#!/usr/bin/env node
/**
 * Testes do gerador de manifest. Node puro, sem framework — a alternativa seria
 * pedir `npm install` a um repositório de markdown.
 *
 * Cada caso monta uma biblioteca descartável em diretório temporário, roda o
 * gerador de verdade como subprocesso e confere saída e código de saída. Não
 * testa a função por dentro: testa o que a CI executa.
 *
 *   node scripts/manifest.test.mjs
 *
 * VENDORIZADO idêntico nas três bibliotecas — ver scripts/manifest.mjs.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const GERADOR = join(AQUI, 'manifest.mjs')

let passou = 0
const falhas = []
const pulados = []

/** Lançar isto marca o caso como PULADO, não como aprovado. */
class Pulado extends Error {}

function teste(nome, fn) {
  const raiz = mkdtempSync(join(tmpdir(), 'manifest-test-'))
  try {
    fn(raiz)
    passou++
    console.log(`  ok    ${nome}`)
  } catch (e) {
    if (e instanceof Pulado) {
      pulados.push(nome)
      console.log(`  pula  ${nome} — ${e.message}`)
    } else {
      falhas.push(nome)
      console.error(`  FALHA ${nome}\n        ${e.message}`)
    }
  } finally {
    rmSync(raiz, { recursive: true, force: true })
  }
}

/** Monta uma biblioteca mínima e devolve a raiz do repositório falso. */
function biblioteca(raiz, arquivos, manifestExtra = {}) {
  mkdirSync(join(raiz, 'scripts'), { recursive: true })
  copyFileSync(GERADOR, join(raiz, 'scripts', 'manifest.mjs'))
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const abs = join(raiz, 'app', rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, conteudo)
  }
  mkdirSync(join(raiz, 'app'), { recursive: true })
  writeFileSync(
    join(raiz, 'app', 'manifest.json'),
    JSON.stringify({ schemaVersion: 1, name: 'lib-teste', version: '1.0.0', files: [], ...manifestExtra }, null, 2) + '\n',
  )
  // Sidecar de forma válida. NÃO é assinatura real e não precisa ser: o gerador
  // confere presença e forma, nunca criptografia — verificar assinatura é
  // trabalho do Desktop, com a chave pública fixada no binário.
  writeFileSync(
    join(raiz, 'app', 'manifest.sig'),
    JSON.stringify({ kid: 'chave-de-teste', alg: 'ed25519', sig: 'ZmFsc28=' }) + '\n',
  )
  return raiz
}

/** Roda o gerador. Devolve {code, out}. Nunca lança — o código de saída é o teste. */
function rodar(raiz, ...args) {
  try {
    const out = execFileSync(process.execPath, [join(raiz, 'scripts', 'manifest.mjs'), ...args], {
      cwd: raiz,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') }
  }
}

const lerManifest = (raiz) => JSON.parse(readFileSync(join(raiz, 'app', 'manifest.json'), 'utf8'))
const exigir = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

// ── geração ──────────────────────────────────────────────────────────────────

teste('gera manifest a partir de app/', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': '# A\n', 'schemas/x.schema.md': '# S\n' })
  const { code } = rodar(raiz)
  exigir(code === 0, `esperava sucesso, veio ${code}`)
  const m = lerManifest(raiz)
  exigir(m.fileCount === 2, `fileCount=${m.fileCount}`)
  // `schemas/` conta como arquivo, não como artefato.
  exigir(m.artifactCount === 1, `artifactCount=${m.artifactCount}`)
  exigir(m.schemaVersion === 1, 'schemaVersion ausente')
})

teste('geração é determinística', (raiz) => {
  biblioteca(raiz, { 'runbooks/b.md': 'b', 'runbooks/a.md': 'a', 'commands/c.md': 'c' })
  rodar(raiz)
  const primeiro = readFileSync(join(raiz, 'app', 'manifest.json'), 'utf8')
  rodar(raiz)
  const segundo = readFileSync(join(raiz, 'app', 'manifest.json'), 'utf8')
  exigir(primeiro === segundo, 'duas execuções produziram bytes diferentes')
  // Ordenação estável, independente da ordem em que o SO listou o diretório.
  const paths = JSON.parse(primeiro).files.map((f) => f.path)
  exigir(String(paths) === String([...paths].sort()), `ordem instável: ${paths}`)
})

teste('não declara o próprio manifest nem a assinatura', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  const paths = lerManifest(raiz).files.map((f) => f.path)
  exigir(!paths.includes('manifest.json') && !paths.includes('manifest.sig'), `declarou a si mesmo: ${paths}`)
})

teste('ignora metadado de repositório fora de app/', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  writeFileSync(join(raiz, 'README.md'), 'readme')
  writeFileSync(join(raiz, 'CHANGELOG.md'), 'changelog')
  rodar(raiz)
  const paths = lerManifest(raiz).files.map((f) => f.path)
  exigir(paths.length === 1 && paths[0] === 'runbooks/a.md', `declarou metadado: ${paths}`)
})

// ── --check ──────────────────────────────────────────────────────────────────

teste('--check passa quando está em dia', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  const { code } = rodar(raiz, '--check')
  exigir(code === 0, `--check deveria passar, veio ${code}`)
})

