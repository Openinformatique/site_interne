# Sécurité et authentification

Fonctionnement de l'authentification et mesures de sécurité du socle — y compris
les **choix délibérés** qu'il ne faut pas « corriger » sans comprendre.

## Les deux jetons

Authentification locale (e-mail + mot de passe), fournisseur d'identité initial
en attendant le SSO (voir [extending.md](extending.md)). Deux jetons signés avec
des **secrets différents** :

| | Access token | Refresh token |
| --- | --- | --- |
| Durée | courte (`JWT_ACCESS_EXPIRATION`, ex. 15 min) | longue (`JWT_REFRESH_EXPIRATION`, ex. 7 j) |
| Transport | corps de réponse + `Authorization: Bearer` | cookie **HttpOnly** `refresh_token` |
| Stockage serveur | aucun | **empreinte SHA-256 uniquement** (jamais en clair) |
| Claims | `sub` (user), `sid` (session), `jti`, `iat`, `exp` | identiques |

Le cookie de refresh token est limité au chemin `/api/v1/auth`, `Secure` et
`SameSite` configurables, jamais accessible au JavaScript du front.

## Déroulé du login

1. normalisation de l'e-mail (minuscules, espaces retirés) ;
2. recherche de l'utilisateur ; vérification : existe, actif, non supprimé,
   possède un mot de passe local ;
3. vérification du mot de passe (**Argon2id**) — pour un compte inconnu, une
   vérification factice est exécutée pour un temps de réponse homogène
   (anti-énumération) ;
4. création d'une session avec une nouvelle **famille de tokens** ;
5. génération des deux jetons ; seule l'empreinte du refresh token est stockée ;
6. audit `auth.login.success` + mise à jour de `last_login_at`.

Tout échec renvoie le même message générique (`AUTHENTICATION_FAILED`) et un
audit `auth.login.failed`.

## Rotation et détection de réutilisation

À chaque `POST /auth/refresh` : signature vérifiée → session récupérée (`sid`)
→ **comparaison de l'empreinte** reçue avec celle stockée → contrôles de
révocation/expiration → nouveau refresh token, empreinte remplacée, nouveau
cookie. L'ancien token devient immédiatement inutilisable.

Si un token **cryptographiquement valide** mais à l'empreinte périmée est
présenté (ancien token rejoué après rotation) :

- la session est considérée compromise ;
- **toute la famille de tokens est révoquée** (`TOKEN_REUSE_DETECTED`) ;
- audit `auth.refresh-token.reuse-detected`, refus `REFRESH_TOKEN_REUSE_DETECTED`.

C'est la protection contre le vol de refresh token : le voleur ou la victime
finira par rejouer un token périmé, ce qui invalide l'ensemble.

## Révocation et sessions

