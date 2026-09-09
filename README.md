# ResolveTech MVP

Central de atendimento com conversa investigativa por IA, atendimento humano interno e encaminhamento completo ao desenvolvimento.

## Executar localmente

1. Instale Node.js 22+ e Python 3.12+.
2. Execute `npm install`.
3. Configure `GROQ_API_KEY` no arquivo `.env`.
4. Execute `npm run build:local`.
5. Execute `npm run start:local` e acesse `http://localhost:8000`.

## Fluxo da demonstração

- O cliente conversa com a IA e pode solicitar atendimento humano.
- Após a solicitação, deve aguardar o suporte responder pelo próprio chat da ResolveTech.
- O suporte recebe todo o histórico, responde ao cliente, finaliza o caso ou confirma a revisão e envia tudo ao desenvolvimento.
- O desenvolvedor recebe apenas demandas encaminhadas, com conversa, formulário e relatório, e pode atualizar o andamento.

## Railway

O Dockerfile compila o frontend e inicia o backend Python. Configure `GROQ_API_KEY`, use um volume montado em `/app/data` e publique a porta do serviço. Alterações enviadas à branch conectada são implantadas automaticamente pelo Railway.

Dados locais e dados hospedados são bancos separados. Não versionar `.env`, `data/` ou artefatos compilados.