teste('--check acusa arquivo ADICIONADO', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  writeFileSync(join(raiz, 'app', 'runbooks', 'novo.md'), 'novo')
  const { code, out } = rodar(raiz, '--check')
  exigir(code === 1, 'deveria reprovar')
  exigir(out.includes('não declarado') && out.includes('runbooks/novo.md'), `saída não aponta o arquivo: ${out}`)
})

teste('--check acusa arquivo REMOVIDO', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a', 'runbooks/b.md': 'b' })
  rodar(raiz)
  rmSync(join(raiz, 'app', 'runbooks', 'b.md'))
  const { code, out } = rodar(raiz, '--check')
  exigir(code === 1, 'deveria reprovar')
  exigir(out.includes('declarado e ausente') && out.includes('runbooks/b.md'), `saída não aponta o arquivo: ${out}`)
})

teste('--check acusa arquivo ALTERADO', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'original' })
  rodar(raiz)
  writeFileSync(join(raiz, 'app', 'runbooks', 'a.md'), 'alterado')
  const { code } = rodar(raiz, '--check')
  exigir(code === 1, 'conteúdo alterado deveria reprovar o --check')
})

teste('--check reprova manifest desatualizado sem tocar no disco', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  const antes = readFileSync(join(raiz, 'app', 'manifest.json'), 'utf8')
  writeFileSync(join(raiz, 'app', 'runbooks', 'z.md'), 'z')
  rodar(raiz, '--check')
  const depois = readFileSync(join(raiz, 'app', 'manifest.json'), 'utf8')
  exigir(antes === depois, '--check NÃO pode gravar')
})

// ── recusas ──────────────────────────────────────────────────────────────────

teste('recusa extensão não publicável dentro de app/', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a', 'runbooks/script.sh': '#!/bin/sh' })
  const { code, out } = rodar(raiz)
  exigir(code === 1, 'deveria reprovar')
  exigir(out.includes('extensão não publicável'), `motivo errado: ${out}`)
})

teste('recusa symlink que aponta fora de app/', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  const segredo = join(raiz, 'segredo.md')
  writeFileSync(segredo, 'conteudo fora da raiz publicavel')
  try {
    symlinkSync(segredo, join(raiz, 'app', 'runbooks', 'link.md'))
  } catch {
    // Windows exige privilégio para criar symlink. Pular é honesto; contar como
    // aprovado seria afirmar uma cobertura que não houve. Na CI (Linux) roda.
    throw new Pulado('symlink indisponível neste ambiente')
  }
  const { code, out } = rodar(raiz)
  exigir(code === 1, 'symlink para fora deveria reprovar')
  exigir(out.includes('symlink aponta fora'), `motivo errado: ${out}`)
})

teste('recusa manifest sem name', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' }, { name: '' })
  const { code, out } = rodar(raiz)
  exigir(code === 1, 'deveria reprovar')
  exigir(out.includes('sem `name`'), `motivo errado: ${out}`)
})

teste('preserva campos editoriais do manifest anterior', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' }, { version: '3.2.1', minimumDesktopVersion: '0.20.0' })
  rodar(raiz)
  const m = lerManifest(raiz)
  exigir(m.version === '3.2.1', `version=${m.version}`)
  exigir(m.minimumDesktopVersion === '0.20.0', `minimumDesktopVersion=${m.minimumDesktopVersion}`)
})

teste('--check reprova biblioteca sem sidecar de assinatura', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  rmSync(join(raiz, 'app', 'manifest.sig'))
  const { code, out } = rodar(raiz, '--check')
  exigir(code === 1, 'sem sidecar deveria reprovar')
  exigir(out.includes('não assinada'), `motivo errado: ${out}`)
})

teste('--check reprova sidecar malformado', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  writeFileSync(join(raiz, 'app', 'manifest.sig'), JSON.stringify({ kid: 'x' }))
  const { code, out } = rodar(raiz, '--check')
  exigir(code === 1, 'sidecar sem alg/sig deveria reprovar')
  exigir(out.includes('malformado'), `motivo errado: ${out}`)
})

teste('--check reprova schemaVersion inesperado', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  const m = lerManifest(raiz)
  m.schemaVersion = 99
  writeFileSync(join(raiz, 'app', 'manifest.json'), JSON.stringify(m, null, 2) + '\n')
  const { code, out } = rodar(raiz, '--check')
  exigir(code === 1, 'schemaVersion desconhecido deveria reprovar')
  exigir(out.includes('schemaVersion'), `motivo errado: ${out}`)
})

teste('--check reprova caminho que escapa de app/', (raiz) => {
  biblioteca(raiz, { 'runbooks/a.md': 'a' })
  rodar(raiz)
  const m = lerManifest(raiz)
  m.files.push({ path: '../fora.md', sha256: 'a'.repeat(64), size: 1 })
  m.fileCount = m.files.length
  writeFileSync(join(raiz, 'app', 'manifest.json'), JSON.stringify(m, null, 2) + '\n')
  const { code, out } = rodar(raiz, '--check')
  exigir(code === 1, 'caminho fora de app/ deveria reprovar')
  exigir(out.includes('caminho inválido'), `motivo errado: ${out}`)
})

// ── resultado ────────────────────────────────────────────────────────────────

console.log(`\n${passou} passaram, ${falhas.length} falharam`)
if (falhas.length) process.exit(1)