- `POST /auth/logout` : révoque la session courante, supprime le cookie ;
- `DELETE /auth/sessions/:id` : révoque une session précise — uniquement les
  siennes (celle d'un autre utilisateur = introuvable) ;
- `POST /auth/logout-all` : révoque toutes les sessions ;
- `GET /auth/sessions` : sessions actives (courante marquée `isCurrent`).

Une session révoquée ne peut plus JAMAIS rafraîchir de jeton.

## Choix délibérés — ne pas « corriger » sans lire ceci

- **Refresh token haché en SHA-256, pas en Argon2** : c'est une valeur signée à
  haute entropie, pas un mot de passe — Argon2id est réservé aux mots de passe.
- **Le guard JWT ne vérifie pas la session en base à chaque requête** (choix de
  performance standard) : un access token déjà émis reste valide jusqu'à sa
  courte expiration, même si la session vient d'être révoquée. Si la révocation
  instantanée devient une exigence : ajouter dans `JwtAuthGuard` une
  vérification `AuthSessionRepositoryPort.findById` + `isUsable()`, au prix
  d'une requête SQL par appel.
- **Détection de réutilisation évaluée AVANT révocation/expiration** : un token
  rejoué doit déclencher la révocation de famille même sur session déjà close.

## Sécurité HTTP

| Mesure | Implémentation |
| --- | --- |
| En-têtes de sécurité | Helmet (CSP, HSTS, no-sniff, frameguard...) |
| Pile masquée | `X-Powered-By` désactivé |
| CORS | Liste blanche stricte (`APP_CORS_ORIGINS`), credentials activés, jamais `*` |
| Taille des corps | JSON/urlencoded limités à 1 Mo ; uploads bornés par `STORAGE_MAX_FILE_SIZE` |
| Rate limiting | 100 req/min/IP global ; login 5/min ; refresh 30/min (429 `TOO_MANY_REQUESTS`) |
| Validation | ValidationPipe global : whitelist + forbidNonWhitelisted + transform |
| Endpoints techniques | /metrics désactivable ; endpoints démo désactivés par défaut hors local |

## Protection des données sensibles

- **Jamais stockés** : mot de passe en clair, access/refresh token en clair ;
- **Jamais journalisés** : mots de passe, hash, jetons, cookies — redaction
  Pino (`authorization`, `cookie`, `set-cookie`, `password*`, `*Token*`...) +
  filtrage des métadonnées par l'AuditService ;
- **Jamais exposés** : détails SQL, stack traces (logs uniquement), existence
  d'un compte (message générique + anti-énumération temporelle) ;
- **Jamais loggé** : le contenu des e-mails (texte, HTML, pièces jointes) —
  seules les métadonnées (destinataire, sujet, tailles).

## Injection SQL et fichiers

- toutes les valeurs passent par des paramètres TypeORM ; aucun nom de colonne
  issu de l'utilisateur : tri/filtres uniquement via les **listes blanches**
  (`TypeOrmFilterHelper`), colonne hors liste = 400 ; jokers LIKE (`%`, `_`,
  `[`) échappés ;
- fichiers : noms physiques générés (UUID), identifiants validés par regex
  stricte, chemin résolu vérifié dans le répertoire de stockage
  (anti-traversée), type MIME et taille validés avant écriture,
  téléchargements en streaming.

## Autorisations par rôle

Chaque utilisateur porte un **rôle applicatif** (`ADMIN` / `MANAGER` /
`EMPLOYEE`, colonne `users.role`, défaut `EMPLOYEE`), lisible par le front
via `GET /users/me`.

Application côté serveur :

- le rôle est embarqué comme **claim `role` de l'ACCESS token uniquement**
  (jamais du refresh token) ; au refresh, le rôle est **relu en base** — un
  changement de rôle est donc effectif au plus tard à l'expiration de
  l'access token courant (durée courte) ;
- le **`RolesGuard` global** (enregistré après le guard JWT) applique les
  restrictions déclarées par `@Roles(...)` sur les handlers : rôle absent ou
  insuffisant → **403 `ACCESS_DENIED`**. Une route sans `@Roles` reste
  accessible à tout utilisateur authentifié ;
- un compte **désactivé** (`is_active = false`) ne peut plus se connecter
  (contrôlé au login) ni rafraîchir sa session (contrôlé au refresh) ; son
  access token courant reste valide jusqu'à sa courte expiration (choix
  documenté du socle) ;
- pour des permissions plus fines qu'un rôle global, les contrats
  `AuthorizationPort` / `@RequiresPermission` restent le point d'extension
  prévu (voir [extending.md](extending.md)).

Masquer un menu côté front n'est jamais une protection : ce sont ces
contrôles serveur qui font foi.

## Recommandations avant production

- HTTPS + `REFRESH_COOKIE_SECURE=true` ;
- protéger `/metrics` (réseau, proxy ou authentification) ;
- secrets dans un coffre (variables injectées, pas de fichiers .env) ;
- ajouter l'environnement `production` à la validation de configuration ;
- envisager la vérification de session systématique dans le guard JWT si la
  révocation instantanée devient une exigence.
