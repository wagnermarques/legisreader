import { LitElement, css, html, nothing } from 'lit'
import { carregarNorma, profundidade, versaoVigente } from '../services/dados-service.js'
import { estudoService } from '../services/estudo-service.js'
import {
  CORES_GRIFO,
  COR_TEXTO_GRIFO,
  ancorarGrifo,
  aparar,
  corGrifo,
  segmentarTexto,
} from '../grifos.js'

// Quanto a seleção precisa ficar parada antes de a barra de cores reagir. Não
// é espera pela seleção final: só evita redesenhar a cada pixel do arrasto.
const ESPERA_SELECAO_MS = 120
// Folga entre a seleção e o topo da barra ao rolar a seleção para fora de
// baixo dela.
const FOLGA_BARRA = 16
// Quanto tempo o dispositivo aberto por âncora fica tingido.
const DESTAQUE_ANCORA_MS = 1600

/** Ancestral rolável mais próximo, atravessando shadow roots. */
function ancestralRolavel(el) {
  let no = el.parentNode ?? el.host
  while (no) {
    if (no.nodeType === Node.ELEMENT_NODE) {
      const overflow = getComputedStyle(no).overflowY
      if (/(auto|scroll)/.test(overflow) && no.scrollHeight > no.clientHeight) return no
    }
    no = no.parentNode ?? no.host
  }
  return null
}

/** Posição de (no, offset) em caracteres, contada do início do texto de `raiz`. */
function posicaoEm(raiz, no, offset) {
  const range = document.createRange()
  range.selectNodeContents(raiz)
  try {
    range.setEnd(no, offset)
  } catch {
    return null
  }
  return range.toString().length
}

/**
 * A parte de `range` que cai dentro do texto de um dispositivo, em posições
 * relativas a esse texto, ou null se só sobrar espaço. O primeiro e o último
 * dispositivo de um arrasto mantêm a borda da seleção; os do meio entram
 * inteiros.
 */
function recortarNoDispositivo(range, el) {
  const recorte = document.createRange()
  recorte.selectNodeContents(el)
  if (recorte.compareBoundaryPoints(Range.START_TO_START, range) < 0) {
    recorte.setStart(range.startContainer, range.startOffset)
  }
  if (recorte.compareBoundaryPoints(Range.END_TO_END, range) > 0) {
    recorte.setEnd(range.endContainer, range.endOffset)
  }
  const inicio = posicaoEm(el, recorte.startContainer, recorte.startOffset)
  const fim = posicaoEm(el, recorte.endContainer, recorte.endOffset)
  if (inicio === null || fim === null) return null

  const texto = el.textContent
  const posicoes = aparar(texto, inicio, fim)
  if (!posicoes) return null
  return {
    dispositivo: el.dataset.disp,
    vigenteDesde: el.dataset.vigenteDesde,
    inicio: posicoes.inicio,
    fim: posicoes.fim,
    texto: texto.slice(posicoes.inicio, posicoes.fim),
  }
}

/**
 * Leitura de uma norma inteira.
 *
 * `dispositivos.json` já vem em ordem de documento, então a renderização é
 * uma passada linear: cada dispositivo sabe seu `pai`, e a profundidade na
 * cadeia de pais vira a indentação. Não há por que remontar a árvore aqui.
 *
 * As divisões (Parte, Título, Capítulo) vêm de `estrutura.json` e são
 * intercaladas antes do artigo que as abre — é o que dá ao texto corrido a
 * cara de código de lei em vez de uma lista de artigos soltos.
 */
export class NormaView extends LitElement {
  static properties = {
    caminho: { type: String },
    ir: { type: String },
    _estado: { state: true },
    _dados: { state: true },
    _erro: { state: true },
    _grifos: { state: true },
    _selecao: { state: true },
    _editando: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      /* Uma coluna estreita é o que torna lei legível; texto de 100% da
         largura numa tela grande é cansativo de acompanhar. */
      max-width: 44rem;
      margin: 0 auto;
    }

    .ementa {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-style: italic;
      margin: 0 0 4px;
    }

