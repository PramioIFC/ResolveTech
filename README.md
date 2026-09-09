# ResolveTech 0.2 — PWA + Groq + atendimento Tidio

Esta versão substitui o formulário do cliente por uma **conversa investigativa com IA**. A página de empresas e os cartões de problemas continuam, incluindo **“Não sei qual é o problema”**. A IA conversa, investiga, sugere verificações e pede a avaliação do cliente. Somente o cliente confirma que está satisfeito; caso contrário, pode solicitar suporte. O botão **Atendimento assistido** está no canto desde o início.

O projeto contém frontend compilado, código-fonte, backend local e migração do banco anterior. **As chaves reais de Groq e Tidio não estão incluídas.** Sem a chave Groq, a tela informa a pendência e permite pedir suporte; nenhuma resposta fixa é apresentada como se viesse da IA.

## Começar no Windows

1. Extraia o ZIP inteiro.
2. Tenha Python 3.11+ instalado (marque “Add python.exe to PATH” na instalação).
3. Execute **CONFIGURAR-WINDOWS.bat**. Informe a chave Groq em entrada oculta e a chave pública Tidio. Não é necessário colar segredo em conversa, arquivo de frontend ou código.
4. Execute **INICIAR-WINDOWS.bat**.
5. Abra **http://localhost:8000**. Mantenha o terminal aberto.
6. Use o botão **Instalar app** ou a opção de instalação do navegador.

A interface já está compilada. Não precisa instalar Node, pacotes Python, PostgreSQL ou Redis para executar este pacote.

macOS/Linux:

```bash
python3 backend/configure.py
python3 backend/server.py --open
```

Configuração manual: copie `.env.example` para `.env`, preencha os valores e reinicie o servidor. Configurações já existentes no ambiente prevalecem sobre `.env`.

## Groq — modelo solicitado

- Console: https://console.groq.com
- Chaves: https://console.groq.com/keys
- Modelo fixado: **openai/gpt-oss-120b**.
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Chave: `GROQ_API_KEY`, somente no backend.
- Saída JSON estruturada com schema estrito, validada novamente pelo backend.

```dotenv
GROQ_API_KEY=sua_chave_groq
```

A IA recebe a conversa da demanda, a categoria e o contexto de atendimento da empresa. Não são enviados automaticamente e-mail, nome completo, senhas, observações internas ou arquivos. O texto digitado pode conter informações pessoais; a interface solicita consentimento antes do envio e orienta não incluir segredos.

A resposta inclui `reply`, `summary`, `missingInformation` e `readyForFeedback`. O modelo não altera status, não executa comandos, não confirma dados nem encerra demandas. O backend controla essas ações. A aplicação envia somente o conteúdo final da resposta para o cliente, sem raciocínio interno.

A chamada usa o histórico completo dentro do limite definido (150 mensagens ou 100 mil caracteres). Ao atingir o limite, o sistema pede encaminhamento humano e preserva todo o histórico, em vez de truncá-lo silenciosamente. Falha, timeout ou limite da Groq mostram erro e permitem repetir a mensagem, sem duplicá-la no banco. Enquanto a Groq responde, o banco não fica bloqueado; o cliente pode pedir suporte.

## Tidio — atendimento humano no canto

- Crie ou acesse seu projeto em https://tidio.com.
- No painel, abra as configurações de instalação do chat e copie a chave do snippet `https://code.tidio.co/CHAVE_PUBLICA.js`.
- A chave tem 32 caracteres alfanuméricos. **Não cole o script inteiro.**
- No `.env`, `TIDIO_PUBLIC_KEY` vale para `TIDIO_COMPANY_ID` (padrão: a empresa fictícia `company-demo`).
- Alternativamente, cada administrador configura sua própria chave pública em **Minha empresa**. A configuração por empresa prevalece sobre `.env`.
- Verifique os domínios permitidos, disponibilidade dos atendentes e permissões/recursos do seu plano Tidio. Desative automações/Lyro que concorram com o atendimento humano se desejar deixar a IA exclusivamente no chat principal.

O **chat investigativo principal é da ResolveTech e usa Groq**. O **widget Tidio é o canal externo de suporte humano**. O Tidio não hospeda o modelo Groq nem recebe respostas de IA simuladas como mensagens de atendente.

Ao clicar em atendimento assistido:

