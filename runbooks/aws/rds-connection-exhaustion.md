---
id: aws-rds-connection-exhaustion
title: Esgotamento de Conexões no RDS/Aurora
description: Diagnóstico e mitigação de "too many connections" no banco gerenciado.
category: aws
severity: SEV1
tags: [aws, rds, aurora, postgres, connections, pool]
estimatedTime: 25m
tools: [aws, psql]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar impacto
    detail: Aplicações recebendo "too many connections" / "remaining connection slots reserved"? Quais serviços?
  - type: cloud
    title: Ver métrica DatabaseConnections (CloudWatch)
    command: "aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections --dimensions Name=DBInstanceIdentifier,Value={{db_instance}} --start-time {{start}} --end-time {{end}} --period 60 --statistics Maximum --region {{region}}"
  - type: cloud
    title: Ver max_connections do parameter group
    command: "aws rds describe-db-parameters --db-parameter-group-name {{param_group}} --query \"Parameters[?ParameterName=='max_connections']\" --region {{region}}"
  - type: query
    title: Contar conexões por estado e app
    query: "SELECT state, application_name, count(*) FROM pg_stat_activity GROUP BY 1,2 ORDER BY 3 DESC;"
  - type: query
    title: Identificar conexões idle in transaction (vazamento)
    query: "SELECT pid, usename, state, now()-state_change AS idle_for, query FROM pg_stat_activity WHERE state='idle in transaction' ORDER BY idle_for DESC;"
  - type: approval
    title: Aprovar encerramento de conexões presas
    detail: Matar conexões idle in transaction antigas libera slots, mas pode abortar transações.
  - type: query
    title: Encerrar conexões idle in transaction antigas
    query: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle in transaction' AND now()-state_change > interval '10 minutes';"
  - type: link
    title: Dashboard de conexões do banco
    url: https://grafana.example.com/d/rds-connections
---

## Contexto
O RDS/Aurora tem um teto de conexões (`max_connections`, geralmente função da
classe de instância). Quando esgota, novas conexões falham com
`FATAL: too many connections` / `remaining connection slots are reserved`, e as
aplicações quebram em cascata. É tipicamente SEV1 porque afeta todos os serviços
que dependem do banco.

Causas comuns: falta de pooler (cada pod abre muitas conexões), vazamento de
conexões (`idle in transaction`), pico de tráfego/réplicas, ou `max_connections`
subdimensionado após scale-out da aplicação.

## Diagnóstico
1. **Confirmar saturação** — `DatabaseConnections` no CloudWatch encostando em
   `max_connections`. Compare os dois.
2. **Quem consome** — `pg_stat_activity` agrupado por `application_name`/estado
   mostra qual serviço abriu mais conexões e quantas estão ociosas.
3. **Vazamento** — muitas conexões `idle in transaction` há minutos indicam
   transação não commitada/rollback (bug de app ou pool mal configurado).
4. **Sem pooler** — se cada réplica de app abre um pool próprio,
   `réplicas × pool_size` pode passar do teto facilmente.

## Mitigação
- **Alívio imediato**: encerre conexões `idle in transaction` antigas com
  `pg_terminate_backend` (aprovação necessária — aborta transações).
- **Reduzir demanda**: diminua `pool_size` das aplicações ou reduza réplicas
  temporariamente.
- **Pooler**: coloque RDS Proxy / PgBouncer na frente para multiplexar conexões.
- **Escalar**: subir a classe da instância aumenta `max_connections`; requer
  janela (failover). Não aumente `max_connections` além do que a RAM suporta.

## Causa raiz (pós-incidente)
- Introduza pooling (RDS Proxy/PgBouncer) como padrão para todas as apps.
- Corrija vazamentos: garanta commit/rollback e timeout de transação na aplicação
  (`idle_in_transaction_session_timeout`).
- Dimensione `pool_size × réplicas` com folga sob o teto e alerte em 80%.

## Referências
- Runbook: `database/postgres-long-running-queries.md`
- Runbook: `database/postgres-replication-lag.md`
- Docs AWS: RDS Proxy / max_connections.
