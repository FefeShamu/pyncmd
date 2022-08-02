# -*- coding: utf-8 -*-
def route(path , query , request):
    print('[I] From query',query)
    from pyncm import GetCurrentSession
    from pyncm.apis.track import GetTrackLyrics,GetTrackDetail
    from pyncm.utils.lrcparser import LrcParser
    from pyncm.utils.helper import TrackHelper
    trackId = query['id'][-1]
    flags = {'lrc': False,'tlyric':False,'romalrc':False}
    flags = {**flags, **{k:True for k,v in query.items()}}
    flags = {k for k,v in flags.items() if v}
    print('[I] ID=%s' % trackId,flags)
    GetCurrentSession().force_http = True
    GetCurrentSession().headers['X-Real-IP'] = '118.88.88.188'
    trackLyrics = GetTrackLyrics(trackId)
    parser = LrcParser()
    for flag in flags:
        if flag in trackLyrics:
            parser.LoadLrc(trackLyrics[flag]['lyric'])    
    tracks = GetTrackDetail(trackId)
    track = tracks.get('songs',[])[0]
    return TrackHelper(track).SanitizedTitle,parser.DumpLyrics()

from http.server import BaseHTTPRequestHandler
from urllib import response
from urllib.parse import quote, unquote,parse_qs,urlparse
from json import dumps
import logging, sys
logging.basicConfig(level=0,force=True,stream=sys.stdout)
# Use the most verbose logging level
class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    # Parsing query string
    self.scheme, self.netloc, self.path, self.params, self.query, self.fragment = urlparse(self.path)
    self.path = unquote(self.path)
    self.query = parse_qs(self.query,keep_blank_values=True)    
    try:
        # Success responses are directly routed        
        name , lrc = route(self.path,self.query, self)
        assert lrc, "No lyrics available."
        print('[I] Got lyrics for',name)
        response = lrc.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/text; charset=utf-8')
        self._headers_buffer.append('Content-Disposition','attachment; filename="%s.lrc"' % quote(name))
        self.send_header('Content-Length',len(response))
        self.send_header('Access-Control-Allow-Origin','*')
        self.end_headers()
        self.wfile.write(response)
    except Exception as e:
        # Errors will then be passed as 500s   
        print('[W] Recevied exception',e)     
        result = {'code':'500','message':'Internal error : %s' % e}    
        self.send_response(result['code'])
        response = dumps(result,ensure_ascii=False).encode('utf-8')
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length',len(response))
        self.send_header('Access-Control-Allow-Origin','*')
        self.end_headers()    
        self.wfile.write(response)

if __name__ == '__main__':
    import sys
    sys.path.pop(0)
    print(route('',parse_qs('id=214421&lrc',keep_blank_values=True),''))
