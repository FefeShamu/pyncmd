# -*- coding: utf-8 -*-

def route(path , query , request):        
    from pykakasi import kakasi
    content = query['content'][-1]
    content = content.split('|')
    # Multiline strings are delimited by |
    result = {no:kakasi().convert(line) for no,line in enumerate(content)}
    return {'data': result}

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
        # Errors will then be passed as 500s        
        result = {'code':'500','message':'Internal error : %s' % e}    
    self.send_response(int(result.get('code',200)))
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Access-Control-Allow-Origin','*')
    self.end_headers()    
    response = dumps(result,ensure_ascii=False).encode('utf-8')
    self.wfile.write(response)
