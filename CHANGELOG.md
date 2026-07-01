# Changelog

Todas as mudanças relevantes deste repositório. O formato segue
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue
[SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-07-01

### Adicionado
- Biblioteca inicial com **20 runbooks** no formato canônico (frontmatter + engine de
  passos), distribuídos em: `aws` (3), `kubernetes` (4), `network` (2), `database` (3),
  `incident` (2), `monitoring` (2), `observability` (2), `security` (2).
- `schemas/runbook.schema.md` documentando o frontmatter e os tipos de passo.
- `manifest.json` com índice versionado e `sha256` por arquivo (base para o
  sync assinado do PlatformOps Desktop).
- `README.md` com formato canônico, estrutura, consumo pelo app e guia de contribuição.

[1.0.0]: https://github.com/skillops-brazil/platformops-runbooks/releases/tag/v1.0.0
