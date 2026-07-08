---
id: incident-comms-bridge
title: Abertura de Bridge e Comunicação de Incidente (SEV1)
description: Processo de coordenação, papéis e comunicação durante um incidente maior.
category: incident
severity: SEV1
tags: [incident, comunicacao, war-room, sev1, coordenacao, postmortem]
estimatedTime: 20m
tools: []
version: 1.0.0
author: SkillOps Platform Engineering
steps:
  - type: checklist
    title: Declarar o incidente e a severidade
    detail: SEV1 = indisponibilidade/impacto amplo. Registre título, horário de início e sintoma observável.
  - type: checklist
    title: Nomear papéis
    detail: Incident Commander (IC), Comms Lead, Ops/Scribe. O IC coordena, não debuga.
  - type: link
    title: Abrir a war-room (bridge de voz/vídeo)
    url: https://meet.example.com/incident-{{incident_id}}
  - type: link
    title: Criar canal do incidente
    url: https://chat.example.com/channels/inc-{{incident_id}}
  - type: link
    title: Abrir/atualizar status page
    url: https://status.example.com/admin/incidents/new
  - type: checklist
    title: Primeira comunicação externa
    detail: Publicar reconhecimento na status page em até 15 min. Sem causa raiz — só impacto e que estamos investigando.
  - type: checklist
    title: Cadência de updates
    detail: Update a cada 30 min (SEV1) mesmo sem novidade. IC define quem comunica.
  - type: approval
    title: Aprovar comunicação a clientes/executivos
    detail: Comms Lead alinha mensagem com IC antes de enviar a stakeholders externos.
  - type: checklist
    title: Encerramento e handoff para pós-morte
    detail: Declarar resolução, atualizar status page, agendar postmortem sem culpa em até 48h.
---

## Contexto
Este runbook é o **processo de coordenação** de um incidente maior (SEV1/SEV2 alto).
Ele não resolve a causa técnica — organiza pessoas, papéis e comunicação para que
a resolução aconteça com clareza e sem ruído. Use em paralelo aos runbooks
técnicos (latência, crashloop, etc.).

## Diagnóstico
Aqui "diagnóstico" é organizacional:
1. **Severidade correta** — SEV1 exige IC dedicado, bridge e status page.
2. **Papéis claros** — sem IC, todos debugam e ninguém coordena. O IC toma decisões,
   delega investigação e controla a comunicação.
3. **Fonte única de verdade** — o canal do incidente é o registro cronológico
   (o Scribe anota decisões, horários e ações).

## Mitigação
Fluxo de coordenação:
- **Abrir**: declarar, nomear papéis, abrir bridge e canal.
- **Comunicar**: reconhecimento externo em ≤15 min; updates em cadência fixa
  (30 min para SEV1). Mensagens focam em impacto e próximos passos, não em causa
  não confirmada.
- **Delegar**: o IC direciona subgrupos aos runbooks técnicos e coleta status.
- **Aprovar externamente**: comunicação a clientes/executivos passa pelo Comms Lead
  alinhado ao IC.
- **Encerrar**: confirmar resolução com quem opera, atualizar status page, e fazer
  handoff limpo para o postmortem.

## Causa raiz (pós-incidente)
- Agende **postmortem sem culpa** em até 48h. Foque em fatores contribuintes e
  barreiras que falharam, não em pessoas.
- Produza timeline, impacto quantificado (duração, usuários, SLO), e ação items
  com dono e prazo.
- Revise se a detecção, a comunicação e a cadência funcionaram; ajuste este runbook.

## Referências
- Runbook: `incident/high-latency-api.md`
- Template de postmortem sem culpa.
- Política de severidade e SLA de comunicação.
