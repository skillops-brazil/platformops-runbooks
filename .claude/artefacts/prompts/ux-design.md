# Prompt — Artefatos de UX/Design (Claude Design)

> Cole este prompt no **Claude (Design / Artifacts)** para gerar os artefatos de UX de uma ideia,
> do inicial ao evolutivo. **Antes**, crie no projeto a pasta `design/` (estrutura na seção 0) e vá
> salvando cada saída no caminho indicado. Os agentes deste projeto sabem que os artefatos de UX
> vivem em `design/` (ver `CLAUDE.md`).

---

## 0. Onde salvar (crie esta estrutura no projeto)

```
design/
  README.md            ← índice + estado de cada artefato (o que existe, versão, pendente)
  brand/               ← brand board, princípios visuais, tom de voz, logo
  tokens/              ← cores, tipografia, espaçamento, raios (JSON + CSS vars)
  flows/               ← sitemap e jornadas do usuário
  wireframes/          ← baixa fidelidade das telas-chave
  prototypes/          ← protótipos navegáveis (HTML autocontido) exportados do Claude
  components/          ← inventário de componentes + specs (estados, variações)
  assets/              ← ícones, ilustrações, imagens
```

Ao gerar cada artefato, **salve como arquivo próprio** no caminho indicado e atualize `design/README.md`.

## 1. Contexto da ideia (preencha sempre)

- **Produto/ideia:** {1-2 frases}
- **Público-alvo:** {quem usa}
- **Plataforma:** {web | desktop (Electron) | mobile | multi}
- **Problema que resolve / valor:** {…}
- **Telas/fluxos principais:** {ex.: login, dashboard, player, checkout}
- **Referências visuais / concorrentes:** {links ou descrição do estilo desejado}
- **Marca existente?** {cores/logo/fonte já definidos — cole aqui; ou "criar do zero"}
- **Estágio:** {novo do zero | evoluindo um protótipo/tela que já existe}

## 2. Artefatos a gerar — por fase (comece pelo inicial; evolua depois)

Gere na ordem abaixo, porque cada fase alimenta a seguinte. Em cada uma, entregue uma **versão inicial coerente** primeiro; refino vem em rodadas seguintes.

**Fase 0 — Marca & tokens** → `design/brand/`, `design/tokens/`
- Brand board: paleta (primária/neutra/semântica), tipografia, uso de logo, princípios visuais, tom de voz.
- **Design tokens** em `tokens/tokens.json` **e** `tokens/tokens.css` (variáveis CSS): cores, escala tipográfica, espaçamento, raios, sombras. Tudo que vier depois usa **só** estes tokens.

**Fase 1 — Estrutura & fluxo** → `design/flows/`, `design/wireframes/`
- `flows/sitemap.md` — mapa de telas e navegação.
- `flows/user-flows.md` — jornadas dos fluxos principais (feliz + erros-chave).
- Wireframes de baixa fidelidade das telas-chave (HTML simples ou markdown/ASCII), sem cor final.

**Fase 2 — Protótipo & componentes** → `design/prototypes/`, `design/components/`
- Protótipo navegável das telas principais como **HTML autocontido** (CSS/JS inline, um arquivo por tela ou um SPA único) usando os tokens da Fase 0.
- `components/inventory.md` — inventário de componentes (botão, input, card, modal…) com estados (default/hover/focus/disabled/erro) e variações.

**Fase 3 — Assets & alta fidelidade** → `design/assets/`, `design/prototypes/`
- Ícones e ilustrações (SVG inline preferencial), imagens de placeholder.
- Telas em alta fidelidade (evolução dos protótipos com assets e microcopy).

**Fase 4 — Handoff para dev** → `design/tokens/`, `design/components/`
- Tokens mapeados para a stack do projeto (ex.: `tokens/tailwind.config` ou CSS vars finais) — ver `context.md` para a stack.
- `components/specs.md` — specs de implementação por componente (props/estados/acessibilidade).
- Checklist de acessibilidade (contraste AA, foco visível, navegação por teclado, semântica/ARIA).

## 3. Regras de geração

- **Tokens primeiro, sempre.** Nenhuma cor/tamanho fora dos tokens da Fase 0.
- **Autocontido.** Protótipos HTML sem dependências externas (inline), para colar como arquivo único.
- **Um artefato = um arquivo**, no caminho da seção 0.
- **Acessibilidade desde o início:** contraste AA, foco visível, semântica correta.
- **Coerência entre fases:** telas usam os componentes do inventário; componentes usam os tokens.

## 4. Trazer para o projeto e evoluir

1. Salve cada saída no caminho indicado e registre em `design/README.md` (artefato, versão, data, pendências).
2. **Evoluir:** rode este prompt de novo citando o artefato existente + o que muda (ex.: "evolua `prototypes/dashboard.html` para incluir estado vazio e loading").
3. **Revisar antes de codar:** use o subagent **`experiencia`** (painel `review/`) para avaliar jornada e consistência.
4. **Implementar:** use o **`pipeline-build`** apontando o protótipo/tokens em `design/` como base — o coding deve reusar os tokens, não recriar estilos.
