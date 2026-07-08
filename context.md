# Contexto — platformops-runbooks

> Contexto vivo do projeto, consumido pelos agentes de `review/` e `build/`. Mantenha curto e atualizado — é o recorte que os agentes recebem. Todo agente que produzir mudança ou fato novo atualiza este arquivo (só a seção afetada) e escreve um resumo curto.

## Resumo
Biblioteca de **runbooks operacionais** (SRE/Platform Engineering) consumida pelo PlatformOps Desktop, que os renderiza com uma engine de passos (checklist, command, cloud, query, approval, link). Cada runbook é um `.md` com frontmatter (modelo `Runbook`, `severity` SEV1-3, lista de `steps`) + corpo (Contexto / Diagnóstico / Mitigação / Causa raiz / Referências).

## Posição na jornada
Repositório de apoio: sync git pelo Desktop com `manifest.json` + `manifest.sig` (Ed25519), cache SQLite offline-first; ações destrutivas sempre com preview + confirmação no app.

## Stack / estrutura
- Só conteúdo: `app/runbooks/<categoria>/` (aws, database, incident, kubernetes, monitoring, network, observability, security), `app/schemas/runbook.schema.md`, `app/manifest.json` + `app/manifest.sig`.
- Sem código executável; `devops/` vazio.

## Restrições e conformidade
- Formato segue `GIT_CONTENT_SPEC.md` (`platformops-internal/app/docs/`); mudanças de schema coordenadas com o Desktop.
- Todo release exige reassinar o manifest (Ed25519).

## Decisões técnicas vigentes
- Manifest assinado desde a versão inicial; conteúdo em português; um runbook por arquivo.

## Pendências / riscos abertos
- Migração de layout (`runbooks/` → `app/`) não commitada.

## Event logs
Histórico de features em [`event-logs/`](./event-logs/).
