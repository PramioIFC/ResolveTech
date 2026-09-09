> Documento histórico da versão 0.1. Para executar a versão atual, leia README.md.

# ResolveTech — MVP local

Aplicação funcional para o hackathon do IFC Concórdia. Interface baseada nos oito wireframes fornecidos: tons roxos, navegação lateral, formulários, atendimento guiado e gestão de demandas.

## Abrir no Windows

1. Extraia **todo** o ZIP em uma pasta.
2. Tenha **Python 3.11 ou superior** instalado. Na instalação do Python, marque “Add python.exe to PATH”.
3. Dê dois cliques em **INICIAR-WINDOWS.bat**.
4. Acesse **http://localhost:8000**. O navegador deve abrir automaticamente.
5. Mantenha a janela do terminal aberta. Para encerrar, pressione `Ctrl+C`.

A interface já está compilada: **não precisa instalar Node, PostgreSQL, Redis ou dependências Python para experimentar**. Os dados são persistidos em `data/resolvetech.sqlite3`; anexos ficam em `data/uploads`. Reiniciar o programa preserva os registros.

Alternativa pelo terminal, dentro da pasta extraída:

```bash
python backend/server.py --open
```

macOS/Linux:

```bash
sh iniciar.sh
```

Se a porta 8000 estiver ocupada, copie `.env.example` para `.env`, altere `PORT=8001` e reinicie. Acesse a porta escolhida.

## Contas prontas

A senha de todas as contas de exemplo é **Demo@2026**. Os botões da tela inicial preenchem as credenciais; clique em Entrar.

| Perfil | E-mail |
|---|---|
| Cliente | client@resolvetech.local |
| Suporte | support@resolvetech.local |
| Desenvolvedor | developer@resolvetech.local |
| Administrador | admin@resolvetech.local |

A empresa fictícia Nexo Sistemas e uma demanda aguardando atendimento são criadas **somente na primeira inicialização**. Uma conta nova pode ser criada como cliente ou administrador de uma nova empresa. O administrador cadastra integrantes com função e senha inicial; não são enviados convites por e-mail.

## Roteiro da demonstração (8–12 minutos)

1. **Administrador:** entre, abra Formulários e escolha Erro no sistema. Altere uma pergunta ou adicione outra seção e publique. Em Equipe, cadastre suporte ou desenvolvedor se desejar. Minha empresa permite editar os dados públicos.
2. **Cliente:** saia e entre com o perfil Cliente. Vá a Empresas → Nexo Sistemas → Erro no sistema → Abrir formulário. A demanda nasce como rascunho com ID próprio. Preencha parte das respostas, anexe um TXT ou uma imagem e clique em Solicitar atendimento. Alternativamente, preencha tudo e Enviar formulário para seguir à triagem.
3. **Suporte:** entre, abra a mesma demanda e clique em Iniciar atendimento. Use a aba Atendimento guiado. Preencha as respostas durante a conversa. Registre consentimento antes de usar transcrição.
4. Cole a transcrição abaixo e clique em Salvar transcrição, depois Extrair sugestões. Confirme as sugestões uma a uma; elas só entram no banco após Salvar respostas e contexto. Informações já preenchidas exigem confirmação explícita para substituir.
5. Complete as perguntas faltantes e registre Observações do suporte. Salve e clique em Gerar relatório para revisão.
6. Vá à aba Relatório técnico. Revise resumo, próximos passos e prioridade. Clique em Confirmar revisão humana, depois Enviar ao desenvolvimento.
7. **Desenvolvedor:** entre, abra a demanda, leia relatório, formulário, anexos e histórico. Clique em Assumir demanda. Alterne Em espera / Em andamento / Concluída. Adicione uma atualização na aba Histórico e conversa.
8. **Cliente:** abra Minhas demandas e veja a conclusão e a conversa. Transcrição, observações internas e relatório técnico não são expostos ao cliente.

Para apresentar simultaneamente os perfis, utilize navegadores diferentes ou perfis do navegador separados. Abas na mesma sessão compartilham o login. Use Atualizar para consultar alterações feitas por outro usuário. Não há atualização por WebSocket neste MVP.

### Transcrição de exemplo para o modo offline

```text
O que aconteceu: Ao gerar o relatório financeiro apareceu erro 500.
Quando começou: Hoje de manhã.
Qual sistema ou módulo: Financeiro.
Qual mensagem de erro apareceu: Erro 500.
O que já foi tentado: Sair e entrar novamente, sem resolver.
Qual o impacto na operação: Não conseguimos fechar os relatórios do dia.
```

