---
id: k8s-crashloop-triage
title: Triagem de Pod em CrashLoopBackOff
description: Diagnóstico e mitigação de pods reiniciando em loop.
category: kubernetes
severity: SEV2
tags: [kubernetes, crashloop, pods, incident, triagem]
estimatedTime: 15m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar escopo e impacto
    detail: Quantos pods afetados? Qual serviço/deployment? Afeta tráfego de usuários ou é interno?
  - type: command
    title: Listar pods problemáticos no namespace
    command: "kubectl get pods -n {{namespace}} --field-selector=status.phase!=Running"
  - type: command
    title: Ver contagem de restarts e estado
    command: "kubectl get pod {{pod}} -n {{namespace}} -o wide"
  - type: command
    title: Descrever o pod (eventos e último estado)
    command: "kubectl describe pod {{pod}} -n {{namespace}}"
  - type: command
    title: Ver logs da encarnação anterior (que crashou)
    command: "kubectl logs -n {{namespace}} {{pod}} --previous --tail=200"
  - type: command
    title: Checar exit code do último container
    command: "kubectl get pod {{pod}} -n {{namespace}} -o jsonpath='{.status.containerStatuses[*].lastState.terminated.exitCode}{\"\\n\"}'"
  - type: link
    title: Dashboard do serviço no Grafana
    url: https://grafana.example.com/d/{{dashboard_uid}}
  - type: approval
    title: Aprovar rollback se for regressão de deploy
    detail: Se o crash começou após um deploy recente, aprovar reversão para a revisão anterior.
  - type: command
    title: Rollback do deployment (se aprovado)
    command: "kubectl rollout undo deployment/{{deployment}} -n {{namespace}}"
---

## Contexto
Este runbook se aplica quando um ou mais pods entram em `CrashLoopBackOff`:
o container inicia, termina com erro e o kubelet o reinicia com backoff exponencial
crescente. Alertas típicos que disparam: `KubePodCrashLooping`,
`KubeContainerWaiting` ou aumento de erros 5xx no serviço.

Sintomas: pods com `RESTARTS` subindo rápido, estado `CrashLoopBackOff` ou
`Error`, e possível queda de réplicas prontas atrás do Service.

## Diagnóstico
1. **Escopo** — `kubectl get pods` mostra quais pods e quantos. Um único pod
   sugere problema de nó/local; todos os pods de um deployment sugerem regressão
   de imagem/config.
2. **Eventos** — `kubectl describe pod` revela a causa na seção `Events`
   (ex.: `Back-off restarting failed container`, `OOMKilled`, falha de
   liveness probe, `ImagePullBackOff`).
3. **Logs anteriores** — `--previous` traz o stdout/stderr da encarnação que
   crashou; é aqui que aparece stack trace, erro de conexão, config faltando.
4. **Exit code** — `137` = OOMKilled (ver runbook de OOMKilled); `1`/`2` = erro
   da aplicação; `139` = segfault; `143` = SIGTERM (encerramento).

## Mitigação
- **Regressão de deploy**: se o crash começou logo após um rollout, faça
  `kubectl rollout undo deployment/{{deployment}} -n {{namespace}}` para voltar à
  revisão saudável.
- **Config/secret ausente**: aplique o ConfigMap/Secret correto e reinicie:
  `kubectl rollout restart deployment/{{deployment}} -n {{namespace}}`.
- **Liveness probe agressiva demais**: se a app precisa de mais tempo para subir,
  aumente `initialDelaySeconds`/`failureThreshold` da probe.
- **Dependência externa fora do ar** (DB, fila): estabilize a dependência; a app
  volta sozinha quando ela responder.

## Causa raiz (pós-incidente)
- Correlacione o início dos restarts com o histórico de deploys
  (`kubectl rollout history deployment/{{deployment}} -n {{namespace}}`).
- Verifique se faltou uma migração de banco, variável de ambiente ou secret.
- Se foi OOM, revise `resources.limits.memory` e o perfil de memória da app.
- Adicione/ajuste testes de smoke pós-deploy e probes que reflitam a saúde real.

## Referências
- Runbook: `kubernetes/oomkilled-pod.md`
- Runbook: `incident/high-latency-api.md`
- Docs Kubernetes: Debug Running Pods.
