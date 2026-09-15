import { html } from 'lit'
import { createAppShell, pattern } from 'fzl-fund-appshell--lit'
import 'fzl-fund-appshell--lit/styles/theme.css'
import './webcomponents/home-view.js'
import './webcomponents/exemplo-view.js'

createAppShell({
  mount: '#app',
  title: 'LegisReader',
  home: () => html`<home-view></home-view>`,

  // Rota/seção/ação de teste do marco A1.6 — provam que o legisreader
  // consegue estender o shell sem editar nada em appshell/. Saem assim que
  // existir conteúdo de domínio de verdade (L1/L2).
  routes: [
    {
      name: 'exemplo',
      match: pattern('exemplo/:id'),
      render: ({ params }) => html`<exemplo-view .id=${params.id}></exemplo-view>`,
    },
  ],
  drawer: {
    sections: [
      {
        id: 'normas',
        label: 'Normas',
        expanded: true,
        items: [{ label: 'Exemplo', icon: 'gavel', href: '#/exemplo/1' }],
      },
    ],
  },
  headerActions: () => html`
    <md-icon-button aria-label="Buscar">
      <md-icon>search</md-icon>
    </md-icon-button>
  `,
})
