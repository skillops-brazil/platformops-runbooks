# Prompt — Tarefa em um Projeto (referenciando o contexto)

> Prompt genérico que **não recebe o repositório inteiro**: referencia só `projects/{projeto}/context.md` como contexto filtrado e despacha para o agente certo. Preencha os `{...}`.

---

Trabalhe no projeto **{projeto}**. Carregue o contexto em `projects/{projeto}/context.md` e use-o como o recorte de domínio — não assuma nada fora dele; se faltar informação relevante, pergunte antes de agir. Aplique `agents/_CONVENTIONS.md`.

**Tarefa:** {descreva a tarefa em 1-2 frases}

Roteie conforme a natureza da tarefa:

- **Se for decidir/avaliar** (vale a pena? é seguro? arquitetura certa? qual o risco?)
  → painel `agents/review/` via `supervisor-tecnico`, acionando só os domínios relevantes ao caso e ao `context.md`. Entregue a matriz de decisão e a decisão final.

- **Se for implementar/corrigir** (feature, bug, migração)
  → pipeline `agents/build/` via `pipeline-build`. Crie o event log em `projects/{projeto}/event-logs/` e percorra só os estágios exigidos. Não avance para Commit com pendência bloqueante.

Use as decisões técnicas vigentes e as restrições do `context.md` como limites — não proponha mudança que conflite com elas sem sinalizar a tensão explicitamente.
