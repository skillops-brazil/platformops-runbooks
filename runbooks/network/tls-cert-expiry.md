---
id: network-tls-cert-expiry
title: Certificado TLS Expirado ou Prestes a Expirar
description: Detecção e renovação de certificados TLS para evitar/resolver indisponibilidade por HTTPS.
category: network
severity: SEV1
tags: [network, tls, ssl, certificado, https, cert-manager]
estimatedTime: 25m
tools: [openssl, kubectl]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar sintoma
    detail: Clientes recebem "certificate expired" / NET::ERR_CERT_DATE_INVALID? Qual host/domínio?
  - type: command
    title: Ver data de expiração do certificado servido
    command: "echo | openssl s_client -connect {{host}}:443 -servername {{host}} 2>/dev/null | openssl x509 -noout -dates -subject -issuer"
  - type: command
    title: Listar Certificates gerenciados (cert-manager)
    command: "kubectl get certificate -A -o wide"
  - type: command
    title: Ver o Certificate e sua condição Ready
    command: "kubectl describe certificate {{certificate}} -n {{namespace}}"
  - type: command
    title: Ver CertificateRequest/Order/Challenge pendentes
    command: "kubectl get certificaterequest,order,challenge -n {{namespace}}"
  - type: command
    title: Logs do cert-manager
    command: "kubectl logs -n cert-manager -l app=cert-manager --tail=100"
  - type: link
    title: Monitor de expiração de certificados
    url: https://grafana.example.com/d/tls-expiry
  - type: approval
    title: Aprovar renovação/forçar reemissão
    detail: Confirmar issuer e validação (DNS/HTTP-01) antes de forçar reemissão.
  - type: command
    title: Forçar renovação (cert-manager)
    command: "kubectl cert-manager renew {{certificate}} -n {{namespace}}"
---

## Contexto
Um certificado TLS expirado faz todos os clientes rejeitarem a conexão HTTPS —
indisponibilidade total e súbita do endpoint, geralmente em SEV1. Também cobre o
caso preventivo: certificado prestes a expirar detectado por monitoramento.

Causas comuns: renovação automática (cert-manager/ACME) falhando silenciosamente
(desafio DNS/HTTP-01 quebrado, rate limit da CA), certificado manual esquecido, ou
certificado renovado mas não recarregado pelo servidor/LB.

## Diagnóstico
1. **O que está servido** — `openssl s_client` mostra a data de expiração
   **real** que o cliente vê. Confirme host correto e SNI (`-servername`).
2. **cert-manager** — `describe certificate` mostra `Ready` e o motivo. Verifique
   `CertificateRequest`/`Order`/`Challenge` presos (desafio ACME falhando).
3. **Renovado mas não recarregado** — se o Secret tem cert novo mas o endpoint
   ainda serve o antigo, o servidor/LB não recarregou.
4. **Rate limit** — logs do cert-manager podem mostrar limite da Let's Encrypt.

## Mitigação
- **Renovação automática travada**: corrija o desafio (registro DNS-01 ou rota
  HTTP-01) e force com `kubectl cert-manager renew`.
- **Não recarregado**: reinicie o ingress/servidor para carregar o Secret novo
  (`kubectl rollout restart deployment/{{ingress}} -n {{namespace}}`).
- **Certificado manual**: emita/instale o novo cert e recarregue o LB.
- **Rate limit da CA**: use o issuer de staging para validar e aguarde a janela,
  ou troque temporariamente para outro provedor de certificado.

## Causa raiz (pós-incidente)
- **Sempre** monitore expiração com alerta em ≥30 dias e ≥7 dias de antecedência.
- Investigue por que a renovação automática falhou sem alertar (desafio, permissão
  DNS, secret).
- Documente todos os certificados críticos e seus donos/issuers.

## Referências
- Runbook: `network/dns-resolution-failure.md`
- Docs: cert-manager Troubleshooting / ACME challenges.
