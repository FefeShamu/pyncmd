import pyncm.ncm,argparse,os,coloredlogs,logging,json,base64
from http import HTTPStatus
from pywebhost import PyWebHost
from pywebhost.handler import RequestHandler
from pywebhost.adapter.websocket import Websocket,WebsocketFrame
from pywebhost.modules import PathMakerModules,HTTPModules
from pyncm import apis as neapi,GetCurrentSession
from datetime import timedelta

coloredlogs.install(0)
# ------------------------Imports END----------------------------
coloredlogs.install(level=logging.INFO)
splash = '''
\033[35m
         p0000,
   _p00 ]0#^~M!       ___           __  ___            _
  p00M~  00          / _ \_   _  /\ \ \/ __\ /\/\   __| |
 j0@^  pg0000g_     / /_)/ | | |/  \/ / /   /    \ / _` |
]00   #00M0#M00g   / ___/| |_| / /\  / /___/ /\/\ \ (_| |
00'  j0F  00 ^Q0g  \/     \__, \_\ \/\____/\/    \/\__,_|
00   00   #0f  00         |___/
00   #0&__#0f  #0c  ———————————————————————————————————————
#0t   M0000F   00                 by greats3an @ mos9527.tooo.top
 00,       +-+-+--+ SYANTAX HELP:
 ~00g      | | | ||     --help,-h show manual
  `000pg,pp+------|
    ~M00000| | | ||
           +-+-+--+
\033[0m
'''
print(splash)
# ascii splash!
parser = argparse.ArgumentParser(description='PyNCM Web Server')
parser.add_argument('--phone',metavar='PHONE',help='Phone number to your account')
parser.add_argument('--password', metavar='PASSWORD',help='Password to your account')
parser.add_argument('--port', metavar='PORT',help='Port to be listened on',default='3301')
parser.add_argument('--message', metavar='MSG',help='Custom message to be displayed',default='')
parser.add_argument('--host', metavar='HOST',help='Restrict request hosts for websockets',default='')

args = parser.parse_args()
args = args.__dict__

port,phone,password,ContributerMessage,host = int(args['port']),args['phone'],args['password'],args['message'],args['host']
# Parsing argumnets
NCM = GetCurrentSession()
if os.path.exists('.cookies'):
    # If cookies,userinfo are stored,load them in
    try:
        NCM.cookies.update(json.loads(open('.cookies',encoding='utf-8').read()))
        logging.info('Loaded stored cookies,continue...')
        NCM.login_info = json.loads(open('.user',encoding='utf-8').read())
        logging.info('Loaded stored user info!')        
    except Exception as e:
        logging.error('Failed while loading saved info:%s' % e)

if phone and password:
    # Provided.login and save the info
    neapi.login.CellphoneLogin(phone,password)
    open('.cookies','w+',encoding='utf-8').write(json.dumps(NCM.cookies.get_dict()))
    logging.info('Saved cookies to `.cookies`')
    open('.user','w+',encoding='utf-8').write(json.dumps(NCM.login_info))
    logging.info('Saved user login info to `.user`')

server = PyWebHost(('', port))
@server.route(PathMakerModules.AbsoluteWithoutCaps('/favicon.ico'))
def favicon(request : RequestHandler):
    favicon_base64 = '''iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAABXSURBVDhPpc1LDsBACALQuf+lrQ2EMpr059tMhNCu+OgcrB2Lhjk6HOkqLHR/B45FwxyPqChmgzwci4Y5nvfGf1BRzAZ5OBSFcg5w3KgDh6JQ/vztTcQBqP4l98/X4gAAAAAASUVORK5CYII=    
    '''
    request.send_response(200)
    request.send_header('Content-Type','image/x-icon')
    request.end_headers()
    HTTPModules.WriteString(request,base64.b64decode(favicon_base64))

@server.route(PathMakerModules.DirectoryPath('/static/'))
def html(request : RequestHandler):
    HTTPModules.WriteStream(request,'./html' + request.path) # Adds '.',referncing local paths

@server.route(PathMakerModules.Absolute('/'))
def IndexPage(request : RequestHandler):
    # /
    # Index page
    request.send_response(200)
    HTTPModules.WriteStream(request,'html/index.html')

class PyNCMApp(Websocket):

    def GetFullPlaylistInfo(self,id):
        # TODO:this is just a tempoary fix.this should be handled by front-end logic rather than us
        info = neapi.playlist.GetPlaylistInfo(id)
        trackIds = [tid['id'] for tid in info['playlist']['trackIds']]
        tracks = neapi.track.GetTrackDetail(trackIds)['songs']
        info['playlist']['tracks'] = tracks
        return info

    def handshake(self):
        if host:
            r_host = self.request.headers.get('Host')
            if not host in r_host:
                self.request.send_error(403,f'Host {r_host} is not recongized')
                return
        return super().handshake()

    def onOpen(self):
        self.requirement_mapping = {
        'audio':neapi.track.GetTrackAudio,
        'info':neapi.track.GetTrackDetail,
        'lyrics':neapi.track.GetTrackLyrics,
        'playlist':self.GetFullPlaylistInfo,
        'album':neapi.album.GetAlbumInfo,
        'mv':neapi.mv.GetMVInfo,
        'contribution':lambda *args:{
                "contributer": NCM.login_info['content']['profile']['nickname'] if NCM.login_info['success'] else '未登录',
                "contributer_message": ContributerMessage,
                "count":len(self.request.server.websockets)
            }
        }
        # Load pesudo-dynamic variables
        def validate(frame : WebsocketFrame):
            # TODO:Add actual challenge-response authentication (bearer or some sort?)
            self.request.format_log = lambda format,*args:f'[{frame.decode()}] {format % args}'
            self.request.log_message('Request finished valiadation - ' + self.request.useragent_string())
            self.send('{"message":"connection established"}')
        self.todo = [validate]
        # Try to validate the request first

    def onReceive(self, frame : WebsocketFrame):
        if self.todo:return self.todo.pop(0)(frame)
        # Perform designated jobs first
        content = frame.decode('utf-8')
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
            if not requirements == ['contribution']:
                # Do not log 'contribution' calls if it's the only one being required
                # This is reserved for getting online user counts
                self.request.log_message(f'ID:{id} Requirements:{requirements} Extras:{extras}')
            response = {}
            for requirement in requirements:
                # composing response
                if requirement in self.requirement_mapping.keys():
                    try:
                        extra = extras[requirement] if requirement in extras.keys() else {}
                        response[requirement] = self.requirement_mapping[requirement](
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
            self.send(response)
        except Exception as e:
            # failed!            
            self.send('{"message":"unexcepted error:%s"}' % e)   
 
@server.route(PathMakerModules.Absolute('/ws'))
def api(request : RequestHandler):
    app = PyNCMApp(request)
    print('ready to handshake')
    app.handshake()
    # Request is now accpeted,reday to serve!
    app.serve(30)
# ------------------------Service END----------------------------
logging.info('Server listening on http://%s:%s' % server.server_address)
server.serve_forever()
# ------------------------Program END----------------------------