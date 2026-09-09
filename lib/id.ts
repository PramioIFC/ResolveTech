export function newId(){
 if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
 if(typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function')return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 return Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
}
