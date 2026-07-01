---
id: security-unauthorized-access-review
title: Revisão de Acesso Não Autorizado (CloudTrail / Audit)
description: Investigar atividade suspeita e determinar escopo de um possível acesso indevido.
category: security
severity: SEV2
tags: [security, cloudtrail, audit, iam, rbac, investigation]
estimatedTime: 45m
tools: [aws, kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Definir o gatilho e o escopo
    detail: O que levantou suspeita (alerta GuardDuty, login incomum, ação inesperada)? Qual identidade/recurso?
  - type: cloud
    title: Eventos recentes da identidade (CloudTrail)
    command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue={{principal}} --max-results 50"
  - type: cloud
    title: Chamadas negadas (tentativas de escalar)
    command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole --max-results 50"
  - type: command
    title: Audit log do Kubernetes (se aplicável)
    command: "kubectl get events -A --sort-by=.lastTimestamp | grep -i {{principal}}"
  - type: cloud
    title: O que a identidade pode fazer
    command: "aws iam list-attached-user-policies --user-name {{principal}}"
  - type: approval
    title: Decidir contenção
    detail: Se confirmado indevido, escalar para o runbook de credencial vazada e revogar acessos.
---

## Contexto
Um sinal de acesso possivelmente indevido (login de local incomum, ação
inesperada, alerta do GuardDuty/SIEM) exige uma revisão estruturada para responder
três perguntas: **quem**, **o quê** e **até onde** chegou. O objetivo é determinar o
escopo antes de reagir — conter de menos deixa brecha; conter de mais causa
indisponibilidade desnecessária.

## Diagnóstico
1. **Timeline da identidade** — CloudTrail por `Username`/`AccessKeyId`: reconstrua
   a sequência de ações, IPs de origem, User-Agents e janelas de horário.
2. **Sinais de comprometimento**: `AssumeRole` inesperado, `CreateUser`/
   `CreateAccessKey`, alteração de políticas, `PutBucketPolicy`/`GetObject` em massa,
   `Decrypt` fora do padrão, desativação de logs.
3. **Negados** — muitas ações `AccessDenied` seguidas indicam **enumeração/tentativa
   de escalar privilégio**.
4. **Kubernetes** — no audit log/eventos, ações do principal em recursos sensíveis
   (secrets, RBAC, exec em pods).
5. **Legítimo?** — confirme com o dono da identidade; automação e humano têm padrões
   diferentes (horário, IP, cadência).

## Mitigação
- **Confirmado indevido**: escale para `security/leaked-credential-response.md` —
  revogue chaves/sessões, invalide roles assumidos e force re-login.
- **Blast radius**: liste e reverta recursos criados/alterados; rode diff de
  políticas IAM/RBAC contra o baseline.
- **Preservar evidências**: exporte os eventos relevantes antes de qualquer mudança
  (para forense e pós-incidente).

## Causa raiz (pós-incidente)
- Menor privilégio e **MFA** obrigatório; credenciais de curta duração (SSO/OIDC).
- CloudTrail/k8s audit **imutáveis** e centralizados (não deletáveis pelo atacante).
- Alertas para ações sensíveis (mudança de política, criação de usuário, desativação
  de logs).

## Referências
- Runbook: `security/leaked-credential-response.md`
- Docs: AWS CloudTrail (lookup-events), GuardDuty findings, Kubernetes Audit Policy.
