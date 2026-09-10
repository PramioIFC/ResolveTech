'use client';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Mic,MicOff,PhoneCall,PhoneOff} from 'lucide-react';
import {toast} from 'sonner';
import {VoiceCall,VoiceSnapshot} from '@/lib/cloudflare-voice';

export default function VoiceCallPanel({demandId,compact=false,onBeforeJoin,onActivityChange}: {demandId:string;compact?:boolean;onBeforeJoin?:()=>Promise<void>;onActivityChange?:(active:boolean)=>void}){
 const call=useMemo(()=>new VoiceCall(demandId),[demandId]);const [state,setState]=useState<VoiceSnapshot>(call.snapshot);const audio=useRef<HTMLAudioElement>(null);
 useEffect(()=>{const unsub=call.subscribe(setState);void call.check();const poll=setInterval(()=>{if(call.snapshot.state==='idle')void call.check()},3000);return()=>{unsub();clearInterval(poll);void call.leave()}},[call]);
 useEffect(()=>{
  if(!state.incoming&&state.state!=='waiting')return;
  let context:AudioContext|undefined;
  const ring=()=>{try{context??=new AudioContext();if(context.state==='suspended')void context.resume();const start=context.currentTime;const notes=state.incoming?[880,660]:[440];notes.forEach((frequency,index)=>{const oscillator=context!.createOscillator(),gain=context!.createGain(),at=start+index*.18;oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0.0001,at);gain.gain.exponentialRampToValueAtTime(state.incoming ? .12 : .045,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+.15);oscillator.connect(gain).connect(context!.destination);oscillator.start(at);oscillator.stop(at+.17)});}catch{}};
  ring();const timer=setInterval(ring,state.incoming?1800:2800);
  return()=>{clearInterval(timer);if(context)void context.close()};
 },[state.incoming,state.state]);
 async function join(){try{await onBeforeJoin?.();if(audio.current)await call.join(audio.current)}catch(e:any){toast.error(e.message)}}
 const active=['joining','waiting','connected'].includes(state.state);
 useEffect(()=>onActivityChange?.(active||state.incoming),[active,state.incoming,onActivityChange]);
 return <div className={'voice-call '+(compact?'compact ':'')+(state.incoming?'incoming':'')}>
  <audio ref={audio} playsInline/>
  {!active?<button className="btn voice-start" onClick={join} disabled={!state.configured||state.state==='joining'}><PhoneCall size={18}/>{state.incoming?`Atender ${state.peerName||'chamada'}`:'Por ligação'}</button>:<><div className="voice-status"><span className="voice-pulse"/><div><b>{state.state==='connected'?'Ligação em andamento':'Aguardando a outra pessoa'}</b><small>{state.peerName||'Áudio protegido pelo WebRTC'}</small></div></div><button className="voice-control" onClick={()=>call.toggleMute()} title={state.muted?'Ativar microfone':'Silenciar'}>{state.muted?<MicOff/>:<Mic/>}</button><button className="voice-control hangup" onClick={()=>void call.leave()} title="Encerrar ligação"><PhoneOff/></button></>}
  {!state.configured&&<small className="voice-warning">Configure a Cloudflare Realtime no servidor.</small>}{state.error&&<small className="voice-warning">{state.error}</small>}
 </div>
}
