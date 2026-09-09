import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.local.config.ts'],{stdio:'inherit'});
if(r.status!==0)process.exit(r.status||1);
await import('./build-pwa.mjs');
