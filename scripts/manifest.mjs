#!/usr/bin/env node
/**
 * Gerador determinístico do manifest da biblioteca de conteúdo.
 *
 * Contrato: docs/reference/CONTENT-LIBRARY-CONTRACT.md do workspace PlatformOps.
 * Este arquivo é VENDORIZADO idêntico nas três bibliotecas — se divergir entre
 * elas, três repositórios passam a ter três definições de "íntegro".
 *
 *   node scripts/manifest.mjs            regrava app/manifest.json
 *   node scripts/manifest.mjs --check    não grava; sai 1 se divergir
 *
 * Node puro, sem dependência: a CI de uma biblioteca de markdown não deveria
 * precisar de `npm install` para conferir um SHA-256.
 *
 * O que ele NÃO faz: assinar. A assinatura é destacada, vive em job protegido e
 * usa chave que não existe em repositório nenhum.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync, realpathSync } from 'node:fs'
import { join, dirname, relative, sep, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const APP = join(REPO, 'app')
const MANIFEST = join(APP, 'manifest.json')

/** Só isto é publicável dentro de `app/`. Extensão nova exige mexer no contrato. */
const EXTENSOES = new Set(['.md'])
/** Não se declaram a si mesmos. */
const IGNORADOS = new Set(['manifest.json', 'manifest.sig'])
/** `schemas/` é contrato para o consumidor, mas não é artefato de conteúdo. */
const NAO_ARTEFATO = new Set(['schemas'])

const erros = []
const falhar = (motivo, caminho) => erros.push(`${motivo}: ${caminho}`)

/**
 * Caminho relativo aceitável: separador POSIX, sem `..`, sem raiz absoluta e
 * sem drive-letter. Espelha `sanitizeRelPath` do consumidor — se as duas regras
 * divergirem, o gerador aprova o que o Desktop recusa.
 */
