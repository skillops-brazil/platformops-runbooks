# Prompt — Contexto inicial do projeto (PRIMEIRA AÇÃO)

> **Rode isto primeiro**, logo após instalar os artefatos (`make init`). Ele lê o negócio/produto,
> o código e o **guia de marca**, e preenche o `context.md` com dados **reais e condensados**.
> Rode de novo depois, a qualquer momento, para re-sincronizar o contexto. É a base que todos os
> agentes (`review/` e `build/`) consomem — por isso precisa ser real e curto.

---

## Preencha

- **Produto/negócio:** {ex.: Pedlin Studio — o que é, para quem, qual dor resolve}
- **Guia de marca / design system:** {caminho, ex.: `system_design/` ou `docs/system_design/` — ou "não há"}
- **Outras fontes conhecidas:** {README, docs/, specs, tickets — ou "descubra pelo código"}

## Instrução

Com base no contexto de negócio e produto acima, **atualize o `context.md`** deste projeto com o
contexto **real** — não o template em branco. Aplique `.claude/artefacts/agents/_CONVENTIONS.md`
(itens 9 e 10: contexto vivo + resumo obrigatório).

1. **Consulte sempre o guia de marca** (caminho acima) e todas as informações conhecidas: código
   (manifestos, config, infra), docs e READMEs. Amostre os pontos-chave — não leia tudo.
2. **Preencha o `context.md` com dados reais e condensados:**
   - Resumo do produto, público e valor.
   - Stack, escala/estágio, restrições e conformidade (do código/infra).
   - **Marca (resumo):** extraia do guia o essencial — paleta/tokens principais, tipografia, tom de
     voz, princípios — em poucos bullets, e **aponte o caminho do guia completo** (não copie o guia
     inteiro para o contexto; isso gasta janela).
   - Decisões técnicas vigentes (visíveis no código/config e commits relevantes), 1 linha cada.
   - Pendências / riscos abertos evidentes.
3. **Preserve** qualquer texto que eu já tenha escrito no `context.md`; complemente, não sobrescreva.
   Marque inferência não confirmada com `(inferido — confirmar)`.
4. **Deixe a manutenção automática ativa:** registre no topo do `context.md` a regra —
   *"Todo agente que produzir mudança ou fato novo atualiza este arquivo (só a seção afetada) e
   escreve um resumo curto."* Isso já está em `_CONVENTIONS.md`; o lembrete aqui garante continuidade.

## Entregue (além do arquivo)

- Um bloco **"Assumi / confirme"** com as inferências que precisam do meu aval.
- Um **resumo de 3-5 linhas** do que mudou no `context.md`. Nada de reescrever código aqui — só contexto.

---

### Como chamar no Claude Code
Dentro do projeto: *"Siga o `.claude/artefacts/prompts/atualizar-contexto.md`"* e preencha o bloco **Preencha**.
