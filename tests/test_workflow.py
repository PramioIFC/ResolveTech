"""Integration checks use an isolated database and real HTTP calls; no browser needed."""
import importlib.util, json, os, tempfile, threading, unittest, urllib.request, urllib.error, http.cookiejar, base64
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
TMP=tempfile.TemporaryDirectory(); os.environ['RESOLVETECH_DATA']=TMP.name
spec=importlib.util.spec_from_file_location('rt',ROOT/'backend/server.py'); rt=importlib.util.module_from_spec(spec); spec.loader.exec_module(rt)
class Client:
 def __init__(self): self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def request(self,path,data=None,status=200):
  req=urllib.request.Request(BASE+'/api/'+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
  try:
   with self.opener.open(req) as r: code=r.status; body=r.read(); ct=r.headers.get('Content-Type','')
  except urllib.error.HTTPError as e: code=e.code;body=e.read();ct=e.headers.get('Content-Type','')
  assert code==status,(path,code,status,body.decode(errors='replace'))
  return json.loads(body) if 'json' in ct else body
 def login(self,role): return self.request('login',{'email':role+'@resolvetech.local','password':'Demo@2026'})
rt.initialize(); SERVER=rt.ThreadingHTTPServer(('127.0.0.1',0),rt.Handler);SERVER.attempts={};BASE='http://127.0.0.1:'+str(SERVER.server_address[1]);threading.Thread(target=SERVER.serve_forever,daemon=True).start()
class Workflow(unittest.TestCase):
 def test_complete_workflow_and_permissions(self):
  client=Client();support=Client();dev=Client();admin=Client();anon=Client()
  anon.request('state',status=401)
  client.login('client');support.login('support');dev.login('developer');admin.login('admin')
  state=client.request('state');issue=state['issues'][0];original=issue['fields']
  d=client.request('demands',{'formId':issue['form_id']});id=d['id'];d=client.request('demands/'+id)
  client.request('demands/'+id+'/save',{'revision':d['revision'],'answers':{},'submit':True},400)
  d=client.request('demands/'+id+'/save',{'revision':d['revision'],'answers':{},'guided':True})
  dev.request('demands/'+id,status=403)
  d=support.request('demands/'+id+'/start',{'revision':d['revision']})
  support.request('demands/'+id+'/send',{'revision':d['revision']},403)
  answers={'description':'Erro ao gerar relatório','started':'Hoje de manhã','module':'Financeiro','procedures':'Sair e entrar','impact':'Não consigo gerar relatórios'}
  d=support.request('demands/'+id+'/save',{'revision':d['revision'],'answers':answers,'notes':'Cliente suspeita de atualização; não confirmado.','transcript':'Hoje de manhã apareceu erro 500 no módulo financeiro. Já tentei sair e entrar novamente.','consent':True})
  stale=d['revision']-1
  support.request('demands/'+id+'/save',{'revision':stale,'answers':answers},409)
  d=support.request('demands/'+id+'/extract',{'revision':d['revision']})
  self.assertTrue(d['suggestions']);self.assertEqual(d['answers']['module'],'Financeiro');self.assertEqual(d['answers']['error'],'')
  d=support.request('demands/'+id+'/upload',{'name':'contexto.txt','data':base64.b64encode(b'contexto adicional').decode()})
  file=d['attachments'][0]['id'];self.assertEqual(client.request('files/'+file),b'contexto adicional')
  support.request('demands/'+id+'/upload',{'name':'falso.png','data':base64.b64encode(b'not png').decode()},400)
  # Old forms stay immutable after publication.
  admin.request('forms',{'issueId':issue['id'],'name':issue['name'],'fields':[dict(key='new_field',label='Nova pergunta?',type='text',section='Nova seção',required=True,options=[])]})
  self.assertEqual(support.request('demands/'+id)['fields'],original)
  d=support.request('demands/'+id+'/report',{'revision':d['revision']});self.assertTrue(d['report']);self.assertFalse(d['report_reviewed']);self.assertEqual(d['report']['possibleHypotheses'],[])
  d=support.request('demands/'+id+'/review',{'revision':d['revision'],'summary':'Erro no relatório financeiro','nextSteps':['Reproduzir o erro.'],'priority':'HIGH'})
  d=support.request('demands/'+id+'/send',{'revision':d['revision']});self.assertEqual(d['status'],'ENVIADA_DESENVOLVIMENTO')
  visible=client.request('demands/'+id);self.assertIsNone(visible['notes']);self.assertIsNone(visible['transcript']);self.assertIsNone(visible['report'])
  client.request('demands/'+id+'/status',{'revision':d['revision'],'status':'CONCLUIDA'},403)
  d=dev.request('demands/'+id);d=dev.request('demands/'+id+'/claim',{'revision':d['revision']});self.assertEqual(d['owner_id'],'developer')
  admin.request('demands/'+id+'/claim',{'revision':d['revision']},409)
  d=dev.request('demands/'+id+'/status',{'revision':d['revision'],'status':'EM_ESPERA'})
  d=dev.request('demands/'+id+'/status',{'revision':d['revision'],'status':'EM_ANDAMENTO'})
  d=dev.request('demands/'+id+'/comment',{'body':'Correção validada e publicada.'})
  d=dev.request('demands/'+id+'/status',{'revision':d['revision'],'status':'CONCLUIDA'})
  self.assertEqual(client.request('demands/'+id)['status'],'CONCLUIDA');self.assertGreaterEqual(len(d['events']),12)
  client.request('forms',{'name':'invasão','fields':original},403)
  # Isolated company and user cannot read or download another client's demand.
  other=Client();other.request('register',{'name':'Outra Empresa','email':'outro@example.test','password':'Teste@2026','company':{'name':'Outra organização'}})
  other.request('demands/'+id,status=403);other.request('files/'+file,status=403)
  newcomer=Client();newcomer.request('register',{'name':'Outro Cliente','email':'cliente2@example.test','password':'Teste@2026'})
  newcomer.request('demands/'+id,status=403)
  other.request('members',{'name':'Suporte novo','email':'suporte2@example.test','password':'Teste@2026','role':'SUPPORT'})
  # Session expiration/logout and origin protection.
  req=urllib.request.Request(BASE+'/api/logout',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://evil.example'})
  with self.assertRaises(urllib.error.HTTPError) as cm:client.opener.open(req)
  self.assertEqual(cm.exception.code,403)
  client.request('logout',{});client.request('state',status=401)
  with rt.connect() as c:
   stored=c.execute('SELECT status FROM demands WHERE id=?',(id,)).fetchone()[0];self.assertEqual(stored,'CONCLUIDA')
 def test_field_validation(self):
  with self.assertRaises(rt.Problem):rt.fields_validate([{'key':'x','label':'x','section':'s','type':'select','options':[]}])
  fields=[{'key':'n','label':'Número','section':'s','type':'number','required':True,'options':[]}]
  with self.assertRaises(rt.Problem):rt.answers_validate(fields,{'n':'abc'})
  self.assertEqual(rt.answers_validate(fields,{'n':'42'},True)['n'],'42')
  fields=[{'key':'b','label':'Sim ou não','section':'s','type':'checkbox','required':True,'options':[]}]
  self.assertIs(rt.answers_validate(fields,{'b':False},True)['b'],False)
 def test_optional_ollama_contract(self):
  class MockModel(rt.BaseHTTPRequestHandler):
   def do_POST(self):
    request=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
    if 'fieldSuggestions' in request['format']['properties']:
     result={'fieldSuggestions':[{'fieldKey':'error','value':'Erro 500','evidence':'erro 500'},{'fieldKey':'module','value':'Inventado','evidence':'não está no texto'}]}
    else:result={'summary':'Resumo de teste','nextSteps':['Verificar os logs.']}
    payload=json.dumps({'message':{'content':json.dumps(result)}}).encode();self.send_response(200);self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
   def log_message(self,*args): pass
  server=rt.ThreadingHTTPServer(('127.0.0.1',0),MockModel);threading.Thread(target=server.serve_forever,daemon=True).start()
  os.environ['OLLAMA_URL']='http://127.0.0.1:'+str(server.server_address[1])
  try:
   result,mode=rt.ai_extract('Apareceu erro 500.',rt.DEFAULT_FIELDS)
   self.assertEqual(mode,'ollama');self.assertEqual(len(result),1);self.assertEqual(result[0]['fieldKey'],'error')
   report=rt.ai_report({'confirmedFacts':[{'field':'Erro','value':'Erro 500'}]})
   self.assertEqual(report['summary'],'Resumo de teste')
  finally:
   os.environ.pop('OLLAMA_URL',None);server.shutdown();server.server_close()
 def test_compiled_app_served(self):
  with urllib.request.urlopen(BASE+'/') as r:
   html=r.read().decode();self.assertIn('ResolveTech',html);self.assertIn("frame-ancestors 'none'",r.headers['Content-Security-Policy'])
  import re
  for asset in re.findall(r'(?:src|href)="([^" ]+)"',html):
   with urllib.request.urlopen(BASE+asset) as r:self.assertEqual(r.status,200)
if __name__=='__main__':
 try:
  result=unittest.main(exit=False).result
  if not result.wasSuccessful(): raise SystemExit(1)
 finally:SERVER.shutdown();SERVER.server_close();TMP.cleanup()
