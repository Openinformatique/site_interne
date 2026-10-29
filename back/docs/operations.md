# Opérations

Configuration, base de données, migrations, observabilité, tests : tout le
« comment on opère » le socle au quotidien. L'installation initiale est dans
[getting-started.md](getting-started.md).

## Configuration

Principes :

- configuration **typée et validée au démarrage** : démarrage refusé si une
  variable est absente ou invalide, avec la liste précise des erreurs ;
- le code consomme les objets typés (`appConfig`, `authConfig`...) via
  l'injection — jamais `process.env` directement (seules exceptions :
  `src/config/*.ts`, `src/bootstrap-env.ts`, scripts CLI de `src/database/`) ;
- environnements : `local`, `development`, `test` ; `.env.<NODE_ENV>` prime
  sur `.env`.

### Variables

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `local`, `development` ou `test` |
| `APP_NAME` / `APP_HOST` / `APP_PORT` | Nom affiché, interface et port d'écoute |
| `APP_GLOBAL_PREFIX` / `APP_VERSION` | Préfixe (`api`) et version d'URI (`/api/v1/...`) |
| `APP_CORS_ORIGINS` | Origines autorisées, séparées par des virgules |
| `DB_HOST` / `DB_PORT` | Hôte / port SQL Server |
| `DB_USERNAME` / `DB_PASSWORD` | Identifiants (aussi utilisés par docker-compose) |
| `DB_DATABASE` / `DB_TEST_DATABASE` | Base courante / base de test (doit finir par `_test`) |
| `DB_ENCRYPT` / `DB_TRUST_SERVER_CERTIFICATE` | Chiffrement ; certificat auto-signé accepté en local |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secrets DISTINCTS, ≥ 32 caractères |
| `JWT_ACCESS_EXPIRATION` / `JWT_REFRESH_EXPIRATION` | Durées (ex. `15m` / `7d`) |
| `REFRESH_COOKIE_NAME` / `SECURE` / `SAME_SITE` / `DOMAIN` | Cookie de refresh (`Secure=true` dès que HTTPS) |
| `LOG_LEVEL` | Niveau Pino (`fatal`…`trace`) |
| `SWAGGER_ENABLED` / `METRICS_ENABLED` / `SCHEDULER_ENABLED` | Interrupteurs des briques |
| `TECHNICAL_DEMO_ENDPOINTS_ENABLED` | Enregistre les routes /technical-demo |
| `MAIL_DRIVER` | `development` (journalisation seule) ou `smtp` (envoi réel) |
| `MAIL_HOST` / `PORT` / `USERNAME` / `PASSWORD` / `FROM` | Paramètres SMTP et expéditeur par défaut |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_PATH` | `local` (seul pilote) ; répertoire créé automatiquement |
| `STORAGE_MAX_FILE_SIZE` / `STORAGE_ALLOWED_MIME_TYPES` | Limites d'upload |
| `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` | Facultatifs ; sinon génération aléatoire affichée en console |

Ajouter une variable : voir [extending.md](extending.md).

## Base de données

SQL Server 2022 dans un conteneur Docker dédié (`nestjs-starter-sqlserver`) ;
NestJS s'exécute localement. Une même instance héberge deux bases :
`nestjs_starter_local` (développement) et `nestjs_starter_test` (tests
UNIQUEMENT). `npm run db:init` crée les deux (idempotent) ;
`npm run db:reset:test` détruit/recrée la base de test — garde-fou : refus de
toute base dont le nom ne finit pas par `_test`.

Docker : volume nommé `nestjs-starter-sqlserver-data` (les données survivent
aux redémarrages) ; healthcheck sqlcmd via `127.0.0.1` (`localhost` se résout
en IPv6 dans le conteneur et ferait échouer la sonde). `Dockerfile.dev` est
fourni à titre de référence UNIQUEMENT.

Schéma : `users`, `auth_sessions` (empreintes SHA-256, familles),
`audit_logs` (immuable), `typeorm_migrations`. Conventions : UUID
`uniqueidentifier` (défaut `NEWSEQUENTIALID()`), dates `datetime2` en UTC,
soft delete (`deleted_at`) sur les entités modifiables, tables/colonnes en
`snake_case` anglais. Classes de base : `AuditableEntity` (id, dates, soft
delete, created_by/updated_by) et `ImmutableEntity` (id, created_at).

TypeORM :

- `synchronize: false` — définitif ; le schéma n'évolue QUE par migrations ;
- application : `autoLoadEntities` (chaque module déclare ses entités via
  `TypeOrmModule.forFeature`) ; CLI : `src/database/data-source.ts` ;
- transactions : `TransactionService.execute(work)` — commit en fin normale,
  rollback sur exception ;
- pas de repository générique universel : chaque module écrit ses requêtes
  (QueryBuilder autorisé), avec les helpers de pagination pour les listes.

Connexion SSMS : serveur `localhost,1433`, SQL Server Authentication, login
`sa`, mot de passe = `DB_PASSWORD` de `.env.local`, chiffrement obligatoire,
**cocher « Trust server certificate »** (certificat auto-signé).

## Migrations et seeders

```bash
npm run migration:generate -- src/database/migrations/NomExplicite  # diff entités <-> schéma
npm run migration:create   -- src/database/migrations/NomExplicite  # squelette vide (SQL manuel)
npm run migration:run          # base de l'environnement courant
npm run migration:run:test     # base de test
npm run migration:show         # état : exécutées / en attente
npm run migration:revert       # annule la DERNIÈRE migration
```

Bonnes pratiques :

- TOUJOURS relire le SQL généré avant de l'exécuter ;
- une migration exécutée sur un environnement partagé ne se modifie plus : on
  en crée une nouvelle ; `down()` doit réellement annuler `up()` ;
- après un `migration:generate`, relancer la commande doit répondre « No
  changes » — preuve que entités et schéma sont alignés ;
- exécuter systématiquement sur la base de test (les suites d'intégration le
  font aussi via `migrationsRun`).

Seeders (`npm run seed` / `seed:test`) : données techniques uniquement —
`admin@local.dev`, `user@local.dev`, quelques audits de démonstration.
**Idempotents** (l'existant est ignoré), aucun mot de passe en dur
(`SEED_ADMIN_PASSWORD`/`SEED_USER_PASSWORD` ou génération aléatoire affichée
une seule fois), hachage Argon2id identique au chemin de production. Pour
ajouter un seed : compléter `src/database/seeds/run-seed.ts` en respectant
l'idempotence.

## Observabilité

**Logs techniques (Pino)** : JSON structuré sur stdout (pino-pretty en local),
niveau via `LOG_LEVEL`. Chaque ligne HTTP porte request ID, méthode, route,
statut, durée, IP, user-agent, et userId/sessionId si authentifié. Redaction
stricte (`authorization`, `cookie`, `password*`, `*Token*`, secrets →
`[REDACTED]`). Aucune stack de collecte embarquée (volontaire) : les logs JSON
stdout se branchent tels quels sur Loki, Elasticsearch/Kibana ou tout
collecteur Docker.

**Journal d'audit** : à ne pas confondre avec les logs — la table `audit_logs`
conserve les ÉVÉNEMENTS significatifs (connexions, révocations, réutilisation
de token...), déclarés explicitement par les cas d'utilisation via
`AuditService`, valeurs sensibles filtrées, enregistrements immuables. Les
audits portent le même `request_id` que les logs Pino.

**Request ID** : réutilise l'en-tête `x-request-id` entrant s'il est valide,
sinon UUID ; renvoyé en réponse, présent dans logs, audits et
`meta.requestId` ; porté par `AsyncLocalStorage` (`RequestContextService`).

**Santé** : `GET /api/v1/health/live` (liveness), `/health/ready` (SQL Server
joignable), `/health` (synthèse). Publics, n'exposent que des statuts up/down.

**Métriques Prometheus** : `GET /metrics` (hors préfixe, hors enveloppe,
désactivable) — métriques process Node.js + `http_requests_total` et
`http_request_duration_seconds{method, route, status}`. Cardinalité
maîtrisée : routes NORMALISÉES (`/api/v1/auth/sessions/:id`), jamais d'id
utilisateur, de request ID ni d'IP. ⚠️ En production, `/metrics` doit être
protégé (réseau privé, proxy ou authentification).

## Tests

| Niveau | Emplacement | Base | Commande |
| --- | --- | --- | --- |
| Unitaires | `src/**/*.spec.ts` (à côté du code) | aucune (mocks) | `npm run test:unit` |
| Intégration | `test/integration/*.integration-spec.ts` | `nestjs_starter_test` | `npm run test:integration` |
| End-to-end | `test/e2e/*.e2e-spec.ts` | `nestjs_starter_test` | `npm run test:e2e` |

`npm test` exécute les trois. `test:cov` : couverture informative, aucun seuil
bloquant (choix assumé).

Prérequis intégration/e2e : conteneur démarré, `.env.test` présent (même
`DB_PASSWORD` que `.env.local`), base créée. Les suites chargent `.env.test`
automatiquement et REFUSENT de s'exécuter si `DB_DATABASE` ne finit pas par
`_test` ; migrations appliquées automatiquement (`migrationsRun`).

Écrire un test :

- **unitaire** : mocker les PORTS (interfaces), pas les classes concrètes —
  voir `refresh-tokens.use-case.spec.ts` (pattern repository en mémoire) ;
- **intégration** : `createTestDataSource()` (`test/helpers/test-database.ts`),
  identifiants uniques (`randomUUID`), nettoyage en `afterAll` ;
- **e2e** : `createE2eApplication()` (même chaîne HTTP que la production),
  `createE2eTestUser()` (utilisateur jetable + nettoyage),
  `extractRefreshCookie()`.

Règles : aucune suite ne dépend d'une autre ni de l'ordre d'exécution ; chaque
suite nettoie ce qu'elle crée.
