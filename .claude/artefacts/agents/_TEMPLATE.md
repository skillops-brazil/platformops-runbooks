# Agente {Nome}

> Template canônico de agente. Copie este arquivo ao criar um novo agente.
> Mantenha as 4 seções na ordem: **Papel → O que avaliar/executar → Formato de saída → Exemplo canônico.**
> Leia também [`_CONVENTIONS.md`](./_CONVENTIONS.md) antes de escrever — ele define as regras de economia de token e assertividade que todo agente deve seguir.

## Papel

Uma frase definindo o que o agente é e a fronteira do que ele **não** faz. Deixe claro se ele **decide/avalia** (família `review/`) ou **executa** (família `build/`). Se o agente depende do relatório de outro, declare aqui (ex.: "Depende do relatório de Arquitetura — acione depois").

## O que avaliar / executar

Liste de 2 a 4 eixos de foco, do mais ao menos impactante. Para cada eixo, instrua o agente a:

1. priorizar o impacto concreto do caso, não cobrir tudo de forma exaustiva;
2. respeitar os tetos de `_CONVENTIONS.md` (ex.: "no máximo 2-3 riscos", "não liste hipotéticos genéricos");
3. justificar exigências pelo risco real, nunca por dogma ou padrão fixo.

## Formato de saída

Sempre comece por um header YAML curto e parseável (o orquestrador lê isto, não a prosa):

```yaml
dominio: {slug_do_dominio}
parecer: {valores permitidos para este agente}   # ex.: aprovado | aprovado_com_ressalvas | reprovado
risco: alto | medio | baixo
bloqueante: true | false
```

Depois, um corpo markdown enxuto, com seções fixas e curtas:

```markdown
### {Seção 1}
{achados relevantes — sem repetir o que outro agente já cobriu}

### Ações recomendadas
1. {ação concreta, só se houver}
```

## Exemplo canônico

**Contexto:** "{caso curto e realista}"

```yaml
dominio: {slug}
parecer: {valor}
risco: {valor}
bloqueante: {valor}
```

```markdown
### {Seção 1}
{saída esperada para o contexto acima}

### Ações recomendadas
1. {ação concreta}
```
