---
id: observability-log-volume-spike
title: Pico de Volume de Logs (Custo e Ruído)
description: Conter um aumento súbito de ingestão de logs que ameaça custo, retenção e a stack de logging.
category: observability
severity: SEV2
tags: [observability, logs, loki, elasticsearch, ingestion, cost]
estimatedTime: 25m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar o pico
    detail: Quando começou? Qual a taxa atual vs. baseline? Há risco de estourar cota/disco?
  - type: query
    title: Taxa de ingestão por serviço (Loki)
    command: "topk(10, sum(rate({job=~\".+\"}[5m])) by (namespace, app))"
  - type: command
    title: Top pods por linhas de log recentes (k8s)
    command: "kubectl logs -n {{namespace}} {{pod}} --since=5m 2>/dev/null | wc -l"
  - type: checklist
    title: Identificar a natureza do pico
    detail: Erro em loop? Debug ligado em produção? Novo deploy verboso? Stacktrace repetido?
  - type: approval
    title: Aprovar mitigação (baixar nível de log / drop)
    detail: Confirmar que não vai descartar logs necessários a um incidente em curso.
  - type: link
    title: Dashboard de ingestão e cota
    url: https://grafana.example.com/d/log-ingestion
---

## Contexto
Um pico de logs tem impacto duplo: **custo** (ingestão/retenção cobradas por volume)
e **operacional** (a stack de logging satura, indexação atrasa, disco enche e você
perde justamente os logs do incidente). Causas típicas: erro em loop cuspindo
stacktrace, `DEBUG` ligado em produção, deploy verboso, ou retry storm.

## Diagnóstico
1. **Quem gera** — ranqueie a taxa por `namespace`/`app`; um único serviço costuma
   dominar o pico.
2. **O quê** — amostre as linhas: é a **mesma** mensagem repetida (loop/erro) ou
   volume legítimo? `DEBUG`/`TRACE` em produção multiplica o volume.
3. **Correlato a erro?** — pico de logs junto com pico de erros aponta incidente
   real (trate a causa, não só o volume).
4. **Cota/disco** — verifique quanto falta para estourar a cota do provedor ou o
   disco do coletor; isso define a urgência.

## Mitigação
- **Loop/erro**: trate a causa (é um incidente) — corrigir o erro estanca o log.
- **DEBUG em produção**: baixe o nível de log do serviço (config/flag) e faça
  rollout — ganho imediato e grande.
- **Verbosidade legítima**: aplique sampling/drop na pipeline (Promtail/Fluent Bit/
  OTel Collector) para mensagens de baixo valor; nunca dropar erros.
- **Proteção da stack**: rate-limit por tenant/stream para o pico não derrubar a
  ingestão dos demais serviços.

## Causa raiz (pós-incidente)
- Alerte por **taxa de ingestão** e por proximidade de cota (antes de estourar).
- Padronize nível de log por ambiente (produção ≠ debug) e revise logs de alto
  volume/baixo valor.

## Referências
- Runbook: `monitoring/missing-metrics.md`, `observability/trace-latency-hotspot.md`
- Docs: Grafana Loki (limits/retention), Fluent Bit/OTel Collector (sampling).
