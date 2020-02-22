'''
@Author: greats3an
@Date: 2020-01-14 17:08:10
@LastEditors  : greats3an
@LastEditTime : 2020-01-28 12:22:24
@Site: mos9527.tooo.top
@Description: PyNCM Web解析服务器
'''
import http.server
import time
import json
import argparse
import sys
import shutil
import random
import json
import socket
import os

from pyncm.ncm.strings import strings, simple_logger
from pyncm.ncm.ncm_core import NeteaseCloudMusic
from http import HTTPStatus
from threading import Timer
root = ''
# Set root working driectory,modifiy if needed
parser = argparse.ArgumentParser(description='PyNCM Web Server')
parser.add_argument('phone',metavar='PHONE',help='Phone number to your account')
parser.add_argument('password', metavar='PASSWORD',help='Password to your account')
parser.add_argument('--port', metavar='PORT',help='Port to be listened on',default='3301')
parser.add_argument('--message', metavar='MSG',help='Custom message to be displayed',default='You guys are awsome👍')
if len(sys.argv) < 2:
    parser.print_help()
    sys.exit(2)
else:
    args = parser.parse_args()
    args = args.__dict__

port = int(args['port'])
phone = args['phone']
password = args['password']
ContributerMessage = args['message']
# Parsing argumnets
NCM = NeteaseCloudMusic(simple_logger)
LoginTimeout = 600
# CSRF Token will expire in 1200s,we perform a normal re-login every 600s(5 mins)
def LoginLooper():
    simple_logger('[W] Automaticly Updating Login Info!')
    result = NCM.UpdateLoginInfo(phone,password)
    if not result['success']:
        # Exceptions Might be:
        #   ip高频   (Anti-Scraper)
        #   出现错误 (Usually,wrong username or password)
        simple_logger('\n\n',str(result),'\n\n')
        LoginTimeout = 10
        # Retry after 10s if an exception has been risen
    else:
        LoginTimeout = 600
        # Re-login after 5 mins if succeed
    Timer(LoginTimeout,LoginLooper).start()
LoginLooper()

class Handler(http.server.BaseHTTPRequestHandler):
    '''
    HTTP Handler,added callback funtionality
        reqeust         :       requst socket
        client_address  :       Client address
        server          :       server socket
        callback        :       request events
    '''
    def __init__(self, request, client_address, server, callback=None):
        self.callback = callback
        super().__init__(
            request, client_address, server)

    def log_message(self,*args):
        # Disable interal logging
        pass

    def log_error(self,*args):
        # Disable interal logging
        pass

    def handle_one_request(self):
        """Handle a single HTTP request.

        You normally don't need to override this method; see the class
        __doc__ string for information on how to handle specific HTTP
        commands such as GET and POST.
        """
        try:
            self.raw_requestline = self.rfile.readline(65537)
            if len(self.raw_requestline) > 65536:
                self.requestline = ''
                self.request_version = ''
                self.command = ''
                self.send_error(HTTPStatus.REQUEST_URI_TOO_LONG)
                return
            if not self.raw_requestline:
                self.close_connection = True
                return
            if not self.parse_request():
                # An error code has been sent, just exit
                return
            self.callback({'type': self.command, 'args': self})
            # actually send the response if not already done.
            self.wfile.flush()
        except socket.timeout as e:
            # a read or a write timed out.  Discard this connection
            self.log_error("Request timed out: %r", e)
            self.close_connection = True
            return


