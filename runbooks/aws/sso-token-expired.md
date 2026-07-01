---
id: aws-sso-token-expired
title: Token de AWS SSO Expirado / Acesso CLI Negado
description: Restabelecer credenciais de AWS IAM Identity Center (SSO) para operar durante incidente.
category: aws
severity: SEV3
tags: [aws, sso, iam-identity-center, credentials, cli, acesso]
estimatedTime: 10m
tools: [aws]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar o erro
    detail: "aws cli retorna 'The SSO session has expired' / 'ExpiredToken' / 'ForbiddenException'? Qual profile?"
  - type: cloud
    title: Verificar identidade atual
    command: "aws sts get-caller-identity --profile {{profile}}"
  - type: cloud
    title: Renovar a sessão SSO (abre navegador)
    command: "aws sso login --profile {{profile}}"
  - type: cloud
    title: Confirmar acesso após login
    command: "aws sts get-caller-identity --profile {{profile}}"
  - type: checklist
    title: Se persistir, checar config do profile
    detail: "~/.aws/config tem sso_start_url, sso_region, sso_account_id, sso_role_name corretos? Relógio do host sincronizado (NTP)?"
  - type: cloud
    title: Limpar cache de SSO e relogar
    command: "rm -rf ~/.aws/sso/cache && aws sso login --profile {{profile}}"
  - type: link
    title: Portal de acesso AWS (SSO)
    url: https://{{org}}.awsapps.com/start
  - type: approval
    title: Escalar para admin de identidade se acesso negado
    detail: Se get-caller-identity funciona mas a ação é negada, é permissão do permission set — envolver o admin.
---

## Contexto
Durante um incidente, o operador precisa da AWS CLI mas a sessão do AWS SSO
(IAM Identity Center) expirou. As sessões SSO têm duração limitada; ao expirar,
comandos retornam `The SSO session associated with this profile has expired`
ou `ExpiredToken`. Isso é SEV3 (bloqueia o operador individual), mas pode atrasar
a resposta a um incidente maior.

## Diagnóstico
1. **Tipo de erro** — `ExpiredToken`/`expired` é sessão vencida (renovável com
   login). `AccessDenied`/`Forbidden` após um `get-caller-identity` bem-sucedido
   é **permissão insuficiente** do permission set (não resolve com login).
2. **Profile correto** — confirme que está usando o profile certo
   (`--profile {{profile}}` ou `AWS_PROFILE`).
3. **Relógio** — token inválido também ocorre se o relógio do host está
   dessincronizado; verifique NTP.

## Mitigação
- **Renovar sessão**: `aws sso login --profile {{profile}}` abre o navegador para
  reautenticar; depois `aws sts get-caller-identity` confirma.
- **Cache corrompido**: limpe `~/.aws/sso/cache` e faça login novamente.
- **Config errada**: valide `~/.aws/config` (start URL, região, account, role).
- **Permissão negada**: se autentica mas a ação é bloqueada, o permission set não
  cobre a operação — escale ao administrador de identidade para ajuste temporário.

## Causa raiz (pós-incidente)
- Se a expiração atrapalhou a resposta, considere sessões mais longas para o time
  de plantão (dentro da política de segurança).
- Documente os profiles/permission sets necessários para operar cada domínio.
- Garanta NTP nos hosts de operação.

## Referências
- Runbook: `security/unauthorized-access-review.md`
- Docs AWS: IAM Identity Center / aws sso login.
