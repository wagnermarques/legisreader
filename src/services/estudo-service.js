/**
 * Dados de estudo do estudante, local-first: tudo fica no localStorage deste
 * navegador e o app funciona 100% sem conta. A sincronização com login vem
 * depois (roadmap, "Dados do estudante"); os registros já têm id próprio
 * para que uma fila de envio possa ser acrescentada sem mudar o formato.
 *
 * Por enquanto só grifos:
 *   { id, grupoId, norma, dispositivo, vigenteDesde, inicio, fim, cor, texto, criadoEm }
 * `norma` é o caminho da norma no índice; `inicio`/`fim` são posições dentro
 * de `versao.texto` da versão `vigenteDesde`. Um grifo arrastado por vários
 * dispositivos é salvo como um registro por dispositivo, todos com o mesmo
 * `grupoId` — recolorir ou remover age sobre o grupo inteiro.
 */

// Mesmo prefixo que o appshell usa nas chaves dele (constante de build
// definida pelo preset do Vite), para não colidir com outros apps servidos
// na mesma origem. O appshell não exporta storageKey(), daí o uso direto.
const CHAVES = {
  grifos: `${__APP_STORAGE_PREFIX__}:estudo:grifos`,
  rotulosCores: `${__APP_STORAGE_PREFIX__}:estudo:rotulos-cores`, // { [corId]: rótulo do estudante }
}

function lerJson(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto === null ? padrao : JSON.parse(bruto)
  } catch {
    return padrao
  }
}

function gravarJson(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // storage indisponível (janela privada, cota) — o app segue funcionando
  }
}

// crypto.randomUUID() só existe em contexto seguro, e falta quando o app é
// servido por http num IP da rede local (celular apontando para o dev server).
// crypto.getRandomValues() não tem essa restrição.
function novoId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante 1
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const estudoService = {
  /** Todos os grifos, do mais antigo para o mais novo. */
  listarGrifos() {
    return lerJson(CHAVES.grifos, [])
  },

  grifosDaNorma(caminho) {
    return this.listarGrifos().filter((g) => g.norma === caminho)
  },

  /**
   * Salva um grifo como um registro por dispositivo que ele cobre.
   * `pedacos`: [{ dispositivo, vigenteDesde, inicio, fim, texto }].
   */
  adicionarGrifo(norma, cor, pedacos) {
    const lista = this.listarGrifos()
    const grupoId = novoId()
    const criadoEm = new Date().toISOString()
    const novos = pedacos.map((p) => ({
      id: novoId(),
      grupoId,
      norma,
      dispositivo: p.dispositivo,
      vigenteDesde: p.vigenteDesde,
      inicio: p.inicio,
      fim: p.fim,
      cor,
      texto: p.texto,
      criadoEm,
    }))
    lista.push(...novos)
    gravarJson(CHAVES.grifos, lista)
    return novos
  },

  recolorirGrupo(grupoId, cor) {
    const lista = this.listarGrifos()
    for (const g of lista) if (g.grupoId === grupoId) g.cor = cor
    gravarJson(CHAVES.grifos, lista)
  },

  removerGrupo(grupoId) {
    gravarJson(
      CHAVES.grifos,
      this.listarGrifos().filter((g) => g.grupoId !== grupoId),
    )
  },

  /** O significado de cada cor: o escolhido pelo estudante, senão o padrão. */
  rotuloDaCor(cor) {
    return lerJson(CHAVES.rotulosCores, {})[cor.id] || cor.rotuloPadrao
  },

  /** Rótulo vazio volta ao padrão. */
  renomearCor(corId, rotulo) {
    const rotulos = lerJson(CHAVES.rotulosCores, {})
    const limpo = rotulo.trim()
    if (limpo) rotulos[corId] = limpo
    else delete rotulos[corId]
    gravarJson(CHAVES.rotulosCores, rotulos)
  },
}
