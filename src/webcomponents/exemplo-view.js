import { LitElement, html, css } from 'lit'

/** View de teste do marco A1 (validação do appshell como submódulo) — só
 *  para provar que o legisreader consegue registrar rota, seção de drawer
 *  e ação de cabeçalho próprias sem editar nada em appshell/. Sai assim que
 *  o L1/L2 (esqueleto de leitura de verdade) existir. */
export class ExemploView extends LitElement {
  static properties = {
    id: {},
  }

  static styles = css`
    :host {
      display: block;
      max-width: 640px;
      margin: 0 auto;
      padding: 16px 24px 64px;
    }
    code {
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
      padding: 1px 4px;
      border-radius: 4px;
    }
  `

  render() {
    return html`
      <h1>Rota de teste</h1>
      <p>
        Esta view prova que o <strong>legisreader</strong> registra rota (<code>#/exemplo/${this.id}</code>),
        seção de drawer e ação de cabeçalho próprias através de <code>createAppShell()</code>, sem editar
        nenhum arquivo em <code>appshell/</code> (marco A1.6).
      </p>
    `
  }
}

customElements.define('exemplo-view', ExemploView)
