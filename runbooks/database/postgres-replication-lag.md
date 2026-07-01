---
id: db-postgres-replication-lag
title: Lag de Replicação no PostgreSQL
description: Diagnóstico e mitigação de atraso entre primário e réplicas do PostgreSQL.
category: database
severity: SEV2
tags: [database, postgres, replication, lag, replica]
estimatedTime: 25m
tools: [psql]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar impacto
    detail: Leituras nas réplicas retornam dados velhos? Failover em risco? Qual réplica está atrasada?
  - type: query
    title: Ver estado da replicação (no primário)
    query: "SELECT client_addr, application_name, state, write_lag, flush_lag, replay_lag, sync_state FROM pg_stat_replication;"
  - type: query
    title: Medir lag em segundos (na réplica)
    query: "SELECT now() - pg_last_xact_replay_timestamp() AS replication_delay;"
  - type: query
    title: Ver posição de WAL e diferença de bytes (no primário)
    query: "SELECT client_addr, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS bytes_behind FROM pg_stat_replication;"
  - type: query
    title: Consultas longas segurando replay na réplica
    query: "SELECT pid, now()-query_start AS duration, state, query FROM pg_stat_activity WHERE state <> 'idle' ORDER BY duration DESC LIMIT 10;"
  - type: query
    title: Ver conflitos de recovery (na réplica)
    query: "SELECT * FROM pg_stat_database_conflicts WHERE datname = '{{db}}';"
  - type: link
    title: Dashboard de replicação
    url: https://grafana.example.com/d/postgres-replication
  - type: approval
    title: Aprovar mitigação (matar query / ajustar carga)
    detail: Encerrar consulta longa na réplica ou reduzir carga de escrita no primário.
---

## Contexto
Lag de replicação é o atraso entre uma escrita no primário e sua aplicação numa
réplica. Isso causa **leituras desatualizadas** (se a app lê de réplicas) e
**risco em failover** (perda potencial de dados / promoção de réplica atrasada).

Causas comuns: pico de escrita no primário (mais WAL do que a réplica consegue
aplicar), consulta longa na réplica bloqueando o replay (conflito de recovery),
rede saturada entre nós, ou I/O/CPU insuficiente na réplica.

## Diagnóstico
1. **Quantificar** — no primário, `pg_stat_replication` mostra `replay_lag` por
   réplica; na réplica, `pg_last_xact_replay_timestamp()` dá o atraso em segundos.
   `pg_wal_lsn_diff` dá o atraso em bytes.
2. **Gargalo de replay** — consultas longas na réplica podem segurar o replay
   (conflito). Verifique `pg_stat_activity` e `pg_stat_database_conflicts`.
3. **Volume de WAL** — se o primário gera WAL mais rápido do que a réplica aplica,
   o lag cresce continuamente sob carga (bulk load, migração, reindex).
4. **Recursos** — I/O/CPU no teto na réplica limitam o replay.

## Mitigação
- **Consulta longa na réplica**: encerre-a (`pg_terminate_backend`) para liberar o
  replay; ajuste `hot_standby_feedback`/`max_standby_streaming_delay` conforme a
  necessidade (trade-off entre leituras longas e lag).
- **Pico de escrita**: pause/atrase o job de bulk load ou migração que gera WAL.
- **Rede/recursos**: garanta banda entre nós; escale I/O/CPU da réplica.
- **App lendo velho**: temporariamente roteie leituras sensíveis para o primário.

## Causa raiz (pós-incidente)
- Se recorrente em bulk loads, faça-os em janelas e/ou com throttling.
- Dimensione a réplica com I/O suficiente para o pico de WAL.
- Alerte em lag de segundos E bytes; monitore o risco de failover.

## Referências
- Runbook: `database/postgres-long-running-queries.md`
- Runbook: `aws/rds-connection-exhaustion.md`
- Docs PostgreSQL: Hot Standby / Monitoring Replication.