1. A demanda é registrada na fila de suporte da ResolveTech.
2. O histórico da IA e o resumo são preservados na mesma demanda.
3. Se configurado, o widget Tidio abre e recebe uma mensagem de contexto via `messageFromVisitor` com protocolo, empresa, categoria, resumo indicado como sugestão da IA e relatos do cliente. Contextos longos são abreviados explicitamente no widget; o histórico completo permanece no sistema.
4. O nome e o e-mail do cliente identificam o contato no Tidio. A interface informa esse compartilhamento.
5. Se Tidio estiver indisponível, bloqueado ou sem configuração, o pedido **continua registrado** e o cliente pode conversar com a equipe pelo canal interno.

**Confirme o recebimento no widget/painel Tidio.** O SDK inicia o envio; a ResolveTech não marca entrega externa como confirmada pelo servidor. Se houver questionário pré-chat, o cliente pode precisar preenchê-lo primeiro. O estado online/offline vem do projeto Tidio, sem prometer atendente imediato.

**Limite desta integração:** mensagens trocadas dentro do widget permanecem no Tidio. Não há sincronização bidirecional por webhook com a ResolveTech. O histórico investigativo e as mensagens do canal interno ficam na ResolveTech e chegam ao desenvolvimento. Se a equipe atuar pelo Tidio, deve registrar o desfecho/observações no painel ResolveTech antes de enviar ao dev. Os dois canais são identificados na interface. O logout limpa a identidade Tidio do navegador; mudar de projeto Tidio na mesma página requer recarregar.

## PWA: o que está implementado

- Manifesto com nome, idioma, escopo, `start_url`, exibição standalone e cores.
- Ícones PNG 192 e 512, ícone maskable e Apple Touch Icon.
- Botão de instalação com evento nativo e orientação para navegadores sem esse evento.
- Service worker com versão calculada no build, cache do shell público e limpeza de versões antigas.
- Atualização mediante ação do usuário para evitar recarregar uma conversa em andamento.
- Shell abre offline após a primeira visita online; se o backend estiver indisponível, há aviso e botão de tentar novamente.
- **Não são cacheados** sessão, API, conversas, anexos, uploads, recursos da Groq ou Tidio.
- Não existe fila de envio silencioso: mensagens não são reproduzidas automaticamente quando a rede volta.
- Layout adaptado para celular, teclado e janela standalone.

**PWA não transforma serviços online em serviços offline.** Groq e Tidio exigem internet. O backend Python precisa estar ligado. A instalação funciona em ambiente seguro: `localhost` no próprio computador ou **HTTPS**. Um celular acessando um IP de rede por HTTP normalmente não pode instalar o PWA; para uso em celular, disponibilize o backend por um domínio HTTPS adequado. Nenhum domínio/servidor externo foi publicado nesta entrega.

## Contas de demonstração

Senha de todas: **Demo@2026**.

| Perfil | E-mail |
|---|---|
| Cliente | client@resolvetech.local |
| Suporte | support@resolvetech.local |
| Desenvolvedor | developer@resolvetech.local |
| Administrador | admin@resolvetech.local |

Os botões da tela inicial preenchem as credenciais. Empresa, usuários e demanda de exemplo só são inseridos na primeira inicialização. Use sessões/perfis de navegador separados para apresentar cliente e suporte simultaneamente.

## Roteiro para apresentar

1. **Admin:** em Base de atendimento, escolha um problema ou crie outro. Preencha contexto do produto, problemas conhecidos e verificações seguras. Em Minha empresa, configure Tidio.
2. **Cliente:** Empresas → Nexo Sistemas → problema ou “Não sei qual é o problema”. O chat abre imediatamente.
3. Autorize o processamento e escreva: “Hoje de manhã fui gerar o relatório financeiro e apareceu erro 500. Já tentei sair e entrar.” Observe a pergunta adaptada ao contexto.
4. Continue a conversa. A avaliação de satisfação aparece quando a IA propõe verificar o resultado; o suporte no canto está disponível desde o começo.
5. Para demonstrar autosserviço, clique em **Sim, estou satisfeito**: a demanda é concluída pelo cliente.
6. Em outra conversa, clique em **Não, quero suporte** ou no botão do canto: a solicitação entra na fila e Tidio abre se estiver configurado.
7. **Suporte:** abra a demanda e a aba Conversa. Leia o histórico, responda pelo canal interno, ou atenda pelo Tidio e registre as observações. Inicie o atendimento e gere o relatório atualizado, revise e envie ao desenvolvimento.
8. **Dev:** assuma, acompanhe o contexto e conclua. O encerramento aparece para o cliente.

## Migrar os dados da versão anterior

1. Encerre o servidor antigo.
2. Faça backup da pasta `data` inteira.
3. Extraia esta versão em uma pasta nova.
4. Copie sua pasta `data` e seu `.env` para a nova pasta (atualize `.env` com Groq/Tidio).
5. Inicie esta versão. A migração `002_chat.sql` adiciona tabelas sem apagar demandas, respostas, formulários, contas ou anexos antigos.