O extrator local reconhece linhas no formato `Pergunta sem interrogação: resposta` ou `identificador_do_campo: resposta`. Também reconhece alguns padrões de fala, como “erro 500”, “hoje de manhã”, “módulo financeiro” e “já tentei...”. Ele **não é um modelo de IA** e não compreende qualquer conversa livre. Sugestões trazem o trecho original para conferência. O relatório offline organiza as respostas confirmadas sem inventar causas.

## IA real opcional, local e sem chave paga

O backend integra o endpoint `/api/chat` do **Ollama** para extrair sugestões e gerar resumo/próximos passos. As respostas confirmadas permanecem a fonte de verdade; o modelo não as altera. A saída estruturada é validada, e sugestões sem trecho literal de evidência são descartadas.

1. Instale e execute Ollama no computador.
2. Baixe um modelo: `ollama pull qwen2.5:3b`.
3. Copie `.env.example` para `.env` e habilite:

```dotenv
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
```

4. Reinicie a ResolveTech. O painel de atendimento indicará “IA local via Ollama”. O primeiro uso pode demorar conforme o computador.

A integração HTTP e a validação possuem teste com resposta controlada. **Não foi executado um modelo Ollama real no ambiente de entrega.** A instalação/download do modelo exige internet e recursos locais. Sem configuração, todos os fluxos usam o modo offline explícito. Falhas do modelo mostram erro; não são apresentadas como resultado de IA.

### Voz

O botão de microfone usa o reconhecimento de fala oferecido pelo navegador (`pt-BR`). Ele depende de suporte/permissão e pode usar o serviço online do navegador. O texto pode ser digitado ou colado quando indisponível. **Não há telefonia, gravação de áudio, transcrição de chamada remota ou serviço Whisper integrado.** O consentimento é obrigatório no servidor para salvar a transcrição. O banco guarda o texto, não o áudio.

## O que funciona

- Login real com sessão HttpOnly/SameSite, logout e cadastro de cliente/empresa.
- Perfis Cliente, Administrador, Suporte e Desenvolvedor com autorização no servidor.
- Cadastro e edição da empresa, integrantes e tipos de problema.
- Construtor de formulários: seções por nome, reordenação de perguntas, campos obrigatórios, texto, texto longo, opções, múltipla escolha, datas, número, e-mail, sim/não e arquivo. A escolha única é apresentada como lista.
- Publicação versionada: versões antigas são imutáveis e preservadas por demanda. O construtor publica diretamente; não há autosave ou rascunho persistente do próprio construtor.
- Rascunho da demanda, envio direto ou solicitação de atendimento guiado.
- Extração local ou Ollama, sugestões com evidência e confirmação humana.
- Notas do suporte separadas, relatório estruturado, revisão e envio obrigatório antes de aparecer ao dev.
- Responsável, prioridade, status, comentários compartilhados e histórico.
- Upload e download privados, limites por arquivo e por demanda, checagem de extensão/assinatura básica.
- Persistência SQLite e controle de revisão para evitar gravação sobre mudanças concorrentes.

## Arquitetura escolhida

**React + TypeScript + Tailwind + componentes Radix/Shadcn** no frontend; **Python com biblioteca padrão + SQLite** no backend. É um monólito local com API HTTP. A escolha simplifica a instalação para o hackathon, reduz falhas de infraestrutura e permite entregar a interface já compilada.

A stack inicialmente cogitada (Next/Nest/Prisma/PostgreSQL/Redis/MinIO) não é necessária para demonstrar o fluxo local. Filas, Redis, WebSocket, telefonia e implantação em produção ficaram fora deste recorte. O backend usa consultas parametrizadas e tabelas relacionais; campos dinâmicos, respostas e relatórios usam JSON armazenado como texto. A pasta também preserva o scaffold de frontend usado na construção; **o comando operacional deste MVP é `python backend/server.py`, e o build é `npm run build:local`**. O build padrão do scaffold não inclui o backend Python e não deve ser usado como entrega de produção.

