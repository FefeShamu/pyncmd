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
import logging,coloredlogs
from http import HTTPStatus
from threading import Timer

from pyncm.ncm.ncm_core import NeteaseCloudMusic
from pyncm.ncm import Depercated
import pyncm.ncm
from pywebserver.pywebserver import PyWebServer
from pywebserver.pywebserver.proto import http
coloredlogs.install(level=logging.INFO)
root = ''
# Set root working driectory,modifiy if needed
parser = argparse.ArgumentParser(description='PyNCM Web Server')
parser.add_argument('--phone',metavar='PHONE',help='Phone number to your account')
parser.add_argument('--password', metavar='PASSWORD',help='Password to your account')
parser.add_argument('--port', metavar='PORT',help='Port to be listened on',default='3301')
parser.add_argument('--message', metavar='MSG',help='Custom message to be displayed',default='')

args = parser.parse_args()
args = args.__dict__

port,phone,password,ContributerMessage = int(args['port']),args['phone'],args['password'],args['message']
# Parsing argumnets
NCM = NeteaseCloudMusic()

if os.path.exists('.cookies'):
    # If cookies,userinfo are stored,load them in
    try:
        pyncm.ncm.session.cookies.update(json.loads(open('.cookies',encoding='utf-8').read()))
        logging.info('Loaded stored cookies,continue...')
        NCM.login_info = json.loads(open('.user',encoding='utf-8').read())
        logging.info('Loaded stored user info!')        
    except Exception as e:
        logging.error('Failed while loading saved info:%s' % e)

if phone and password:
    # Provided.login and save the info
    NCM.UpdateLoginInfo(phone,password)
    open('.cookies','w+',encoding='utf-8').write(json.dumps(pyncm.ncm.session.cookies.get_dict()))
    logging.info('Saved cookies to `.cookies`')
    open('.user','w+',encoding='utf-8').write(json.dumps(NCM.login_info))
    logging.info('Saved user login info to `.user`')

server = PyWebServer(('', port),protos=[http.HTTP])

@server.path_absolute('GET','/',http.HTTP)
def IndexPage(handler):
    # /
    # Index page
    handler.send_response(200)
    http.Modules.write_file(handler.proto, 'index.html')

count,requirement_mapping = 0,{
    'audio':NCM.GetSongInfo,
    'info':NCM.GetSongDetail,
    'lyrics':NCM.GetSongLyrics,
    'playlist':NCM.GetPlaylistInfo,
    'album':NCM.GetAlbumInfo,
    'mv':NCM.GetMVInfo,
    'contribution':lambda *args:{
        "contributer": NCM.login_info['content']['profile']['nickname'] if NCM.GetUserAccountLevel() != 'NOLOGIN' else '未登录',
        "contributer_message": ContributerMessage,
        "count":count                   
    }
}

@server.path_absolute('POST','/api',http.HTTP)
def API(handler):
    # All-In-One API call handler
    # Utilizing PyNCM to load music info
    # With given music ID
    global count,requirement_mapping
    content_length = handler.headers.get('content-length')
    content = handler.rfile.read(int(content_length)).decode(
        'utf-8') if content_length else None
    # load content inside request body
    try:
        content = json.loads(content)
        id,requirements,extras = (
            content['id'] if 'id' in content.keys() else 'Not Given',
            content['requirements'] if 'requirements' in content.keys() else [],
            content['extras'] if 'extras' in content.keys() else {},
        )
        # object ID,request requirements,extra parameters per requirement
        # a request for a song's audio url can be the following
        '''
        {
            'id':7355608,
            // specifies ID
            'requirements':['audio'],
            // specifies only for audio
            'extra':{'audio':{'quality':'lossless'}}
            // sets audio quality
        }
        '''
        logging.info(f'[Procssing Request] {id} Requirements:{requirements} Extras:{extras}')
        response = {}
        for requirement in requirements:
            # composing response
            if requirement in requirement_mapping.keys():
                try:
                    extra = extras[requirement] if requirement in extras.keys() else {}
                    response[requirement] = requirement_mapping[requirement](
                        id,
                        **extra
                    )
                    response[requirement]['extra'] = extra
                    if 'code' in response[requirement].keys() and response[requirement]['code'] != 200:                        
                        response[requirement]['message'] = f"netease eAPI error:{response[requirement]['code']}"
                    else:
                        response[requirement]['message'] = 'success'
                except Exception as e:
                    response[requirement] = {'message':e}
            else:
                response[requirement] = {'message':'func not found'}
        response = {**response,'requirements':requirements,'required_id':id}
        # Select what to send based on 'requirements' value
        handler.send_response(200)              
        handler.end_headers()
        http.Modules.write_string(handler.proto, json.dumps(response))
    except Exception as e:
        # failed!
        handler.send_response(500)
        handler.end_headers()
        http.Modules.write_string(handler.proto, '{"message":"unexcepted error:%s"}' % e)
    count += 1
    logging.info('Processed request.Total times:%s , ID: %s' % (count, content['id'] if content else 'INVALID'))

server.add_relative('GET','/',http.HTTP,local='.',modules={
    'file':http.Modules.write_file
})

logging.info('Listening:\n    http://{0}:{1}'.format(*server.server_address))
server.serve_forever()
