import { html } from 'lit'
import { createAppShell, pattern } from 'fzl-fund-appshell--lit'
import 'fzl-fund-appshell--lit/styles/theme.css'
import './webcomponents/grifos-view.js'
import './webcomponents/home-view.js'
import './webcomponents/norma-view.js'
import './webcomponents/sobre-view.js'
import './webcomponents/sumario-normas.js'

createAppShell({
  mount: '#app',
  title: 'LegisReader',
  home: () => html`<home-view></home-view>`,

  // Propriedade do GA4 deste app (o appshell não tem id próprio). Sem a
  // variável definida — o caso normal em desenvolvimento — o analytics não
  // liga e nenhuma requisição sai do navegador. O consentimento (LGPD) é
  // pedido pelo shell antes de qualquer carga do gtag; a escolha fica no
  // localStorage sob o mesmo prefixo dos dados de estudo, em Config >
  // Privacidade.
  analytics: {
    id: import.meta.env.VITE_GA4_MEASUREMENT_ID,
    cookiePrefix: __APP_STORAGE_PREFIX__,
  },

  routes: [
    // O caminho da norma tem vários segmentos (br/federal/decreto-lei/...),
    // daí o *caminho em vez de :caminho. A âncora vai em ?ir=, não num
    // segundo '#', que colidiria com o hash da própria rota.
    {
      name: 'norma',
      match: pattern('norma/*caminho'),
      render: ({ params, query }) =>
        html`<norma-view .caminho=${params.caminho} .ir=${query.ir ?? ''}></norma-view>`,
    },
    { name: 'grifos', match: pattern('grifos'), render: () => html`<grifos-view></grifos-view>` },
    { name: 'sobre', match: pattern('sobre'), render: () => html`<sobre-view></sobre-view>` },
  ],
  drawer: {
    sections: [
      {
        // Sem expanded: o sumário de uma norma inteira é longo demais para
        // abrir por cima das outras seções — quem abre o drawer precisa ver
        // primeiro o que existe nele.
        id: 'normas',
        label: 'Normas',
        render: () => html`<sumario-normas></sumario-normas>`,
      },
      {
        id: 'estudo',
        label: 'Estudo',
        items: [{ label: 'Meus grifos', icon: 'format_ink_highlighter', href: '#/grifos' }],
      },
      {
        id: 'ajuda',
        label: 'Ajuda',
        items: [{ label: 'Sobre e fontes', icon: 'info', href: '#/sobre' }],
      },
    ],
  },
  headerActions: () => html`
    <md-icon-button aria-label="Buscar">
      <md-icon>search</md-icon>
    </md-icon-button>
  `,
})
