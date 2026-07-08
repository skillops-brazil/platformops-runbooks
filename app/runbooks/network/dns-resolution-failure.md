---
id: network-dns-resolution-failure
title: Falha de Resolução DNS (Serviços não se Encontram)
description: Diagnóstico de falhas de DNS internas (CoreDNS) e externas.
category: network
severity: SEV1
tags: [network, dns, coredns, resolucao, kubernetes]
estimatedTime: 20m
tools: [kubectl, dig]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Delimitar o escopo
    detail: Falha é DNS interno (svc.namespace) ou externo (domínio público)? Um serviço ou todo o cluster?
  - type: command
    title: Testar resolução externa a partir de um pod
    command: "kubectl run dns-test --rm -it --image=busybox:1.36 --restart=Never -- nslookup {{external_host}}"
  - type: command
    title: Testar resolução interna (service discovery)
    command: "kubectl run dns-test --rm -it --image=busybox:1.36 --restart=Never -- nslookup {{service}}.{{namespace}}.svc.cluster.local"
  - type: command
    title: Ver pods do CoreDNS
    command: "kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide"
  - type: command
    title: Logs do CoreDNS (erros/SERVFAIL)
    command: "kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100"
  - type: command
    title: Consulta detalhada com dig (do host)
    command: "dig {{host}} @{{resolver}} +short"
  - type: command
    title: Ver ConfigMap do CoreDNS (Corefile)
    command: "kubectl get configmap coredns -n kube-system -o yaml"
  - type: link
    title: Dashboard de latência/erros do DNS
    url: https://grafana.example.com/d/coredns
  - type: approval
    title: Aprovar restart do CoreDNS
    detail: Reiniciar CoreDNS é de baixo risco, mas pode causar breve turbulência de resolução.
---

## Contexto
Falhas de DNS quebram service discovery e chamadas externas, muitas vezes se
manifestando como erros de conexão intermitentes espalhados por vários serviços —
o que confunde a triagem. No Kubernetes, o resolvedor interno é o CoreDNS.

Sintomas: `Name or service not known`, `SERVFAIL`, timeouts em chamadas que antes
funcionavam, erros de "no such host". Alertas típicos: `CoreDNSErrorsHigh`,
`CoreDNSLatencyHigh`.

## Diagnóstico
1. **Interno vs. externo** — teste um nome de service (`*.svc.cluster.local`) e um
   domínio público. Se interno falha mas externo funciona, é CoreDNS/config; se
   ambos falham, pode ser upstream/rede; se só externo falha, é forwarder/egress.
2. **CoreDNS saudável?** — pods prontos, sem restarts/OOM. Poucas réplicas sob
   alta carga geram latência/`SERVFAIL`.
3. **Logs** — CoreDNS loga `SERVFAIL`, `i/o timeout` para upstream, ou erros de
   plugin. `dig` do host isola se o problema é do resolvedor upstream.
4. **Corefile** — forwarders errados, `ndots` alto causando muitas queries, ou
   zona mal configurada.

## Mitigação
- **CoreDNS sobrecarregado/travado**: `kubectl rollout restart deployment/coredns -n kube-system`
  e escale réplicas (`kubectl scale`). Considere `NodeLocal DNSCache`.
- **Upstream fora**: aponte o forwarder para um resolvedor saudável no Corefile.
- **ndots excessivo**: ajuste `dnsConfig`/`ndots` para reduzir queries de busca.
- **Externo bloqueado**: verifique egress/NAT/Security Group e o forwarder externo.

## Causa raiz (pós-incidente)
- Se foi capacidade, adote NodeLocal DNSCache e mais réplicas de CoreDNS.
- Se foi config, verifique drift de IaC do Corefile.
- Alerte latência e taxa de erro do DNS; DNS costuma ser causa raiz oculta de
  incidentes "de rede".

## Referências
- Runbook: `network/tls-cert-expiry.md`
- Docs Kubernetes: Debugging DNS Resolution.
