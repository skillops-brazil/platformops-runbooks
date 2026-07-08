# Prompt — Implementar Feature

> Aciona o pipeline `agents/build/` (subagent `pipeline-build`). Preencha os `{...}` e remova o que não se aplicar.

---

Implemente a seguinte feature seguindo o pipeline `agents/build/`. Aplique `agents/_CONVENTIONS.md`: header YAML por estágio, no máximo 2-3 achados por agente, nada genérico, e acione **só** os estágios que o caso exige.

**Projeto:** {projeto — ver `projects/{projeto}/context.md`}
**Feature:** {1-2 frases do que precisa ser construído}
**Restrições conhecidas:** {prazo, stack, compatibilidade, dados sensíveis — ou "nenhuma"}

Comece criando o Context ID e o event log em `projects/{projeto}/event-logs/`. Depois:
1. **01 Context Intake** — delimite escopo e levante ambiguidades bloqueantes (pare e pergunte se houver).
2. Acione os estágios de planejamento relevantes (03 arquitetura, 04 segurança, 05 contrato, 06 dados, 07 testes, 08 confiabilidade) — só os que o caso pede.
3. **09 Implementation Controller** — fixe escopo e arquivos permitidos.
4. **10 Coding** + **11 Test** — implemente só o autorizado e rode os testes definidos.
5. **12/13/14** revisões + **15 Commit** + **16 Release Notes**.

Não avance para Commit com pendência bloqueante. Atualize o event log ao fim de cada estágio.
