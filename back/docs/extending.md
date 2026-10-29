# Étendre le socle

Comment construire par-dessus le socle : ajouter un module métier, brancher un
SSO, activer les permissions, étendre les briques techniques. Le principe est
toujours le même : **implémenter un port existant, jamais modifier les cas
d'utilisation**.

## Créer un module métier

Arborescence type (exemple `projects`) :

```text
src/modules/projects/
├── domain/            project.ts (classe pure) + project-repository.port.ts (contrat + jeton)
├── application/       create-project.use-case.ts, list-projects.use-case.ts
├── infrastructure/    entities/project.entity.ts, project.mapper.ts, typeorm-project.repository.ts
├── presentation/      dto/, projects.controller.ts
└── projects.module.ts
```

Règles non négociables :

- le domaine n'importe RIEN de NestJS/TypeORM/Express ;
- le contrôleur n'utilise JAMAIS un repository directement : il délègue aux cas
  d'utilisation ;
- l'infrastructure implémente les contrats du domaine (binding
  `{ provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository }`).

Points de branchement fournis par le socle :

- **Entité** : hériter d'`AuditableEntity` (id UUID, dates, soft delete,
  created_by/updated_by), d'`IdentityAuditableEntity` (même chose avec un id
  entier IDENTITY, pour le schéma métier repris de l'application historique,
  voir [schema-metier.md](schema-metier.md)) ou `ImmutableEntity` ; le glob du DataSource CLI
  (`src/modules/**/infrastructure/**/*.entity.ts`) la détecte automatiquement ;
- **Migration** : `npm run migration:generate -- src/database/migrations/CreateProjectsTable`,
  relire le SQL, puis `migration:run` + `migration:run:test` ;
- **Audit** : appeler `AuditService.record()` DANS les cas d'utilisation
  significatifs (catégorie, action, acteur, ressource) ;
- **Protection** : le guard JWT global couvre la route automatiquement ;
  `@CurrentUser()` fournit l'utilisateur ; l'enveloppe s'applique seule ;
- **Liste paginée** : le contrôleur reçoit `@Query() query: PaginationQueryDto`,
  le cas d'utilisation applique les helpers avec listes blanches :

```typescript
const SORTABLE_COLUMNS: ColumnWhitelist = { name: 'project.name', createdAt: 'project.created_at' };
const qb = this.repository.createQueryBuilder('project');
TypeOrmFilterHelper.applySearch(qb, query.search, ['project.name']);
TypeOrmFilterHelper.applySort(qb, query.sortBy, query.sortDirection, SORTABLE_COLUMNS);
return TypeOrmPaginationHelper.paginate(qb, query.page, query.limit);
```

L'interceptor d'enveloppe détecte le résultat paginé et produit
`meta.pagination` automatiquement.

Checklist finale :

- [ ] Domaine sans dépendance framework
- [ ] Contrôleur léger, aucun repository TypeORM injecté
- [ ] Migration créée ET exécutée (locale + test)
- [ ] Tri/filtres uniquement via listes blanches
- [ ] Audit explicite dans les cas d'utilisation significatifs
- [ ] Swagger complet (ApiOperation, réponses, erreurs)
- [ ] Tests unitaires + intégration + e2e
- [ ] `npm run build && npm run lint && npm test` au vert

## Brancher un fournisseur SSO

Le socle prépare l'intégration SANS simuler de faux SSO. Ce qui existe dans
`src/modules/authentication/domain/identity-provider.port.ts` :

- `IdentityProviderPort` : contrat unique d'authentification ;
- `AuthenticationInput` : union discriminée `local` / `external` ;
- `AuthenticatedIdentity` : identité résolue vers un utilisateur INTERNE ;
- jeton `IDENTITY_PROVIDER`, lié aujourd'hui à `LocalIdentityProvider`.

Les cas d'utilisation (login, sessions, jetons) ne connaissent QUE le port.
Étapes (exemple OpenID Connect) :

1. **créer l'adaptateur** `OidcIdentityProvider implements IdentityProviderPort`
   dans `infrastructure/` : valider le code/jeton auprès de l'IdP, extraire les
   claims, lier à un utilisateur interne, retourner `{ userId, email, displayName }` ;
2. **lier l'identité externe** : la table `users` prévoit déjà
   `authentication_source = 'SSO'` et `password_hash` nullable. Politique au
   choix : provisioning automatique à la première connexion, ou refus si
   l'e-mail n'existe pas. Pour conserver l'identifiant stable de l'IdP
   (`sub`/`oid`) : colonne `external_subject` + index unique, par migration ;
3. **composer les fournisseurs** : remplacer le binding `IDENTITY_PROVIDER` ou
   créer un `CompositeIdentityProvider` qui route selon `input.provider` ;
4. **exposer le flux HTTP** du protocole (redirection, callback...) dans la
   couche presentation ; le callback réutilise la MÊME création de
   session/jetons que le login local — le SSO hérite automatiquement de la
   rotation, de la détection de réutilisation et des audits ;
