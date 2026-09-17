import { LitElement, css, html, nothing } from 'lit'
import { carregarNorma, versaoVigente } from '../services/dados-service.js'
import { estudoService } from '../services/estudo-service.js'
import { CORES_GRIFO, ancorarGrifo, citacao, corGrifo } from '../grifos.js'

/**
 * Inventário dos grifos, classificado por cor. A cor é o eixo principal
 * porque cada uma tem um significado (renomeável aqui mesmo): "tudo o que
 * marquei como pena" é a pergunta que este inventário responde. Dentro de
 * cada cor, os grifos seguem a ordem da lei, que é como o estudante pensa o
 * código.
 */
export class GrifosView extends LitElement {
  static properties = {
    _grifos: { state: true },
    _normas: { state: true },
    _filtro: { state: true },
    _renomeando: { state: true },
    _erro: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      max-width: 44rem;
      margin: 0 auto;
      padding: 16px 16px 64px;
    }

    h1 {
      font-size: 1.5rem;
      margin: 0 0 16px;
    }

    .legenda {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
    }

    .legenda li {
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: 8px;
    }

    .legenda li[data-ativo] {
      background: var(--md-sys-color-secondary-container, #e8def8);
    }

    .filtro {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
      padding: 8px 12px;
      border: 0;
      border-radius: 8px;
      background: none;
      color: var(--md-sys-color-on-surface, #1d1b20);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .filtro:hover {
      background: var(--md-sys-color-surface-variant, #e7e0ec);
    }

    .amostra {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
    }

    .filtro .rotulo {
      flex: 1;
      min-width: 0;
    }

    .contagem {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-variant-numeric: tabular-nums;
    }

    md-outlined-text-field {
      flex: 1;
      margin: 4px 0 4px 8px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      margin: 32px 0 8px;
    }

    .grifo {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      padding: 8px 4px 8px 12px;
      margin: 0 0 4px;
      border-left: 6px solid transparent;
      border-radius: 4px;
    }

    .grifo:hover {
      background: var(--md-sys-color-surface-variant, #e7e0ec);
    }

    .grifo a {
      flex: 1;
      min-width: 0;
      color: inherit;
      text-decoration: none;
    }

    .trecho {
      display: block;
      line-height: 1.5;
    }

    .onde {
      display: block;
      margin-top: 2px;
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .alterado {
      display: inline-block;
      margin-left: 6px;
      padding: 0 6px;
      border-radius: 8px;
      font-size: 0.75rem;
      background: var(--md-sys-color-error-container, #f9dedc);
      color: var(--md-sys-color-on-error-container, #410e0b);
    }

    .estado {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      line-height: 1.6;
    }
  `

  constructor() {
    super()
    this._grifos = estudoService.listarGrifos()
    this._normas = null
    this._filtro = null
    this._renomeando = null
    this._erro = null
  }

  async connectedCallback() {
    super.connectedCallback()
    const caminhos = [...new Set(this._grifos.map((g) => g.norma))]
    try {
      const normas = new Map()
      await Promise.all(
        caminhos.map(async (caminho) => {
          try {
            const dados = await carregarNorma(caminho)
            normas.set(caminho, {
              ...dados,
              porId: new Map(dados.dispositivos.map((d) => [d.id, d])),
              ordem: new Map(dados.dispositivos.map((d, i) => [d.id, i])),
            })
          } catch {
            // Norma que saiu dos dados publicados: os grifos dela ainda
            // aparecem, com o trecho salvo, só sem citação.
          }
        }),
      )
      this._normas = normas
    } catch (erro) {
      this._erro = erro.message
    }
  }

  /**
   * Um item por grifo (não por registro): um grifo arrastado por vários
   * dispositivos é salvo em pedaços, mas o estudante fez um grifo só.
   */
  _itens() {
    const grupos = new Map()
    for (const grifo of this._grifos) {
      if (!grupos.has(grifo.grupoId)) grupos.set(grifo.grupoId, [])
      grupos.get(grifo.grupoId).push(grifo)
    }

    const itens = []
    for (const pedacos of grupos.values()) {
      const norma = this._normas.get(pedacos[0].norma)
      const ordem = (g) => norma?.ordem.get(g.dispositivo) ?? Number.MAX_SAFE_INTEGER
      pedacos.sort((a, b) => ordem(a) - ordem(b) || a.inicio - b.inicio)
      const [primeiro] = pedacos

      const alterado = pedacos.some((p) => {
        const disp = norma?.porId.get(p.dispositivo)
        return !disp || !ancorarGrifo(p, versaoVigente(disp).texto)
      })
      const dispInicial = norma?.porId.get(primeiro.dispositivo)
      const outros = new Set(pedacos.map((p) => p.dispositivo)).size - 1

      itens.push({
        grupoId: primeiro.grupoId,
        cor: primeiro.cor,
        caminho: primeiro.norma,
        ancora: primeiro.dispositivo,
        texto: pedacos.map((p) => p.texto).join(' … '),
        onde:
          (dispInicial
            ? citacao(norma.norma.nome, dispInicial, norma.porId)
            : `${norma?.norma.nome ?? primeiro.norma} (dispositivo ${primeiro.dispositivo})`) +
          (outros > 0 ? ` e mais ${outros} ${outros === 1 ? 'dispositivo' : 'dispositivos'}` : ''),
        alterado,
        chaveOrdem: [primeiro.norma, ordem(primeiro), primeiro.inicio],
      })
    }

    return itens.sort((a, b) => {
      const [na, oa, ia] = a.chaveOrdem
      const [nb, ob, ib] = b.chaveOrdem
      return na.localeCompare(nb) || oa - ob || ia - ib
    })
  }

  _alternarFiltro(corId) {
    this._filtro = this._filtro === corId ? null : corId
  }

  async _comecarRenomear(corId) {
    this._renomeando = corId
    await this.updateComplete
    this.renderRoot.querySelector('md-outlined-text-field')?.focus()
  }

  _salvarRotulo(evento, corId) {
    if (this._renomeando !== corId) return
    estudoService.renomearCor(corId, evento.target.value)
    this._renomeando = null
  }

  _teclaNoRotulo(evento, corId) {
    if (evento.key === 'Enter') this._salvarRotulo(evento, corId)
    else if (evento.key === 'Escape') this._renomeando = null
  }

  _remover(grupoId) {
    estudoService.removerGrupo(grupoId)
    this._grifos = estudoService.listarGrifos()
  }

  render() {
    if (this._erro) {
      return html`<h1>Meus grifos</h1>
        <p class="estado">Não foi possível carregar os grifos: ${this._erro}</p>`
    }
    if (!this._normas) {
      return html`<h1>Meus grifos</h1>
        <p class="estado">Carregando…</p>`
    }
    if (this._grifos.length === 0) {
      return html`
        <h1>Meus grifos</h1>
        <p class="estado">
          Você ainda não grifou nenhum trecho. Enquanto lê uma norma, selecione um trecho do texto
          e escolha uma cor na barra que aparece na parte de baixo da tela.
        </p>
      `
    }

    const itens = this._itens()
    const porCor = new Map(CORES_GRIFO.map((c) => [c.id, []]))
    for (const item of itens) porCor.get(corGrifo(item.cor).id).push(item)

    return html`
      <h1>Meus grifos</h1>
      <ul class="legenda" aria-label="Filtrar por cor">
        ${CORES_GRIFO.map((cor) => this._renderLegenda(cor, porCor.get(cor.id).length))}
      </ul>
      ${CORES_GRIFO.filter((cor) => porCor.get(cor.id).length && (!this._filtro || this._filtro === cor.id)).map(
        (cor) => html`
          <section>
            <h2>
              <span class="amostra" style="background:${cor.fundo}"></span>
              ${estudoService.rotuloDaCor(cor)}
            </h2>
            ${porCor.get(cor.id).map((item) => this._renderItem(item, cor))}
          </section>
        `,
      )}
    `
  }

  _renderLegenda(cor, quantidade) {
    const rotulo = estudoService.rotuloDaCor(cor)
    if (this._renomeando === cor.id) {
      return html`
        <li>
          <span class="amostra" style="background:${cor.fundo};margin-left:12px"></span>
          <md-outlined-text-field
            label="Significado do ${cor.nome.toLowerCase()}"
            supporting-text="Vazio volta a “${cor.rotuloPadrao}”"
            .value=${rotulo}
            @keydown=${(e) => this._teclaNoRotulo(e, cor.id)}
            @blur=${(e) => this._salvarRotulo(e, cor.id)}
          ></md-outlined-text-field>
        </li>
      `
    }
    return html`
      <li ?data-ativo=${this._filtro === cor.id}>
        <button
          type="button"
          class="filtro"
          aria-pressed=${String(this._filtro === cor.id)}
          ?disabled=${quantidade === 0 && this._filtro !== cor.id}
          @click=${() => this._alternarFiltro(cor.id)}
        >
          <span class="amostra" style="background:${cor.fundo}"></span>
          <span class="rotulo">${rotulo} <span class="contagem">(${cor.nome})</span></span>
          <span class="contagem">${quantidade}</span>
        </button>
        <md-icon-button
          aria-label="Renomear o significado do ${cor.nome.toLowerCase()}"
          @click=${() => this._comecarRenomear(cor.id)}
        >
          <md-icon>edit</md-icon>
        </md-icon-button>
      </li>
    `
  }

  _renderItem(item, cor) {
    return html`
      <div class="grifo" style="border-left-color:${cor.fundo}">
        <a href="#/norma/${item.caminho}?ir=${item.ancora}">
          <span class="trecho">“${item.texto}”</span>
          <span class="onde"
            >${item.onde}${item.alterado
              ? html`<span class="alterado" title="A redação mudou desde que o trecho foi grifado"
                  >Texto alterado</span
                >`
              : nothing}</span
          >
        </a>
        <md-icon-button aria-label="Remover grifo" @click=${() => this._remover(item.grupoId)}>
          <md-icon>delete</md-icon>
        </md-icon-button>
      </div>
    `
  }
}

customElements.define('grifos-view', GrifosView)
