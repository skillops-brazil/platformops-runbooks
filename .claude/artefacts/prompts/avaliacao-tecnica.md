# Prompt — Avaliação Técnica de Proposta

> Aciona o painel `agents/review/` (subagent `supervisor-tecnico`). Use ANTES de construir, para decidir.

---

Avalie a proposta abaixo usando o painel `agents/review/` via o supervisor. Aplique `agents/_CONVENTIONS.md`: acione **só** os domínios relevantes (não os 8 por padrão), envie a cada um só o contexto do seu domínio, e produza a decisão final no formato do supervisor.

**Proposta:** {descrição da mudança/feature/decisão}
**Contexto atual:** {stack, escala, time, prazo — ver `projects/{projeto}/context.md`}
**Dados/usuários envolvidos:** {há dado pessoal? pagamento? exposição externa? UI?}

Entregue:
- a lista de domínios acionados e por quê (1 linha cada);
- a matriz de decisão (parecer/risco/bloqueante por domínio);
- conflitos entre pareceres, se houver, com resolução proposta;
- ações bloqueantes antes da aprovação;
- decisão final e comunicação por audiência (negócio + técnico).
