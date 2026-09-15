# legisreader

Leitor de legislação brasileira para estudantes de direito. Ver `roadmap.org`
para o plano completo do produto.

Três repositórios compõem o projeto: este (views/serviços de domínio,
deploy), [fzl-fund-appshell--lit](https://github.com/wagnermarques/fzl-fund-appshell--lit)
(casca do app, submódulo em `appshell/`) e
[legis-dados](https://github.com/wagnermarques/legis-dados) (pipeline de
coleta + dados versionados das normas, consumido como release, não
submódulo — ver `roadmap.org`, seção "Repositórios", para o porquê).

## Usando o appshell como submódulo

Este app usa o [fzl-fund-appshell--lit](https://github.com/wagnermarques/fzl-fund-appshell--lit)
como base (header, drawer, roteador, tema, PWA, auth/notificações locais) —
consumido como **submódulo git + npm workspace**, não copiado. Isso significa
que o código do shell nunca é editado por aqui: tudo que é específico deste
app entra via configuração declarativa em `createAppShell()`.

### Como foi montado (para clonar o repositório do zero)

```sh
git submodule add git@github.com:wagnermarques/fzl-fund-appshell--lit.git appshell
```

O `package.json` da raiz declara o submódulo como workspace npm:

```json
{
  "workspaces": ["appshell"],
  "dependencies": {
    "fzl-fund-appshell--lit": "*"
  }
}
```

Só então `npm install` **na raiz do app** (nunca dentro de `appshell/`) — o
npm resolve o pacote do shell para o próprio diretório do submódulo e cria um
único `node_modules` compartilhado (por isso uma cópia só de `lit`/
`@material/web` no bundle final).

Ao clonar este repositório pela primeira vez, use `--recurse-submodules` (ou
rode `git submodule update --init` depois) antes do `npm install`:

```sh
git clone --recurse-submodules git@github.com:wagnermarques/legisreader.git
```

### `vite.config.js`: o preset do shell

```js
import { defineConfig, mergeConfig } from 'vite'
import { appshellConfig } from 'fzl-fund-appshell--lit/vite'

export default defineConfig(
  mergeConfig(
    appshellConfig({
      base: '/legisreader/',
      manifest: { name: 'LegisReader', short_name: 'LegisReader', theme_color: '#1f3a5f' },
    }),
    { /* ajustes específicos deste app (ex.: runtimeCaching dos dados) entram aqui */ },
  ),
)
```

O preset cuida do `VitePWA`, das constantes de build
(`__APP_VERSION__`/`__APP_STORAGE_PREFIX__` — a segunda é o que garante que
as chaves de `localStorage` deste app usem o prefixo `legisreader:`, sem
vazar sessão/notificações para outro app hospedado na mesma origem) e do
`resolve.dedupe` contra duas cópias de `lit`/`@material/web` no bundle.

### `src/main.js`: a configuração declarativa

```js
import { createAppShell, pattern } from 'fzl-fund-appshell--lit'
import 'fzl-fund-appshell--lit/styles/theme.css'

createAppShell({
  mount: '#app',
  title: 'LegisReader',
  home: () => html`...`,
  routes: [{ name: 'exemplo', match: pattern('exemplo/:id'), render: ({ params }) => html`...` }],
  drawer: { sections: [{ id: 'normas', label: 'Normas', items: [...] }] },
  headerActions: () => html`...`,
})
```

Ver `src/main.js` deste repositório para o exemplo real (ainda uma rota de
teste do marco A1 — a leitura de verdade começa no L1/L2 do roadmap).

### Ícones

```sh
npx appshell-generate-icons
```

Gera `public/icons/*.png` a partir de `public/favicon.svg` deste app (não do
shell). Aceita `--svg <path>` e `--out <dir>` para caminhos diferentes.

### Atualizando o shell

O app fixa um commit do submódulo — atualizar é um ato deliberado:

```sh
cd appshell && git pull origin main && cd ..
npm install   # se dependências do shell mudaram
git add appshell
git commit -m "Atualiza appshell para <descrição>"
```

Sempre teste (`npm run dev`/`build`/`preview`) depois de atualizar. Se você
alterar algo *dentro* de `appshell/` para contribuir de volta ao shell,
faça commit e `git push` no repositório do shell **antes** de commitar o
novo ponteiro aqui — senão este app aponta para um commit que não existe no
GitHub e o CI quebra.

### CI

Quando este repositório ganhar um workflow de deploy (marco M5), o checkout
precisa buscar o submódulo:

```yaml
- uses: actions/checkout@v4
  with:
    submodules: recursive
```
