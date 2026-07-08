---
id: db-redis-memory-pressure
title: Pressão de Memória no Redis (Evictions / OOM)
description: Diagnóstico de Redis próximo de maxmemory, com evictions ou rejeição de escritas.
category: database
severity: SEV2
tags: [database, redis, cache, memory, eviction, maxmemory]
estimatedTime: 20m
tools: [redis-cli]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar sintoma
    detail: Erros OOM command not allowed? Cache hit ratio caindo? Latência subindo? Evictions crescendo?
  - type: command
    title: Ver seção de memória
    command: "redis-cli -h {{host}} -p {{port}} INFO memory"
  - type: command
    title: Ver política e limite de maxmemory
    command: "redis-cli -h {{host}} -p {{port}} CONFIG GET maxmemory maxmemory-policy"
  - type: command
    title: Ver evictions e expired keys
    command: "redis-cli -h {{host}} -p {{port}} INFO stats | grep -E 'evicted_keys|expired_keys|keyspace'"
  - type: command
    title: Amostrar as maiores chaves (bigkeys)
    command: "redis-cli -h {{host}} -p {{port}} --bigkeys"
  - type: command
    title: Ver hit/miss ratio
    command: "redis-cli -h {{host}} -p {{port}} INFO stats | grep -E 'keyspace_hits|keyspace_misses'"
  - type: link
    title: Dashboard de memória do Redis
    url: https://grafana.example.com/d/redis-memory
  - type: approval
    title: Aprovar mitigação (política/flush seletivo/escala)
    detail: Mudar política de eviction, remover chaves sem TTL, ou escalar o node.
---

## Contexto
O Redis opera com um teto `maxmemory`. Ao atingi-lo, o comportamento depende da
`maxmemory-policy`: com `noeviction`, **escritas passam a falhar**
(`OOM command not allowed`), quebrando a aplicação; com políticas `allkeys-lru`/
`volatile-lru`, ele começa a **despejar chaves** (evictions), o que derruba o hit
ratio e desloca carga para o backend (banco).

Causas comuns: chaves sem TTL acumulando, big keys (listas/hashes gigantes),
crescimento natural de dados sem escala, ou fragmentação de memória.

## Diagnóstico
1. **Uso vs. limite** — `INFO memory`: `used_memory` vs. `maxmemory`, e
   `mem_fragmentation_ratio` (bem acima de 1.0 = fragmentação; abaixo de 1.0 =
   swap, ruim).
2. **Política** — `CONFIG GET maxmemory-policy`. `noeviction` explica erros de
   escrita; políticas LRU/LFU explicam evictions.
3. **Evictions/expiração** — `evicted_keys` crescendo confirma pressão. `INFO
   keyspace` mostra quantas chaves têm TTL vs. persistentes.
4. **Big keys** — `--bigkeys` acha chaves anormalmente grandes que consomem
   memória desproporcional e causam latência.
5. **Hit ratio** — queda de `keyspace_hits` relativo a misses indica cache menos
   efetivo por causa de evictions.

## Mitigação
- **noeviction quebrando escritas**: se o Redis é cache (não fonte de verdade),
  troque para `allkeys-lru` para ele auto-regular
  (`CONFIG SET maxmemory-policy allkeys-lru`).
- **Chaves sem TTL**: aplique TTL às chaves de cache; remova padrões conhecidos de
  chaves obsoletas.
- **Big keys**: quebre estruturas gigantes; nunca use `KEYS *` em produção (use
  `SCAN`).
- **Crescimento legítimo**: escale a memória do node / cluster (com janela).
- **Fragmentação alta**: `activedefrag yes` ou reinício controlado de réplica.

## Causa raiz (pós-incidente)
- Padronize TTLs e revise o que é cacheado (o que realmente compensa).
- Alerte em `used_memory > 80% de maxmemory` e em evictions.
- Confirme que a app tolera cache miss/eviction (não trate Redis como storage
  durável salvo se for esse o desenho).

## Referências
- Runbook: `incident/high-latency-api.md`
- Docs Redis: Using Redis as an LRU cache / memory optimization.
