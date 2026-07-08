# Schema do Runbook — PlatformOps Desktop

Este documento descreve o **formato canônico** de um runbook consumido pelo app
PlatformOps Desktop. Cada runbook é um único arquivo `.md` composto por:

1. **Frontmatter YAML** — metadados + a lista de `steps` (passos executáveis).
2. **Corpo markdown** — narrativa (contexto, diagnóstico, mitigação, causa raiz, referências).

O app faz o parsing do frontmatter para o modelo `Runbook` e renderiza os passos
através de uma **engine de passos**. O corpo é exibido como documentação de apoio.

---

## 1. Campos do frontmatter

| Campo           | Tipo             | Obrigatório | Descrição                                                                 |
|-----------------|------------------|:-----------:|---------------------------------------------------------------------------|
| `id`            | string (slug)    | sim         | Identificador único e estável. Formato `kebab-case`. Usado como chave.     |
| `title`         | string           | sim         | Título legível exibido na lista e no cabeçalho.                            |
| `description`   | string           | sim         | Resumo de uma linha do propósito do runbook.                              |
| `category`      | enum             | sim         | Categoria/pasta. Ver lista abaixo.                                        |
| `severity`      | enum             | sim         | `SEV1` \| `SEV2` \| `SEV3`. Coerente com o impacto do cenário.            |
| `tags`          | lista de string  | sim         | Palavras-chave para busca e filtro.                                       |
| `estimatedTime` | string (duração) | sim         | Tempo estimado de execução. Ex.: `15m`, `1h`, `45m`.                      |
| `tools`         | lista de string  | sim         | Ferramentas necessárias. Ex.: `[kubectl, aws]`.                          |
| `version`       | string (SemVer)  | sim         | Versão do runbook. Ex.: `1.0.0`.                                          |
| `author`        | string           | sim         | Autor/equipe responsável.                                                |
| `steps`         | lista de passos  | sim         | Passos executáveis. Ver seção 3.                                          |

### Categorias válidas (`category`)

`aws` · `kubernetes` · `network` · `database` · `incident` · `monitoring` · `observability` · `security`

### Severidade (`severity`)

| Valor  | Uso                                                                                  |
|--------|--------------------------------------------------------------------------------------|
| `SEV1` | Indisponibilidade total ou perda de dados; impacto amplo a usuários; acordar gente.  |
| `SEV2` | Degradação séria de um serviço/funcionalidade; impacto parcial; resposta imediata.   |
| `SEV3` | Impacto baixo/contido; sem urgência de plantão; pode ser tratado em horário útil.    |

---

## 2. Placeholders (`{{var}}`)

Comandos, queries e URLs podem conter placeholders no formato `{{nome}}`.
O operador preenche esses valores no app antes de executar/copiar o passo.
Nomes comuns: `{{namespace}}`, `{{pod}}`, `{{cluster}}`, `{{region}}`, `{{host}}`, `{{db}}`.

---

## 3. Estrutura de `steps`

`steps` é uma lista ordenada. Cada item tem um `type` e campos específicos.
Campos comuns a **todos** os tipos:

| Campo    | Tipo   | Obrigatório | Descrição                                  |
|----------|--------|:-----------:|--------------------------------------------|
| `type`   | enum   | sim         | Tipo do passo (ver abaixo).                |
| `title`  | string | sim         | Rótulo curto do passo.                     |
| `detail` | string | não         | Explicação/contexto adicional do passo.    |

### Tipos de passo

#### `checklist`
Passo de verificação manual — o operador confirma condições antes de prosseguir.

```yaml
- type: checklist
  title: Confirmar escopo e impacto
  detail: Quantos pods? Qual serviço? Afeta usuários?
```

#### `command`
Comando de shell/CLI local (ex.: `kubectl`, `psql`, `dig`, `redis-cli`).
Campo próprio: `command` (string, com placeholders).

```yaml
- type: command
  title: Listar pods problemáticos
  command: "kubectl get pods -n {{namespace}} --field-selector=status.phase!=Running"
```

#### `cloud`
Comando de provedor de nuvem (ex.: `aws`, `gcloud`, `az`).
Campo próprio: `command` (string). Distinto de `command` para o app poder
sinalizar credenciais/perfil de nuvem.

```yaml
- type: cloud
  title: Descrever nodegroup do EKS
  command: "aws eks describe-nodegroup --cluster-name {{cluster}} --nodegroup-name {{nodegroup}} --region {{region}}"
```

#### `query`
Consulta a banco de dados (SQL) ou linguagem de query.
Campo próprio: `query` (string).

```yaml
- type: query
  title: Ver replicação em atraso
  query: "SELECT client_addr, state, write_lag, replay_lag FROM pg_stat_replication;"
```

#### `approval`
Ponto de aprovação/gate — exige decisão humana (ex.: aprovar rollback).
Pode conter `detail` explicando o que está sendo aprovado.

```yaml
- type: approval
  title: Aprovar rollback do deployment
  detail: Requer OK do on-call sênior antes de reverter para a versão anterior.
```

#### `link`
Referência externa (dashboard, doc, ticket).
Campo próprio: `url` (string, com placeholders opcionais).

```yaml
- type: link
  title: Dashboard do serviço no Grafana
  url: https://grafana.example.com/d/{{dashboard_uid}}
```

---

## 4. Regras de qualidade

- **Coerência narrativa**: cada `step` deve corresponder à narrativa do corpo.
- **Variedade de tipos**: use `checklist`/`command`/`link`/`approval`; `cloud` para
  `aws`/`gcloud`/`az`; `query` para SQL.
- **Comandos reais e acionáveis**: sintaxe nativa correta, placeholders onde o
  operador preenche valores do ambiente.
- **Severidade coerente** com o cenário descrito.
- **Idempotência de leitura**: passos de diagnóstico não devem alterar estado;
  passos que alteram estado devem vir após `approval` quando forem arriscados.
