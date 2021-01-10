import pyncm,getpass,os,argparse,logging
from pywebhost import PyWebHost,Request
from pywebhost.modules import Redirect, WriteContentToRequest,JSONMessageWrapper,BinaryMessageWrapper
from pywebhost.modules.session import SessionWrapper
from pyncm import GetCurrentSession,SetCurrentSession,LoadSessionFromString
from pywebhost.modules.session import Session
SESSION_FILE = 'session.ncm'
def parse():
    parser = argparse.ArgumentParser(description='PyNCM Web Server')
    parser.add_argument('--phone',metavar='PHONE',help='Phone number to your account')
    parser.add_argument('--password', metavar='PASSWORD',help='Password to your account')
    parser.add_argument('--port', metavar='PORT',help='Port to be listened on',default=3301,type=int)
    parser.add_argument('--message', metavar='MSG',help='Custom message to be displayed',default='')
    parser.add_argument('--host', metavar='HOST',help='Restrict request hosts for websockets',default='')
    args = parser.parse_args()
    args = args.__dict__
    return args
def login(session_file=SESSION_FILE,phone='',password=''):
    def save():
        with open(session_file,'w+') as f:
            f.write(pyncm.DumpSessionAsString(GetCurrentSession()))
        return True
    def load():
        if not os.path.isfile(session_file):return False
        with open(session_file) as f:
            pyncm.SetCurrentSession(LoadSessionFromString(f.read()))
        return pyncm.GetCurrentSession().login_info['success']    
    if not (phone and password) and load():
        return logging.info('Serving as %s' % pyncm.GetCurrentSession().login_info['content']['profile']['nickname']) or True
    pyncm.login.LoginViaCellphone(phone,password)
    logging.info('%s' % pyncm.GetCurrentSession().login_info['content']['profile']['nickname'],'has logged in')
    return save()
server = None
def route():    
    @server.route('/.*')
    def html(server : PyWebHost,request : Request,content):
        path = './web' + request.path
        WriteContentToRequest(request,path,mime_type='')

    @server.route('/static/.*')
    def html(server : PyWebHost,request : Request,content):
        path = './web' + request.path
        WriteContentToRequest(request,path,mime_type='')

    @server.route('/')
    def IndexPage(server : PyWebHost,request : Request,content):
        WriteContentToRequest(request,'web/index.html',mime_type='text/html')

    class NCMdAPISession(Session):        
        logger = logging.getLogger('NCMdAPI')   
        @BinaryMessageWrapper()
        def _stats_requests(self,request: Request,content):      
            '''accumulates total requests'''      
            request.send_response(200)
            return str(self['requests'])
        @JSONMessageWrapper(read=False)
        def _stats_server(self,request: Request,content):      
            '''server hoster nickname'''      
            if GetCurrentSession().login_info['success']:
                request.send_response(200)
                return GetCurrentSession().login_info['content']['profile']
            else:
                request.send_response(404)
                return {}                        
        @JSONMessageWrapper(read=False)
        def routeCloudmusicApis(self,request: Request, content):        
            path = list(filter(lambda x:x and x != 'pyncm',request.path.split('/')))
            base,target = path
            if not base in filter(lambda x:x.islower() and not '_' in x,dir(pyncm.apis)):
                return request.send_error(404,'base method %s not found' % base)   
            if base in {'user','login'}:
                return request.send_error(403,'base method %s not allowed' % base)   
            base = getattr(pyncm.apis,base)         
            if not target in filter(lambda x:'Get' in x or 'Set' in x,dir(base)):
                return request.send_error(404,'target method %s not found' % target)       
            if 'Set' in target:
                return request.send_error(403,'you have no rights to perfrom "Set" calls')
            query = {k:v if not len(v) == 1 else v[0] for k,v in request.query.items()}
            response = getattr(base,target)(**query)
            self.logger.info('[%s] %s - %s'%(request.address_string,target,query))
            self['requests'] += 1
            request.send_response(200)
            return response
        def onCreate(self, request: Request, content):
            if not 'requests' in self:self['requests'] = 0 
            if not self.session_id: self.set_session_id(path='/')
            self.paths['/pyncm.*'] = self.routeCloudmusicApis
            return super().onCreate(request=request, content=content)
    @server.route('/pyncm.*')
    @server.route('/stats.*')
    @SessionWrapper()
    def APIs(server : PyWebHost,request : Request,content):
        return NCMdAPISession
    return True
def serve():
    logging.warning('Now serving http://127.0.0.1:%s' % server.server_address[1])
    return server.serve_forever()
if __name__ == "__main__":    
    import coloredlogs
    coloredlogs.install(logging.INFO)
    args = parse()    
    server = PyWebHost(('',args['port']))
    login(SESSION_FILE,args['phone'],args['password']) and route() and serve()