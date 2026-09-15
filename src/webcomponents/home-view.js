import { LitElement, html, css } from 'lit'

/** Página inicial do legisreader. Só existe conteúdo de verdade a partir do
 *  L1/L2 (roadmap) — por enquanto marca que o appshell está funcionando. */
export class HomeView extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 640px;
      margin: 0 auto;
      padding: 16px 24px 64px;
    }
    p {
      line-height: 1.6;
      color: var(--md-sys-color-on-surface);
    }
  `

  render() {
    return html`
      <h1>LegisReader</h1>
      <p>Leitor de legislação brasileira para estudantes de direito.</p>
      <p>
        Em construção — este marco (A1) só valida o appshell como submódulo git; a leitura de
        verdade começa no L1/L2 do roadmap.
      </p>
    `
  }
}

customElements.define('home-view', HomeView)
