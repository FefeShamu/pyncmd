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
from ncm.strings import strings, simple_logger
from ncm.ncm_core import NeteaseCloudMusic
from http import HTTPStatus
from threading import Timer
root = ''

parser = argparse.ArgumentParser(description='PyNCM Web Server')
parser.add_argument('phone',metavar='PHONE',help='Phone number to your account')
parser.add_argument('password', metavar='PASSWORD',help='Password to your account')
parser.add_argument('--port', metavar='PORT',help='Port to be listened on',default='3301')
parser.add_argument('--messsage', metavar='MSG',help='Custom message to be displayed',default='You guys are awsome👍')
if len(sys.argv) < 2:
    parser.print_help()
    sys.exit(2)
else:
    args = parser.parse_args()
    args = args.__dict__

port = int(args['port'])
phone = args['phone']
password = args['password']
ContributerMessage = args['messsage']

# 解析输入命令
NCM = NeteaseCloudMusic(simple_logger)
LoginTimeout = 600
# 给的 keep-alive 时间是 1200 秒，这里会在 0~1200 秒内动态变化
def LoginLooper():
    simple_logger('[W] Automaticly Updating Login Info!')
    result = NCM.UpdateLoginInfo(phone,password)['content']['code']
    if result != 200:
        # 登录出现问题
        print('\n\n',result['content']['msg'],'\n\n')
        LoginTimeout = 10
        # 10s 后重试
    else:
        LoginTimeout = 600
        # 登陆正常，600s 刷新一次
    Timer(LoginTimeout,LoginLooper).start()
LoginLooper()

class Server(http.server.ThreadingHTTPServer):

    def write_file(self, caller, path='.', content_type='application/octet-stream'):
        '''
        @description: 发送文件
        @param caller:HTTPHandler path:文件路径
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
        @description: 发送HTML页面
        @param caller:HTTPHandler page:页面路径 html_handlers:是否发送指定HTML的回复头 end_headers:是否结束回复头
        '''
        if html_headers:
            caller.send_header('Content-type', 'text/html;charset=utf-8/html')
        # 让浏览器使用 UTF8 编码
        size = os.path.getsize(page)
        # 根据大小判断发送方式
        if size > 1024 * 1024:
            self.write_file(
                caller, page, content_type='text/html;charset=utf-8/html')
        else:
            if end_headers:
                caller.end_headers()
            caller.wfile.write(open(page, 'rb').read())

    def write_string(self, caller, string, html_headers=False, end_headers=True):
        '''
        @description: 发送字符串
        @param caller:HTTPHandler string:发送内容 html_handlers:是否发送指定HTML的回复头 end_headers:是否结束回复头
        '''
        if html_headers:
            caller.send_header('Content-type', 'text/html;charset=utf-8/html')
        if end_headers:
            caller.end_headers()
        caller.wfile.write(string.encode('utf-8'))

    def GET(self, caller):
        print('GET', end=' ')
        return self.METHOD(caller)

    def POST(self, caller):
        print('POST', end=' ')
        return self.METHOD(caller)

    def METHOD(self, caller):
        path = caller.path.replace('/', '_')
        # 所有 / 字符将以 _ 字符反射
        # 根目录 (/) 反射即 def _(self,caller):...
        if hasattr(self, path):
            # 处理函数反射
            getattr(self, path)(caller)
        else:
            # 处理目录反射
            path = root + caller.path[1:]
            # 删掉根目录索引
            simple_logger('Requesting:', path)
            if os.path.exists(path):
                if os.path.isdir(path):
                    caller.send_response(403)
                    self.write_page(caller, 'static/403.html')
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
        return

    def callback(self, kwargs):
        if hasattr(self, kwargs['type']):
            getattr(self, kwargs['type'])(kwargs['args'])
        else:
            simple_logger('cannot reflect function',
                          kwargs['type'], 'with argument', kwargs['args'])

    def __init__(self, server_address):
        class Handler(http.server.BaseHTTPRequestHandler):
            # 继承类：继承了 BaseHTTPRequestHandler，增加回调功能
            def __init__(self, request, client_address, server, callback=None):
                self.callback = callback
                super().__init__(
                    request, client_address, server)

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

        super().__init__(server_address, lambda request, client_address,
                         server: Handler(request, client_address, server, self.callback))


server = Server(('', port))

def _(caller):
    # 首页
    caller.send_response(200)
    server.write_page(caller, 'static/index.html')

counts = 0
def _api_song(caller):
    # 读取数据
    global counts
    content_length = caller.headers.get('content-length')
    content = caller.rfile.read(int(content_length)).decode(
        'utf-8') if content_length else None
    # 开始解析
    try:
        content = json.loads(content)
        SONG = NCM.GetSongInfo(content['id'])
        if not SONG:
            raise Exception('加载歌曲(id:%s)失败，请检查链接是否正确' % content['id'])
        else:
            # 解析成功
            EXTRA = NCM.GetExtraSongInfo(content['id'])
            caller.send_response(200)
            server.write_string(caller, json.dumps(
                {
                    **SONG,
                    **EXTRA,
                    "contributer": NCM.login_info['content']['profile']['nickname'],
                    "contributer_message": ContributerMessage,
                    "counts":counts,
                    "message": "Success!"
                }, ensure_ascii=False, indent=4))
    except Exception as e:
        # 解析失败
        caller.send_response(500)
        server.write_string(caller, '{"message":"出现错误：%s"}' % e)
    counts += 1
    simple_logger('处理请求完毕，第 %s 次，ID: %s' %
                  (counts, content['id'] if content else '无效'))


# 根目录索引
server._ = _
server._api_song = _api_song

simple_logger(
    'Listening:\n    http://{0}:{1}'.format(*server.server_address))
server.serve_forever()
