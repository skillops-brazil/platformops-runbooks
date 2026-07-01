---
id: monitoring-alert-noise-triage
title: Triagem de Ruído de Alertas (Alert Fatigue)
description: Reduzir alertas repetidos/irrelevantes que causam fadiga e mascaram incidentes reais.
category: monitoring
severity: SEV3
tags: [monitoring, alertmanager, prometheus, alert-fatigue, silences]
estimatedTime: 30m
tools: [amtool, promtool]
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Confirmar o problema
    detail: O on-call está recebendo alertas demais? Quais disparam com mais frequência e são acionáveis?
  - type: command
    title: Listar alertas ativos agrupados
    command: "amtool alert query --alertmanager.url={{amUrl}} -o extended"
  - type: command
    title: Ranking de alertas mais barulhentos (por nome)
    command: "amtool alert query --alertmanager.url={{amUrl}} -o simple | awk '{print $1}' | sort | uniq -c | sort -rn | head"
  - type: command
    title: Ver silences ativos
    command: "amtool silence query --alertmanager.url={{amUrl}}"
  - type: approval
    title: Aprovar silence temporário do alerta ruidoso
    detail: Só silenciar com dono e prazo definidos — nunca silenciar sem investigar o gatilho.
  - type: command
    title: Criar silence com prazo e autor
    command: "amtool silence add alertname={{alertname}} --duration={{duration}} --comment='{{motivo}}' --author={{autor}} --alertmanager.url={{amUrl}}"
  - type: link
    title: Dashboard de volume de alertas
    url: https://grafana.example.com/d/alert-volume
---

## Contexto
Excesso de alertas não-acionáveis (flapping, thresholds mal calibrados, alertas
informativos roteados como page) causa **fadiga de alertas**: o on-call passa a
ignorar notificações e um incidente real escapa no meio do ruído. Este runbook
trata a triagem imediata (silenciar com critério) e a correção da causa (regra).

## Diagnóstico
1. **O que está disparando** — agrupe os alertas ativos e monte o ranking por
   `alertname`. Os 3-5 mais frequentes geralmente respondem por 80% do ruído.
2. **É acionável?** — para cada alerta barulhento pergunte: exige ação humana
   *agora*? Se não, não deveria ser um page (deveria ser ticket/dashboard).
3. **Flapping** — alerta que resolve e re-dispara em minutos indica threshold no
   limite ou falta de `for:` adequado na regra.
4. **Roteamento** — verifique se severidade e receiver estão corretos (info não
   deve ir para o pager).

## Mitigação
- **Silence com critério**: `amtool silence add` sempre com autor, motivo e
  **prazo curto** — o silence é paliativo, não solução.
- **Ajuste de regra**: aumente `for:` (persistência antes de disparar) e calibre o
  threshold; reclassifique a severidade (page → ticket) e o roteamento.
- **Inibição**: use inhibition rules para suprimir alertas derivados quando o
  alerta-causa já disparou (ex.: node down inibe pods down daquele node).

## Causa raiz (pós-incidente)
- Todo alerta que dispara deve ter runbook e ser acionável — audite regras órfãs.
- Meça **MTTA/volume por alerta** e revise mensalmente os top ofensores.
- Prefira alertas baseados em sintoma (SLO/erro do usuário) a causas (CPU alta).

## Referências
- Runbook: `monitoring/missing-metrics.md`
- Docs: Alertmanager (silences, inhibition), Google SRE — Alerting on SLOs.
