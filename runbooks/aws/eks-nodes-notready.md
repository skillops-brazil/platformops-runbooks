---
id: aws-eks-nodes-notready
title: Nós do EKS NotReady / Nodegroup sem Capacidade
description: Diagnóstico de nós EKS que não entram no cluster ou ficam NotReady.
category: aws
severity: SEV2
tags: [aws, eks, nodes, notready, autoscaling, nodegroup]
estimatedTime: 30m
tools: [aws, kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar escopo
    detail: Nós existentes ficaram NotReady ou novos nós não entram no cluster? Qual nodegroup/cluster?
  - type: command
    title: Ver nós pelo Kubernetes
    command: "kubectl get nodes -o wide"
  - type: cloud
    title: Estado do managed nodegroup
    command: "aws eks describe-nodegroup --cluster-name {{cluster}} --nodegroup-name {{nodegroup}} --region {{region}}"
  - type: cloud
    title: Atividade do Auto Scaling Group
    command: "aws autoscaling describe-scaling-activities --auto-scaling-group-name {{asg}} --max-records 10 --region {{region}}"
  - type: cloud
    title: Checar limites/erros de capacidade EC2
    command: "aws ec2 describe-instances --filters Name=tag:eks:nodegroup-name,Values={{nodegroup}} Name=instance-state-name,Values=running --region {{region}} --query 'Reservations[].Instances[].{Id:InstanceId,State:State.Name,AZ:Placement.AvailabilityZone}'"
  - type: checklist
    title: Verificar IAM/aws-auth e rede
    detail: Role do nó no configmap aws-auth? Subnets com rota p/ o control plane? SG do cluster liberando o nó?
  - type: command
    title: Eventos do cluster-autoscaler
    command: "kubectl logs -n kube-system -l app=cluster-autoscaler --tail=100"
  - type: link
    title: Console do EKS (cluster/nodegroup)
    url: https://console.aws.amazon.com/eks/home?region={{region}}#/clusters/{{cluster}}
  - type: approval
    title: Aprovar reciclagem do nodegroup
    detail: Substituir nós requer capacidade e pode impactar cargas. Confirmar PDBs e capacidade.
---

## Contexto
Nós do EKS podem ficar `NotReady` (nó já registrado deixou de reportar) ou
**nunca entrar** no cluster (a instância sobe mas não vira nó). Isso trava
agendamento e pode gerar pods `Pending` acumulando.

Causas comuns: role do nó ausente no `aws-auth`, subnets sem rota para o endpoint
do control plane, Security Group bloqueando, capacidade EC2 esgotada
(`InsufficientInstanceCapacity`), AMI/bootstrap com problema, ou disco cheio.

## Diagnóstico
1. **Existente vs. novo** — se nós que estavam Ready ficaram NotReady, trate como
   `kubernetes/node-notready.md` (kubelet, disco, rede do host). Se **novos** nós
   não aparecem no `kubectl get nodes`, é registro/bootstrap.
2. **Nodegroup** — `describe-nodegroup` mostra `health.issues`
   (ex.: `NodeCreationFailure`, `AccessDenied`, `InsufficientFreeAddresses`).
3. **ASG** — `describe-scaling-activities` revela falha de launch
   (`InsufficientInstanceCapacity` na AZ, quota vCPU, launch template inválido).
4. **Registro** — role do nó precisa estar no `aws-auth` configmap; sem isso o
   kubelet não autentica e o nó não registra.
5. **Rede** — subnets do nodegroup precisam de rota ao endpoint do cluster e o SG
   do cluster deve permitir o tráfego dos nós.

## Mitigação
- **Capacidade EC2**: diversifique tipos de instância no nodegroup, adicione mais
  AZs/subnets, ou solicite aumento de quota vCPU.
- **aws-auth**: adicione a role do nó ao configmap
  (`kubectl edit configmap aws-auth -n kube-system`).
- **Rede/SG**: corrija rotas das subnets e regras do Security Group do cluster.
- **Nós travados**: recicle o nodegroup (substitua instâncias); o ASG sobe novas.
- Se pods estão `Pending` por falta de nó, o `cluster-autoscaler` deve escalar —
  verifique seus logs por erros.

## Causa raiz (pós-incidente)
- Se foi capacidade, ajuste estratégia de instâncias/AZ e alerte quota.
- Se foi rede/IAM, verifique drift de IaC (Terraform) que causou a divergência.
- Monitore `aws-auth` e endpoints privados; documente as subnets/SGs esperados.

## Referências
- Runbook: `kubernetes/node-notready.md`
- Runbook: `kubernetes/pvc-pending.md`
- Docs AWS: EKS Troubleshooting / worker nodes fail to join.
