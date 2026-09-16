/**
 * Acesso aos dados das normas publicados pelo legis-dados.
 *
 * Os arquivos vêm de public/data/, baixados num ref fixado por
 * scripts/baixar-dados.mjs — não são importados pelo bundler de propósito:
 * são grandes, mudam num ritmo próprio e devem ser cacheáveis pelo service
 * worker separados do código do app.
 */

const base = `${import.meta.env.BASE_URL}data/`

// Uma norma inteira é ~280 KB; buscar de novo a cada navegação de rota seria
// desperdício. O cache guarda a promessa, não o resultado, para que duas
// navegações simultâneas compartilhem o mesmo fetch.
const cache = new Map()

async function buscarJson(caminhoRelativo) {
  const url = `${base}${caminhoRelativo}`
  const resposta = await fetch(url)
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${caminhoRelativo} (HTTP ${resposta.status})`)
  }

  // Servidor de SPA (o preview do Vite e o GitHub Pages fazem isso) devolve
  // index.html com 200 para caminho inexistente. Sem esta checagem o erro que
  // chega ao usuário é "Unexpected token '<'", que não diz nada; o que houve
  // foi uma norma que não existe nos dados publicados.
  const tipo = resposta.headers.get('content-type') ?? ''
  if (!tipo.includes('json')) {
    throw new Error(`Norma não encontrada nos dados publicados (${caminhoRelativo})`)
  }

  return resposta.json()
}

function comCache(chave, produzir) {
  if (!cache.has(chave)) {
    // Um erro não pode envenenar o cache: sem isso, uma falha de rede
    // momentânea deixaria a norma inacessível até o reload da página.
    cache.set(
      chave,
      produzir().catch((erro) => {
        cache.delete(chave)
        throw erro
      }),
    )
  }
  return cache.get(chave)
}

/** Lista das normas disponíveis: [{ urn, nome, caminho }]. */
export function carregarIndice() {
  return comCache('indice', () => buscarJson('indice.json'))
}

/**
 * Carrega uma norma inteira: { norma, estrutura, dispositivos }.
 * `caminho` é o campo `caminho` do índice (ex.: 'br/federal/decreto-lei/1940-2848').
 */
export function carregarNorma(caminho) {
  return comCache(`norma:${caminho}`, async () => {
    const [norma, estrutura, dispositivos] = await Promise.all([
      buscarJson(`${caminho}/norma.json`),
      buscarJson(`${caminho}/estrutura.json`),
      buscarJson(`${caminho}/dispositivos.json`),
    ])
    return { norma, estrutura, dispositivos }
  })
}

/** A versão vigente de um dispositivo: a que não tem `vigenteAte`. */
export function versaoVigente(dispositivo) {
  return dispositivo.versoes.find((v) => v.vigenteAte === null) ?? dispositivo.versoes.at(-1)
}

/**
 * Profundidade de um dispositivo na hierarquia, seguindo `pai` até o artigo.
 * Usada só para indentar a leitura — artigo = 0, parágrafo/inciso = 1, etc.
 */
export function profundidade(dispositivo, porId) {
  let nivel = 0
  let atual = dispositivo
  while (atual?.pai) {
    nivel += 1
    atual = porId.get(atual.pai)
  }
  return nivel
}

/**
 * Achata a árvore de `estrutura.json` nas divisões que interessam ao sumário
 * (parte, título, capítulo, seção — tudo que não é artigo), guardando o id do
 * primeiro artigo de cada divisão para servir de âncora.
 */
export function divisoesDoSumario(estrutura) {
  const divisoes = []

  const primeiroArtigo = (no) => {
    if (no.tipo === 'artigo') return no.id
    for (const filho of no.filhos ?? []) {
      const id = primeiroArtigo(filho)
      if (id) return id
    }
    return null
  }

  const visitar = (nos, nivel) => {
    for (const no of nos) {
      if (no.tipo === 'artigo') continue
      divisoes.push({
        tipo: no.tipo,
        rotulo: no.rotulo,
        rubrica: no.rubrica,
        nivel,
        ancora: primeiroArtigo(no),
      })
      visitar(no.filhos ?? [], nivel + 1)
    }
  }

  visitar(estrutura, 0)
  return divisoes
}
