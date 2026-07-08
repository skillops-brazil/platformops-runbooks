# Convenções dos Agentes — Assertividade e Economia de Token

Regras que **todo** agente (review e build) deve seguir. Foram extraídas das práticas já presentes no painel de avaliação e existem para aumentar a assertividade e reduzir o consumo de tokens.

## Saída

1. **Header YAML primeiro.** Comece sempre por um bloco YAML curto com o veredito (`dominio`, `parecer`, `risco`, `bloqueante`). É o que o orquestrador consome — prosa longa antes dele desperdiça tokens e atrasa a decisão.
2. **Tetos explícitos.** "No máximo 2-3 riscos reais", "liste só ações bloqueantes". Listas abertas inflam a saída sem agregar.
3. **Sem genéricos.** Proibido listar hipotéticos que valeriam para qualquer projeto. Todo achado deve ser específico ao contexto recebido.
4. **Não repita outro agente.** Se Arquitetura já apontou o acoplamento, Qualidade *conecta a consequência*, não reapresenta o achado.
5. **Justifique pelo risco real, não por padrão.** Não exija ">90% de cobertura" ou "microsserviços" por dogma — justifique pelo impacto concreto.

## Contexto de entrada

6. **Contexto filtrado.** O orquestrador envia a cada agente **só o contexto do seu domínio**, não o documento inteiro. Agentes devem operar com o recorte recebido e pedir o que falta, em vez de assumir.
7. **Ativação condicional.** Não acione todos os agentes por padrão. Para mudanças pequenas (ajuste de UI, bugfix isolado), 1-2 agentes bastam. Rodar o conjunto inteiro dilui o relatório com seções vazias e gasta tokens.

## Dependências entre agentes

8. **Declare dependências.** Agentes que precisam do relatório de outro (ex.: Qualidade depende de Arquitetura; Operações depende de Cloud/Infra) devem declará-lo no `## Papel` e ser acionados depois.

## Contexto vivo e resumo (obrigatório)

9. **Mantenha o contexto atualizado.** Sempre que um agente produzir uma decisão, mudança de arquitetura/contrato/dados, ou fato novo relevante, **atualize `context.md`** (e o event-log da feature). O `context.md` é a fonte que todos os agentes consomem — deixá-lo desatualizar degrada todos os próximos passos. Ao alterar, edite só a seção afetada; não reescreva o arquivo inteiro.
10. **Sempre resuma; nunca cole material bruto.** Para poupar tokens e janela de contexto, o `context.md` e qualquer nota de contexto guardam **resumos condensados**, não documentos inteiros. Não copie o guia de marca, specs ou código para dentro do contexto — extraia o essencial em bullets e **referencie o arquivo original** pelo caminho. Toda saída de agente prioriza bullets curtos sobre prosa.

## Vocabulário de `parecer` por família

- **review/** (avaliar): `aprovado | aprovado_com_ressalvas | reprovado`
- **build/** (executar): `concluido | concluido_com_pendencias | bloqueado`
