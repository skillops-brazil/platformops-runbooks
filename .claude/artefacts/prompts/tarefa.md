# Prompt — Tarefa (uso diário)

> Template padrão para **qualquer tarefa** dentro de um projeto já instalado. Preencha o contexto
> da tarefa e cole no Claude Code. O roteamento (avaliar → `review/` | executar → `build/`) é
> automático via `CLAUDE.md`; você também pode chamar um subagent explicitamente (veja no fim).

---

## Contexto da tarefa (preencha sempre)

**Objetivo:** {o que você quer, em 1-2 frases}
**Tipo:** {decidir/avaliar | implementar | corrigir bug | migração | investigar}
**Áreas/arquivos envolvidos:** {ex.: src/player/, IPC do Electron, schema de licença — ou "não sei, descubra"}
**Restrições:** {compatibilidade, prazo, não mexer em X — ou "nenhuma"}
**Resultado esperado:** {ex.: diff pronto para commit | decisão com riscos | plano | análise}

## Instrução

Use o `context.md` deste projeto como recorte de domínio (não assuma nada fora dele; se faltar,
pergunte). Aplique `.claude/artefacts/agents/_CONVENTIONS.md`. Roteie conforme o **Tipo** acima:

- **decidir/avaliar** → painel `review/` via `supervisor-tecnico`; entregue matriz de decisão + decisão final.
- **implementar/corrigir/migração** → pipeline `build/` via `pipeline-build`; crie o event log em
  `event-logs/` e percorra só os estágios necessários. Não avance para commit com pendência bloqueante.

Acione só os agentes que a tarefa exige (mudança pequena = 1-2). Sinalize conflito com as decisões
vigentes do `context.md` em vez de ignorá-las.

---

## Como chamar no Claude Code

1. **Automático (recomendado):** cole o bloco acima preenchido. O `CLAUDE.md` já orienta o roteamento
   e os subagents são acionados pela descrição da tarefa.
2. **Explícito:** peça o subagent pelo nome, ex.:
   - "Use o **supervisor-tecnico** para avaliar {tarefa}."
   - "Use o **pipeline-build** para implementar {tarefa}."
3. **Especialista único** (quando você já sabe o domínio): "Use o **seguranca** para revisar {…}",
   "**arquitetura**", "**dados**", etc.