class Server(http.server.ThreadingHTTPServer):
    '''
        Threading HTTP Server contating NE's api,exposed by PyNCM
            server_address  :   Tuplet(ip,addr)
    '''
    def write_file(self, caller, path='.', content_type='application/octet-stream'):
        '''
        Send a file in sparse
            caller      :    A 'Handler' object
            path        :    File path
            content_type:    The 'Content-Type' Header
        '''
        sent, size = 0, os.path.getsize(path)
        # Visualize the progress
        caller.send_header('Content-Type', content_type)
        caller.send_header('Content-Length', size)
        # Send OCTET-STREAM header to transfer files
        caller.end_headers()
        with open(path, 'rb') as f:
            while sent < size:
                try:
                    # Read file with buffer of 1MB,then send
                    caller.wfile.write(data:= f.read(1024 * 1024))
                except Exception as e:
                    print(e)
                    break
                sent += len(data)

    def write_page(self, caller, page, html_headers=True, end_headers=True):
        '''
        Send a html page
            caller      :    A 'Handler' object
            page        :    Page's file path
            html_headers:    Do send 'Content-type' headers
            end_headers :    Apply Handler.end_headers()
        '''
        if html_headers:
            caller.send_header('Content-type', 'text/html;charset=utf-8/html')
        # Send HTML & UTF-8 Headers
        size = os.path.getsize(page)
        # Send in sparse if size's over 1MB
        if size > 1024 * 1024:
            self.write_file(
                caller, page, content_type='text/html;charset=utf-8/html')
        else:
            if end_headers:
                caller.end_headers()
            caller.wfile.write(open(page, 'rb').read())

    def write_string(self, caller, string, html_headers=False, end_headers=True):
        '''
        Send a html page
            caller      :    A 'Handler' object
            string      :    Content to be sent
            html_headers:    Do send 'Content-type' headers
            end_headers :    Apply Handler.end_headers()
        '''
        if html_headers:
            caller.send_header('Content-type', 'text/html;charset=utf-8/html')
        if end_headers:
            caller.end_headers()
        caller.wfile.write(string.encode('utf-8'))

    def GET(self, caller):
        return self.METHOD(caller)

    def POST(self, caller):
        return self.METHOD(caller)

    def METHOD(self, caller):
        '''
            Process all methods.GET,POST,OPTIONS,etc
        '''
        path = caller.path.replace('/', '_')
        # repalce '/' with '_' since it's illegal to use '/' inside a function name
        if hasattr(self, path):
            # Reflect funtion if exsists
            getattr(self, path)(caller)
        else:
            # Try to send files if cannot reflect the funtion
            path = root + caller.path[1:]
            # Removes '/'
            if os.path.exists(path):
                if os.path.isdir(path):
                    caller.send_response(403)
                    self.write_page(caller, 'static/403.html')
                    # Restrict directory access
                else:
                    caller.send_response(200)
                    content_type = 'application/octet-stream'
                    if 'css' in path:
                        content_type = 'text/css'
                    if 'js' in path:
                        content_type = 'text/javascript'
                    if 'html' in path:
                        content_type = 'text/html;charset=utf-8/html'                    
                    self.write_file(caller, path, content_type)
            else:
                caller.send_response(404)
                self.write_page(caller, 'static/404.html')
                caller.end_headers()
                # Page not found
        return

    def callback(self, kwargs):
        if hasattr(self, kwargs['type']):
            getattr(self, kwargs['type'])(kwargs['args'])
        else:
            simple_logger('Cannot reflect function',
                          kwargs['type'], 'with argument', kwargs['args'])

    def __init__(self, server_address):
        super().__init__(server_address, lambda request, client_address,
                         server: Handler(request, client_address, server, self.callback))


server = Server(('', port))

def _(caller):
    # /
    # Index page
    caller.send_response(200)
    server.write_page(caller, 'index.html')

counts = 0
def _api_song(caller):
    # /api/song
    # Utilizing PyNCM to load music info
    # With given music ID
    global counts
    content_length = caller.headers.get('content-length')
    content = caller.rfile.read(int(content_length)).decode(
        'utf-8') if content_length else None
    # load content
    try:
        content = json.loads(content)
        simple_logger('Request ID:',content['id'],'Request Requirements',' '.join(content['requirements']))
        AUDIO = NCM.GetSongInfo(content['id']) if 'audio' in content['requirements'] else {}           
        EXTRA = NCM.GetExtraSongInfo(content['id']) if 'info' in content['requirements'] else {}
        LYRICS = NCM.GetSongLyrics(content['id'])  if 'lyrics' in content['requirements'] else {}
        PLAYLIST = NCM.GetPlaylistInfo(content['id']) if 'playlist' in content['requirements'] else {}
        CONTRIBUTION = {
            "contributer": NCM.login_info['content']['profile']['nickname'],
            "contributer_message": ContributerMessage,
            "counts":counts                   
        } if 'contribution' in content['requirements'] else {}
        # Select what to send based on 'requirements' value
        caller.send_response(200)
        server.write_string(caller, json.dumps(
            {                
                "audio":AUDIO,
                "info":EXTRA,
                "lyrics":LYRICS,
                "playlist":PLAYLIST,
                "contribution":CONTRIBUTION,
                "requirements":content['requirements'],                 
                "message": "Success",
                "attention_hackerz":"you're free to use this api,but pleases do not abuse or spread it\nthis project is open-source:github.com/greats3an/pyncmd"
            }, ensure_ascii=False, indent=4))
            # cheecky message ( ͡° ͜ʖ ͡°)
    except Exception as e:
        # failed!
        caller.send_response(500)
        server.write_string(caller, '{"message":"加载歌曲(id:%s)时出现错误：%s"}' % (content['id'],e))
    counts += 1
    simple_logger('Processed request.Total times:%s , ID: %s' %
                  (counts, content['id'] if content else 'INVALID'))


# 根目录索引
server._ = _
server._api_song = _api_song

simple_logger(
    'Listening:\n    http://{0}:{1}'.format(*server.server_address))
server.serve_forever()