5. **configuration** : variables dans `environment.validation.ts` +
   `sso.config.ts` ; **tests** : unitaires (IdP mocké) + e2e.

Règles : échec = TOUJOURS `AuthenticationFailedException` générique ; ne jamais
journaliser les jetons/assertions de l'IdP ; les comptes SSO n'ont pas de mot
de passe local ; ne pas créer d'implémentation factice « pour tester » —
brancher un vrai IdP de développement (tenant Entra ID de dev, Keycloak...).

## Rôles et permissions

Le socle fournit un contrôle **par rôle** opérationnel : `users.role`
(`ADMIN`/`MANAGER`/`EMPLOYEE`, enum `UserRole`), claim `role` de l'access
token, décorateur `@Roles(...)` et `RolesGuard` global (refus → 403
`ACCESS_DENIED`). Restreindre une route se résume à la décorer :
`@Roles(UserRole.Admin)`. Voir [security-and-auth.md](security-and-auth.md).

Pour des **permissions fines** (par ressource, par action, RBAC complet),
les contrats neutres restent le point d'extension prévu :

- `AuthorizationPort.isAllowed(user, requirement)` + jeton `AUTHORIZATION_PORT`
  (aucune implémentation liée) dans `authentication/domain/authorization.port.ts` ;
- `@RequiresPermission({ permission: 'users.read' })` : pose des métadonnées —
  AUCUN guard ne les évalue aujourd'hui.

Chemin d'intégration :

1. **choisir le modèle** (permissions unitaires, RBAC, règles contextuelles via
   `requirement.resourceType/resourceId`) — dans tous les cas, `isAllowed()`
   reste l'UNIQUE point d'évaluation : le modèle sous-jacent est remplaçable ;
2. **créer les tables** par migration ;
3. **implémenter le port** (`RbacAuthorizationService`) et le binder sur
   `AUTHORIZATION_PORT` ;
4. **créer un `AuthorizationGuard`** qui lit les métadonnées via `Reflector`
   (pas d'exigence déclarée = authentification seule ; refus =
   `ForbiddenException`) et l'enregistrer comme guard global APRÈS
   `JwtAuthGuard` (l'ordre suit l'ordre des providers `APP_GUARD`) ;
5. **décorer les endpoints** : les métadonnées existantes deviennent effectives.

Règles : NE PAS embarquer les permissions dans le JWT (invalidation impossible
avant expiration) — évaluation côté serveur, avec cache si nécessaire ;
auditer les refus significatifs (`SECURITY`) ; tester les 403 en e2e.

## Étendre les briques techniques

- **E-mail** : les consommateurs n'utilisent que `MailProviderPort` (jeton
  `MAIL_PROVIDER`). L'échec d'envoi est un RÉSULTAT (`delivered: false`), pas
  une exception. En local, un SMTP de test (MailHog/Mailpit, port 1025)
  fonctionne avec `MAIL_DRIVER=smtp`.
- **Stockage cloud** : créer un adaptateur `FileStoragePort` (Azure Blob, S3...)
  dans `storage/infrastructure/`, ajouter la valeur au `StorageDriver` et
  sélectionner l'implémentation dans `StorageModule` selon `STORAGE_DRIVER`
  (même pattern que le mail). Les consommateurs ne changent pas d'une ligne.
  Version locale : métadonnées en sidecar JSON, pas de table SQL.
- **Gabarit PDF** : déclarer la constante + l'interface des données dans
  `pdf-generator.port.ts`, ajouter la méthode de rendu dans
  `PdfKitPdfGenerator`, créer un cas d'utilisation dédié (avec audit). Si les
  besoins dépassent PDFKit, un adaptateur alternatif (Playwright + Chromium)
  peut implémenter le même port.
- **Tâche planifiée** : créer `<nom>.task.ts` dans `scheduler/` sur le modèle de
  `SessionCleanupTask` : `@Cron`, garde `SCHEDULER_ENABLED` à l'exécution,
  verrou anti-concurrence, logs début/fin/durée, erreurs capturées jamais
  propagées, méthode `execute()` publique testable. ⚠️ Le verrou est LOCAL au
  processus : en multi-instances, toute tâche non idempotente exigera un verrou
  partagé (`sp_getapplock` SQL Server ou table de verrous).
- **Code d'erreur** : ajouter l'entrée dans `ErrorCode` (`error-code.enum.ts`),
  créer l'exception dans `app-exceptions.ts` (message français), documenter le
  code dans [architecture.md](architecture.md) et Swagger, tester en e2e.
- **Variable d'environnement** : déclarer + valider dans
  `environment.validation.ts`, l'exposer via la config typée du domaine
  (`registerAs`), documenter dans les 4 `.env*.example` et
  [operations.md](operations.md), compléter `environment.validation.spec.ts`.
