# platformops-runbooks

Biblioteca de **runbooks operacionais** (SRE/Platform Engineering) consumida pelo
app **PlatformOps Desktop**. Cada runbook é um procedimento acionável — diagnóstico
e mitigação passo a passo — que o app renderiza com uma **engine de passos**
(checklist, comandos, queries, aprovações e links) e que também é legível
diretamente aqui no GitHub, para aprendizado fora do app.

## Formato canônico

Cada runbook é **um arquivo Markdown** com _frontmatter_ YAML (metadados + a lista
estruturada de passos, que mapeia para o modelo `Runbook` do app) seguido do corpo
narrativo em markdown.

```markdown
---
id: k8s-crashloop-triage
title: Triagem de Pod em CrashLoopBackOff
description: Diagnóstico e mitigação de pods reiniciando em loop.
category: kubernetes
severity: SEV2                 # SEV1 | SEV2 | SEV3
tags: [kubernetes, crashloop, pods]
estimatedTime: 15m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar escopo e impacto
    detail: Quantos pods? Qual serviço? Afeta usuários?
  - type: command
    title: Listar pods problemáticos
    command: "kubectl get pods -n {{namespace}} --field-selector=status.phase!=Running"
  - type: link
    title: Dashboard do serviço
    url: https://grafana.example.com
  - type: approval
    title: Aprovar rollback se necessário
---

## Contexto
Quando este runbook se aplica.

## Diagnóstico
Raciocínio passo a passo.

## Mitigação
Ações para estabilizar.

## Causa raiz (pós-incidente)
Investigação e prevenção.

## Referências
Docs e runbooks relacionados.
```

Os placeholders `{{var}}` nos comandos são preenchidos pelo operador no app (contexto
ativo, namespace, etc.). Veja o schema completo em [`schemas/runbook.schema.md`](schemas/runbook.schema.md).

### Tipos de passo
| type | uso |
|---|---|
| `checklist` | verificação humana (sem execução) |
| `command` | comando de terminal (kubectl/CLI) |
| `cloud` | comando de cloud (aws/gcloud/az) |
| `query` | consulta (SQL/PromQL) |
| `approval` | gate de aprovação humana antes de ação de risco |
| `link` | dashboard, doc ou runbook relacionado |

## Estrutura de pastas

```
runbooks/
  aws/            kubernetes/     network/       database/
  incident/       monitoring/     observability/ security/
schemas/          # descrição do formato
manifest.json     # índice versionado (checksum por arquivo) — consumido pelo app
CHANGELOG.md
README.md
```

## Como o app consome

1. O PlatformOps Desktop sincroniza este repositório (git clone) e lê o
   [`manifest.json`](manifest.json) — índice com `version`, `sha256` por arquivo e
   `minimumDesktopVersion`.
2. O conteúdo é gravado em cache local (SQLite) → **offline-first**: após a 1ª
   sincronização, os runbooks funcionam sem rede.
3. A tela de Runbooks renderiza o corpo em markdown e a engine executa os `steps`
   (com preview e confirmação nas ações destrutivas — guardrails do app).
4. Atualizações são **sob demanda**: o app avisa "nova versão da biblioteca" e o
   usuário escolhe atualizar.

> **Integridade:** o `manifest.json` é assinado (Ed25519) na publicação e verificado
> pelo app antes de aplicar (ver a Fase de sincronização do Desktop). Todo comando de
> runbook passa pelo preview + confirmação — conteúdo remoto nunca é auto-executado.

## Contribuindo

Para adicionar um runbook, crie um `.md` no formato acima dentro da categoria
correspondente. Sem alterar código do app: o índice/manifest é regenerado na
publicação. Use `severity` coerente, `steps` alinhados à narrativa e sempre uma
seção de **Causa raiz** para fechar o ciclo.

## Licença

Ver `LICENSE` (a definir na publicação).