Novas demandas usam chat. Demandas antigas sem conversa continuam abrindo na interface anterior para preservar seus registros. O construtor antigo deixa de ser a navegação principal; Base de atendimento administra categorias e orientações da IA. Conversas iniciadas preservam uma cópia das orientações válidas na criação.

Mantenha o backup: não rode simultaneamente servidores de versões diferentes sobre o mesmo banco. O esquema anterior e novas tabelas usam SQLite com chaves estrangeiras e transações; a migração registrada não é aplicada novamente.

## Estrutura e comandos

```text
app/page.tsx                   Navegação, páginas e telas legadas
app/globals.css                Estilo responsivo
components/chat-workspace.tsx  Chat, satisfação e atendimento assistido
components/pwa-controls.tsx    Instalação, rede e atualização
lib/tidio.ts                   Loader, identidade e integração do widget
backend/server.py             Sessões, permissões, API, banco e arquivos
backend/chat.py               Conversas, estados e adaptador Groq
backend/migrations/002_chat.sql Migração aditiva
backend/configure.py          Configuração local com segredo oculto
public/manifest.webmanifest   Manifesto PWA
public/icons/                 Ícones de instalação
scripts/build-local.mjs        Compilação local
scripts/build-pwa.mjs          Service worker com versão dos arquivos
dist-local/                  Interface compilada e service worker
```

Para alterar o frontend, use Node 22.13+ (preferencialmente 24):

```bash
npm ci
npm run build:local
python backend/server.py
```

Depois de mudanças, recompilar é necessário para atualizar o frontend e o service worker. O comando padrão `npm run build` ainda pertence ao scaffold original; **o pacote operacional usa `npm run build:local` + backend Python**.

## Verificações executadas e limitações

```bash
npx tsc --noEmit
npm run build:local
python tests/test_workflow.py
python tests/test_chat.py
node tests/test_integrations.mjs
```

- 4 testes da versão anterior: fluxo, autorização, anexos, formas antigas e validações.
- 7 testes novos: chat, categoria desconhecida, satisfação, encaminhamento imediato, falha/repetição sem duplicação, suporte durante geração, migração idempotente, isolamento, contrato Groq e manifesto/service worker.
- Testes JavaScript do service worker e do adaptador Tidio com SDK controlado: identidade, envio de contexto, limpeza no logout, cache público e bypass de APIs/serviços externos.
- Compilação e TypeScript aprovados.

**Groq e Tidio foram testados com respostas/SDK controlados, sem credenciais reais.** Não foi possível testar o seu projeto externo, limite/plano de conta ou uma resposta real do modelo. Não foi executado teste visual/instalação em navegador ou dispositivo físico. O código do PWA e as integrações estão implementados, mas a aceitação final com suas contas e dispositivos requer executá-los após configurar as chaves. Não se afirma funcionamento perfeito em todo navegador.

Docker opcional: `docker compose up --build` (usa o frontend compilado e variáveis `.env`). O Compose não foi executado neste ambiente.

## Segurança e dados

GROQ_API_KEY nunca chega ao JavaScript, ao manifesto ou ao cache. Sessões continuam HttpOnly/SameSite; o cookie de desenvolvimento usa HTTP local. Arquivos continuam privados e sem análise automática pela IA. Consultas parametrizadas, autorização por empresa e papel, histórico e controle de revisão permanecem. O backend aceita ações de chat apenas para o proprietário e permite respostas humanas somente à equipe autorizada. Mensagens têm identificadores para repetição idempotente.

O Tidio carrega somente quando o cliente pede atendimento; sua CSP inclui os domínios indicados pela documentação oficial. Não há espelhamento de APIs privadas no service worker. A chamada Groq tem timeout; falhas não são convertidas em respostas inventadas.

A entrega é destinada a demonstração local. Produção exige hospedagem HTTPS, servidor adequado, proteção de segredo, políticas de retenção, limite de uso/custo Groq e gestão das integrações. Não há certificado de conformidade LGPD. Preserve a pasta `data` e não a compartilhe se contiver dados reais.

## Referências das integrações

- Groq, modelo: https://console.groq.com/docs/model/openai/gpt-oss-120b
- Groq, saída estruturada: https://console.groq.com/docs/structured-outputs
- Tidio, métodos do widget: https://developers.tidio.com/docs/widget-other-methods
- Tidio, identificação: https://developers.tidio.com/docs/widget-visitor-identification
- Tidio, CSP: https://developers.tidio.com/docs/widget-security-policy
- PWA, instalação: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
