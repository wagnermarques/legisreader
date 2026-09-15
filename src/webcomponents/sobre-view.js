import { LitElement, html, css } from 'lit'

/** Página "Sobre / fontes" — aviso permanente de que o texto compilado não
 *  substitui o publicado no Diário Oficial da União, e de onde vem cada
 *  norma (marco L1 do roadmap). */
export class SobreView extends LitElement {
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
    .aviso {
      margin: 16px 0;
      padding: 12px 16px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 12px;
      background: var(--md-sys-color-surface-variant);
      color: var(--md-sys-color-on-surface-variant);
    }
    h2 {
      font-size: 1.05rem;
      margin: 32px 0 8px;
    }
    ul {
      line-height: 1.6;
      padding-left: 20px;
    }
  `

  render() {
    return html`
      <h1>Sobre e fontes</h1>

      <div class="aviso" role="note">
        O texto compilado aqui <strong>não substitui</strong> o publicado no Diário Oficial da
        União. Em caso de dúvida ou uso formal (petição, prova, decisão), consulte sempre a fonte
        oficial.
      </div>

      <p>
        O legisreader é um leitor de legislação brasileira para estudantes de direito, começando
        pelo Código Penal. Textos de leis, decretos e demais atos oficiais não têm proteção de
        direito autoral (Lei nº 9.610/1998, art. 8º, IV) — por isso este projeto só captura
        conteúdo de fontes oficiais, e guarda sempre de onde e quando cada texto veio.
      </p>

      <h2>Fontes</h2>
      <ul>
        <li>
          <a href="https://www.planalto.gov.br/ccivil_03/" target="_blank" rel="noopener">Planalto</a>
          — texto compilado atual, base da importação.
        </li>
        <li>
          <a href="https://www.lexml.gov.br/" target="_blank" rel="noopener">LexML Brasil</a>
          — identificadores e relações entre normas.
        </li>
        <li>Diário Oficial da União (Imprensa Nacional) — fonte oficial de referência.</li>
      </ul>

      <p>
        A coleta e o versionamento automático dos dados (projeto <code>legis-dados</code>) ainda
        não existem — este é um marco inicial (L1) que só monta o esqueleto do app.
      </p>
    `
  }
}

customElements.define('sobre-view', SobreView)
