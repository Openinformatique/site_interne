#!/usr/bin/env bash
# =============================================================================
# Déploiement production du site interne — exécuté SUR LE SERVEUR.
# À lancer après chaque merge sur main : bash /opt/site-interne/scripts/deploy.sh
# Reproduit la procédure de deploiement.md §7 et §8.
# =============================================================================
set -euo pipefail

cd /opt/site-interne

# --- npm ci uniquement si nécessaire ------------------------------------------
# L'empreinte du lockfile est enregistrée dans un fichier témoin APRÈS un
# npm ci réussi (hors du dépôt : ~/.site-interne-deploy). Comparer au témoin —
# plutôt qu'à l'état d'avant le pull — garantit qu'un npm ci interrompu
# (réseau, coupure…) sera bien retenté au run suivant.
STAMP_DIR="$HOME/.site-interne-deploy"
mkdir -p "$STAMP_DIR"

npm_ci_si_besoin() { # $1 = back | front
  local empreinte
  empreinte=$(md5sum "/opt/site-interne/$1/package-lock.json" | cut -d' ' -f1)
  if [ -f "$STAMP_DIR/$1.lock.md5" ] && [ "$empreinte" = "$(cat "$STAMP_DIR/$1.lock.md5")" ]; then
    echo "dépendances $1 inchangées → npm ci sauté"
    return
  fi
  echo "package-lock.json ($1) modifié → npm ci"
  (cd "/opt/site-interne/$1" && npm ci)
  echo "$empreinte" > "$STAMP_DIR/$1.lock.md5"
}

echo "═══ 1/4 Récupération du code ═══"
git pull --ff-only

echo "═══ 2/4 Backend ═══"
cd /opt/site-interne/back
npm_ci_si_besoin back
npm run build
NODE_ENV=production npm run migration:run
pm2 restart site-interne-api

echo "═══ 3/4 Frontend ═══"
cd /opt/site-interne/front
npm_ci_si_besoin front
npm run build
rsync -a --delete /opt/site-interne/front/dist/demo1/browser/ /var/www/site-interne/

echo "═══ 4/4 Vérification ═══"
# L'API peut mettre quelques secondes à redémarrer : jusqu'à 6 tentatives.
for tentative in 1 2 3 4 5 6; do
  sleep 5
  if curl -sf http://127.0.0.1:3001/api/v1/health > /dev/null; then
    echo "✔ Déploiement terminé, l'API répond."
    exit 0
  fi
  echo "… l'API ne répond pas encore (tentative $tentative/6)"
done
echo "✘ L'API ne répond pas après redémarrage — voir : pm2 logs site-interne-api"
exit 1
