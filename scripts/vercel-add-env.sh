#!/usr/bin/env bash
set -euo pipefail

# Ajoute automatiquement les variables d'environnement listées dans .env.local
# Utilisation:
# 1) vercel login
# 2) vercel link
# 3) ./scripts/vercel-add-env.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Erreur: la CLI 'vercel' n'est pas installée. Installez-la et relancez (brew install vercel ou npm i -g vercel)."
  exit 2
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur: fichier .env.local introuvable dans $ROOT_DIR. Créez-le à partir de .env.local.example."
  exit 2
fi

declare -a KEYS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"

)

add_key() {
  local key="$1"
  local val
  val=$(grep -m1 "^${key}=" "$ENV_FILE" || true)
  if [ -z "$val" ]; then
    return 0
  fi
  # extract after first '='
  val="${val#*=}"
  if [ -z "$val" ]; then
    echo "La variable $key est vide, saut."
    return 0
  fi

  for env in production preview; do
    echo "Ajout de $key pour l'environnement $env..."
    # vercel env add attend la valeur en stdin si on la pipe
    printf '%s' "$val" | vercel env add "$key" "$env" || {
      echo "Attention: ajout de $key pour $env a échoué (peut-être déjà présente)."
    }
  done
}

echo "Début: ajout des variables trouvées dans $ENV_FILE"
for k in "${KEYS[@]}"; do
  add_key "$k"
done

echo "Fini. Vérifiez avec: vercel env ls"
