---
id: security-leaked-credential-response
title: Resposta a Credencial Vazada (AWS Key / Token)
description: Conter e remediar o vazamento de uma credencial (chave AWS, token, secret) em minutos.
category: security
severity: SEV1
tags: [security, incident, credentials, aws, iam, rotation, secrets]
estimatedTime: 30m
tools: [aws, git, kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar o vazamento
    detail: Qual credencial, onde apareceu (repo público, log, print), desde quando? Qual o escopo/permissões dela?
  - type: cloud
    title: Quem é a chave (AWS)
    command: "aws sts get-access-key-info --access-key-id {{accessKeyId}}"
  - type: approval
    title: Aprovar revogação imediata
    detail: Contenção vem antes da conveniência — revogar pode quebrar um serviço; tenha o plano de reemissão pronto.
  - type: cloud
    title: Desativar a access key comprometida
    command: "aws iam update-access-key --access-key-id {{accessKeyId}} --status Inactive --user-name {{iamUser}}"
  - type: cloud
    title: Procurar uso suspeito no CloudTrail
    command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue={{accessKeyId}} --max-results 50"
  - type: cloud
    title: Após reemitir e validar, excluir a chave antiga
    command: "aws iam delete-access-key --access-key-id {{accessKeyId}} --user-name {{iamUser}}"
  - type: link
    title: Registrar no canal de incidentes de segurança
    url: https://example.com/security-incident
---

## Contexto
Uma credencial exposta (chave AWS em repo público, token em log, secret num print)
deve ser tratada como **comprometida imediatamente**, mesmo sem sinal de abuso —
scanners varrem o GitHub em segundos. Prioridade: **conter** (revogar) primeiro,
investigar depois. É SEV1 quando a credencial tem permissões amplas ou acesso a
dados.

## Diagnóstico
1. **Identifique e escopo** — de quem é a chave e o que ela pode fazer
   (`get-access-key-info`, políticas IAM anexadas). Escopo largo eleva a severidade.
2. **Houve abuso?** — CloudTrail filtrado pela `AccessKeyId`: chamadas de IPs/países
   incomuns, `RunInstances`, `CreateUser`, `PutBucketPolicy`, exfiltração de dados.
3. **Onde mais está** — a mesma credencial pode estar em vários lugares (CI,
   Secret, `.env`). Revogar uma cópia não basta.

## Mitigação
- **Revogar já**: desative a access key (`Inactive`) — reversível e imediato. Só
  exclua depois de reemitir e validar o substituto.
- **Reemitir**: crie nova credencial, entregue via keychain/secret manager (nunca em
  repo/plaintext) e faça rollout dos consumidores.
- **Remover do histórico**: se vazou em git, a rotação é obrigatória — reescrever o
  histórico não desfaz o comprometimento (assuma exposta).
- **Se houve abuso**: acione o processo de incidente de segurança, revise recursos
  criados/alterados e amplie a revogação (sessions, roles assumidos).

## Causa raiz (pós-incidente)
- Segredos **só** em keychain/secret manager; nunca em repo, log ou variável de
  build exposta. Ligue secret scanning + push protection no GitHub.
- Prefira credenciais de curta duração (SSO/OIDC/roles) a chaves estáticas.
- Rotação periódica e princípio do menor privilégio nas políticas IAM.

## Referências
- Runbook: `security/unauthorized-access-review.md`, `aws/sso-token-expired.md`
- Docs: AWS — What to do if you expose an access key; GitHub secret scanning.
