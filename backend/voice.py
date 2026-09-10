"""Server-side signaling proxy for Cloudflare Realtime SFU audio calls."""
import json, os, re, time, urllib.error, urllib.request
from datetime import datetime, timezone

class VoiceError(Exception):
 def __init__(self,message,status=400): self.message=message; self.status=status

def now(): return datetime.now(timezone.utc).isoformat()
def configured(): return bool(os.environ.get('CLOUDFLARE_CALLS_APP_ID') and os.environ.get('CLOUDFLARE_CALLS_APP_SECRET'))

def _access(c,u,demand_id):
 d=c.execute('SELECT d.client_id,d.company_id,d.status,cv.phase FROM demands d LEFT JOIN conversations cv ON cv.demand_id=d.id WHERE d.id=?',(demand_id,)).fetchone()
 if not d: raise VoiceError('Demanda não encontrada.',404)
 allowed=d['client_id']==u['id'] if u['role']=='CLIENT' else u['role'] in ['SUPPORT','ADMIN'] and d['company_id']==u['company_id']
 if not allowed: raise VoiceError('Você não tem acesso a esta ligação.',403)
 if d['phase']!='SUPPORT' or d['status']=='CONCLUIDA': raise VoiceError('A ligação só fica disponível durante o atendimento com o suporte.',409)
 return d

def _error_detail(raw):
 try:
  payload=json.loads(raw.decode('utf-8','replace'))
  if isinstance(payload,dict):
   for key in ['errorDescription','message','error']:
    value=payload.get(key)
    if isinstance(value,str) and value:return value[:500]
   errors=payload.get('errors')
   if isinstance(errors,list) and errors and isinstance(errors[0],dict): return str(errors[0].get('message') or errors[0].get('code') or '')[:500]
 except Exception: pass
 return ''

def _cf(path,method='POST',body=None):
 app=os.environ.get('CLOUDFLARE_CALLS_APP_ID',''); secret=os.environ.get('CLOUDFLARE_CALLS_APP_SECRET','')
 if not app or not secret: raise VoiceError('A chamada de voz ainda não foi configurada no servidor.',503)
 data=None if body is None else json.dumps(body).encode()
 req=urllib.request.Request('https://rtc.live.cloudflare.com/v1/apps/'+app+path,data=data,method=method,headers={'Authorization':'Bearer '+secret,'Content-Type':'application/json','Accept':'application/json','User-Agent':'ResolveTech/1.0'})
 try:
  with urllib.request.urlopen(req,timeout=20) as res: result=json.loads(res.read())
 except urllib.error.HTTPError as e:
  detail=_error_detail(e.read())
  raise VoiceError(('Cloudflare '+str(e.code)+': '+detail) if detail else 'Cloudflare recusou a sinalização (HTTP '+str(e.code)+').',502)
 except Exception as e: raise VoiceError('Não foi possível conectar à infraestrutura de voz.',502) from e
 if result.get('errorCode'): raise VoiceError(result.get('errorDescription') or 'Falha na sinalização da chamada.',502)
 return result

def status(c,u,demand_id):
 _access(c,u,demand_id)
 cutoff=int(time.time())-45
 own=c.execute('SELECT active FROM voice_participants WHERE demand_id=? AND user_id=?',(demand_id,u['id'])).fetchone()
 peers=[{'userId':r['user_id'],'name':r['name'],'role':r['role'],'sessionId':r['session_id'],'trackName':r['track_name']} for r in c.execute('SELECT vp.*,us.name,us.role FROM voice_participants vp JOIN users us ON us.id=vp.user_id WHERE vp.demand_id=? AND vp.user_id<>? AND vp.active=1 AND vp.updated>? AND vp.track_name IS NOT NULL',(demand_id,u['id'],cutoff))]
 return {'configured':configured(),'active':bool(own and own['active']),'peers':peers}

def route(c,u,path,b):
 parts=path.strip('/').split('/')
 if len(parts)!=4 or parts[:2]!=['api','voice']: raise VoiceError('Rota de voz não encontrada.',404)
 demand_id,action=parts[2],parts[3]; _access(c,u,demand_id); stamp=int(time.time())
 if action=='join':
  session=_cf('/sessions/new'); sid=session.get('sessionId')
  if not sid: raise VoiceError('A Cloudflare não criou a sessão de voz.',502)
  c.execute('INSERT INTO voice_participants(demand_id,user_id,session_id,track_name,active,joined,updated) VALUES(?,?,?,?,1,?,?) ON CONFLICT(demand_id,user_id) DO UPDATE SET session_id=excluded.session_id,track_name=NULL,active=1,joined=excluded.joined,updated=excluded.updated',(demand_id,u['id'],sid,None,now(),stamp))
  return {'sessionId':sid}
 row=c.execute('SELECT * FROM voice_participants WHERE demand_id=? AND user_id=? AND active=1',(demand_id,u['id'])).fetchone()
 if not row: raise VoiceError('Entre na ligação antes de sinalizar.',409)
 sid=row['session_id']; c.execute('UPDATE voice_participants SET updated=? WHERE demand_id=? AND user_id=?',(stamp,demand_id,u['id']))
 if action=='publish':
  sdp=b.get('sdp'); mid=b.get('mid'); track=b.get('trackName')
  if not all(isinstance(x,str) and x for x in [sdp,mid,track]) or len(sdp)>200000 or not re.fullmatch(r'[\w.-]{1,180}',track): raise VoiceError('Oferta de áudio inválida.')
  result=_cf('/sessions/'+sid+'/tracks/new',body={'sessionDescription':{'sdp':sdp,'type':'offer'},'tracks':[{'location':'local','mid':mid,'trackName':track}]})
  c.execute('UPDATE voice_participants SET track_name=?,updated=? WHERE demand_id=? AND user_id=?',(track,stamp,demand_id,u['id']))
  return result
 if action=='pull':
  peer=c.execute('SELECT * FROM voice_participants WHERE demand_id=? AND user_id=? AND active=1 AND updated>?',(demand_id,b.get('peerUserId'),stamp-45)).fetchone()
  if not peer or not peer['track_name']: raise VoiceError('A outra pessoa ainda não está com o áudio disponível.',409)
  return _cf('/sessions/'+sid+'/tracks/new',body={'tracks':[{'location':'remote','trackName':peer['track_name'],'sessionId':peer['session_id']}]})
 if action=='renegotiate':
  sdp=b.get('sdp')
  if not isinstance(sdp,str) or not sdp or len(sdp)>200000: raise VoiceError('Resposta de áudio inválida.')
  return _cf('/sessions/'+sid+'/renegotiate',method='PUT',body={'sessionDescription':{'sdp':sdp,'type':'answer'}})
 if action=='heartbeat': return {'ok':True}
 if action=='leave':
  c.execute('UPDATE voice_participants SET active=0,updated=? WHERE demand_id=? AND user_id=?',(stamp,demand_id,u['id'])); return {'ok':True}
 raise VoiceError('Ação de voz não encontrada.',404)
