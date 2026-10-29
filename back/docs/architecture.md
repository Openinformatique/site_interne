# Architecture du socle

Carte de référence du projet : qui fait quoi, où, et comment une requête circule.

**Stack** : NestJS 11 · TypeScript strict · TypeORM · SQL Server 2022 (Docker) · Pino · Jest.

## Vue d'ensemble

Le socle est un **monolithe modulaire** : chaque brique technique est un module NestJS
autonome au sein d'un seul processus. L'architecture s'inspire de manière pragmatique
de la Clean Architecture / hexagonale : séparation des responsabilités et maîtrise de
la direction des dépendances, sans multiplication gratuite des fichiers.

Le socle est **strictement technique** : aucune logique métier n'y figure. Les API
métier se construisent par-dessus, en ajoutant des modules dans `src/modules/`.

## Arborescence : qui fait quoi

```text
src/
├── main.ts                  Point d'entrée : bootstrap NestJS + Swagger + écoute HTTP.
├── bootstrap-env.ts         Chargement du bon fichier .env selon NODE_ENV.
├── app.setup.ts             Chaîne HTTP transverse (Helmet, CORS, cookies, préfixe
│                            /api/v1, validation, enveloppe, filtre d'erreurs).
│                            Partagée entre main.ts et les tests e2e : les tests
│                            exercent EXACTEMENT la même chaîne que la production.
├── app.module.ts            Module racine : assemble tous les modules ci-dessous.
│
├── config/                  Configuration typée, UNE source de vérité par domaine :
│                            app, auth, database, logging, mail, observability,
│                            storage, swagger. environment.validation.ts refuse le
│                            démarrage si une variable manque ou est invalide.
│
├── common/                  Briques transverses, sans logique métier :
│   ├── context/             Request ID + contexte par requête (AsyncLocalStorage),
│   │                        enrichi par le guard JWT (userId/sessionId).
│   ├── decorators/          @Public(), @CurrentUser(), @RequiresPermission(),
│   │                        @SkipResponseEnvelope().
│   ├── entities/            Classes de base TypeORM (auditable, immuable).
│   ├── exceptions/          AppException + codes d'erreur stables (error-code.enum).
│   ├── filters/             GlobalExceptionFilter : toute erreur sort au format
│   │                        d'enveloppe standard, sans fuite de détail interne.
│   ├── interceptors/        ResponseEnvelopeInterceptor : enveloppe JSON uniforme
│   │                        de toutes les réponses (détecte les résultats paginés).
│   ├── logging/             Intégration Pino : logs structurés, corrélés au request
│   │                        ID, redaction des secrets.
│   ├── pagination/          PaginationQueryDto (page/tri/filtres/recherche) +
│   │                        helpers TypeORM à listes blanches, SQL paramétré.
│   ├── pipes/               Pipe de validation global (class-validator, whitelist).
│   └── security/            Rate limiting (@nestjs/throttler).
│
├── database/                DataSource TypeORM, migrations (users, auth_sessions,
│                            audit_logs), seeds idempotents, scripts d'init/reset
│                            des bases, TransactionService.
│
├── documentation/           Génération Swagger/OpenAPI (servi sur /api/docs).
│
└── modules/                 Un dossier = une capacité technique (détail ci-dessous).
```

## Cycle de vie d'une requête

```text
HTTP entrant
  → Helmet + CORS (liste blanche, credentials) + body limit 1 Mo   [app.setup.ts]
  → Middleware contexte : request ID + AsyncLocalStorage           [common/context]
  → ThrottlerGuard : rate limiting                                 [common/security]
  → JwtAuthGuard global : authentification par défaut,
    contourné uniquement par @Public()                             [authentication]
  → Pipe de validation : DTO class-validator, whitelist stricte    [common/pipes]
  → Contrôleur (presentation) → cas d'utilisation (application)
    → ports du domaine → adaptateurs (infrastructure)
  → ResponseEnvelopeInterceptor : enveloppe JSON standard          [common/interceptors]
  → En cas d'erreur : GlobalExceptionFilter → enveloppe d'erreur
    + code stable + log corrélé au request ID                      [common/filters]
```

