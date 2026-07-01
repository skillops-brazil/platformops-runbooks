---
id: observability-trace-latency-hotspot
title: Localizar Hotspot de Latência via Tracing Distribuído
description: Usar traces para achar o span/dependência responsável por latência alta em uma rota.
category: observability
severity: SEV2
tags: [observability, tracing, latency, tempo, jaeger, opentelemetry]
estimatedTime: 30m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Delimitar o sintoma
    detail: Qual rota/endpoint está lento? p95/p99? Começou após um deploy?
  - type: query
    title: Confirmar a degradação (métrica RED)
    command: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{route=\"{{route}}\"}[5m])) by (le))"
  - type: link
    title: Abrir traces lentos no Tempo/Jaeger
    url: https://grafana.example.com/explore?tracing={{service}}
  - type: checklist
    title: Ler um trace representativo do p99
    detail: Qual span domina o tempo total? É I/O (DB/HTTP externo), fila, ou CPU no serviço?
  - type: query
    title: Correlacionar com o serviço dependente
    command: "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{service=\"{{dependency}}\"}[5m])) by (le))"
  - type: link
    title: Logs correlacionados por trace_id
    url: https://grafana.example.com/explore?logs=trace_id
---

## Contexto
Latência alta numa rota raramente é do serviço de entrada — quase sempre é uma
**dependência** (DB, cache, chamada HTTP externa, fila). Tracing distribuído mostra
o caminho completo da requisição e revela **qual span** consome o tempo, evitando
otimizar o lugar errado. Este runbook parte de um SLO de latência estourado até a
dependência culpada.

## Diagnóstico
1. **Confirme com métrica RED** — p95/p99 da rota (não a média, que esconde cauda).
2. **Pegue um trace do p99** — no Tempo/Jaeger, filtre por duração alta na rota.
   Olhe o waterfall: o span mais largo é o hotspot.
3. **Classifique o span**: I/O (query lenta, N+1, external API), espera (fila,
   lock, pool exausto) ou CPU (serialização, laço).
4. **Correlacione** — a latência do span bate com a métrica do serviço dependente?
   Um `trace_id` nos logs conecta trace ↔ log da mesma requisição.
5. **N+1** — muitos spans pequenos e sequenciais para a mesma dependência indicam
   problema de acesso a dados, não lentidão pontual.

## Mitigação
- **Query/dependência lenta**: veja o runbook do alvo (ex.:
  `database/postgres-long-running-queries.md`) — índice, plano, cache.
- **Pool exausto / espera**: aumente/ajuste connection pool, timeouts e retries com
  backoff (retry sem backoff amplifica a latência).
- **N+1**: batch/eager-load; adicione cache na borda quente.
- **Deploy regressor**: se começou num release, faça rollback e investigue offline.

## Causa raiz (pós-incidente)
- Garanta **instrumentação** (OpenTelemetry) nas dependências críticas — trace que
  "acaba" no serviço de entrada não ajuda.
- Alerte por **SLO de latência** (burn rate), não por threshold fixo de CPU.

## Referências
- Runbook: `incident/high-latency-api.md`, `database/postgres-long-running-queries.md`
- Docs: OpenTelemetry, Grafana Tempo (trace to logs/metrics).
