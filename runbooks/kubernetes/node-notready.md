---
id: k8s-node-notready
title: Nó Kubernetes em NotReady
description: Diagnóstico e recuperação de um nó que ficou NotReady e drenagem segura de cargas.
category: kubernetes
severity: SEV2
tags: [kubernetes, node, notready, kubelet, drain]
estimatedTime: 25m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar impacto
    detail: Quantos nós NotReady? Há capacidade nos nós saudáveis para reagendar? Cargas stateful envolvidas?
  - type: command
    title: Listar nós e status
    command: "kubectl get nodes -o wide"
  - type: command
    title: Descrever o nó afetado (conditions e eventos)
    command: "kubectl describe node {{node}}"
  - type: command
    title: Ver pods rodando no nó
    command: "kubectl get pods -A --field-selector spec.nodeName={{node}} -o wide"
  - type: command
    title: Checar pressão de recursos do nó
    command: "kubectl top node {{node}}"
  - type: checklist
    title: Inspecionar kubelet/containerd no host
    detail: "Via SSH/SSM: systemctl status kubelet; journalctl -u kubelet --since '30 min ago'. Disco cheio? Rede? Certificado expirado?"
  - type: command
    title: Cordon do nó (impedir novos agendamentos)
    command: "kubectl cordon {{node}}"
  - type: approval
    title: Aprovar drain do nó
    detail: Drenar move as cargas para outros nós. Confirmar capacidade e impacto em PodDisruptionBudgets.
  - type: command
    title: Drain do nó respeitando PDBs
    command: "kubectl drain {{node}} --ignore-daemonsets --delete-emptydir-data --timeout=300s"
  - type: link
    title: Dashboard de saúde dos nós
    url: https://grafana.example.com/d/node-health
---

## Contexto
Um nó `NotReady` deixou de reportar heartbeat saudável ao control plane.
O kubelet pode ter parado, o nó pode estar sem disco/CPU, com problema de rede,
ou o certificado do kubelet pode ter expirado. Após ~5min, o control plane começa
a evacuar (evict) os pods do nó, o que pode causar indisponibilidade.

Alertas típicos: `KubeNodeNotReady`, `KubeNodeUnreachable`.

## Diagnóstico
1. **Escopo** — `kubectl get nodes` mostra quantos nós e há quanto tempo.
   Vários nós NotReady simultâneos apontam para problema de control plane/rede,
   não do nó individual.
2. **Conditions** — `kubectl describe node` mostra `MemoryPressure`,
   `DiskPressure`, `PIDPressure` e a razão do `Ready=False`
   (ex.: `KubeletNotReady`, `NodeStatusUnknown`).
3. **Cargas em risco** — liste os pods do nó; identifique stateful/singletons.
4. **No host** — via SSH/SSM verifique `kubelet` (`systemctl status kubelet`),
   uso de disco (`df -h`, especialmente `/var/lib/containerd`), e logs
   (`journalctl -u kubelet`).

## Mitigação
- **Kubelet parado**: `systemctl restart kubelet` no host. Se voltar Ready,
   monitore e não é preciso drenar.
- **Disco cheio**: limpe imagens/logs (`crictl rmi --prune`), expanda o volume.
- **Nó irrecuperável**: `kubectl cordon {{node}}` e depois
   `kubectl drain {{node}}` para evacuar com segurança; então recicle o nó
   (terminar a instância deixa o autoscaler subir uma nova).
- Respeite `PodDisruptionBudgets`; se o drain travar, investigue o PDB antes de
   forçar.

## Causa raiz (pós-incidente)
- Correlacione com uso de disco/memória, atualizações de AMI/kernel, ou eventos
   de spot/preemption.
- Se recorrente por disco, ajuste rotação de logs e limpeza de imagens.
- Se por rede, revise CNI e MTU. Considere `node-problem-detector` para detecção
   proativa.

## Referências
- Runbook: `aws/eks-nodes-notready.md`
- Runbook: `kubernetes/pvc-pending.md`
- Docs Kubernetes: Safely Drain a Node.
