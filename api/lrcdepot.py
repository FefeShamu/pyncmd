# -*- coding: utf-8 -*-
import sys
sys.path.pop(0) # Don't import pyncm.py here!

def route(path , query , request):
    from pyncm.apis.track import GetTrackLyrics,GetTrackDetail
    from pyncm.utils.lrcparser import LrcParser
    from pyncm.utils.helper import TrackHelper

    trackId = query['id'][-1]
    flags = {'lrc': False,'tlyric':False,'romalrc':False}
    flags = {**flags, **{k:True for k,v in query.items()}}
    flags = {k for k,v in flags.items() if v}
    trackLyrics = GetTrackLyrics(trackId)
    parser = LrcParser()
    for flag in flags:
        if flag in trackLyrics:
            parser.LoadLrc(trackLyrics[flag]['lyric'])    
    return TrackHelper(GetTrackDetail(trackId)).SanitizedTitle,parser.DumpLyrics()

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
    self.query = parse_qs(self.query,keep_blank_values=True)    
    try:
        # Success responses are directly routed        
        name , lrc = route(self.path,self.query, self)
        assert lrc, "No lyrics available."
        self.send_response(200)
        self.send_header('Content-type', 'application/text; charset=utf-8')
        self.send_error('Content-Disposition','attachment; filename="%s.jpg"' % name)
        self.send_header('Access-Control-Allow-Origin','*')
        self.end_headers()
        self.wfile.write(lrc.encode('utf-8'))
    except Exception as e:
        # Errors will then be passed as 500s        
        result = {'code':'500','message':'Internal error : %s' % e}    
        self.send_response(result['code'])
        response = dumps(result,ensure_ascii=False).encode('utf-8')
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin','*')
        self.end_headers()    
        self.wfile.write(response)
