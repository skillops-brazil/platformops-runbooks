#!/usr/bin/env node
/**
 * Monta o artefato de release com layout DUPLO, para a janela de migração em que
 * dois Desktops diferentes leem o mesmo branch.
 *
 *   node scripts/build-compatible-library.mjs            grava dist/library/
 *   node scripts/build-compatible-library.mjs --check    valida sem gravar
 *
 * ── Por que o layout duplo, e por que ele tem esta forma exata ───────────────
 *
 * O Desktop publicado (0.21.0-beta.2) lê `<clone>/manifest.json` e resolve os
 * caminhos declarados a partir da RAIZ DO CLONE. O Desktop corrigido lê
 * `<clone>/app/manifest.json` e resolve a partir de `app/`. Os dois clonam o
 * mesmo branch `main`.
 *
 * A tentação é declarar `app/runbooks/x.md` no manifest da raiz e não duplicar
 * nada. Isso VERIFICA VERDE e entrega ZERO conteúdo: o frontend filtra por
 * PRIMEIRO SEGMENTO do caminho (`commands/`, `runbooks/`, e a lista PROMPT_DIRS
 * em `lib/libraryContent.ts`). Um caminho começando por `app` é descartado em
 * silêncio depois de passar por assinatura e checksum — verificação bem-sucedida
 * com biblioteca vazia, que é o pior modo de falha possível.
 *
 * Então o conteúdo é projetado nas duas posições, com a MESMA estrutura relativa.
 * A consequência é a propriedade que torna isto seguro: como os caminhos
 * relativos e os bytes são idênticos nas duas posições, `manifest.json` e
 * `app/manifest.json` são o MESMO ARQUIVO, byte a byte — e a assinatura também.
 * Não há dois manifests para divergirem; há um manifest em dois lugares.
 *
 * A duplicação existe só no artefato publicado. O repositório-fonte continua com
 * o conteúdo uma vez só, em `app/`.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, cpSync, lstatSync } from 'node:fs'
import { join, dirname, relative, sep, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const APP = join(REPO, 'app')
const DIST = join(REPO, 'dist', 'library')

const conferir = process.argv.includes('--check')

/** Primeiro segmento aceito pelo consumidor. Espelha `lib/libraryContent.ts`. */
const SEGMENTOS_CONSUMIDOS = new Set([
  'commands', 'runbooks',
  'prompts', 'agents', 'patterns', 'templates', 'playbooks', 'workflows',
])

function morrer(msg) {
  console.error('erro:', msg)
  process.exit(1)
}

// ── origem ───────────────────────────────────────────────────────────────────

if (!existsSync(join(APP, 'manifest.json'))) morrer('app/manifest.json ausente — gere o manifest antes.')
const manifestBytes = readFileSync(join(APP, 'manifest.json'))
const manifest = JSON.parse(manifestBytes.toString('utf8'))

if (manifest.schemaVersion !== 1) morrer(`schemaVersion inesperado: ${manifest.schemaVersion}`)
if (!manifest.name || !manifest.version) morrer('manifest sem name/version')
if (!Array.isArray(manifest.files) || !manifest.files.length) morrer('manifest sem arquivos')

const temSidecar = existsSync(join(APP, 'manifest.sig'))

// ── invariantes que fazem o layout legado funcionar ──────────────────────────

const problemas = []
let consumiveis = 0
for (const f of manifest.files) {
  const seg = f.path.split('/')[0]
  if (f.path.startsWith('app/')) {
    // Este é o erro que o comentário do topo descreve. Vale um check explícito:
    // ele nunca deveria acontecer, e se acontecer é silencioso do outro lado.
    problemas.push(`caminho com prefixo app/ (o consumidor legado descartaria): ${f.path}`)
  }
  if (SEGMENTOS_CONSUMIDOS.has(seg)) consumiveis++
  const abs = join(APP, f.path.split('/').join(sep))
  if (!existsSync(abs)) problemas.push(`declarado e ausente em app/: ${f.path}`)
  else {
    const bytes = readFileSync(abs)
    if (createHash('sha256').update(bytes).digest('hex') !== f.sha256) problemas.push(`hash divergente: ${f.path}`)
    if (bytes.includes('\r\n')) problemas.push(`CRLF em conteúdo protegido: ${f.path}`)
  }
}
if (!consumiveis) problemas.push('nenhum arquivo em diretório que o consumidor reconheça — a biblioteca seria servida vazia')
if (problemas.length) {
  console.error('artefato NÃO montado:')
  for (const p of problemas) console.error('  ·', p)
  process.exit(1)
}

