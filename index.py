# -*- coding: utf-8 -*-
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
    if not os.path.isfile('./session'):
        return print('[W] 找不到 "session" 配置文件')                
    session = open('./session','r',encoding='utf-8').read()
    session_obj = LoadSessionFromString(session) 
    if not session_obj.login_info['success']:
        return print('[W] 配置文件不含有效登录态')
    SetCurrentSession(session_obj)
    print('[I] %s 已登录' % session_obj.login_info['content']['profile']['nickname'])
    return session_obj.login_info['content']['profile']['nickname']

def route(path , query):    
    path = list(filter(lambda x:x and x != 'pyncmd',path.split('/')))                
    base , target = (path + ['<not set>'])[:2]
    ident_info = load_identity()
    if ident_info is None:
        print('[W] 匿名（游客）身份操作。请参见 README ： https://github.com/greats3an/pyncmd')
    print('[D] Rendezvous API to %s.%s' % (base,target))    
    err = lambda code,msg:{'statusCode' : code , 'msg' : msg}
    if base == 'identity':
        if ident_info is None:        
            return err(*generate_identity(query['phone'],query['pwd']))
        else:
            return err(503,'Session file "session" non-empty. See https://github.com/greats3an/pyncmd for more info')
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

def main_handler(event,content):
    print('[I] 来源请求： %s' % event)
    return route(event['path'],event['queryString'])