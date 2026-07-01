---
id: k8s-oomkilled-pod
title: Pod Terminado por OOMKilled
description: Investigação e mitigação de containers mortos por falta de memória (exit 137).
category: kubernetes
severity: SEV2
tags: [kubernetes, oom, memory, limits, exit137]
estimatedTime: 20m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar que é OOM
    detail: Restarts crescentes + reason OOMKilled + exit code 137? Um pod ou todos do deployment?
  - type: command
    title: Ver último estado e reason do container
    command: "kubectl get pod {{pod}} -n {{namespace}} -o jsonpath='{.status.containerStatuses[*].lastState.terminated.reason}{\"\\n\"}'"
  - type: command
    title: Ver limites/requests configurados
    command: "kubectl get pod {{pod}} -n {{namespace}} -o jsonpath='{.spec.containers[*].resources}{\"\\n\"}'"
  - type: command
    title: Uso atual de memória dos pods
    command: "kubectl top pod -n {{namespace}} --containers"
  - type: command
    title: Eventos recentes do namespace
    command: "kubectl get events -n {{namespace}} --sort-by='.lastTimestamp' | grep -i oom"
  - type: link
    title: Gráfico de memória do container
    url: https://grafana.example.com/d/container-memory
  - type: approval
    title: Aprovar aumento de limite de memória
    detail: Ajustar resources.limits.memory tem custo de capacidade. Confirmar com dono do serviço.
  - type: command
    title: Aplicar novo limite via patch
    command: "kubectl set resources deployment/{{deployment}} -n {{namespace}} --limits=memory={{new_limit}} --requests=memory={{new_request}}"
---

## Contexto
Quando um container excede seu `resources.limits.memory`, o cgroup dispara o OOM
killer do kernel e o container é morto com `reason: OOMKilled` e exit code `137`.
O kubelet o reinicia; se o consumo volta a estourar, vira `CrashLoopBackOff`.

Alertas típicos: `KubePodCrashLooping`, `KubeContainerOOMKilled`, ou latência/erros
no serviço afetado.

## Diagnóstico
1. **Confirmar OOM** — `lastState.terminated.reason == OOMKilled` e exit `137`.
   Se for OOM do **nó** (e não do container), o `describe node` mostra
   `MemoryPressure` e evictions — trate como problema de capacidade do nó.
2. **Limites vs. uso** — compare `resources.limits.memory` com o `kubectl top`.
   Se o uso encosta no limite sob carga, o limite está baixo demais.
3. **Padrão de crescimento** — memória subindo continuamente entre restarts
   sugere **vazamento** na aplicação, não só limite baixo.
4. **Escopo** — todos os pods do deployment sugerem regressão/carga geral; um só
   pod sugere hot partition ou request específico.

## Mitigação
- **Limite baixo, sem vazamento**: aumente `limits.memory` (e `requests`) para o
  pico observado + folga. Use `kubectl set resources`.
- **Vazamento de memória**: mitigue com restart programado e/ou reduzindo réplicas
  por nó; a correção real é na aplicação.
- **JVM/Node/Python**: alinhe o heap ao limite do container
  (`-Xmx`, `--max-old-space-size`); o limite do cgroup precisa ser maior que o
  heap + overhead.
- Se o nó está sob pressão, considere reagendar/escalar nós.

## Causa raiz (pós-incidente)
- Analise o perfil de memória e o que muda no pico (batch, cache, payloads).
- Estabeleça `requests`/`limits` baseados em dados históricos, não em chute.
- Adicione alerta de "memória > 85% do limite" para antecipar OOM.
- Se vazamento, abra issue de correção na aplicação com o heap dump.

## Referências
- Runbook: `kubernetes/crashloop-triage.md`
- Runbook: `kubernetes/node-notready.md`
- Docs Kubernetes: Assign Memory Resources / OOM.
