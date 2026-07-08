---
id: monitoring-missing-metrics
title: Métricas Ausentes / Target de Scrape Down
description: Diagnóstico de séries que sumiram ou targets do Prometheus que pararam de ser coletados.
category: monitoring
severity: SEV2
tags: [monitoring, prometheus, scrape, targets, servicemonitor]
estimatedTime: 25m
tools: [promtool, kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar escopo
    detail: Quais métricas sumiram? De um serviço só ou de vários? Desde quando (deploy/mudança)?
  - type: command
    title: Ver saúde dos targets (up == 0)
    command: "curl -s {{promUrl}}/api/v1/targets | jq '.data.activeTargets[] | select(.health!=\"up\") | {job:.labels.job, url:.scrapeUrl, err:.lastError}'"
  - type: query
    title: Conferir a série no Prometheus
    command: "up{job=\"{{job}}\"}"
  - type: command
    title: Ver o ServiceMonitor/PodMonitor
    command: "kubectl get servicemonitor,podmonitor -A | grep {{app}}"
  - type: command
    title: Checar o endpoint /metrics do pod
    command: "kubectl exec -n {{namespace}} {{pod}} -- curl -s localhost:{{port}}/metrics | head"
  - type: link
    title: Dashboard de cobertura de scrape
    url: https://grafana.example.com/d/prometheus-targets
---

## Contexto
Métricas que somem quebram dashboards e, pior, **silenciam alertas** (uma regra que
depende de série ausente pode nunca disparar). Causas: target de scrape caiu, label
mudou (deploy renomeou job/instance), `ServiceMonitor` com selector errado, endpoint
`/metrics` fora do ar, ou retenção/cardinalidade estourando o Prometheus.

## Diagnóstico
1. **Target up?** — `up == 0` (ou target ausente) com `lastError` aponta a causa:
   connection refused (app não expõe), 404 (path errado), timeout (lento/rede).
2. **Selector** — o `ServiceMonitor`/`PodMonitor` casa com os labels do Service?
   Um deploy que mudou labels desconecta o scrape silenciosamente.
3. **Endpoint** — `curl localhost:port/metrics` de dentro do pod confirma se a app
   ainda expõe as métricas (mudança de porta/flag).
4. **Label drift** — se a série existe mas com outro `job`/`instance`, alertas e
   dashboards que filtram pelo label antigo "perdem" a métrica.
5. **Cardinalidade** — Prometheus com OOM/`too many samples` pode dropar séries;
   veja `prometheus_tsdb_head_series`.

## Mitigação
- **Selector/label errado**: corrija o `ServiceMonitor` ou os labels do Service e
  aguarde o próximo scrape; recarregue config (`promtool` / SIGHUP) se necessário.
- **Endpoint fora**: corrija porta/path/flag de métricas no deploy.
- **Cardinalidade**: reduza labels de alta cardinalidade (IDs, request paths crus),
  aumente recursos do Prometheus ou ajuste retenção.

## Causa raiz (pós-incidente)
- Alerta de **meta-monitoramento**: `up == 0` e `absent(métrica_crítica)` devem
  alertar (senão a ausência passa despercebida).
- Trate mudança de labels de métrica como mudança de contrato (revisão + changelog).

## Referências
- Runbook: `monitoring/alert-noise-triage.md`, `observability/log-volume-spike.md`
- Docs: Prometheus Operator (ServiceMonitor), `absent()` para alertas de ausência.
