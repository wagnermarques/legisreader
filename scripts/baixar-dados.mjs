#!/usr/bin/env node
// Baixa os dados das normas do legis-dados para public/data/, num ref fixado.
//
// Por que baixar em vez de submódulo: os dados mudam num ritmo próprio
// (diário, guiado pelo DOU) e são grandes; o app fixa uma versão e só se move
// quando alguém decide mover. Ver roadmap.org, seção "Como o app consome os
// dados".
//
// Uso:
//   node scripts/baixar-dados.mjs            # no-op se o pin já está baixado
//   node scripts/baixar-dados.mjs --force    # rebaixa mesmo assim
//
// Offline / desenvolvimento com o legis-dados ao lado:
//   LEGIS_DADOS_LOCAL=../legis-dados node scripts/baixar-dados.mjs

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'public', 'data')
const arquivoPin = join(destino, '.pin')

const config = JSON.parse(readFileSync(join(raiz, 'dados.config.json'), 'utf8'))
const { repo, ref } = config
const forcar = process.argv.includes('--force')
const local = process.env.LEGIS_DADOS_LOCAL

// Assinatura do que está em disco: o ref pedido, ou o caminho local.
const pinAtual = local ? `local:${resolve(local)}` : `${repo}@${ref}`

if (!forcar && existsSync(arquivoPin) && readFileSync(arquivoPin, 'utf8').trim() === pinAtual) {
  console.log(`dados: ${pinAtual} já em public/data/ (use --force para rebaixar)`)
  process.exit(0)
}

rmSync(destino, { recursive: true, force: true })
mkdirSync(destino, { recursive: true })

if (local) {
  const origem = join(resolve(local), 'dados')
  if (!existsSync(origem)) {
    console.error(`dados: LEGIS_DADOS_LOCAL=${local} não tem um diretório dados/`)
    process.exit(1)
  }
  // O "/." copia o conteúdo, não o diretório.
  execFileSync('cp', ['-R', `${origem}/.`, destino], { stdio: 'inherit' })
  console.log(`dados: copiados de ${origem}`)
} else {
  const url = `https://codeload.github.com/${repo}/tar.gz/${ref}`
  console.log(`dados: baixando ${repo}@${ref}`)

  const resposta = await fetch(url)
  if (!resposta.ok) {
    console.error(`dados: falha ao baixar ${url} — HTTP ${resposta.status}`)
    console.error('Se estiver sem rede, use LEGIS_DADOS_LOCAL=<caminho do legis-dados>.')
    process.exit(1)
  }

  // O tarball do GitHub vem com um diretório raiz "<repo>-<ref>/"; --strip=2
  // descarta esse nível e o "dados/", deixando o conteúdo direto em data/.
  execFileSync('tar', ['-xz', '--strip-components=2', '-C', destino, '--wildcards', '*/dados/*'], {
    input: Buffer.from(await resposta.arrayBuffer()),
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

if (!existsSync(join(destino, 'indice.json'))) {
  console.error('dados: extração terminou sem public/data/indice.json — abortando')
  process.exit(1)
}

writeFileSync(arquivoPin, `${pinAtual}\n`)

const indice = JSON.parse(readFileSync(join(destino, 'indice.json'), 'utf8'))
console.log(`dados: ${indice.length} norma(s) em public/data/ — ${indice.map((n) => n.nome).join(', ')}`)
