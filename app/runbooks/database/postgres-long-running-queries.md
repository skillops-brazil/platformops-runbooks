---
id: db-postgres-long-running-queries
title: Consultas Longas e Locks no PostgreSQL
description: Identificar e encerrar queries longas e bloqueios que degradam o banco.
category: database
severity: SEV2
tags: [database, postgres, locks, queries, performance, bloat]
estimatedTime: 20m
tools: [psql]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar sintoma
    detail: App lenta/travando? Timeouts? Aumento de conexões idle in transaction? Desde quando?
  - type: query
    title: Listar as consultas mais longas em execução
    query: "SELECT pid, usename, application_name, now()-query_start AS duration, state, wait_event_type, query FROM pg_stat_activity WHERE state <> 'idle' AND now()-query_start > interval '30 seconds' ORDER BY duration DESC;"
  - type: query
    title: Ver bloqueios (quem bloqueia quem)
    query: "SELECT blocked.pid AS blocked_pid, blocked.query AS blocked_query, blocking.pid AS blocking_pid, blocking.query AS blocking_query FROM pg_stat_activity blocked JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid));"
  - type: query
    title: Ver locks detalhados
    query: "SELECT locktype, relation::regclass, mode, granted, pid FROM pg_locks WHERE NOT granted ORDER BY pid;"
  - type: query
    title: Transações idle in transaction (vazamento)
    query: "SELECT pid, usename, now()-state_change AS idle_for, query FROM pg_stat_activity WHERE state='idle in transaction' ORDER BY idle_for DESC;"
  - type: approval
    title: Aprovar encerramento de sessão
    detail: Cancelar/matar uma query aborta o trabalho dela. Confirmar que é seguro (não é migração crítica).
  - type: query
    title: Cancelar a query (mantém a conexão)
    query: "SELECT pg_cancel_backend({{pid}});"
  - type: query
    title: Encerrar a conexão (se cancelar não resolver)
    query: "SELECT pg_terminate_backend({{pid}});"
  - type: link
    title: Dashboard de performance do banco
    url: https://grafana.example.com/d/postgres-perf
---

## Contexto
Consultas longas e cadeias de lock degradam o banco: uma transação que segura um
lock pesado (ex.: `ALTER TABLE`, update em massa, ou `idle in transaction`
esquecida) bloqueia outras, causando fila, timeouts e latência em cascata na
aplicação.

Sintomas: latência subindo (ver `incident/high-latency-api.md`), conexões
acumulando, `wait_event` de lock, e possivelmente esgotamento de conexões.

## Diagnóstico
1. **Queries longas** — `pg_stat_activity` filtrando por duração revela o que está
   rodando há tempo demais. Anote `pid`, `query` e `wait_event_type`.
2. **Cadeia de bloqueio** — `pg_blocking_pids()` mostra quem bloqueia quem; o
   "bloqueador raiz" é quem precisa ser resolvido primeiro.
3. **idle in transaction** — sessões que abriram transação e não commitaram seguram
   locks indefinidamente; é bug de aplicação/pool frequente.
4. **DDL em horário de pico** — `ALTER TABLE`/índices podem pegar lock exclusivo e
   travar tudo.

## Mitigação
- **Cancelar** (`pg_cancel_backend`) tenta abortar a query mantendo a conexão;
  prefira isto primeiro.
- **Terminar** (`pg_terminate_backend`) mata a conexão inteira; use se cancelar não
  resolver.
- **Resolver o bloqueador raiz** primeiro; matar os bloqueados só adia o problema.
- **idle in transaction**: configure `idle_in_transaction_session_timeout` para o
  banco encerrar sozinho; corrija o código que não commita.
- **DDL**: rode migrações pesadas em janela e com `lock_timeout`.

## Causa raiz (pós-incidente)
- Adicione índices para queries que fazem seq scan caro (analise `EXPLAIN`).
- Configure `statement_timeout` e `idle_in_transaction_session_timeout` sensatos.
- Habilite `pg_stat_statements` para achar as queries mais custosas ao longo do
  tempo.

## Referências
- Runbook: `database/postgres-replication-lag.md`
- Runbook: `aws/rds-connection-exhaustion.md`
- Docs PostgreSQL: Lock Monitoring / pg_stat_activity.
