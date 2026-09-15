import { html } from 'lit'
import { createAppShell, pattern } from 'fzl-fund-appshell--lit'
import 'fzl-fund-appshell--lit/styles/theme.css'
import './webcomponents/home-view.js'
import './webcomponents/exemplo-view.js'
import './webcomponents/sobre-view.js'

createAppShell({
  mount: '#app',
  title: 'LegisReader',
  home: () => html`<home-view></home-view>`,

  routes: [
    // Rota/seção de teste do marco A1.6 — prova que o legisreader consegue
    // registrar rota própria sem editar nada em appshell/. Sai assim que
    // existir conteúdo de leitura de verdade (L2).
    {
      name: 'exemplo',
      match: pattern('exemplo/:id'),
      render: ({ params }) => html`<exemplo-view .id=${params.id}></exemplo-view>`,
    },
    { name: 'sobre', match: pattern('sobre'), render: () => html`<sobre-view></sobre-view>` },
  ],
  drawer: {
    sections: [
      {
        id: 'normas',
        label: 'Normas',
        expanded: true,
        items: [{ label: 'Exemplo', icon: 'gavel', href: '#/exemplo/1' }],
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
