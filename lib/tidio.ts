// Tidio is loaded only after the client explicitly opens assisted support.
// Groq investigation is server-side; messageFromOperator is intentionally not used.
type TidioAPI={on:(event:string,fn:(data?:any)=>void)=>void;open:()=>void;hide:()=>void;show:()=>void;resetVisitor:()=>void;messageFromVisitor:(message:string)=>void;getStatus:()=>string|null};
declare global {interface Window {tidioChatApi?:TidioAPI;} interface Document {tidioIdentify?:{distinct_id:string;name?:string;email?:string};tidioChatLang?:string;}}
let loading:Promise<TidioAPI>|null=null;let currentKey='';let currentIdentity='';
export function resetTidio(){
 delete document.tidioIdentify;
 if(window.tidioChatApi){window.tidioChatApi.hide();window.tidioChatApi.resetVisitor();}
 currentIdentity='';loading=null;
}
export async function openTidio(key:string,user:{id:string;name:string;email:string},companyId:string,context?:string){
 if(!/^[a-zA-Z0-9]{32}$/.test(key))throw new Error('O Tidio ainda não foi configurado para esta empresa. Sua solicitação já está na fila interna do suporte.');
 if(currentKey&&currentKey!==key)throw new Error('Para abrir o Tidio de outra empresa, recarregue a página primeiro. Seu atendimento interno foi preservado.');
 const identity=companyId+':'+user.id;
 const identify={distinct_id:identity,name:user.name,email:user.email};
 const changed=currentIdentity!==identity;
 document.tidioIdentify=identify;document.tidioChatLang='pt';
 if(changed&&window.tidioChatApi){window.tidioChatApi.hide();window.tidioChatApi.resetVisitor();loading=null;}
 currentIdentity=identity;currentKey=key;
 if(!loading){loading=new Promise<TidioAPI>((resolve,reject)=>{
  let finished=false;
  const timeout=window.setTimeout(()=>finish(new Error('O Tidio não carregou. Verifique a conexão ou o bloqueador de conteúdo. O atendimento interno continua disponível.')),18000);
  function finish(error?:Error){if(finished)return;finished=true;clearTimeout(timeout);document.removeEventListener('tidioChat-ready',ready);if(error){loading=null;reject(error);}else if(window.tidioChatApi)resolve(window.tidioChatApi);}
  function ready(){finish();}
  if(window.tidioChatApi){window.tidioChatApi.on('ready',ready);if(window.tidioChatApi.getStatus()!==null)ready();}
  else document.addEventListener('tidioChat-ready',ready,{once:true});
  if(!document.getElementById('resolvetech-tidio')){const script=document.createElement('script');script.id='resolvetech-tidio';script.src='https://code.tidio.co/'+key+'.js';script.async=true;script.onerror=()=>{script.remove();currentKey='';finish(new Error('Falha ao carregar o Tidio. Use o chat interno abaixo ou tente novamente.'));};document.body.appendChild(script);}
 });}
 const api=await loading;
 if(currentIdentity!==identity||document.tidioIdentify?.distinct_id!==identity)throw new Error('A sessão mudou. Abra o atendimento novamente na conta atual.');
 api.show();api.open();
 if(context)api.messageFromVisitor(context);
 return api.getStatus();
}
