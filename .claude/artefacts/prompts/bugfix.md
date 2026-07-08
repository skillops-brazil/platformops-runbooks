# Prompt — Corrigir Bug

> Caminho curto do pipeline `agents/build/`. Para bug isolado, não rode o pipeline inteiro.

---

Corrija o bug abaixo usando o caminho mínimo do `agents/build/`. Aplique `agents/_CONVENTIONS.md`.

**Projeto:** {projeto}
**Sintoma observado:** {o que acontece}
**Comportamento esperado:** {o que deveria acontecer}
**Reprodução:** {passos ou link}

Sequência sugerida (pule o que não se aplicar):
1. **01 Context Intake** — delimite a causa provável e o escopo do fix (não corrija sintoma sem causa).
2. **09 Implementation Controller** — liste os arquivos que o fix pode tocar; nada além disso.
3. **10 Coding** — corrija e adicione um teste de regressão que falha sem o fix.
4. **11 Test** + **14 Diff Review** — confirme verde e ausência de mudança fora de escopo.
5. **15 Commit** — `fix(escopo): ...` referenciando o sintoma.

Se o bug revelar risco de segurança ou quebra de contrato, acione **12** ou **13** antes do commit.
