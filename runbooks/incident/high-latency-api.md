---
id: incident-high-latency-api
title: API com Alta Latência (SLO de Latência Violado)
description: Triagem estruturada de degradação de latência em uma API de produção.
category: incident
severity: SEV2
tags: [incident, latency, api, slo, performance]
estimatedTime: 30m
tools: [kubectl, curl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Declarar e dimensionar
    detail: Qual endpoint/serviço? p99 atual vs. SLO? Desde quando? Correlaciona com deploy, tráfego ou dependência?
  - type: link
    title: Painel de latência (RED) do serviço
    url: https://grafana.example.com/d/{{service}}-red
  - type: command
    title: Medir latência de fora (do cluster)
    command: "curl -w '@curl-format.txt' -o /dev/null -s https://{{host}}/{{endpoint}}"
  - type: command
    title: Ver réplicas prontas e restarts
    command: "kubectl get deployment {{deployment}} -n {{namespace}}"
  - type: command
    title: Uso de CPU/memória dos pods
    command: "kubectl top pod -n {{namespace}} -l app={{app}}"
  - type: command
    title: Ver saturação de conexões/HPA
    command: "kubectl get hpa -n {{namespace}}"
  - type: link
    title: APM / traces do endpoint lento
    url: https://tempo.example.com/explore?service={{service}}
  - type: approval
    title: Aprovar mitigação (scale-out ou rollback)
    detail: Escolher entre escalar réplicas, aumentar recursos, ou reverter o último deploy.
  - type: command
    title: Escalar horizontalmente (mitigação rápida)
    command: "kubectl scale deployment/{{deployment}} -n {{namespace}} --replicas={{replicas}}"
  - type: command
    title: Rollback se for regressão de deploy
    command: "kubectl rollout undo deployment/{{deployment}} -n {{namespace}}"
---

## Contexto
O SLO de latência de um endpoint foi violado (ex.: p99 acima do target por N
minutos). Alertas típicos: `HighRequestLatency`, `SLOBurnRate`. O objetivo é
**estabilizar primeiro**, investigar depois.

Dimensões a checar: mudança de código (deploy), aumento de tráfego (saturação),
degradação de dependência (DB, cache, serviço downstream) ou problema de
infraestrutura (nó, rede).

## Diagnóstico
1. **Onde dói** — o painel RED (Rate/Errors/Duration) mostra se latência subiu com
   ou sem aumento de tráfego, e se há erros junto.
2. **Saturação** — `kubectl top` + HPA: CPU no teto e HPA no máximo indicam falta
   de capacidade. Conexões/threads esgotadas indicam pool saturado.
3. **Dependências** — traces (APM) mostram em qual span o tempo é gasto: no banco?
   numa chamada externa? em GC? Correlacione com os runbooks de DB/cache.
4. **Correlação temporal** — o início bate com um deploy? Com um pico de tráfego?
   Com um incidente de dependência?

## Mitigação
- **Saturação de capacidade**: escale réplicas (`kubectl scale`) e/ou aumente o
  teto do HPA. Aumente CPU se limitado por CPU.
- **Regressão de deploy**: `kubectl rollout undo` para a revisão anterior.
- **Dependência lenta**: acione o runbook específico (ex.: replication lag,
  long-running queries, redis memory pressure). Considere circuit breaker/timeout
  mais curto para proteger a API.
- **Pool esgotado**: aumente o pool de conexões/threads com cautela (não maior que
  o que a dependência aguenta).

## Causa raiz (pós-incidente)
- Reconstrua a timeline (deploy, tráfego, alertas) e o gargalo dominante nos traces.
- Se saturação recorrente, revise dimensionamento/HPA e capacidade planejada.
- Se dependência, endereçe na fonte (índice faltando, cache, backpressure).
- Ajuste o error budget e revise se o SLO/alertas refletem a experiência real.

## Referências
- Runbook: `observability/trace-latency-hotspot.md`
- Runbook: `database/postgres-long-running-queries.md`
- Runbook: `incident/incident-comms-bridge.md`
