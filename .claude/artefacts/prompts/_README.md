# Templates de Prompt

Prompts prontos que **já embutem** as convenções de `agents/_CONVENTIONS.md` (header YAML, tetos de achados, contexto filtrado, ativação condicional) para aumentar a assertividade e reduzir tokens.

Cada template aponta para os agentes da estrutura em vez de reescrever as instruções deles. Use `{...}` como placeholders.

| Template | Quando usar |
|---|---|
| [`tarefa.md`](./tarefa.md) | **Uso diário.** Qualquer tarefa: preencha o contexto e o roteamento é automático. |
| [`feature.md`](./feature.md) | Implementar uma feature nova ponta a ponta (pipeline `build/`). |
| [`bugfix.md`](./bugfix.md) | Corrigir um bug isolado (caminho curto do `build/`). |
| [`avaliacao-tecnica.md`](./avaliacao-tecnica.md) | Decidir sobre uma proposta antes de construir (painel `review/`). |
| [`projeto.md`](./projeto.md) | Tarefa genérica em um projeto existente, referenciando só o `context.md` dele. |
| [`atualizar-contexto.md`](./atualizar-contexto.md) | Preencher/atualizar o `context.md` de um projeto já existente a partir do código. |
| [`ux-design.md`](./ux-design.md) | Gerar/evoluir os artefatos de UX (marca, tokens, wireframes, protótipos, assets) na pasta `design/`. |
| [`commit.md`](./commit.md) | Gerar mensagem de commit seguindo o padrão de versionamento (`agents/_COMMITS.md`). |

Para criar um template novo, siga o mesmo padrão: contexto filtrado, agente alvo explícito, formato de saída pedido.
