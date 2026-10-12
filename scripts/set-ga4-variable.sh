#!/usr/bin/env bash
# Cria/atualiza a variável VITE_GA4_MEASUREMENT_ID no repositório do GitHub,
# para o workflow de build injetá-la no Vite (ver roadmap, M5 — CI/CD).
#
# É uma *variable*, não um secret: o Measurement ID vai para dentro do bundle
# e aparece nas requisições do gtag.js — não há o que esconder, e como
# variable dá para conferir o valor depois pela interface do GitHub.
#
# Cada app que usa o appshell tem a sua própria propriedade do GA4, então
# rode a partir da raiz do repositório do app (o gh usa o remote dali).
#
# Uso: scripts/set-ga4-variable.sh [G-XXXXXXXXXX] [--repo dono/repo]
#      Sem o id na linha de comando, o script pergunta.
set -euo pipefail

id=''
repo_args=()

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)
      [ $# -ge 2 ] || { echo "--repo exige dono/repo" >&2; exit 1; }
      repo_args=(--repo "$2")
      shift 2
      ;;
    -h | --help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      id="$1"
      shift
      ;;
  esac
done

command -v gh >/dev/null || {
  echo "gh não encontrado. Instale o GitHub CLI: https://cli.github.com" >&2
  exit 1
}
gh auth status >/dev/null 2>&1 || {
  echo "gh sem autenticação. Rode: gh auth login" >&2
  exit 1
}

repo=$(gh repo view "${repo_args[@]}" --json nameWithOwner -q .nameWithOwner)
atual=$(gh variable list "${repo_args[@]}" --json name,value -q '.[] | select(.name == "VITE_GA4_MEASUREMENT_ID") | .value' 2>/dev/null || true)

echo "Repositório: $repo"
[ -n "$atual" ] && echo "Valor atual: $atual"

if [ -z "$id" ]; then
  # Fica perguntando até vir um id válido; Enter vazio cancela.
  while true; do
    read -r -p "Measurement ID do GA4 (G-XXXXXXXXXX, vazio cancela): " id
    [ -n "$id" ] || { echo "Cancelado."; exit 0; }
    [[ "$id" =~ ^[Gg]-[A-Za-z0-9]+$ ]] && break
    echo "Formato inválido — o id do GA4 começa com G- (ex.: G-ABC1234567)." >&2
  done
else
  [[ "$id" =~ ^[Gg]-[A-Za-z0-9]+$ ]] || {
    echo "Formato inválido: \"$id\" — o id do GA4 começa com G- (ex.: G-ABC1234567)." >&2
    exit 1
  }
fi

id=$(printf '%s' "$id" | tr '[:lower:]' '[:upper:]')

if [ "$id" = "$atual" ]; then
  echo "A variável já vale $id — nada a fazer."
  exit 0
fi

read -r -p "Definir VITE_GA4_MEASUREMENT_ID=$id em $repo? [s/N] " resposta
case "$resposta" in
  s | S | sim | Sim) ;;
  *) echo "Cancelado."; exit 0 ;;
esac

gh variable set VITE_GA4_MEASUREMENT_ID "${repo_args[@]}" --body "$id"
echo "Pronto. Confira em: https://github.com/$repo/settings/variables/actions"
