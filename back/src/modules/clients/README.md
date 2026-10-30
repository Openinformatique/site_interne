# Module clients (back)

Clients de l'entreprise, repris de l'application historique (tables `clients`,
`client_contrats`, `contacts` : voir [docs/schema-metier.md](../../../docs/schema-metier.md)).

État actuel : **liste des clients**. La fiche client (consultation, création,
modification) viendra ensuite.

## API

### `GET /api/v1/clients`

Liste paginée, accessible à tout utilisateur authentifié.

| Paramètre         | Défaut          | Rôle                                                                 |
| ----------------- | --------------- | -------------------------------------------------------------------- |
| `page`, `limit`   | 1, 20 (max 1000) | pagination standard du socle                                        |
| `sortBy`          | `raisonSociale` | `codeClient`, `raisonSociale`, `groupe`, `actif`, `adresse1..3`, `codePostal`, `ville`, `codePays` |
| `sortDirection`   | `ASC`           | `ASC` / `DESC` ; l'identifiant départage pour un ordre stable        |
| `includeInactive` | `false`         | `true` : actifs et inactifs                                          |
| `groupes`         | —               | clés GSOC séparées par des virgules (ex. `CFL`)                      |
| `sansGroupe`      | `false`         | inclut les clients sans groupe                                       |
| `search`          | —               | recherche multi-mots (ci-dessous)                                    |

- `groupes` et `sansGroupe` se combinent en **OU** ; sans l'un ni l'autre, aucun
  filtre de groupe.
- **Recherche** : chaque mot (8 au plus) doit figurer, sans tenir compte de la
  casse ni des accents (collation `Latin1_General_CI_AI`), dans : code, raison
  sociale, adresses 1 à 3, code postal, ville, code pays, **libellé du pays**
  (jointure sur le paramétrage `PAYS`), n° de TVA, groupe. Les jokers LIKE
  saisis (`%`, `_`, `[`) sont neutralisés.
- Les clients supprimés (suppression logique) ne sont jamais renvoyés.

Réponse : enveloppe standard, `data` = lignes (`ClientSummaryResponseDto`),
`meta.pagination` = pagination.

## Organisation

| Couche         | Fichier                                              |
| -------------- | ---------------------------------------------------- |
| domain         | `client-repository.port.ts` (port, `ClientSummary`, colonnes de tri) |
| application    | `list-clients.use-case.ts`                           |
| infrastructure | `typeorm-client.repository.ts`, `entities/`          |
| presentation   | `clients.controller.ts`, `dto/`                      |

Le libellé des groupes et des pays est servi par le module `parametres`
(`GET /api/v1/parametres/:codeTable`, ex. `GSOC`, `PAYS`).

## Tests

- `list-clients-query.dto.spec.ts` : conversion et validation des paramètres ;
- `list-clients.use-case.spec.ts` : pagination.

Le SQL (filtres, recherche, tri) a été vérifié sur la base locale ; des tests
d'intégration nécessiteront une base de test (`.env.test`).
