"""Interactive local setup. Never prints the Groq secret."""
from pathlib import Path
from getpass import getpass
import re
root=Path(__file__).resolve().parent.parent
path=root/'.env'
values={}
if path.exists():
 for line in path.read_text(encoding='utf-8').splitlines():
  if line.strip() and not line.lstrip().startswith('#') and '=' in line:
   key,value=line.split('=',1);values[key.strip()]=value.strip()
print('Configuração da ResolveTech PWA. Enter mantém a configuração atual.')
print('Crie sua chave em https://console.groq.com/keys')
key=getpass('GROQ_API_KEY (entrada oculta): ').strip()
if key:
 if not re.fullmatch(r'[A-Za-z0-9_-]{20,200}',key):raise SystemExit('Formato de chave inválido; nenhuma alteração foi salva.')
 values['GROQ_API_KEY']=key
values.setdefault('HOST','127.0.0.1');values.setdefault('PORT','8000')
path.write_text('# Configuração local. Não compartilhe este arquivo.\n'+'\n'.join(k+'='+v for k,v in values.items())+'\n',encoding='utf-8')
try:path.chmod(0o600)
except OSError:pass
print('Configuração salva. Reinicie a ResolveTech para aplicar.')