function relativoValido(rel) {
  if (rel === '' || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return false
  if (rel.includes('\\')) return false
  return !rel.split('/').some((seg) => seg === '..' || seg === '.' || seg === '')
}

/** Percorre `app/` recusando o que escapa da raiz. Ordenação vem depois, sobre o todo. */
function coletar(dir, achados) {
  for (const nome of readdirSync(dir).sort()) {
    const abs = join(dir, nome)
    const st = lstatSync(abs)

    if (st.isSymbolicLink()) {
      // Symlink para dentro de `app/` seria aceitável, mas o alvo real é o que
      // conta — e um link que sai da raiz é caminho de escape por indireção.
      let alvo
      try {
        alvo = realpathSync(abs)
      } catch {
        falhar('symlink quebrado', relative(APP, abs))
        continue
      }
      if (relative(realpathSync(APP), alvo).startsWith('..')) {
        falhar('symlink aponta fora de app/', relative(APP, abs))
        continue
      }
    }

    if (st.isDirectory()) {
      coletar(abs, achados)
      continue
    }

    const rel = relative(APP, abs).split(sep).join(posix.sep)
    if (IGNORADOS.has(rel)) continue

    if (!relativoValido(rel)) {
      falhar('caminho inválido', rel)
      continue
    }
    const ext = rel.slice(rel.lastIndexOf('.'))
    if (!EXTENSOES.has(ext)) {
      falhar('extensão não publicável em app/', rel)
      continue
    }
    achados.push(rel)
  }
  return achados
}

function construir() {
  if (!existsSync(APP)) {
    console.error('app/ não existe — a raiz publicável é obrigatória.')
    process.exit(1)
  }

  const caminhos = coletar(APP, [])

  // Ordenação estável por code point, não por locale: `localeCompare` varia com
  // o ambiente e produziria manifests diferentes na mesma árvore.
  caminhos.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  const vistos = new Set()
  for (const c of caminhos) {
    if (vistos.has(c)) falhar('caminho duplicado', c)
    vistos.add(c)
  }

  const files = caminhos.map((rel) => {
    const bytes = readFileSync(join(APP, rel))
    return { path: rel, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length }
  })

  const anterior = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
  const artefatos = files.filter((f) => !NAO_ARTEFATO.has(f.path.split('/')[0])).length

  // Campos de identidade e política vêm do manifest atual: são decisão editorial
  // (quando subir versão, qual Desktop mínimo), não algo derivável da árvore.
  return {
    schemaVersion: 1,
    name: anterior.name ?? '',
    version: anterior.version ?? '0.0.0',
    lastUpdate: anterior.lastUpdate ?? '',
    minimumDesktopVersion: anterior.minimumDesktopVersion ?? '',
    breakingChanges: anterior.breakingChanges ?? false,
    artifactCount: artefatos,
    fileCount: files.length,
    files,
  }
}

const manifest = construir()

if (erros.length) {
  console.error('manifest NÃO gerado — corrija antes:')
  for (const e of erros) console.error('  ·', e)
  process.exit(1)
}
if (!manifest.name) {
  console.error('manifest.json sem `name`: identidade da biblioteca é editorial e não se deriva da árvore.')
  process.exit(1)
}

const serializado = JSON.stringify(manifest, null, 2) + '\n'

/**
 * Invariantes do manifest COMO ESTÁ NO DISCO, mais o sidecar de assinatura.
 *
 * Ficam aqui, e não em `node -e` dentro do YAML da CI, porque o padrão de
 * caminho precisa casar barra invertida — e escapar isso através de YAML, shell
 * e argv é frágil o bastante para o gate passar a validar a coisa errada sem
 * ninguém perceber.
 */
function validarNoDisco() {
  const problemas = []
  let m
  try {
    m = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  } catch {
    return ['manifest.json ausente ou ilegível']
  }

  if (m.schemaVersion !== 1) problemas.push(`schemaVersion inesperado: ${m.schemaVersion}`)
  if (!m.name) problemas.push('manifest sem `name`')
  if (!Array.isArray(m.files) || m.files.length === 0) problemas.push('manifest sem arquivos')
  if (Array.isArray(m.files) && m.fileCount !== m.files.length) {
    problemas.push(`fileCount=${m.fileCount} não bate com ${m.files.length} entradas`)
  }
  for (const f of m.files ?? []) {
    if (!relativoValido(f.path)) problemas.push(`caminho inválido no manifest: ${f.path}`)
    if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problemas.push(`sha256 malformado: ${f.path}`)
  }

  // Presença e forma do sidecar. A assinatura em si não é verificável aqui: a
  // chave pública vive no binário do Desktop e a privada, no cofre. Mas uma
  // biblioteca sem sidecar é rejeitada como não assinada, e isso dá para pegar.
  const sidecar = join(APP, 'manifest.sig')
  if (!existsSync(sidecar)) {
    problemas.push('app/manifest.sig ausente — a biblioteca seria rejeitada como não assinada')
  } else {
    try {
      const s = JSON.parse(readFileSync(sidecar, 'utf8'))
      if (!s.kid || s.alg !== 'ed25519' || !s.sig) problemas.push('manifest.sig malformado')
    } catch {
      problemas.push('manifest.sig ilegível')
    }
  }
  return problemas
}

if (process.argv.includes('--check')) {
  const problemas = validarNoDisco()
  if (problemas.length) {
    console.error(`manifest inválido em ${manifest.name}:`)
    for (const p of problemas) console.error('  ·', p)
    process.exit(1)
  }
  const atual = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : ''
  if (atual !== serializado) {
    console.error(`manifest divergente em ${manifest.name}.`)
    console.error('Rode `node scripts/manifest.mjs` e assine novamente antes de publicar.')
    // Diferença mais provável primeiro: conteúdo que entrou ou saiu sem regeneração.
    try {
      const declarado = new Set((JSON.parse(atual).files ?? []).map((f) => f.path))
      const real = new Set(manifest.files.map((f) => f.path))
      for (const p of manifest.files.map((f) => f.path)) if (!declarado.has(p)) console.error('  + não declarado:', p)
      for (const p of declarado) if (!real.has(p)) console.error('  - declarado e ausente:', p)
    } catch {
      console.error('  (manifest atual ilegível)')
    }
    process.exit(1)
  }
  console.log(`${manifest.name}: manifest em dia — ${manifest.fileCount} arquivos, ${manifest.artifactCount} artefatos.`)
} else {
  writeFileSync(MANIFEST, serializado, 'utf8')
  console.log(`${manifest.name}: manifest gerado — ${manifest.fileCount} arquivos, ${manifest.artifactCount} artefatos.`)
  console.log('assinatura NÃO refeita: rode `librarysign sign` no job protegido antes de publicar.')
}