    .aviso {
      background: var(--md-sys-color-surface-variant, #e7e0ec);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.8rem;
      margin: 16px 0 24px;
    }

    .aviso a {
      color: inherit;
    }

    h1 {
      font-size: 1.5rem;
      margin: 0 0 8px;
    }

    .divisao {
      margin: 32px 0 8px;
      text-align: center;
    }

    .divisao .rotulo {
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .divisao .rubrica {
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    /* Parte e título pesam mais que capítulo/seção. */
    .divisao[data-tipo='parte'] .rotulo {
      font-size: 1.15rem;
    }
    .divisao[data-tipo='titulo'] .rotulo {
      font-size: 1.05rem;
    }

    .dispositivo {
      margin: 0 0 12px;
      line-height: 1.6;
      /* scroll-margin: sem isso, pular para uma âncora deixa o artigo colado
         no topo, por baixo do header fixo do shell. */
      scroll-margin-top: 80px;
    }

    .dispositivo[data-nivel='1'] {
      margin-left: 1.5rem;
    }
    .dispositivo[data-nivel='2'] {
      margin-left: 3rem;
    }
    .dispositivo[data-nivel='3'] {
      margin-left: 4.5rem;
    }

    .rubrica-artigo {
      display: block;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--md-sys-color-primary, #1f3a5f);
      margin-top: 20px;
    }

    .rotulo-disp {
      font-weight: 600;
    }

    /* Revogado e vetado nunca devem se parecer com texto vigente: um
       estudante que bate o olho tem de perceber a diferença sem ler a nota. */
    .dispositivo[data-evento='revogado'],
    .dispositivo[data-evento='vetado'] {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-style: italic;
    }

    .estado {
      padding: 32px 0;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .erro {
      color: var(--md-sys-color-error, #b3261e);
    }

    .dispositivo.destaque {
      animation: destaque ${DESTAQUE_ANCORA_MS}ms ease-out;
    }
    @keyframes destaque {
      from {
        background: var(--md-sys-color-secondary-container, #e8def8);
      }
      to {
        background: transparent;
      }
    }

    mark {
      border-radius: 3px;
      padding: 1px 0;
      cursor: pointer;
    }

    /* Enquanto a barra de cores está aberta, o fim da norma precisa poder
       rolar para cima dela. */
    :host([data-barra-aberta]) {
      padding-bottom: 120px;
    }

    .barra-grifo {
      position: fixed;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      z-index: 5;
      box-sizing: border-box;
      width: min(100%, 44rem);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      background: var(--md-sys-color-surface, #fffbfe);
      color: var(--md-sys-color-on-surface, #1d1b20);
      border-top: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.18);
    }

    .cores {
      display: flex;
      flex: 1;
      gap: 4px;
      overflow-x: auto;
    }

    .cor {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex: 0 0 auto;
      width: 72px;
      padding: 4px 0;
      border: 0;
      border-radius: 8px;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.7rem;
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
    }

    .amostra {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
    }

    .cor[aria-pressed='true'] .amostra {
      outline: 3px solid var(--md-sys-color-primary, #1f3a5f);
      outline-offset: 2px;
    }
  `

  constructor() {
    super()
    this.caminho = ''
    this.ir = ''
    this._estado = 'carregando'
    this._dados = null
    this._erro = null
    this._grifos = []
    this._selecao = null
    this._editando = null

    // Um long-press no Android é tratado pela UI de seleção do sistema e
    // termina em touchcancel, não em touchend: evento de toque nunca dispara
    // justo no gesto que seleciona texto. selectionchange é o sinal que o
    // navegador emite qualquer que seja a forma de entrada.
    this._aoMudarSelecao = () => {
      clearTimeout(this._timerSelecao)
      this._timerSelecao = setTimeout(() => this._acompanharSelecao(), ESPERA_SELECAO_MS)
    }
    // Editar um grifo existente não tem seleção para desfazer, então um
    // toque fora da barra é o que a fecha.
    this._aoTocarDocumento = (evento) => {
      if (!this._editando) return
      const barra = this.renderRoot.querySelector('.barra-grifo')
      if (barra && evento.composedPath().includes(barra)) return
      this._editando = null
    }
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('selectionchange', this._aoMudarSelecao)
    document.addEventListener('pointerdown', this._aoTocarDocumento, true)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('selectionchange', this._aoMudarSelecao)
    document.removeEventListener('pointerdown', this._aoTocarDocumento, true)
    clearTimeout(this._timerSelecao)
    clearTimeout(this._timerDestaque)
  }

  updated() {
    this.toggleAttribute('data-barra-aberta', this._barraAberta)
  }

  willUpdate(changed) {
    if (changed.has('caminho') && this.caminho) {
      this._carregar(this.caminho)
    } else if (changed.has('ir') && this._estado === 'pronto') {
      // Mesma norma, âncora diferente (clique no sumário com a norma já
      // aberta): não recarrega nada, só rola.
      this.updateComplete.then(() => this._irParaAncora())
    }
  }

  async _carregar(caminho) {
    this._estado = 'carregando'
    this._erro = null
    this._selecao = null
    this._editando = null
    try {
      const dados = await carregarNorma(caminho)
      // Uma navegação mais nova pode ter começado enquanto esta esperava.
      if (this.caminho !== caminho) return
      this._dados = dados
      this._porId = new Map(dados.dispositivos.map((d) => [d.id, d]))
      this._divisoes = this._divisoesPorArtigo(dados.estrutura)
      this._grifos = estudoService.grifosDaNorma(caminho)
      this._estado = 'pronto'
      // Depois da primeira pintura, honra o ?ir= da URL (ex.: vindo do
      // sumário). A âncora vai em query, não num segundo '#', porque o
      // router já usa o hash para a rota inteira.
      await this.updateComplete
      this._irParaAncora()
    } catch (erro) {
      if (this.caminho !== caminho) return
      this._erro = erro.message
      this._estado = 'erro'
    }
  }

  /**
   * Divisões de `estrutura.json` indexadas pelo id do artigo que as abre,
   * para intercalar no texto corrido. Um mesmo artigo pode abrir várias
   * divisões aninhadas (Parte + Título + Capítulo), daí o array.
   */
  _divisoesPorArtigo(estrutura) {
    const mapa = new Map()

    const primeiroArtigo = (no) => {
      if (no.tipo === 'artigo') return no.id
      for (const filho of no.filhos ?? []) {
        const id = primeiroArtigo(filho)
        if (id) return id
      }
      return null
    }

    const visitar = (nos) => {
      for (const no of nos) {
        if (no.tipo === 'artigo') continue
        const ancora = primeiroArtigo(no)
        if (ancora) {
          if (!mapa.has(ancora)) mapa.set(ancora, [])
          mapa.get(ancora).push(no)
        }
        visitar(no.filhos ?? [])
      }
    }

    visitar(estrutura)
    return mapa
  }

  _irParaAncora() {
    if (!this.ir) return
    const el = this.renderRoot.getElementById(this.ir)
    if (!el) return
    el.scrollIntoView({ block: 'start' })
    // Numa norma longa, cair no lugar certo sem nenhuma pista de qual
    // dispositivo era o alvo obriga a procurar. Recolocar a classe no mesmo
    // frame não reiniciaria a animação.
    el.classList.remove('destaque')
    requestAnimationFrame(() => el.classList.add('destaque'))
    clearTimeout(this._timerDestaque)
    this._timerDestaque = setTimeout(() => el.classList.remove('destaque'), DESTAQUE_ANCORA_MS)
  }

  /**
   * O range selecionado dentro desta view, ou null. A seleção dentro de
   * shadow DOM não é exposta do mesmo jeito em todo navegador: o Chromium
   * tem shadowRoot.getSelection(); os demais, getComposedRanges(), que
   * precisa receber o shadow root para não devolver o range recortado no
   * host.
   */
  _rangeSelecionado() {
    const raiz = this.renderRoot
    if (raiz.getSelection) {
      const sel = raiz.getSelection()
      return sel && !sel.isCollapsed && sel.rangeCount ? sel.getRangeAt(0) : null
    }
    const sel = document.getSelection()
    if (!sel || !sel.rangeCount) return null
    if (sel.getComposedRanges) {
      let ranges
      try {
        ranges = sel.getComposedRanges({ shadowRoots: [raiz] })
      } catch {
        ranges = sel.getComposedRanges(raiz) // assinatura antiga do Safari
      }
      const estatico = ranges[0]
      if (!estatico || estatico.collapsed) return null
      const range = document.createRange()
      range.setStart(estatico.startContainer, estatico.startOffset)
      range.setEnd(estatico.endContainer, estatico.endOffset)
      return range
    }
    return sel.isCollapsed ? null : sel.getRangeAt(0)
  }

  /**
   * A seleção atual como um pedaço por dispositivo que ela toca, ou null se
   * não houver nada grifável (seleção vazia, ou só em rótulos e rubricas).
   */
  _pedacosSelecionados() {
    const range = this._rangeSelecionado()
    if (!range) return null
    const pedacos = []
    for (const el of this.renderRoot.querySelectorAll('.texto-disp')) {
      if (!range.intersectsNode(el)) continue
      const pedaco = recortarNoDispositivo(range, el)
      if (pedaco) pedacos.push(pedaco)
    }
    return pedacos.length ? pedacos : null
  }

  get _barraAberta() {
    return !!(this._selecao || this._editando)
  }

  /**
   * Acompanha a seleção ao vivo em vez de esperar a final: a barra pode
   * aparecer enquanto o estudante ainda arrasta a alça, porque o grifo é
   * recortado do que estiver selecionado no toque na cor.
   */
  _acompanharSelecao() {
    if (this._estado !== 'pronto') return
    const pedacos = this._pedacosSelecionados()
    if (pedacos) {
      const estavaAberta = this._barraAberta
      this._editando = null
      this._selecao = pedacos
      if (!estavaAberta) this._mostrarAcimaDaBarra(this._rangeSelecionado()?.getBoundingClientRect())
    } else if (this._selecao) {
      this._selecao = null
    }
  }

  _editarGrifo(evento, grifo) {
    // Um toque que termina uma seleção sobre um grifo é seleção, não edição.
    if (this._rangeSelecionado()) return
    evento.stopPropagation()
    this._selecao = null
    this._editando = grifo
    this._mostrarAcimaDaBarra(evento.currentTarget.getBoundingClientRect())
  }

  /**
   * Mantém a seleção viva durante o toque na barra: a ação padrão de um
   * pointerdown fora da seleção é desfazê-la, e não sobraria nada para grifar
   * quando o click chegasse.
   */
  _aoPressionarBarra(evento) {
    evento.preventDefault()
  }

  _aplicarCor(corId) {
    if (this._editando) {
      estudoService.recolorirGrupo(this._editando.grupoId, corId)
      this._editando = null
    } else {
      // Relê em vez de confiar no que abriu a barra: alças arrastadas depois
      // ainda caem nas palavras certas.
      const pedacos = this._pedacosSelecionados() ?? this._selecao
      if (!pedacos) return
      estudoService.adicionarGrifo(this.caminho, corId, pedacos)
      document.getSelection()?.removeAllRanges()
      this._selecao = null
    }
    this._grifos = estudoService.grifosDaNorma(this.caminho)
  }

  _removerGrifo() {
    if (this._editando) estudoService.removerGrupo(this._editando.grupoId)
    this._editando = null
    this._grifos = estudoService.grifosDaNorma(this.caminho)
  }

  /** Rola o que a barra cobriria de volta para a vista, depois que ela aparece. */
  async _mostrarAcimaDaBarra(retangulo) {
    if (!retangulo) return
    await this.updateComplete
    const barra = this.renderRoot.querySelector('.barra-grifo')
    if (!barra) return
    const sobreposicao = retangulo.bottom - barra.getBoundingClientRect().top + FOLGA_BARRA
    if (sobreposicao > 0) {
      ;(ancestralRolavel(this) ?? window).scrollBy({ top: sobreposicao, behavior: 'smooth' })
    }
  }

  /**
   * Grifos desta norma já ancorados no texto vigente, por dispositivo. Os
   * que não se acham mais (a redação mudou) não são pintados — aparecem só
   * no inventário, marcados como texto alterado.
   */
  _grifosPorDispositivo() {
    const mapa = new Map()
    for (const grifo of this._grifos) {
      const disp = this._porId.get(grifo.dispositivo)
      if (!disp) continue
      const posicoes = ancorarGrifo(grifo, versaoVigente(disp).texto)
      if (!posicoes) continue
      if (!mapa.has(disp.id)) mapa.set(disp.id, [])
      mapa.get(disp.id).push({ ...grifo, ...posicoes })
    }
    return mapa
  }

  render() {
    if (this._estado === 'carregando') {
      return html`<p class="estado">Carregando a norma…</p>`
    }
    if (this._estado === 'erro') {
      return html`
        <p class="estado erro">Não foi possível carregar a norma.</p>
        <p class="estado">${this._erro}</p>
      `
    }

    const { norma, dispositivos } = this._dados
    const grifos = this._grifosPorDispositivo()

    return html`
      <h1>${norma.nome}</h1>
      <p class="ementa">${norma.ementa}</p>
      <p class="aviso">
        Texto não oficial, compilado a partir do
        <a href=${norma.urlFonte} target="_blank" rel="noopener">${norma.fonte}</a>
        em ${norma.capturadoEm}. Não substitui o publicado no Diário Oficial da União —
        ver <a href="#/sobre">Sobre e fontes</a>.
      </p>
      ${dispositivos.map((d) => this._renderDispositivo(d, grifos.get(d.id) ?? []))}
      ${this._renderBarra()}
    `
  }

  _renderDispositivo(disp, grifos) {
    const versao = versaoVigente(disp)
    const nivel = profundidade(disp, this._porId)

    return html`
      ${(this._divisoes.get(disp.id) ?? []).map(
        (div) => html`
          <div class="divisao" data-tipo=${div.tipo}>
            <div class="rotulo">${div.rotulo}</div>
            ${div.rubrica ? html`<div class="rubrica">${div.rubrica}</div>` : nothing}
          </div>
        `,
      )}
      ${disp.rubrica ? html`<span class="rubrica-artigo">${disp.rubrica}</span>` : nothing}
      <p class="dispositivo" id=${disp.id} data-nivel=${nivel} data-evento=${versao.evento}>
        <span class="rotulo-disp">${disp.rotulo}</span>
        <!-- Sem espaço dentro do span: as posições dos grifos são contadas
             sobre o textContent dele, que tem de ser exatamente versao.texto. -->
        <span class="texto-disp" data-disp=${disp.id} data-vigente-desde=${versao.vigenteDesde}
          >${this._renderTexto(versao.texto, grifos)}</span
        >
      </p>
    `
  }

  _renderTexto(texto, grifos) {
    if (!grifos.length) return texto
    return segmentarTexto(texto, grifos).map(({ texto: trecho, grifo }) => {
      if (!grifo) return trecho
      const cor = corGrifo(grifo.cor)
      // O significado da cor vai no title: o destaque não pode depender só
      // de enxergar a cor.
      return html`<mark
        style="background:${cor.fundo};color:${COR_TEXTO_GRIFO}"
        title="${estudoService.rotuloDaCor(cor)} — toque para recolorir ou remover"
        @click=${(e) => this._editarGrifo(e, grifo)}
        >${trecho}</mark
      >`
    })
  }

  _renderBarra() {
    if (!this._barraAberta) return nothing
    const atual = this._editando?.cor
    return html`
      <div
        class="barra-grifo"
        role="toolbar"
        aria-label=${this._editando ? 'Editar grifo' : 'Grifar trecho'}
        @pointerdown=${this._aoPressionarBarra}
      >
        <div class="cores">
          ${CORES_GRIFO.map((cor) => {
            const rotulo = estudoService.rotuloDaCor(cor)
            return html`
              <button
                type="button"
                class="cor"
                aria-label="${cor.nome}: ${rotulo}"
                aria-pressed=${this._editando ? String(atual === cor.id) : nothing}
                @click=${() => this._aplicarCor(cor.id)}
              >
                <span class="amostra" style="background:${cor.fundo}"></span>
                <span>${rotulo}</span>
              </button>
            `
          })}
        </div>
        ${this._editando
          ? html`<md-icon-button aria-label="Remover grifo" @click=${this._removerGrifo}>
              <md-icon>delete</md-icon>
            </md-icon-button>`
          : nothing}
      </div>
    `
  }
}

customElements.define('norma-view', NormaView)
