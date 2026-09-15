import { LitElement, html, css } from 'lit'

/** Página inicial do legisreader. A leitura de verdade começa no L2 —
 *  por enquanto marca que o appshell está funcionando e aponta pra
 *  "Sobre e fontes" (aviso permanente de texto não oficial, marco L1). */
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
        Em construção — este marco (L1) monta o esqueleto do app; a leitura de verdade começa no
        L2 do roadmap. O texto compilado aqui não substitui o publicado no Diário Oficial da
        União — ver <a href="#/sobre">Sobre e fontes</a>.
      </p>
    `
  }
}

customElements.define('home-view', HomeView)
