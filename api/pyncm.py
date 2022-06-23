# -*- coding: utf-8 -*-
ENV_KEY = 'PYNCMD_SESSION'
def generate_identity(phone,pwd):
    # Generates session data, which contatins everything we'd need
    # to recover a previous login state. No plaintext password is stored here.
    from pyncm import DumpSessionAsString, GetCurrentSession
    from pyncm.apis.login import LoginViaCellphone
    try:
        LoginViaCellphone(phone,pwd)
    except Exception as e:
        return 503 , str(e)
    return 200, DumpSessionAsString(GetCurrentSession())

def load_identity():    
    # Loads session data from local file 'session'
    # and then tries to restore login state pre-request
    from pyncm import LoadSessionFromString,SetCurrentSession
    import os        
    if not ENV_KEY in os.environ:
        return print(f'[W] 找不到 {ENV_KEY} 环境变量，以游客模式继续')
    session = os.environ(ENV_KEY)
    session_obj = LoadSessionFromString(session) 
    if not session_obj.login_info['success']:
        return print('[W] 配置不含有效登录态')
    SetCurrentSession(session_obj)
    print('[I] %s 已登录' % session_obj.login_info['content']['profile']['nickname'])
    return session_obj.login_info['content']['profile']['nickname']

def route(path , query):    
    path = list(filter(lambda x:x and x != 'pyncmd',path.split('/')))                
    base , target = (path + ['<not set>'])[:2]
    ident_info = load_identity()
    if ident_info is None:
        print('[W] 匿名（游客）身份操作。请参见 README ： https://github.com/mos9527/pyncmd')
    print('[D] PyNCM API Call %s.%s' % (base,target))    
    err = lambda code,msg:{'code' : code , 'message' : msg}
    if base == 'identity':
        if ident_info is None:        
            return err(*generate_identity(query['phone'],query['pwd']))
        else:            
            return err(503,'Session environ "session" non-empty. See https://github.com/mos9527/pyncmd for more info')
    import pyncm,pyncm.apis
    # Filtering request    
    if not base in filter(lambda x:x.islower() and not '_' in x,dir(pyncm.apis)):
        return err(404,'base method %s not found' % base)
    if base in {'user','login'}:
        return err(403,'base method %s not allowed' % base)
    base = getattr(pyncm.apis,base)
    if not target in filter(lambda x:'Get' in x or 'Set' in x,dir(base)):
        return err(404,'target method %s not found' % target)
    if 'Set' in target:
        return err(403,'cannot perfrom "Set" calls')
    query = {k:v if not len(v) == 1 else v[0] for k,v in query.items()}
    response = getattr(base,target)(**query)    
    if ident_info:
        response['server'] = ident_info
    return response

from http.server import BaseHTTPRequestHandler
from urllib.parse import unquote,parse_qs,urlparse
from json import dumps
class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    self.send_response(200)
    self.send_header('Content-type', 'application/json; charset=utf-8')
    self.end_headers()
    # Parsing query string
    self.scheme, self.netloc, self.path, self.params, self.query, self.fragment = urlparse(self.raw_path)
    self.path = unquote(self.path)
    self.query = parse_qs(self.query)
    try:
        # Success responses are directly routed
        result = route(self.path,self.query)
    except Exception as e:
        # Errors will then be passed as 500s        
        result = {'code':'500','message':'Internal error : %s' % e}
    response = dumps(result,ensure_ascii=False).encode('utf-8')
    self.wfile.write(response)