// ── staging ──────────────────────────────────────────────────────────────────

/** Lista recursiva de `app/`, para copiar sem depender de `cp -r` do SO. */
function arquivosDe(dir, base = dir, out = []) {
  for (const nome of readdirSync(dir).sort()) {
    const abs = join(dir, nome)
    if (lstatSync(abs).isDirectory()) arquivosDe(abs, base, out)
    else out.push(relative(base, abs).split(sep).join(posix.sep))
  }
  return out
}

const resumo = {
  name: manifest.name,
  version: manifest.version,
  schemaVersion: manifest.schemaVersion,
  files: manifest.fileCount,
  artifacts: manifest.artifactCount,
  consumiveis,
  assinado: temSidecar,
  layout: 'dual',
}

if (conferir) {
  console.log(`${resumo.name} v${resumo.version}: pronto para artefato dual — ` +
    `${resumo.files} arquivos, ${resumo.consumiveis} em diretório consumido, ` +
    `sidecar=${temSidecar ? 'presente' : 'AUSENTE'}`)
  if (!temSidecar) {
    console.error('  aviso: sem app/manifest.sig, o artefato publicado seria rejeitado como não assinado.')
  }
  process.exit(0)
}

rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })

// 1. `app/` — o layout novo, cópia fiel da origem (conteúdo + manifest + sidecar).
cpSync(APP, join(DIST, 'app'), { recursive: true })

// 2. Raiz — projeção do MESMO conteúdo, mesma estrutura relativa. Só os arquivos
//    declarados no manifest: nada que o manifest não cubra entra no artefato.
for (const f of manifest.files) {
  const destino = join(DIST, f.path.split('/').join(sep))
  mkdirSync(dirname(destino), { recursive: true })
  cpSync(join(APP, f.path.split('/').join(sep)), destino)
}

// 3. O manifest da raiz é o MESMO arquivo, byte a byte. Não é uma segunda
//    verdade: os caminhos relativos e os bytes coincidem nas duas posições, então
//    o mesmo documento descreve as duas. Copiar em vez de re-serializar é o que
//    garante que a assinatura vale para os dois sem assinar duas vezes.
writeFileSync(join(DIST, 'manifest.json'), manifestBytes)
if (temSidecar) cpSync(join(APP, 'manifest.sig'), join(DIST, 'manifest.sig'))

// ── conferência do que foi montado ───────────────────────────────────────────

const erros = []
if (readFileSync(join(DIST, 'manifest.json')).compare(readFileSync(join(DIST, 'app', 'manifest.json'))) !== 0) {
  erros.push('manifest da raiz e de app/ divergem — deveriam ser o mesmo arquivo')
}
for (const f of manifest.files) {
  for (const posicao of [join(DIST, f.path.split('/').join(sep)), join(DIST, 'app', f.path.split('/').join(sep))]) {
    if (!existsSync(posicao)) { erros.push(`ausente no artefato: ${relative(DIST, posicao)}`); continue }
    if (createHash('sha256').update(readFileSync(posicao)).digest('hex') !== f.sha256) {
      erros.push(`hash divergente no artefato: ${relative(DIST, posicao)}`)
    }
  }
}
if (erros.length) {
  console.error('artefato montado INVÁLIDO:')
  for (const e of erros) console.error('  ·', e)
  process.exit(1)
}

const total = arquivosDe(DIST).length
console.log(`${resumo.name} v${resumo.version}: artefato dual em dist/library/`)
console.log(`  ${manifest.fileCount} arquivos declarados, projetados nas duas posições (${total} arquivos no total)`)
console.log(`  manifest.json === app/manifest.json (byte a byte)`)
console.log(`  assinatura: ${temSidecar ? 'copiada da origem' : 'AUSENTE — artefato não publicável'}`)
writeFileSync(join(REPO, 'dist', 'resumo.json'), JSON.stringify(resumo, null, 2) + '\n')
