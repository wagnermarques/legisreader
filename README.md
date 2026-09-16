# legisreader

Leitor de legislação brasileira para estudantes de direito. Ver `roadmap.org`
para o plano completo do produto.

Três repositórios compõem o projeto: este (views/serviços de domínio,
deploy), [fzl-fund-appshell--lit](https://github.com/wagnermarques/fzl-fund-appshell--lit)
(casca do app, submódulo em `appshell/`) e
[legis-dados](https://github.com/wagnermarques/legis-dados) (pipeline de
coleta + dados versionados das normas, consumido como release, não
submódulo — ver `roadmap.org`, seção "Repositórios", para o porquê).

## Como rodar

Requisitos: **Node.js 20+** e npm (testado com Node 22.23.1 / npm 10.9.8).

### 1. Clonar com o submódulo

O app não compila sem o `appshell/` — ele é uma dependência npm que mora no
submódulo, não no registro público:

```sh
git clone --recurse-submodules git@github.com:wagnermarques/legisreader.git
cd legisreader
```

Se você já clonou sem `--recurse-submodules`:

```sh
git submodule update --init
```

### 2. Instalar as dependências

Sempre **na raiz do app**, nunca dentro de `appshell/` (ver a seção seguinte
para o porquê):

```sh
npm install
```

### 3. Rodar em desenvolvimento

```sh
npm run dev
```

Na primeira vez isso baixa os dados das normas (~280 KB) antes de subir o
servidor — ver "Os dados das normas", abaixo.

Abre em **http://localhost:5173/legisreader/** — repare no caminho
`/legisreader/`: é o `base` do Vite, que existe para o deploy em GitHub
Pages. A raiz (`http://localhost:5173/`) responde 404, e isso é esperado.

Com hot reload: editar `src/` recarrega o navegador sozinho.

### 4. Conferir o build de produção

O dev server não exercita o service worker nem os caminhos com hash dos
assets. Antes de promover para `production`, rode o build de verdade:

```sh
npm run serve
```

Equivale a `npm run build && npm run preview`: gera `dist/` e serve aquilo
que o GitHub Pages serviria, também em `/legisreader/`.

Para só gerar o `dist/` sem servir, `npm run build`.

### Resumo dos scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Dev server com hot reload |
| `npm run build` | Gera `dist/` (produção, com PWA/service worker) |
| `npm run preview` | Serve o `dist/` já gerado |
| `npm run serve` | `build` + `preview` |
| `npx appshell-generate-icons` | Regera `public/icons/*.png` a partir de `public/favicon.svg` |

### Problemas comuns

- **`Failed to resolve import "fzl-fund-appshell--lit"`** — o submódulo está
  vazio (clone sem `--recurse-submodules`). Rode `git submodule update --init`
  e depois `npm install` de novo.
- **`npm install` rodado dentro de `appshell/`** — cria um `node_modules`
  aninhado e o bundle acaba com duas cópias de `lit`, o que quebra os
  componentes (`customElements.define` duplicado no console). Apague o
  `appshell/node_modules/` e rode `npm install` na raiz.
- **Página em branco na raiz do servidor** — use a URL com `/legisreader/`.

## Os dados das normas

O texto das leis **não** mora neste repositório: vem do
[legis-dados](https://github.com/wagnermarques/legis-dados), baixado para
`public/data/` por `scripts/baixar-dados.mjs`. `public/data/` é ignorado pelo
git — é artefato de build, não fonte.

O ref consumido é **fixado** em `dados.config.json`:

```json
{ "repo": "wagnermarques/legis-dados", "ref": "3951145d…" }
```

Fixar é deliberado: os dados mudam num ritmo próprio (diário, guiado pelo
DOU) e um build só deve mudar de texto legal quando alguém decidir isso.
Atualizar = trocar o `ref` e commitar. Quando o `legis-dados` passar a
publicar releases, o `ref` vira uma tag (ex.: `dados-2026.09.15`).

O download roda sozinho antes de `dev` e de `build` (ganchos `predev`/
`prebuild`), é idempotente e não refaz nada se o pin já estiver em disco:

```sh
npm run dados              # baixa se necessário
node scripts/baixar-dados.mjs --force   # rebaixa mesmo assim
```

Sem rede, ou para testar uma alteração no `legis-dados` antes de commitá-la,
aponte para um clone local:

```sh
LEGIS_DADOS_LOCAL=../legis-dados npm run dados
```

O CI não precisa de nada extra: ele roda `npm run build`, e o `prebuild`
cuida do download.

### Como o app lê esses dados

- `src/services/dados-service.js` — busca e cacheia `indice.json` e as normas
  (`norma`/`estrutura`/`dispositivos`). Os JSONs são buscados em runtime, não
  importados pelo bundler, para ficarem fora do bundle e cacheáveis à parte
  pelo service worker.
- `src/webcomponents/norma-view.js` — a leitura. `dispositivos.json` já vem em
  ordem de documento, então é uma passada linear; `pai` vira indentação e as
  divisões de `estrutura.json` são intercaladas antes do artigo que abrem.
- `src/webcomponents/sumario-normas.js` — o sumário do drawer (Parte > Título
  > Capítulo > Seção).

Rotas: `#/norma/<caminho>` abre a norma, e `?ir=<id>` rola até um dispositivo
(ex.: `#/norma/br/federal/decreto-lei/1940-2848?ir=art121`). A âncora vai em
query em vez de um segundo `#` porque o hash já é usado pela rota inteira.

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
