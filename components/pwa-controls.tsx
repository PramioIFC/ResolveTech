'use client';
import React,{useEffect,useState} from 'react';
import {WifiOff,RefreshCw} from 'lucide-react';
import {toast} from 'sonner';

export default function PwaControls(){
 const [waiting,setWaiting]=useState<ServiceWorker|null>(null);
 const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine);
 useEffect(()=>{
  const net=()=>setOnline(navigator.onLine);
  window.addEventListener('online',net);window.addEventListener('offline',net);
  if('serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('/sw.js').then(reg=>{if(reg.waiting)setWaiting(reg.waiting);reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker)})});}).catch(()=>toast.error('Não foi possível preparar os recursos offline. A versão web continua disponível.'))}
  return()=>{window.removeEventListener('online',net);window.removeEventListener('offline',net)};
 },[]);
 return <>{!online&&<div className="network-banner" role="status"><WifiOff size={16}/>Sem conexão. A IA precisa de internet. Mensagens não serão enviadas automaticamente.</div>}{waiting&&<div className="update-banner"><span>Uma atualização do aplicativo está pronta.</span><button onClick={()=>{if(window.confirm('Atualizar agora? Envie ou copie mensagens ainda não enviadas antes de continuar.')){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});waiting.postMessage({type:'ACTIVATE_UPDATE'})}}}><RefreshCw size={15}/>Atualizar</button></div>}</>;
}