Toutes les routes vivent sous `/api/v1` (versioning URI), sauf `/metrics`
(chemin standard Prometheus, hors préfixe).

## Couches internes des modules

Lorsqu'un module le justifie (authentication, users, audit), il est découpé en
quatre couches :

```text
domain          Entités, règles, PORTS (interfaces). Ne dépend d'aucun framework.
application     Cas d'utilisation, orchestration. Ne dépend ni des contrôleurs
                ni de TypeORM.
infrastructure  Adaptateurs concrets : entités TypeORM, repositories SQL Server,
                SMTP, stockage local... Implémente les ports.
presentation    Contrôleurs REST, DTO HTTP, guards, décorateurs Swagger.
```

Direction des dépendances — règles non négociables :

- `presentation → application → domain` ; `infrastructure → application / domain` ;
- le domaine ne dépend d'aucun framework ;
- un contrôleur ne touche jamais un repository TypeORM : il délègue aux cas
  d'utilisation ;
- l'infrastructure implémente les contrats du domaine, jamais l'inverse.

Les modules purement techniques (health, observability, scheduler...) utilisent une
structure plus légère quand les quatre couches n'apportent rien.

## Modules et endpoints exposés

| Module           | Rôle                                                        | Endpoints (`/api/v1`)                                                                                      |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `authentication` | Login local, JWT, sessions, rotation + détection de réutilisation du refresh token (cookie HttpOnly) | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `GET /auth/me` |
| `users`          | Gestion des utilisateurs et rôles `ADMIN`/`MANAGER`/`EMPLOYEE` (routes d'administration restreintes par rôle) | `GET /users/me`, `PATCH /users/me/password`, `GET /users` (paginé), `POST /users`, `GET /users/:id`, `PATCH /users/:id/role`, `DELETE /users/:id` (désactivation soft), `PATCH /users/:id/reactivate` |
| `audit`          | Journal d'audit persistant (`audit_logs`), distinct des logs techniques | — (service injectable)                                                                                      |
| `health`         | Santé de l'application (Terminus)                           | `GET /health`, `GET /health/live`, `GET /health/ready`                                                      |
| `observability`  | Métriques Prometheus + interceptor de métriques HTTP        | `GET /metrics` (hors préfixe)                                                                               |
| `mail`           | Envoi d'e-mails : port + adaptateurs dev et SMTP            | — (service injectable)                                                                                      |
| `storage`        | Stockage de fichiers : port + implémentation locale         | — (service injectable)                                                                                      |
| `pdf`            | Génération PDF : port + adaptateur PDFKit                   | — (service injectable)                                                                                      |
| `scheduler`      | Tâches planifiées (purge des sessions expirées)             | —                                                                                                           |
| `technical-demo` | Démonstration branchée des briques mail/fichiers/PDF        | `POST /demo/mail`, `POST /demo/files`, `GET /demo/files/:id`, `DELETE /demo/files/:id`, `GET /demo/pdf`     |

Swagger est servi sur `/api/docs`.

## Contrat d'API : enveloppe et codes d'erreur

Toute réponse passe par l'enveloppe standardisée (succès et erreur). Format
d'erreur :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données transmises sont invalides.",
    "details": [{ "field": "email", "message": "L'adresse e-mail n'est pas valide." }]
  },
  "meta": { "requestId": "uuid", "timestamp": "...", "path": "/api/v1/..." }
}
```

`error.details` n'apparaît que pour la validation. Les consommateurs
s'appuient sur `error.code` (**stable, contractuel**), jamais sur
`error.message` (humain, susceptible d'évoluer). `meta.requestId` permet de
retrouver les logs correspondants.

| Code | HTTP | Signification |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Données d'entrée invalides |
| `AUTHENTICATION_FAILED` | 401 | Identifiants incorrects (message générique) |
| `ACCESS_TOKEN_INVALID` | 401 | Jeton d'accès absent, invalide ou expiré |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token absent ou invalide |
| `SESSION_EXPIRED` / `SESSION_REVOKED` | 401 | Session expirée / révoquée |
| `REFRESH_TOKEN_REUSE_DETECTED` | 401 | Ancien token rejoué → famille révoquée |
| `ACCESS_DENIED` | 403 | Rôle insuffisant pour la route (authentifié mais non autorisé) |
| `RESOURCE_NOT_FOUND` | 404 | Ressource inexistante |
| `RESOURCE_ALREADY_EXISTS` | 409 | Conflit d'unicité |
| `BUSINESS_RULE_VIOLATION` | 409 | Règle métier violée (message utilisateur en français) |
| `FILE_NOT_FOUND` / `FILE_TYPE_NOT_ALLOWED` / `FILE_TOO_LARGE` | 404 / 400 / 413 | Erreurs fichiers |
| `TOO_MANY_REQUESTS` | 429 | Rate limiting |
| `DATABASE_ERROR` | 500 | Erreur d'accès aux données (détail en log uniquement) |
| `INTERNAL_SERVER_ERROR` | 500 | Erreur inconnue (message générique) |

Côté interne : les cas d'utilisation lèvent les sous-classes d'`AppException`
(`src/common/exceptions/app-exceptions.ts`) ; le `GlobalExceptionFilter`
traduit tout le reste (erreurs TypeORM → `DATABASE_ERROR` sans détail SQL,
HttpException → code déduit du statut, inconnu → `INTERNAL_SERVER_ERROR`).
La stack n'est JAMAIS renvoyée au client ; la valeur soumise n'est jamais
renvoyée dans les erreurs de validation (elle pourrait contenir un secret).
Ajout d'un code : voir [extending.md](extending.md).

## Points d'extension prévus

- **SSO** : `IdentityProviderPort` (domaine authentication) — un `LocalIdentityProvider`
  est injecté par défaut ; brancher un fournisseur externe revient à fournir un autre
  adaptateur.
- **Permissions** : `AuthorizationPort` + décorateur `@RequiresPermission` (métadonnées
  seules, aucun guard permissif fourni). Le modèle de rôles appartient à l'API métier.

Le mode d'emploi des deux se trouve dans [extending.md](extending.md).

## Décisions d'architecture

Décidé le 2026-07-14, avant toute ligne de code :

- **Monolithe modulaire, pas de préparation microservices** : pas de message
  broker, pas de découpage réseau, pas d'événements inter-services. Aucun
  facteur déclencheur n'existe (pas d'équipes multiples autonomes, pas de
  scalabilité différenciée) ; les microservices ajouteraient immédiatement de
  la complexité sans bénéfice. Si le besoin émerge, les frontières nettes des
  modules seront le meilleur point de départ.
- **Architecture « pragmatique »** : l'objectif est la maîtrise des
  dépendances, pas la pureté doctrinale. Couches complètes quand il y a du
  domaine, structure directe quand il n'y en a pas.
- **Ports et adaptateurs sur les frontières externes** (identité, persistance,
  e-mail, stockage, PDF) : chaque brique se remplace sans toucher aux cas
  d'utilisation.
- **Inconvénients assumés** : scalabilité verticale ou par réplication complète
  (le scheduler exigera alors un verrou distribué) ; pas d'isolation de panne
  entre modules ; la discipline de dépendances repose sur la revue de code.

## Pour aller plus loin

- Installation et premier démarrage : [getting-started.md](getting-started.md)
- Sécurité et authentification (avec les choix délibérés) : [security-and-auth.md](security-and-auth.md)
- Étendre le socle (module métier, SSO, permissions, briques) : [extending.md](extending.md)
- Opérations (config, base, migrations, observabilité, tests) : [operations.md](operations.md)
