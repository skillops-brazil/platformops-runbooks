---
id: k8s-pvc-pending
title: PersistentVolumeClaim Preso em Pending
description: Diagnóstico de PVC que não faz bind e do pod que não agenda por falta de volume.
category: kubernetes
severity: SEV3
tags: [kubernetes, storage, pvc, pv, storageclass]
estimatedTime: 20m
tools: [kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar sintoma
    detail: Pod preso em Pending? PVC em Pending? Deploy novo ou carga existente?
  - type: command
    title: Ver o PVC e seu status
    command: "kubectl get pvc {{pvc}} -n {{namespace}} -o wide"
  - type: command
    title: Descrever o PVC (eventos do provisionamento)
    command: "kubectl describe pvc {{pvc}} -n {{namespace}}"
  - type: command
    title: Ver a StorageClass usada
    command: "kubectl get storageclass {{storageclass}} -o yaml"
  - type: command
    title: Checar o pod que consome o PVC
    command: "kubectl describe pod {{pod}} -n {{namespace}}"
  - type: command
    title: Ver logs do provisioner CSI
    command: "kubectl logs -n kube-system -l app={{csi_driver}} --tail=100"
  - type: link
    title: Console de volumes do provedor (EBS/PD/Disks)
    url: https://console.aws.amazon.com/ec2/home#Volumes
---

## Contexto
Um `PersistentVolumeClaim` fica em `Pending` quando não consegue fazer bind a um
`PersistentVolume`. Como consequência, o pod que o monta também fica `Pending`
com evento `FailedScheduling` / `waiting for volume to be created`.

Causas comuns: StorageClass inexistente ou errada, `WaitForFirstConsumer` sem pod
agendável, cota de volumes do provedor estourada, zona de disponibilidade
incompatível entre o PV e o nó, ou o CSI driver com falha.

## Diagnóstico
1. **Eventos do PVC** — `kubectl describe pvc` normalmente diz tudo:
   `storageclass.storage.k8s.io "x" not found`, `failed to provision volume`,
   `ProvisioningFailed` com erro do provedor (cota, permissão IAM, AZ).
2. **StorageClass** — confirme que existe e se `volumeBindingMode` é
   `WaitForFirstConsumer` (o bind só ocorre quando um pod é agendado) ou
   `Immediate`.
3. **Topologia/AZ** — em multi-AZ, o volume é criado numa zona; o pod precisa
   agendar num nó dessa mesma zona. Incompatibilidade trava o bind.
4. **CSI driver** — os logs do provisioner mostram erros de API do provedor
   (permissão IAM, limite de volumes por instância, quota da conta).

## Mitigação
- **StorageClass errada/ausente**: corrija o campo `storageClassName` no PVC
  (recrie o PVC — é imutável) ou crie a StorageClass esperada.
- **WaitForFirstConsumer**: garanta que o pod é agendável (tem nó com recursos e
  na AZ certa). O PVC só faz bind quando o scheduler escolhe o nó.
- **Cota do provedor**: solicite aumento de limite ou libere volumes órfãos.
- **Permissão IAM** (EKS): confirme que a role do CSI tem `ec2:CreateVolume`,
  `ec2:AttachVolume` etc.

## Causa raiz (pós-incidente)
- Padronize StorageClasses e documente qual usar por tipo de carga.
- Monitore cota de volumes e alerte antes de estourar.
- Para cargas multi-AZ, use `WaitForFirstConsumer` e topologia consistente.

## Referências
- Runbook: `kubernetes/node-notready.md`
- Docs Kubernetes: Storage Classes / Volume Binding Mode.
