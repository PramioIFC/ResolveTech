type ApiResult=Record<string,any>;
async function voiceApi(demandId:string,action:string,body?:Record<string,any>):Promise<ApiResult>{
 const response=await fetch(`/api/voice/${demandId}/${action}`,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível conectar a chamada.');return data;
}

export type VoiceSnapshot={state:'idle'|'joining'|'waiting'|'connected'|'error';muted:boolean;peerName?:string;error?:string;configured:boolean;incoming:boolean};
type Listener=(state:VoiceSnapshot)=>void;

export class VoiceCall {
 private pc?:RTCPeerConnection;private stream?:MediaStream;private remote=new MediaStream();private listeners=new Set<Listener>();private poll?:ReturnType<typeof setInterval>;private heartbeat?:ReturnType<typeof setInterval>;private pulled=new Set<string>();
 snapshot:VoiceSnapshot={state:'idle',muted:false,configured:true,incoming:false};
 constructor(readonly demandId:string){}
 subscribe(listener:Listener){this.listeners.add(listener);listener(this.snapshot);return()=>this.listeners.delete(listener)}
 private update(next:Partial<VoiceSnapshot>){this.snapshot={...this.snapshot,...next};this.listeners.forEach(x=>x(this.snapshot))}
 async check(){
  try{const status=await voiceApi(this.demandId,'status');this.update({configured:status.configured,incoming:this.snapshot.state==='idle'&&status.peers.length>0,peerName:status.peers[0]?.name});if(this.pc)await this.pull(status.peers)}catch{}
 }
 async join(audio:HTMLAudioElement){
  if(this.pc)return;this.update({state:'joining',error:undefined,incoming:false});
  try{
   this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   const {sessionId}=await voiceApi(this.demandId,'join',{});void sessionId;
   this.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],bundlePolicy:'max-bundle'});
   audio.srcObject=this.remote;audio.autoplay=true;
   this.pc.ontrack=e=>{this.remote.addTrack(e.track);audio.play().catch(()=>{});this.update({state:'connected'})};
   this.pc.onconnectionstatechange=()=>{if(this.pc?.connectionState==='failed')this.update({state:'error',error:'A conexão de áudio foi interrompida.'})};
   const track=this.stream.getAudioTracks()[0];const transceiver=this.pc.addTransceiver(track,{direction:'sendonly'});
   const offer=await this.pc.createOffer();await this.pc.setLocalDescription(offer);
   const pushed=await voiceApi(this.demandId,'publish',{sdp:offer.sdp,mid:transceiver.mid,trackName:track.id});
   await this.pc.setRemoteDescription(pushed.sessionDescription);
   this.update({state:'waiting'});await this.check();
   this.poll=setInterval(()=>this.check(),3000);this.heartbeat=setInterval(()=>voiceApi(this.demandId,'heartbeat',{}).catch(()=>{}),15000);
   this.enableMediaSession();
  }catch(e:any){await this.leave(false);this.update({state:'error',error:e?.message||'Não foi possível iniciar a ligação.'});throw e}
 }
 private async pull(peers:any[]){
  if(!this.pc)return;
  for(const peer of peers){
   if(this.pulled.has(peer.userId))continue;this.pulled.add(peer.userId);
   try{
    const result=await voiceApi(this.demandId,'pull',{peerUserId:peer.userId});
    if(result.requiresImmediateRenegotiation){await this.pc.setRemoteDescription(result.sessionDescription);const answer=await this.pc.createAnswer();await this.pc.setLocalDescription(answer);await voiceApi(this.demandId,'renegotiate',{sdp:answer.sdp})}
    this.update({peerName:peer.name});
   }catch{this.pulled.delete(peer.userId)}
  }
 }
 toggleMute(){const track=this.stream?.getAudioTracks()[0];if(!track)return;track.enabled=!track.enabled;this.update({muted:!track.enabled})}
 async leave(notify=true){
  if(this.poll)clearInterval(this.poll);if(this.heartbeat)clearInterval(this.heartbeat);this.poll=undefined;this.heartbeat=undefined;
  this.stream?.getTracks().forEach(t=>t.stop());this.remote.getTracks().forEach(t=>t.stop());this.pc?.close();this.pc=undefined;this.stream=undefined;this.remote=new MediaStream();this.pulled.clear();
  if(notify)await voiceApi(this.demandId,'leave',{}).catch(()=>{});this.update({state:'idle',muted:false,peerName:undefined,incoming:false,error:undefined});
 }
 private enableMediaSession(){if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:'Atendimento ResolveTech',artist:'Chamada de suporte'});navigator.mediaSession.setActionHandler('hangup',()=>{void this.leave()});navigator.mediaSession.setActionHandler('togglemicrophone',()=>this.toggleMute())}catch{}}
}
