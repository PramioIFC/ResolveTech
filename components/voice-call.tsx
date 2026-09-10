'use client';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Mic,MicOff,Phone,PhoneCall,PhoneOff} from 'lucide-react';
import {toast} from 'sonner';
import {VoiceCall,VoiceSnapshot} from '@/lib/cloudflare-voice';

export default function VoiceCallPanel({demandId,compact=false,onBeforeJoin}: {demandId:string;compact?:boolean;onBeforeJoin?:()=>Promise<void>}){
 const call=useMemo(()=>new VoiceCall(demandId),[demandId]);const [state,setState]=useState<VoiceSnapshot>(call.snapshot);const audio=useRef<HTMLAudioElement>(null);
 useEffect(()=>{const unsub=call.subscribe(setState);void call.check();const poll=setInterval(()=>{if(call.snapshot.state==='idle')void call.check()},3000);return()=>{unsub();clearInterval(poll);void call.leave()}},[call]);
 async function join(){try{await onBeforeJoin?.();if(audio.current)await call.join(audio.current)}catch(e:any){toast.error(e.message)}}
 const active=['joining','waiting','connected'].includes(state.state);
 return <div className={'voice-call '+(compact?'compact ':'')+(state.incoming?'incoming':'')}>
  <audio ref={audio} playsInline/>
  {!active?<button className="btn voice-start" onClick={join} disabled={!state.configured||state.state==='joining'}><PhoneCall size={18}/>{state.incoming?`Atender ${state.peerName||'chamada'}`:'Por ligação'}</button>:<><div className="voice-status"><span className="voice-pulse"/><div><b>{state.state==='connected'?'Ligação em andamento':'Aguardando a outra pessoa'}</b><small>{state.peerName||'Áudio protegido pelo WebRTC'}</small></div></div><button className="voice-control" onClick={()=>call.toggleMute()} title={state.muted?'Ativar microfone':'Silenciar'}>{state.muted?<MicOff/>:<Mic/>}</button><button className="voice-control hangup" onClick={()=>void call.leave()} title="Encerrar ligação"><PhoneOff/></button></>}
  {!state.configured&&<small className="voice-warning">Configure a Cloudflare Realtime no servidor.</small>}{state.error&&<small className="voice-warning">{state.error}</small>}
 </div>
}