```text
app/page.tsx                Interface React e fluxos por perfil
app/globals.css             Identidade visual e responsividade
components/ui/              Componentes acessíveis de interface
backend/server.py           API, sessão, regras, uploads, extração e relatório
backend/schema.sql          Esquema SQLite
local-main.tsx              Entrada do frontend local
vite.local.config.ts        Build local da interface
dist-local/                 Interface compilada e pronta para uso
tests/test_workflow.py       Testes de integração e validação
INICIAR-WINDOWS.bat          Inicialização no Windows
iniciar.sh                  Inicialização em macOS/Linux
data/                       Criada automaticamente; banco e anexos
```

## Endpoints

| Método | Caminho | Finalidade |
|---|---|---|
| GET | /api/me | Sessão e modo de extração |
| POST | /api/login, /api/register, /api/logout | Autenticação |
| GET | /api/state | Empresas, formulários, demandas e equipe autorizada |
| POST | /api/company, /api/members, /api/forms | Administração |
| POST | /api/demands | Criar demanda com formId |
| GET | /api/demands/:id | Detalhes autorizados |
| POST | /api/demands/:id/save | Respostas, notas, transcrição, submit ou guided |
| POST | /api/demands/:id/start | Iniciar atendimento |
| POST | /api/demands/:id/extract | Gerar sugestões sem confirmar |
| POST | /api/demands/:id/report | Gerar relatório |
| POST | /api/demands/:id/review | Confirmar revisão e prioridade |
| POST | /api/demands/:id/send | Enviar ao dev |
| POST | /api/demands/:id/claim | Assumir demanda |
| POST | /api/demands/:id/status | Alterar status |
| POST | /api/demands/:id/comment | Adicionar comentário |
| POST | /api/demands/:id/upload | Upload em base64 |
| GET | /api/files/:id | Download com autorização |

Mutações do contexto exigem `revision` igual à revisão atual. Em conflito, o backend devolve 409 e a interface mantém o que foi digitado; copie as mudanças importantes e reabra a demanda para carregar a versão atual. Os anexos e comentários são aditivos. As operações de gravação de demanda usam transação com bloqueio de escrita, evitando dois responsáveis assumirem simultaneamente.

## Desenvolvimento e testes

Para editar e recompilar o frontend, instale Node **22.13+** (recomendado Node 24) e execute:

```bash
npm ci
npm run build:local
python backend/server.py
```

O build atual usa Vite 8; prefira Node 22.13+ ou 24. Não é necessário rodar Node ao apenas apresentar o pacote compilado.

Teste isolado, sem alterar seu banco de demonstração:

```bash
python tests/test_workflow.py
```

Os testes cobrem autenticação, fluxo cliente → suporte → dev → cliente, revisão obrigatória, bloqueio de perfis e empresas, anexos, versionamento do formulário, conflito de revisão, responsável e persistência em SQLite. A interface foi compilada e verificada por TypeScript; não foi realizada inspeção visual automatizada nem teste do microfone em navegador nesta entrega.

## Docker opcional

Com Docker instalado:

```bash
docker compose up --build
```

Acesse http://localhost:8000. O volume `resolvetech-data` preserva banco e arquivos. O Dockerfile usa o frontend já compilado; recompile antes se alterar React/CSS. A receita foi fornecida, mas não executada neste ambiente. O Ollama opcional não está incluído no Compose.

## Dados, privacidade e limites do MVP

Senhas usam scrypt com salt aleatório. Sessões duram 12 horas e ficam em cookie HttpOnly/SameSite=Strict; o cookie não usa Secure porque o servidor padrão é HTTP em localhost. As consultas são parametrizadas, as empresas têm isolamento de acesso e existe limitação básica de tentativas de login. Os uploads são baixados como anexo, sem executar conteúdo, e não possuem antivírus. Auditoria é funcional, mas não é um log inviolável.

O servidor é voltado à demonstração local e escuta apenas 127.0.0.1. Não exponha este servidor diretamente à internet; produção exige servidor apropriado/TLS, recuperação de senha, revisão de segurança, backups, limites globais de armazenamento, política de retenção e gestão de consentimentos. Nenhuma certificação de conformidade LGPD é alegada. Não há e-mail transacional, recuperação de senha, notificações push, controle separado de QA/implantação ou integração ERP/Jira.

Para backup, pare o servidor e copie a pasta `data` inteira. Não a compartilhe junto do código se tiver dados reais. Para começar uma demonstração do zero, pare o servidor e **renomeie** `data` para `data-backup`; uma nova pasta de exemplo será criada na próxima execução. Essa ação não apaga o backup.
