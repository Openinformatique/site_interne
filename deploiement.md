# Guide de déploiement — Site interne sur le serveur IONOS (à côté de l'ERP)

> **Public visé :** la personne qui déploie le site interne sur le serveur `212.227.13.4`.
> Chaque commande est donnée telle quelle, dans l'ordre. Ne sautez aucune étape.
>
> **Point de départ :** le serveur héberge déjà l'ERP, installé avec le guide
> `deploiement.md` du dépôt `monorepo-erp`. Ubuntu 24.04, Node.js 22, PM2, nginx et
> SQL Server (Docker) sont donc **déjà installés et configurés** : ce guide ne fait
> qu'**ajouter** un second site, sans rien modifier à l'ERP ni à sa base `erp_production`.

---

## Table des matières

1. [Architecture cible](#1-architecture-cible)
2. [Prérequis](#2-prérequis)
3. [Ouvrir le port 8080](#3-ouvrir-le-port-8080)
4. [Récupérer le code](#4-récupérer-le-code)
5. [Créer la base et son login SQL dédié](#5-créer-la-base-et-son-login-sql-dédié)
6. [Créer le fichier .env.production](#6-créer-le-fichier-envproduction)
7. [Déployer le backend](#7-déployer-le-backend)
8. [Déployer le frontend](#8-déployer-le-frontend)
9. [Configurer nginx](#9-configurer-nginx)
10. [Vérifications finales](#10-vérifications-finales)
11. [Exploitation courante](#11-exploitation-courante)
12. [Dépannage](#12-dépannage)
13. [Annexe — Récapitulatif](#13-annexe--récapitulatif)

---

## 1. Architecture cible

Pas de nom de domaine : les deux sites sont distingués par leur **port**.

```
                              Internet
                                 │
               ┌─────────────────┴─────────────────┐
               ▼ port 80                           ▼ port 8080
  ┌──────────────────────────────────────────────────────────────┐
  │                      nginx (sur l'hôte)                      │
  │  site "erp"           (inchangé)  site "site-interne"        │
  │  /var/www/erp                     /var/www/site-interne      │
  │  /api/ → 127.0.0.1:3000           /api/ → 127.0.0.1:3001     │
  └───────────┬──────────────────────────────────┬───────────────┘
              ▼                                  ▼
  ┌───────────────────────┐          ┌───────────────────────────┐
  │ PM2 : erp-api         │          │ PM2 : site-interne-api    │
  │ /opt/erp/back         │          │ /opt/site-interne/back    │
  └───────────┬───────────┘          └─────────────┬─────────────┘
              │          127.0.0.1:1433            │
              ▼                                    ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  SQL Server 2022 (Docker : nestjs-starter-sqlserver)         │
  │  erp_production (login sa)   site_interne_production         │
  │                              (login site_interne_app)        │
  └──────────────────────────────────────────────────────────────┘
```

| | ERP (existant) | Site interne (nouveau) |
|---|---|---|
| URL | `http://212.227.13.4` | `http://212.227.13.4:8080` |
| Code | `/opt/erp` | `/opt/site-interne` |
| Front servi par nginx | `/var/www/erp` | `/var/www/site-interne` |
| API (PM2) | `erp-api` sur `127.0.0.1:3000` | `site-interne-api` sur `127.0.0.1:3001` |
| Base | `erp_production` | `site_interne_production` |
| Cookie de refresh | `refresh_token` | `site_interne_refresh_token` |

> ⚠️ **Pourquoi un nom de cookie différent ?** Les navigateurs **ne séparent pas les
> cookies par port** : `212.227.13.4` et `212.227.13.4:8080` partagent les mêmes cookies.
> Les deux API déposent leur cookie de refresh sur le même chemin (`/api/v1/auth`) : avec
> le même nom, se connecter à un site déconnecterait l'autre. Le nom
> `site_interne_refresh_token` (étape 6) évite cette collision.

---

## 2. Prérequis

- Une session SSH sur le serveur avec l'utilisateur **`deploy`**.
- Le code à déployer **poussé sur la branche `main`** de
  `https://github.com/Openinformatique/site_interne` (le serveur clone depuis GitHub).
  Le dépôt doit contenir la prise en charge de `NODE_ENV=production`
  (`back/src/config/environment.validation.ts`).
- Le mot de passe `sa` de SQL Server : il se trouve dans `/opt/erp/back/.env.production`
  (variable `DB_PASSWORD`). Les commandes ci-dessous le lisent directement dans ce fichier.

---

## 3. Ouvrir le port 8080

### 3.1 Pare-feu du serveur (UFW)

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

**✔ Vérification :** la liste contient `8080/tcp ALLOW Anywhere`.

### 3.2 Pare-feu IONOS

IONOS applique aussi un pare-feu **devant** le serveur, géré dans l'espace client :
**Serveurs & Cloud** → votre serveur → **Réseau** → **Stratégies de pare-feu**.
Ajoutez une règle entrante **TCP, port 8080, source : toutes**, puis enregistrez.

> Sans cette règle, `http://212.227.13.4:8080` reste injoignable de l'extérieur alors que
> tout fonctionne sur le serveur (`curl http://127.0.0.1:8080` répond).

---

## 4. Récupérer le code

Le dépôt est public : clonage en HTTPS, aucune clé de déploiement n'est nécessaire.

```bash
sudo mkdir -p /opt/site-interne
sudo chown deploy:deploy /opt/site-interne
git clone https://github.com/Openinformatique/site_interne.git /opt/site-interne
```

**✔ Vérification :** `ls /opt/site-interne` affiche `back  deploiement.md  front  package.json  scripts`.

> Si le dépôt devient privé plus tard : GitHub refuse de réutiliser la deploy key de
> l'ERP (`~/.ssh/id_ed25519`) sur un second dépôt. Il faudra générer une seconde clé
> (`ssh-keygen -t ed25519 -f ~/.ssh/site_interne_deploy`), la déclarer dans les
> **Deploy keys** du dépôt, et ajouter un alias dans `~/.ssh/config` :
>
> ```
> Host github-site-interne
>     HostName github.com
>     IdentityFile ~/.ssh/site_interne_deploy
> ```
>
> puis : `git -C /opt/site-interne remote set-url origin git@github-site-interne:Openinformatique/site_interne.git`

---

## 5. Créer la base et son login SQL dédié

On réutilise l'instance SQL Server de l'ERP, mais avec **une base et un login à part** :
le site interne n'a aucun droit sur `erp_production`.

> On n'utilise **pas** `npm run db:init` ici : ce script crée aussi une base de test et
> exige des droits serveur que le login dédié n'a pas.

### 5.1 Préparer les mots de passe

```bash
# Mot de passe sa, lu dans la configuration de l'ERP (rien n'est affiché)
SA_PWD=$(grep '^DB_PASSWORD=' /opt/erp/back/.env.production | cut -d= -f2-)

# Mot de passe du nouveau login : majuscules, minuscules et chiffres, sans caractère spécial
APP_DB_PWD=$(openssl rand -base64 24 | tr -d '/+=')
echo "$APP_DB_PWD"
```

**Notez le mot de passe affiché** : il servira à l'étape 6 (`DB_PASSWORD`).

> Gardez la même session SSH jusqu'à la fin de l'étape 5 : les variables `SA_PWD` et
> `APP_DB_PWD` disparaissent à la déconnexion.

### 5.2 Créer la base

```bash
docker exec nestjs-starter-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S 127.0.0.1 -U sa -P "$SA_PWD" -C -b \
  -Q "CREATE DATABASE [site_interne_production];"
```

### 5.3 Créer le login et lui donner la main sur cette base uniquement

```bash
docker exec nestjs-starter-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S 127.0.0.1 -U sa -P "$SA_PWD" -C -b \
  -Q "CREATE LOGIN [site_interne_app] WITH PASSWORD = N'$APP_DB_PWD', DEFAULT_DATABASE = [site_interne_production];
      USE [site_interne_production];
      CREATE USER [site_interne_app] FOR LOGIN [site_interne_app];
      ALTER ROLE db_owner ADD MEMBER [site_interne_app];"
```

> `db_owner` est nécessaire pour que les migrations créent et modifient les tables. Ce rôle
> est limité à `site_interne_production` : le login ne voit pas `erp_production`.

### 5.4 Vérifier

```bash
docker exec nestjs-starter-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S 127.0.0.1 -U site_interne_app -P "$APP_DB_PWD" -C -b \
  -Q "SELECT DB_NAME() AS base_courante;"
```

**✔ Vérification :** la commande affiche `site_interne_production`.

---

## 6. Créer le fichier .env.production

C'est **le** fichier de configuration du site sur le serveur. Il n'est jamais versionné
(`back/.gitignore`). Générez d'abord deux secrets JWT :

```bash
openssl rand -hex 48        # → secret JWT n° 1 (access)
openssl rand -hex 48        # → secret JWT n° 2 (refresh)
```

> Utilisez des secrets **différents de ceux de l'ERP** : un jeton émis par un site ne doit
> jamais être accepté par l'autre.

Créez le fichier :

```bash
nano /opt/site-interne/back/.env.production
```

Collez-y le contenu suivant en remplaçant les valeurs `A_REMPLACER` :

```ini
# =============================================================================
# Configuration PRODUCTION du site interne — créée à la main, jamais versionnée.
# =============================================================================

# --- Application -------------------------------------------------------------
NODE_ENV=production
APP_NAME=site-interne
# 127.0.0.1 : seule nginx (sur la même machine) accède à l'API
APP_HOST=127.0.0.1
# 3001 : le port 3000 est déjà pris par l'API de l'ERP
APP_PORT=3001
APP_GLOBAL_PREFIX=api
APP_VERSION=1
APP_CORS_ORIGINS=http://212.227.13.4:8080

# --- Base de données SQL Server ------------------------------------------------
DB_HOST=127.0.0.1
DB_PORT=1433
DB_USERNAME=site_interne_app
DB_PASSWORD=A_REMPLACER_mot_de_passe_de_l_etape_5_1
DB_DATABASE=site_interne_production
# Requise par la validation ; inutilisée en production
DB_TEST_DATABASE=site_interne_test
DB_ENCRYPT=true
# true : le certificat du conteneur SQL Server est auto-signé
DB_TRUST_SERVER_CERTIFICATE=true

# --- JWT -----------------------------------------------------------------------
JWT_ACCESS_SECRET=A_REMPLACER_secret_jwt_1
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=A_REMPLACER_secret_jwt_2
JWT_REFRESH_EXPIRATION=7d

# --- Cookie de refresh token -----------------------------------------------------
# Nom DIFFÉRENT de celui de l'ERP : les cookies ne sont pas séparés par port
REFRESH_COOKIE_NAME=site_interne_refresh_token
# false tant que le site est en HTTP
REFRESH_COOKIE_SECURE=false
REFRESH_COOKIE_SAME_SITE=lax
REFRESH_COOKIE_DOMAIN=

# --- Observabilité et fonctionnalités ---------------------------------------------
LOG_LEVEL=info
# Pas de documentation d'API exposée en production
SWAGGER_ENABLED=false
METRICS_ENABLED=false
SCHEDULER_ENABLED=true
TECHNICAL_DEMO_ENDPOINTS_ENABLED=false

# --- E-mails ------------------------------------------------------------------------
# development : les e-mails sont journalisés sans être envoyés
MAIL_DRIVER=development
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=noreply@openinformatique.com

# --- Seeder (comptes initiaux, cf. étape 7.2) ---------------------------------------
SEED_ADMIN_PASSWORD=A_REMPLACER_mot_de_passe_admin_fort
SEED_USER_PASSWORD=A_REMPLACER_mot_de_passe_user_fort

# --- Stockage de fichiers --------------------------------------------------------------
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./uploads
# 20 Mo (nginx autorise 25 Mo, étape 9)
STORAGE_MAX_FILE_SIZE=20971520
STORAGE_ALLOWED_MIME_TYPES=application/pdf,image/png,image/jpeg,image/gif,image/webp,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/rtf,application/zip,application/x-zip-compressed,application/vnd.ms-outlook,message/rfc822
```

Enregistrez (`Ctrl+O`, Entrée), quittez (`Ctrl+X`), puis protégez le fichier :

```bash
chmod 600 /opt/site-interne/back/.env.production
```

---

## 7. Déployer le backend

### 7.1 Installer les dépendances

```bash
cd /opt/site-interne/back
npm ci
```

> Pas de Chromium à installer : contrairement à l'ERP, le site interne génère ses PDF
> avec `pdfkit`, en pur Node.js.

### 7.2 Créer les tables et les comptes initiaux

```bash
cd /opt/site-interne/back
NODE_ENV=production npm run migration:run
NODE_ENV=production npm run seed
```

> ⚠️ Le préfixe `NODE_ENV=production` est **obligatoire** : c'est lui qui fait lire
> `.env.production`. Sans lui, le script cherche `.env.local` et échoue.

Le seeder crée deux comptes avec les mots de passe `SEED_*` de `.env.production` :

- `admin@local.dev` — administrateur
- `user@local.dev` — utilisateur standard

> Le seeder ne modifie **jamais** le mot de passe d'un compte existant. Renseignez donc
> bien les variables `SEED_*` **avant** le premier `npm run seed` : sinon un mot de passe
> aléatoire est généré et affiché une seule fois dans la console.

Après la mise en service : connectez-vous en admin, créez les vrais comptes, désactivez
`user@local.dev`, puis supprimez les lignes `SEED_*` de `.env.production`.

### 7.3 Compiler

```bash
cd /opt/site-interne/back
npm run build
```

**✔ Vérification :** `ls dist/main.js` existe.

### 7.4 Lancer l'API avec PM2

Créez le fichier de configuration PM2 (propre au serveur, non versionné) :

```bash
tee /opt/site-interne/back/ecosystem.config.js > /dev/null <<'EOF'
// Configuration PM2 du serveur de production — NON versionnée.
module.exports = {
  apps: [
    {
      name: 'site-interne-api',
      cwd: '/opt/site-interne/back',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
    },
  ],
};
EOF
```

Démarrage, puis enregistrement de la liste des processus (le démarrage automatique de PM2
au boot est déjà en place depuis l'installation de l'ERP) :

```bash
cd /opt/site-interne/back
pm2 start ecosystem.config.js
pm2 save
pm2 ls
```

**✔ Vérification :** `erp-api` **et** `site-interne-api` sont `online`, et l'API répond :

```bash
curl http://127.0.0.1:3001/api/v1/health
# → JSON avec "status":"ok"
```

En cas d'erreur : `pm2 logs site-interne-api` (au démarrage, le message liste précisément
les variables manquantes ou invalides).

---

## 8. Déployer le frontend

### 8.1 Compiler

```bash
cd /opt/site-interne/front
npm ci
npm run build
```

> Le front appelle l'API en relatif (`/api/v1`, voir `src/environments/environment.ts`) :
> servi sur le port 8080, il appellera `http://212.227.13.4:8080/api/v1`. Aucune URL à
> configurer. La télémétrie Angular est déjà désactivée sur ce serveur
> (`~/.angular-config.json`), le build ne modifiera pas `angular.json`.

**✔ Vérification :** `ls dist/demo1/browser/index.html` existe.

### 8.2 Publier les fichiers

Le dossier appartient à `deploy` : les mises à jour n'auront pas besoin de `sudo`.

```bash
sudo mkdir -p /var/www/site-interne
sudo chown deploy:deploy /var/www/site-interne
rsync -a --delete /opt/site-interne/front/dist/demo1/browser/ /var/www/site-interne/
```

---

## 9. Configurer nginx

On **ajoute** un second site ; le fichier `/etc/nginx/sites-available/erp` n'est pas touché.

```bash
sudo tee /etc/nginx/sites-available/site-interne > /dev/null <<'EOF'
server {
    # Port dédié au site interne (le port 80 reste à l'ERP)
    listen 8080;
    listen [::]:8080;
    server_name _;

    # Front Angular (fichiers statiques)
    root /var/www/site-interne;
    index index.html;

    # L'API accepte des uploads jusqu'à 20 Mo : marge à 25 Mo ici
    client_max_body_size 25m;

    # API NestJS du site interne — le modificateur ^~ rend ce bloc prioritaire
    # sur la regex des assets ci-dessous
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        # $http_host conserve le port 8080 (Host, redirections, cookies)
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # La génération de PDF peut prendre du temps
        proxy_read_timeout 60s;
    }

    # Fichiers copiés tels quels depuis front/public (noms SANS empreinte) :
    # toujours revalider. Placé AVANT la regex des assets ci-dessous.
    location ~* ^/(css|data|images)/ {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    location = /favicon.ico {
        add_header Cache-Control "no-cache";
    }

    # Bundles Angular avec empreinte dans le nom : cache navigateur long
    location ~* \.(js|css|woff2?|ttf|otf|png|jpe?g|svg|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Routage Angular : toute URL inconnue retombe sur index.html,
    # revalidé à chaque chargement pour voir chaque déploiement immédiatement
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

Activation :

```bash
sudo ln -s /etc/nginx/sites-available/site-interne /etc/nginx/sites-enabled/site-interne
sudo nginx -t          # doit répondre "syntax is ok" et "test is successful"
sudo systemctl reload nginx
```

> `reload` (et non `restart`) : nginx recharge sa configuration sans couper l'ERP.

---

## 10. Vérifications finales

Sur le serveur :

```bash
sudo ss -tlnp | grep -E ':(80|8080|3000|3001|1433) '
```

**✔ Attendu :** `80` et `8080` sur `0.0.0.0` ; `3000`, `3001` et `1433` sur `127.0.0.1`
uniquement.

Depuis votre PC, dans un navigateur :

1. **`http://212.227.13.4:8080`** → la page de connexion du site interne s'affiche.
2. **Connexion** avec `admin@local.dev` + le mot de passe `SEED_ADMIN_PASSWORD`.
3. **Parcourez** quelques écrans (clients, contrats, pointages) : les listes se chargent.
4. **Éditez un PDF** (fiche contrat → « Suivi du contrat d'assistance ») : le PDF se télécharge.
5. **Téléversez un fichier** : cela valide le stockage et la limite nginx.
6. **`http://212.227.13.4`** → l'ERP fonctionne toujours. Connectez-vous aux deux sites dans
   le même navigateur, attendez 15 minutes (expiration du jeton d'accès) puis naviguez
   sur chacun : aucun des deux ne doit vous déconnecter.

---

## 11. Exploitation courante

### 11.1 Mettre à jour le site (nouvelle version du code)

Le script de déploiement est **versionné dans le dépôt** (`scripts/deploy.sh`) : il
arrive sur le serveur avec le code, rien à créer à la main.

1. Sur le PC : mergez sur `main` (et poussez).
2. Connectez-vous en SSH au serveur (PuTTY), utilisateur `deploy`.
3. Lancez :

```bash
bash /opt/site-interne/scripts/deploy.sh
```

Le script enchaîne :

| Étape | Ce qui est fait |
|---|---|
| 1/4 Récupération du code | `git pull --ff-only` |
| 2/4 Backend | `npm ci` (seulement si `back/package-lock.json` a changé) → build → migrations → `pm2 restart site-interne-api` |
| 3/4 Frontend | `npm ci` (seulement si `front/package-lock.json` a changé) → build → `rsync` vers `/var/www/site-interne` |
| 4/4 Vérification | attend que l'API réponde sur `/api/v1/health` (6 tentatives, 30 s au total) |

**✔ Vérification :** le script se termine par `✔ Déploiement terminé, l'API répond.`

> Les empreintes des `package-lock.json` sont mémorisées dans `~/.site-interne-deploy`.
> Pour forcer un `npm ci` complet : `rm -rf ~/.site-interne-deploy` puis relancez le script.

> Modifier `scripts/deploy.sh` : le run qui fait le `git pull` de la nouvelle version
> s'exécute encore avec l'**ancienne** (bash l'a déjà chargée). Relancez le script une
> seconde fois pour que la nouvelle version s'applique.

> Ne modifiez jamais le code directement sur le serveur : `git pull --ff-only` serait
> bloqué. Les fichiers propres au serveur (`.env.production`, `ecosystem.config.js`) sont
> ignorés par git.

### 11.2 Consulter les logs

| Quoi | Commande |
|---|---|
| API (temps réel) | `pm2 logs site-interne-api` |
| API (état, mémoire) | `pm2 ls` |
| nginx (accès) | `sudo tail -f /var/log/nginx/access.log` |
| nginx (erreurs) | `sudo tail -f /var/log/nginx/error.log` |

### 11.3 Sauvegardes quotidiennes (base + uploads)

```bash
tee ~/sauvegarde-site-interne.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
# Sauvegarde quotidienne du site interne : base (.bak) + fichiers uploadés (.tar.gz).
# Conservation : 14 jours.
set -euo pipefail

ENV_FILE=/opt/site-interne/back/.env.production
DB_USERNAME=$(grep '^DB_USERNAME=' "$ENV_FILE" | cut -d= -f2-)
DB_PASSWORD=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
DB_DATABASE=$(grep '^DB_DATABASE=' "$ENV_FILE" | cut -d= -f2-)
STAMP=$(date +%Y-%m-%d)
DEST=/home/deploy/backups/site-interne
CONTAINER=nestjs-starter-sqlserver

mkdir -p "$DEST"
docker exec "$CONTAINER" mkdir -p /var/opt/mssql/backups
docker exec "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S 127.0.0.1 -U "$DB_USERNAME" -P "$DB_PASSWORD" -C -b \
  -Q "BACKUP DATABASE [$DB_DATABASE] TO DISK='/var/opt/mssql/backups/${DB_DATABASE}_${STAMP}.bak' WITH INIT"
docker cp "$CONTAINER:/var/opt/mssql/backups/${DB_DATABASE}_${STAMP}.bak" "$DEST/"
docker exec "$CONTAINER" rm -f "/var/opt/mssql/backups/${DB_DATABASE}_${STAMP}.bak"

tar czf "$DEST/uploads_${STAMP}.tar.gz" -C /opt/site-interne/back uploads

find "$DEST" -type f -mtime +14 -delete

echo "✔ Sauvegarde du site interne du ${STAMP} terminée."
EOF
chmod +x ~/sauvegarde-site-interne.sh
```

Testez-le une fois (`~/sauvegarde-site-interne.sh`), puis planifiez-le chaque nuit à 2 h 30 :

```bash
crontab -e
```

Ajoutez cette ligne à la fin du fichier :

```
30 2 * * * /home/deploy/sauvegarde-site-interne.sh >> /home/deploy/backups/site-interne/sauvegarde.log 2>&1
```

> ⚠️ Ces sauvegardes restent **sur le même serveur**. Copiez régulièrement
> `/home/deploy/backups/` ailleurs.

### 11.4 Restaurer une sauvegarde de la base

```bash
# 1. Arrêter l'API pour couper les connexions
pm2 stop site-interne-api

# 2. Copier le .bak dans le conteneur (adaptez la date)
docker cp /home/deploy/backups/site-interne/site_interne_production_2026-11-02.bak \
  nestjs-starter-sqlserver:/var/opt/mssql/backups/restauration.bak

# 3. Restaurer avec le compte sa (mot de passe lu dans la configuration de l'ERP)
SA_PWD=$(grep '^DB_PASSWORD=' /opt/erp/back/.env.production | cut -d= -f2-)
docker exec nestjs-starter-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S 127.0.0.1 -U sa -P "$SA_PWD" -C -b \
  -Q "ALTER DATABASE [site_interne_production] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      RESTORE DATABASE [site_interne_production] FROM DISK='/var/opt/mssql/backups/restauration.bak' WITH REPLACE;
      ALTER DATABASE [site_interne_production] SET MULTI_USER;"

# 4. Relancer l'API
pm2 start site-interne-api
```

> Vérifiez **deux fois** le nom de la base dans la commande de restauration : une faute de
> frappe vers `erp_production` écraserait l'ERP.

---

## 12. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `http://212.227.13.4:8080` ne répond pas (délai dépassé) | Port fermé dans UFW ou dans le pare-feu IONOS | Étape 3. Sur le serveur, `curl -I http://127.0.0.1:8080` doit répondre `200` |
| **502 Bad Gateway** sur le port 8080 | L'API `site-interne-api` est arrêtée ou plante | `pm2 ls` puis `pm2 logs site-interne-api` |
| L'API refuse de démarrer : « Configuration invalide, démarrage refusé » | Variable manquante/incorrecte dans `.env.production` | Le message liste les variables en erreur ; comparez avec l'étape 6 |
| `NODE_ENV doit valoir "local", "development" ou "test"` | Le code cloné ne gère pas encore `production` | Poussez la version à jour sur `main`, puis `bash /opt/site-interne/scripts/deploy.sh` |
| L'API démarre puis s'arrête : `EADDRINUSE 127.0.0.1:3001` | Port 3001 déjà pris | `sudo ss -tlnp \| grep 3001` ; choisissez un autre port dans `APP_PORT` **et** dans `proxy_pass` (étape 9) |
| `migration:run` : « Variable d'environnement manquante » | Préfixe `NODE_ENV=production` oublié | Relancez avec `NODE_ENV=production` devant |
| `migration:run` : `Login failed for user 'site_interne_app'` | Mot de passe de `.env.production` différent de celui de l'étape 5 | Corrigez `DB_PASSWORD`, ou changez le mot de passe du login : `ALTER LOGIN [site_interne_app] WITH PASSWORD = N'...'` (avec sa) |
| Se connecter à un site déconnecte l'autre | Même `REFRESH_COOKIE_NAME` sur les deux sites | Vérifiez `REFRESH_COOKIE_NAME=site_interne_refresh_token`, puis `pm2 restart site-interne-api` |
| Mot de passe admin inconnu après le seed | `SEED_ADMIN_PASSWORD` vide au premier seed | Cherchez la ligne « mot de passe généré » dans la sortie du seed ; le seeder ne réécrit jamais un compte existant |
| `npm ci` ou `npm run build` se termine par **Killed** | Mémoire insuffisante | `free -h` ; arrêtez temporairement l'API (`pm2 stop site-interne-api`) pendant le build |
| Un upload échoue vers 25 Mo | Limite nginx | `client_max_body_size` (étape 9) et `STORAGE_MAX_FILE_SIZE` (étape 6) |
| `git pull --ff-only` échoue (« local changes would be overwritten » ou « Not possible to fast-forward ») | Fichiers modifiés sur le serveur | `cd /opt/site-interne && git status` ; `git restore <fichier>` |
| `deploy.sh` : erreurs `\r: command not found` | Fins de ligne Windows (CRLF) dans le script | Vérifiez que `.gitattributes` contient `*.sh text eol=lf`, puis re-commitez le script |
| `deploy.sh` finit par « ✘ L'API ne répond pas après redémarrage » | L'API plante au démarrage | `pm2 logs site-interne-api` : le message d'erreur indique la cause |

---

## 13. Annexe — Récapitulatif

### Ports

| Port | Service | Écoute sur | Accessible depuis Internet ? |
|---|---|---|---|
| 22 | SSH | toutes interfaces | ✔ |
| 80 | nginx — ERP | toutes interfaces | ✔ |
| 8080 | nginx — site interne | toutes interfaces | ✔ |
| 3000 | API ERP (PM2) | `127.0.0.1` | ✘ |
| 3001 | API site interne (PM2) | `127.0.0.1` | ✘ |
| 1433 | SQL Server (Docker, partagé) | `127.0.0.1` | ✘ |

### Fichiers propres au serveur (jamais dans git, à recréer si le serveur change)

- `/opt/site-interne/back/.env.production` — configuration et secrets
- `/opt/site-interne/back/ecosystem.config.js` — configuration PM2
- `/etc/nginx/sites-available/site-interne` (+ lien dans `sites-enabled`) — configuration nginx
- `~/sauvegarde-site-interne.sh` — script de sauvegarde
- `~/.site-interne-deploy/` — empreintes des `package-lock.json` (recréées automatiquement)

Le script de déploiement, lui, est versionné : `/opt/site-interne/scripts/deploy.sh`.

### Pour tout retirer (retour à l'état d'avant)

```bash
pm2 delete site-interne-api && pm2 save
sudo rm /etc/nginx/sites-enabled/site-interne && sudo systemctl reload nginx
sudo ufw delete allow 8080/tcp
# La base et le login restent : à supprimer avec sa si besoin
# (DROP DATABASE [site_interne_production]; DROP LOGIN [site_interne_app];)
```
