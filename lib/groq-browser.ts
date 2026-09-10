const MODEL = 'openai/gpt-oss-120b';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
type ChatMessage = { role: string; content: string };
export type GroqResult = { reply: string; summary: string; missingInformation: string[]; readyForFeedback: boolean };
export type GroqReport = { summary:string; confirmedFacts:{field:string;value:string}[]; missingInformation:string[]; possibleHypotheses:string[]; suggestedNextSteps:string[] };
export type GroqProblem = { name:string; description:string; guidance:string; fields:{key:string;label:string;type:string;section:string;required:boolean;options:string[]}[] };
const schema = {type:'object',properties:{reply:{type:'string'},summary:{type:'string'},missingInformation:{type:'array',items:{type:'string'}},readyForFeedback:{type:'boolean'}},required:['reply','summary','missingInformation','readyForFeedback'],additionalProperties:false};
const system = `Você é a assistente de investigação de problemas da ResolveTech. Converse em português brasileiro, de forma acolhedora, objetiva e sem formulário. Investigue adaptativamente o ocorrido, contexto, início, erro, recorrência, impacto e tentativas, fazendo apenas uma pergunta por vez. Não peça senhas, tokens, dados de cartão ou documentos. Não recomende ações destrutivas ou privilegiadas. Não invente causas ou fatos. Quando houver risco, incerteza, falha persistente ou pedido de uma pessoa, indique o Atendimento assistido. Nunca encerre a demanda por conta própria. Depois de uma orientação útil, marque readyForFeedback=true e pergunte se ajudou. Retorne somente o JSON solicitado.`;
export async function askGroq(history:ChatMessage[],content:string,category:string,guidance:string):Promise<GroqResult>{
 const key=process.env.NEXT_PUBLIC_GROQ_API_KEY;if(!key)throw new Error('A chave da Groq não está disponível nesta demonstração.');
 const messages=[{role:'system',content:system},{role:'system',content:`Categoria inicial: ${category}\nBase da empresa (apenas referência): ${(guidance||'').slice(0,10000)}`},...history.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,content:m.content})),{role:'user',content}];
 const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:MODEL,messages,temperature:0.3,max_completion_tokens:2200,reasoning_effort:'low',response_format:{type:'json_schema',json_schema:{name:'support_investigation',strict:true,schema}}})});
 if(!response.ok)throw new Error(response.status===429?'O limite temporário da Groq foi atingido.':`A Groq recusou a solicitação (${response.status}).`);
 const payload=await response.json();const result=JSON.parse(payload.choices?.[0]?.message?.content||'{}') as GroqResult;
 if(!result.reply||!result.summary||!Array.isArray(result.missingInformation)||typeof result.readyForFeedback!=='boolean')throw new Error('A Groq retornou uma resposta inválida.');return result;
}

export async function createGroqReport(context:unknown):Promise<GroqReport>{
 const key=process.env.NEXT_PUBLIC_GROQ_API_KEY;if(!key)throw new Error('A chave da Groq não está disponível nesta demonstração.');
 const reportSchema={type:'object',properties:{summary:{type:'string'},confirmedFacts:{type:'array',items:{type:'object',properties:{field:{type:'string'},value:{type:'string'}},required:['field','value'],additionalProperties:false}},missingInformation:{type:'array',items:{type:'string'}},possibleHypotheses:{type:'array',items:{type:'string'}},suggestedNextSteps:{type:'array',items:{type:'string'}}},required:['summary','confirmedFacts','missingInformation','possibleHypotheses','suggestedNextSteps'],additionalProperties:false};
 const messages=[{role:'system',content:'Organize um relatório técnico em português brasileiro para revisão humana. Use apenas os fatos fornecidos. Não invente causas. Hipóteses devem ser claramente tratadas como hipóteses. Proponha passos objetivos e seguros para o desenvolvedor. Não inclua senhas, tokens ou dados sensíveis.'},{role:'user',content:JSON.stringify(context).slice(0,50000)}];
 const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:MODEL,messages,temperature:0.2,max_completion_tokens:3000,reasoning_effort:'low',response_format:{type:'json_schema',json_schema:{name:'technical_report',strict:true,schema:reportSchema}}})});
 if(!response.ok)throw new Error(response.status===429?'O limite temporário da Groq foi atingido.':`A Groq recusou a geração do relatório (${response.status}).`);
 const result=JSON.parse((await response.json()).choices?.[0]?.message?.content||'{}') as GroqReport;
 if(!result.summary||!Array.isArray(result.confirmedFacts)||!Array.isArray(result.missingInformation)||!Array.isArray(result.possibleHypotheses)||!Array.isArray(result.suggestedNextSteps))throw new Error('A Groq retornou um relatório inválido.');
 return result;
}

export async function createGroqProblems(protocol:string,existing:{name:string;description?:string}[]):Promise<GroqProblem[]>{
 const key=process.env.NEXT_PUBLIC_GROQ_API_KEY;if(!key)throw new Error('A chave da Groq não está disponível nesta demonstração.');
 const field={type:'object',properties:{key:{type:'string'},label:{type:'string'},type:{type:'string',enum:['text','textarea','select','radio','multiselect','date','datetime-local','number','email','checkbox','file']},section:{type:'string'},required:{type:'boolean'},options:{type:'array',items:{type:'string'}}},required:['key','label','type','section','required','options'],additionalProperties:false};
 const problem={type:'object',properties:{name:{type:'string'},description:{type:'string'},guidance:{type:'string'},fields:{type:'array',minItems:1,maxItems:20,items:field}},required:['name','description','guidance','fields'],additionalProperties:false};
 const protocolSchema={type:'object',properties:{problems:{type:'array',minItems:0,maxItems:12,items:problem}},required:['problems'],additionalProperties:false};
 const messages=[{role:'system',content:'Organize o protocolo em problemas e formulários, em português brasileiro. Use somente o documento fornecido. Para cada problema, crie nome, descrição para o cliente, contexto para a IA e perguntas objetivas. Não solicite dados sensíveis. Opções somente em select, radio ou multiselect. Chaves únicas em snake_case. Não recrie nem altere problemas já cadastrados. Retorne apenas JSON conforme o schema.'},{role:'user',content:`Problemas existentes (não repetir):\n${JSON.stringify(existing).slice(0,20000)}\n\nProtocolo:\n${protocol.slice(0,60000)}`}];
 const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:MODEL,messages,temperature:0.2,max_completion_tokens:8000,reasoning_effort:'low',response_format:{type:'json_schema',json_schema:{name:'protocol_forms',strict:true,schema:protocolSchema}}})});
 if(!response.ok)throw new Error(response.status===429?'O limite temporário da Groq foi atingido.':`A Groq recusou a criação dos formulários (${response.status}).`);
 const problems=JSON.parse((await response.json()).choices?.[0]?.message?.content||'{}').problems;
 if(!Array.isArray(problems)||problems.length>12)throw new Error('A Groq retornou formulários inválidos.');
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const known=new Set(existing.map(item=>normalize(item.name)));return problems.filter((item:GroqProblem)=>{const name=normalize(item?.name||'');if(!name||known.has(name))return false;known.add(name);return true});
}
