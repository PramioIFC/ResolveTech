import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig(({mode})=>{const env=loadEnv(mode,'.','');return {plugins:[react()],define:{'process.env.NEXT_PUBLIC_GROQ_API_KEY':JSON.stringify(env.GROQ_API_KEY||'')},resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},build:{outDir:'dist-local',emptyOutDir:true}}});
