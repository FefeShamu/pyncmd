# -*- coding: utf-8 -*
ENV_KEY = 'PYNCMD_SESSION'
def generate_identity(phone,pwd,ctcode):
    # Generates session data, which contatins everything we'd need
    # to recover a previous login state. No plaintext password is stored here.
    from pyncm import DumpSessionAsString,GetCurrentSession
    from pyncm.apis.login import LoginViaCellphone
    try:
        LoginViaCellphone(phone,pwd,ctcode=ctcode)
    except Exception as e:
        return 503 , str(e)
    return 200, DumpSessionAsString(GetCurrentSession())

def load_identity():    
    # Loads session data from local file 'session'
    # and then tries to restore login state per-request
    from pyncm import LoadSessionFromString,SetCurrentSession
    import os        
    if not ENV_KEY in os.environ:
        return print(f'[W] 找不到 {ENV_KEY} 环境变量，以游客模式继续')
    session = os.environ[ENV_KEY]
    session_obj = LoadSessionFromString(session)
    if not session_obj.login_info['success']:
        return print('[W] 配置不含有效登录态')
    SetCurrentSession(session_obj)
    print('[I] %s 已登录' % session_obj.login_info['content']['profile']['nickname'])
    return session_obj.login_info['content']['profile']['nickname']

def route(path , query , request):        
    # The query K-V always comes in [str]-[List[str]]
    from pyncm import __version__
    print('PyNCM',__version__)
    query = {k:v if len(v) > 1 else v[0] for k,v in query.items()}
    base , target = query.get('module','?'), query.get('method','?')
    if 'module' in query : del query['module']
    if 'method' in query : del query['method']
    # `withIP` : Modifing IP header
    realIP = '118.88.88.88'
    # For default, 118.88.88.88 is used because...well, everyone was using it
    # This should alleviate most problems caused by non-mainland IP
    # being recognized as overseas users and therefore unable to listen to some songs
    if 'withIP' in query:
        # I've decided to let the client to control this behavior own their own since
        # the cases are quite complicated. Using this should be easy as "&withIP=client", etc
        if query['withIP'] == 'client':
            # Use client's acutal IP for requests
            # This solves problems with GetTrackAudio where the URLs are fetched
            # But cannot be played back due to IP differences
            realIP = request.headers['x-real-ip']
        elif query['withIP'] == 'server':
            # Do not send X-Real-IP header
            realIP = None
        else:
            realIP = query['withIP']
        del query['withIP']
    # Pop method descriptors before we actually pass the arguments
    ident_info = load_identity()
    # Random deviceId
    from pyncm.utils.constant import known_good_deviceIds
    from random import choice as rnd_choice
    pyncm.GetCurrentSession().deviceId = rnd_choice(known_good_deviceIds)
    print('[D] Choosing random deviceId',pyncm.GetCurrentSession().deviceId)
    if ident_info is None:
        from pyncm.apis.login import LoginViaAnonymousAccount               
        if target in {'GetTrackAudio'}:                        
            resp = LoginViaAnonymousAccount()
            print('[D] Anonymous login returned %s' % resp)
        print('[W] 匿名（游客）身份操作。请参见 README ： https://github.com/mos9527/pyncmd')
    print('[D] PyNCM API Call %s.%s' % (base,target))    
    err = lambda code,msg:{'code' : code , 'message' : msg}
    if base == 'identity':
        if ident_info is None:        
            return err(*generate_identity(query['phone'],query['pwd'],query.get('ctcode',86)))
        else:            
            return err(503,'Session environ "session" non-empty. See https://github.com/mos9527/pyncmd for more info')
    import pyncm,pyncm.apis
    if realIP:
        print('[D] Reporting IP as',realIP)
        pyncm.GetCurrentSession().headers['X-Real-IP'] = realIP
    else:
        print('[D] Not using alternative IP')
    # Filtering request    
    if not base in filter(lambda x:x.islower() and not '_' in x,dir(pyncm.apis)):
        return err(404,'pyncm module %s not found' % base)
    if base in {'user','login','cloud'}:
        return err(403,'pyncm module %s not allowed' % base)
    base = getattr(pyncm.apis,base)
    if not target in filter(lambda x:'Get' in x or 'Set' in x,dir(base)):
        return err(404,'module method %s not found' % target)
    if 'Set' in target:
        return err(403,'"Set" not allowed')
    query = {k:v if not len(v) == 1 else v[0] for k,v in query.items()}
    response = getattr(base,target)(**query)    
    if ident_info:
        response['server'] = ident_info
    # Adding these as well
    response['requestIP'] = realIP
    response['clientIP'] = request.headers['x-real-ip']
    response['deviceId'] = pyncm.GetCurrentSession().deviceId
    return response

from http.server import BaseHTTPRequestHandler
from urllib.parse import unquote,parse_qs,urlparse
from json import dumps
import logging, sys
logging.basicConfig(level=0,force=True,stream=sys.stdout)
# Use the most verbose logging level
class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    # Parsing query string
    self.scheme, self.netloc, self.path, self.params, self.query, self.fragment = urlparse(self.path)
    self.path = unquote(self.path)
    self.query = parse_qs(self.query)    
    try:
        # Success responses are directly routed        
        result = route(self.path,self.query, self)
    except Exception as e:        
        result = {'code':'500','message':'PyNCMd error : %s' % e}    
    # Responses are sent with 200 (otherwise Vercel will intercept them...?)
    self.send_response(200)
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Access-Control-Allow-Origin','*')
    self.end_headers()    
    response = dumps(result,ensure_ascii=False).encode('utf-8')
    self.wfile.write(response)
