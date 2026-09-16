import { LitElement, css, html } from 'lit'
import { carregarIndice, carregarNorma, divisoesDoSumario } from '../services/dados-service.js'

/**
 * Sumário navegável do drawer: as normas disponíveis e, dentro de cada uma,
 * a árvore de divisões (Parte > Título > Capítulo > Seção).
 *
 * Carrega sozinho em vez de receber os dados prontos porque o drawer é
 * montado por createAppShell() na inicialização, antes de qualquer fetch —
 * e um sumário que só aparece depois do primeiro clique numa norma seria
 * inútil justamente para quem ainda não sabe o que existe.
 */
export class SumarioNormas extends LitElement {
  static properties = {
    _normas: { state: true },
    _erro: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      padding: 4px 0 8px;
    }

    .norma {
      font-weight: 600;
      display: block;
      padding: 8px 16px;
      color: var(--md-sys-color-primary, #1f3a5f);
      text-decoration: none;
    }

    a {
      display: block;
      padding: 5px 16px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      text-decoration: none;
      font-size: 0.85rem;
      line-height: 1.3;
    }

    a:hover {
      background: var(--md-sys-color-surface-variant, #e7e0ec);
    }

    /* A indentação é o que comunica a hierarquia — sem ela o sumário vira
       uma lista plana de rótulos parecidos. */
    a[data-nivel='1'] {
      padding-left: 30px;
    }
    a[data-nivel='2'] {
      padding-left: 44px;
    }
    a[data-nivel='3'] {
      padding-left: 58px;
    }

    .rubrica {
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .estado {
      padding: 8px 16px;
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
  `

  constructor() {
    super()
    this._normas = null
    this._erro = null
  }

  async connectedCallback() {
    super.connectedCallback()
    try {
      const indice = await carregarIndice()
      this._normas = await Promise.all(
        indice.map(async (entrada) => {
          const { estrutura } = await carregarNorma(entrada.caminho)
          return { ...entrada, divisoes: divisoesDoSumario(estrutura) }
        }),
      )
    } catch (erro) {
      this._erro = erro.message
    }
  }

  render() {
    if (this._erro) {
      return html`<p class="estado">Não foi possível carregar o sumário.</p>`
    }
    if (!this._normas) {
      return html`<p class="estado">Carregando…</p>`
    }
    if (this._normas.length === 0) {
      return html`<p class="estado">Nenhuma norma disponível.</p>`
    }

    return html`
      ${this._normas.map(
        (norma) => html`
          <a class="norma" href="#/norma/${norma.caminho}">${norma.nome}</a>
          ${norma.divisoes.map(
            (div) => html`
              <a href="#/norma/${norma.caminho}?ir=${div.ancora}" data-nivel=${div.nivel}>
                ${div.rotulo}${div.rubrica ? html` <span class="rubrica">— ${div.rubrica}</span>` : ''}
              </a>
            `,
          )}
        `,
      )}
    `
  }
}

customElements.define('sumario-normas', SumarioNormas)
