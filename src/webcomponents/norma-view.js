import { LitElement, css, html, nothing } from 'lit'
import { carregarNorma, profundidade, versaoVigente } from '../services/dados-service.js'

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
  `

  constructor() {
    super()
    this.caminho = ''
    this.ir = ''
    this._estado = 'carregando'
    this._dados = null
    this._erro = null
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
    try {
      const dados = await carregarNorma(caminho)
      // Uma navegação mais nova pode ter começado enquanto esta esperava.
      if (this.caminho !== caminho) return
      this._dados = dados
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

  /** Índice dos dispositivos por id, para resolver `pai` em O(1). */
  get _porId() {
    return new Map(this._dados.dispositivos.map((d) => [d.id, d]))
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
    this.renderRoot.getElementById(this.ir)?.scrollIntoView({ block: 'start' })
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

    const { norma, estrutura, dispositivos } = this._dados
    const porId = this._porId
    const divisoes = this._divisoesPorArtigo(estrutura)

    return html`
      <h1>${norma.nome}</h1>
      <p class="ementa">${norma.ementa}</p>
      <p class="aviso">
        Texto não oficial, compilado a partir do
        <a href=${norma.urlFonte} target="_blank" rel="noopener">${norma.fonte}</a>
        em ${norma.capturadoEm}. Não substitui o publicado no Diário Oficial da União —
        ver <a href="#/sobre">Sobre e fontes</a>.
      </p>
      ${dispositivos.map((d) => this._renderDispositivo(d, porId, divisoes))}
    `
  }

  _renderDispositivo(disp, porId, divisoes) {
    const versao = versaoVigente(disp)
    const nivel = profundidade(disp, porId)

    return html`
      ${(divisoes.get(disp.id) ?? []).map(
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
        ${versao.texto}
      </p>
    `
  }
}

customElements.define('norma-view', NormaView)
