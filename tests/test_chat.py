"""PWA migration + investigative chat + Groq contract. Uses controlled external responses."""
import json,os,threading,unittest,io,urllib.error
from unittest.mock import patch
import test_workflow as base
rt=base.rt
class ChatTests(unittest.TestCase):
 def setUp(self):
  base.SERVER.attempts={};self.client=base.Client();self.client.login('client');self.support=base.Client();self.support.login('support');self.dev=base.Client();self.dev.login('developer')
 def create(self,issue=None):return self.client.request('chat/start',{'companyId':'company-demo','issueId':issue})
 def output(self,**kwargs):return dict(reply='Qual mensagem aparece ao gerar o relatório?',summary='Cliente relata problema ao gerar relatório.',missingInformation=['Mensagem de erro'],readyForFeedback=False,**kwargs)
 def test_unknown_and_immediate_handoff_without_ai_key(self):
  d=self.create();self.assertEqual(d['chat']['category'],'Não sei qual é o problema');self.assertEqual(d['status'],'EM_INVESTIGACAO');self.assertNotIn('guidance',d['chat'])
  self.dev.request('demands/'+d['id'],status=403)
  with patch.dict(os.environ,{'GROQ_API_KEY':''}):self.client.request('chat/'+d['id']+'/message',{'content':'Erro','messageId':rt.uid(),'consent':True},503)
  d=self.client.request('chat/'+d['id']+'/handoff',{});self.assertEqual(d['chat']['phase'],'SUPPORT');self.assertEqual(d['status'],'AGUARDANDO_ATENDIMENTO')
  count=len(d['chat']['messages']);d=self.client.request('chat/'+d['id']+'/handoff',{});self.assertEqual(len(d['chat']['messages']),count)
  mid=rt.uid();d=self.client.request('chat/'+d['id']+'/reply',{'messageId':mid,'content':'Preciso de ajuda com o login.'});d=self.support.request('chat/'+d['id']+'/reply',{'messageId':rt.uid(),'content':'Olá, vamos verificar isso juntos.'});self.assertEqual(d['chat']['messages'][-1]['role'],'support')
  d=self.support.request('demands/'+d['id']+'/start',{'revision':d['revision']})
  d=self.support.request('demands/'+d['id']+'/report',{'revision':d['revision']});self.assertTrue(d['report']['confirmedFacts'])
  d=self.support.request('demands/'+d['id']+'/review',{'revision':d['revision'],'summary':'Falha de login relatada pelo cliente.','priority':'MEDIUM','nextSteps':['Verificar o ambiente.']})
  d=self.support.request('demands/'+d['id']+'/send',{'revision':d['revision']});d=self.dev.request('demands/'+d['id']+'/claim',{'revision':d['revision']});d=self.dev.request('demands/'+d['id']+'/status',{'revision':d['revision'],'status':'CONCLUIDA'});self.assertEqual(d['chat']['phase'],'RESOLVED')
 def test_investigate_retry_idempotency_satisfaction(self):
  d=self.create('issue-0');id=d['id'];mid=rt.uid();body={'content':'O relatório falhou.','messageId':mid,'consent':True}
  with patch.dict(os.environ,{'GROQ_API_KEY':'test-only'}),patch.object(rt.chat,'groq',return_value=self.output()) as ai:
   self.client.request('chat/'+id+'/message',{**body,'consent':False},400)
   d=self.client.request('chat/'+id+'/message',body);self.assertEqual(ai.call_count,1)
   repeat=self.client.request('chat/'+id+'/message',body);self.assertEqual(ai.call_count,1);self.assertEqual(len(repeat['chat']['messages']),len(d['chat']['messages']))
   d=self.client.request('chat/'+id+'/feedback',{'satisfied':True});self.assertEqual(d['status'],'CONCLUIDA');self.assertEqual(d['chat']['satisfaction'],1)
   self.client.request('chat/'+id+'/message',{**body,'messageId':rt.uid()},409)
 def test_failed_generation_preserves_message_and_retries(self):
  d=self.create();id=d['id'];mid=rt.uid();body={'content':'Não consigo entrar.','messageId':mid,'consent':True}
  with patch.dict(os.environ,{'GROQ_API_KEY':'test-only'}):
   with patch.object(rt.chat,'groq',side_effect=rt.chat.ChatError('Indisponível',502)):self.client.request('chat/'+id+'/message',body,502)
   current=self.client.request('demands/'+id);self.assertEqual(len([m for m in current['chat']['messages'] if m['role']=='user']),1);self.assertIsNone(current['chat']['pending_id'])
   self.client.request('chat/'+id+'/message',{**body,'messageId':rt.uid()},409)
   with patch.object(rt.chat,'groq',return_value=self.output()):d=self.client.request('chat/'+id+'/message',body)
   self.assertEqual(len([m for m in d['chat']['messages'] if m['role']=='user']),1)
 def test_handoff_while_ai_waits(self):
  d=self.create();id=d['id'];started=threading.Event();release=threading.Event();errors=[]
  def ai(*args):started.set();release.wait(5);return self.output()
  def send():
   try:self.client.request('chat/'+id+'/message',{'content':'Erro no app.','messageId':rt.uid(),'consent':True})
   except BaseException as e:errors.append(e)
  with patch.dict(os.environ,{'GROQ_API_KEY':'test-only'}),patch.object(rt.chat,'groq',side_effect=ai):
   worker=threading.Thread(target=send);worker.start();self.assertTrue(started.wait(2))
   d=self.client.request('chat/'+id+'/handoff',{});release.set();worker.join(4)
   self.assertFalse(errors);d=self.client.request('demands/'+id);self.assertEqual(d['chat']['phase'],'SUPPORT');self.assertFalse(any(m['source'].startswith('groq:') for m in d['chat']['messages']))
 def test_groq_api_contract_and_bad_schema(self):
  class Response(io.BytesIO):
   def __enter__(self):return self
   def __exit__(self,*a):self.close()
  def result(value):return Response(json.dumps({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]}).encode())
  with patch.dict(os.environ,{'GROQ_API_KEY':'test-secret'}),patch.object(rt.chat.urllib.request,'urlopen',return_value=result(self.output())) as request:
   actual=rt.chat.groq([{'role':'user','content':'Erro'}],'Não sei','Contexto do produto')
   sent=request.call_args.args[0];payload=json.loads(sent.data);self.assertEqual(payload['model'],'openai/gpt-oss-120b');self.assertTrue(payload['response_format']['json_schema']['strict']);self.assertEqual(sent.full_url,'https://api.groq.com/openai/v1/chat/completions');self.assertEqual(actual['reply'],self.output()['reply'])
  with patch.dict(os.environ,{'GROQ_API_KEY':'test-secret'}),patch.object(rt.chat.urllib.request,'urlopen',return_value=result({'reply':'bad'})):
   with self.assertRaises(rt.chat.ChatError):rt.chat.groq([],'x','')
 def test_migration_reentrant_and_tenant_isolation(self):
  d=self.create();rt.initialize();rt.initialize();self.assertEqual(self.client.request('demands/'+d['id'])['chat']['category'],d['chat']['category'])
  other=base.Client();other.request('register',{'name':'Outro','email':rt.uid()+'@example.test','password':'Teste@2026'})
  other.request('chat/'+d['id']+'/handoff',{},403)
  self.support.request('chat/'+d['id']+'/feedback',{'satisfied':True},403)
  admin=base.Client();admin.login('admin');admin.request('knowledge',{'issueId':'issue-0','name':'Erro no sistema','description':'Ajuda','guidance':'Contexto interno de teste'})
  new=self.create('issue-0');self.assertNotIn('guidance',new['chat'])
  self.assertEqual(self.support.request('demands/'+new['id'])['chat']['guidance'],'Contexto interno de teste')
 def test_pwa_and_public_config(self):
  import urllib.request
  with urllib.request.urlopen(base.BASE+'/manifest.webmanifest') as r:
   self.assertEqual(r.headers['Content-Type'],'application/manifest+json');manifest=json.load(r);self.assertEqual(manifest['display'],'standalone');self.assertEqual(len(manifest['icons']),3)
  with urllib.request.urlopen(base.BASE+'/sw.js') as r:
   self.assertEqual(r.headers['Service-Worker-Allowed'],'/');self.assertEqual(r.headers['Cache-Control'],'no-cache');sw=r.read().decode();self.assertIn("url.pathname.startsWith('/api/')",sw);self.assertNotIn('GROQ_API_KEY',sw)
  with patch.dict(os.environ,{'GROQ_API_KEY':'DO-NOT-EXPOSE'}):
   result=self.client.request('me');self.assertNotIn('DO-NOT-EXPOSE',json.dumps(result));self.assertTrue(result['integrations']['groqConfigured'])
if __name__=='__main__':
 try:
  result=unittest.main(exit=False).result
  if not result.wasSuccessful():raise SystemExit(1)
 finally:base.SERVER.shutdown();base.SERVER.server_close();base.TMP.cleanup()
