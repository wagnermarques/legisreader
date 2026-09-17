/**
 * Lógica pura dos grifos (trechos destacados pelo estudante), sem DOM nem
 * storage — é o que decide onde um grifo cai no texto e como ele é citado.
 *
 * Um grifo guarda posições de caractere dentro de `versao.texto` de um
 * dispositivo. O id do dispositivo nunca muda, mas o texto muda quando a lei
 * é alterada; por isso o grifo guarda também a versão grifada
 * (`vigenteDesde`) e o próprio trecho, para ser reencontrado ou dado como
 * perdido.
 */

// Paleta dos grifos. A cor tem um *significado* padrão (renomeável pelo
// estudante): agrupar o inventário por cor só ajuda se a cor quiser dizer
// alguma coisa. O texto sobre o grifo é fixo e escuro porque todos os fundos
// são pastéis claros — o on-surface do tema escuro sumiria em cima deles.
export const CORES_GRIFO = [
  { id: 'amarelo', nome: 'Amarelo', fundo: '#fff59d', rotuloPadrao: 'Elemento do tipo' },
  { id: 'vermelho', nome: 'Vermelho', fundo: '#ffcdd2', rotuloPadrao: 'Pena' },
  { id: 'azul', nome: 'Azul', fundo: '#bbdefb', rotuloPadrao: 'Exceção ou excludente' },
  { id: 'verde', nome: 'Verde', fundo: '#c8e6c9', rotuloPadrao: 'Prazo' },
  { id: 'laranja', nome: 'Laranja', fundo: '#ffe0b2', rotuloPadrao: 'Para revisar' },
]

export const COR_TEXTO_GRIFO = '#1c1b1f'

const coresPorId = new Map(CORES_GRIFO.map((c) => [c.id, c]))

export function corGrifo(id) {
  return coresPorId.get(id) ?? CORES_GRIFO[0]
}

/**
 * Onde o grifo cai no texto atual do dispositivo: { inicio, fim }, ou null
 * quando o trecho grifado não existe mais (a lei mudou a redação).
 *
 * Se as posições salvas ainda apontam para o mesmo trecho, valem como estão.
 * Senão, procura o trecho no texto novo e fica com a ocorrência mais próxima
 * da posição original — um grifo em "reclusão" no fim do caput não deve
 * pular para um "reclusão" do começo.
 */
export function ancorarGrifo(grifo, texto) {
  const { inicio, fim, texto: trecho } = grifo
  if (texto.slice(inicio, fim) === trecho) return { inicio, fim }
  if (!trecho) return null

  let melhor = -1
  for (let i = texto.indexOf(trecho); i !== -1; i = texto.indexOf(trecho, i + 1)) {
    if (melhor === -1 || Math.abs(i - inicio) < Math.abs(melhor - inicio)) melhor = i
  }
  return melhor === -1 ? null : { inicio: melhor, fim: melhor + trecho.length }
}

/**
 * Divide o texto em trechos alternados sem grifo / com grifo. `grifos` já
 * vêm ancorados ({ inicio, fim, ... }). Aplicados em ordem de início e
 * cortados ao que ainda não foi consumido, grifos sobrepostos viram um
 * destaque mais curto em vez de duplicar ou corromper o texto.
 */
export function segmentarTexto(texto, grifos) {
  const trechos = []
  let cursor = 0
  for (const grifo of [...grifos].sort((a, b) => a.inicio - b.inicio)) {
    const inicio = Math.max(grifo.inicio, cursor)
    const fim = Math.min(grifo.fim, texto.length)
    if (fim <= inicio) continue
    if (inicio > cursor) trechos.push({ texto: texto.slice(cursor, inicio), grifo: null })
    trechos.push({ texto: texto.slice(inicio, fim), grifo })
    cursor = fim
  }
  if (cursor < texto.length) trechos.push({ texto: texto.slice(cursor), grifo: null })
  return trechos
}

/**
 * Posições [inicio, fim) sem os espaços das pontas, ou null se só sobrar
 * espaço. As alças de seleção costumam passar do trecho, e um arrasto que
 * termina logo depois de um dispositivo deixa o seguinte só com espaço.
 */
export function aparar(texto, inicio, fim) {
  if (inicio > fim) [inicio, fim] = [fim, inicio]
  while (inicio < fim && /\s/.test(texto[inicio])) inicio++
  while (fim > inicio && /\s/.test(texto[fim - 1])) fim--
  return fim > inicio ? { inicio, fim } : null
}

/** Rótulo de um dispositivo como aparece numa citação. */
function rotuloNaCitacao(disp) {
  const rotulo = disp.rotulo.trim()
  switch (disp.tipo) {
    case 'artigo':
      return rotulo.replace(/^Art\./, 'art.')
    case 'paragrafo':
      return rotulo.replace(/^Parágrafo único$/i, 'parágrafo único')
    case 'inciso':
      return rotulo.replace(/\s*[–-]\s*$/, '')
    case 'alinea':
      return `alínea ${rotulo.replace(/\)\s*$/, '')}`
    default:
      return rotulo
  }
}

/**
 * Citação do dispositivo a partir da cadeia de pais:
 * "Código Penal, art. 121, § 2º, VI".
 */
export function citacao(nomeNorma, dispositivo, porId) {
  const partes = []
  for (let atual = dispositivo; atual; atual = atual.pai ? porId.get(atual.pai) : null) {
    partes.unshift(rotuloNaCitacao(atual))
  }
  return [nomeNorma, ...partes].join(', ')
}
