# Module commandes (back)

Commandes clients, reprises de l'application historique (table `commandes` :
voir [docs/schema-metier.md](../../../docs/schema-metier.md)).

Écran servi : **liste des commandes** (menu GESTION › Commandes). Toutes les
routes sont accessibles à tout utilisateur authentifié (tous les rôles).
L'écran Commande (consultation / modification / création) viendra ensuite.

## API

### `GET /api/v1/commandes`

Liste paginée.

| Paramètre       | Défaut           | Rôle                                                                                                                                                         |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page`, `limit` | 1, 20 (max 1000) | pagination standard du socle                                                                                                                                 |
| `sortBy`        | `client`         | `client`, `groupe`, `dateCommande`, `numeroCommande`, `numeroDevis`, `dateDevis`, `delai`, `libelle`, `joursPrevus`, `joursPasses`, `joursCommandes`, `montant`, `statut` |
| `sortDirection` | `ASC`            | `ASC` / `DESC` ; puis date de commande décroissante et identifiant                                                                                          |
| `includeClosed` | `false`          | `true` : en cours et clôturées                                                                                                                               |
| `du`, `au`      | —                | période (AAAA-MM-JJ) : date du devis **ou** date de commande comprise                                                                                         |
| `clientId`      | —                | un seul client                                                                                                                                               |
| `groupes`       | —                | clés GSOC du client, séparées par des virgules ; combinées en OU avec `sansGroupe`                                                                           |
| `sansGroupe`    | `false`          | inclut les commandes des clients sans groupe                                                                                                                 |
| `search`        | —                | recherche multi-mots (ci-dessous)                                                                                                                            |

- **Recherche** : chaque mot (8 au plus) doit figurer, sans tenir compte de la
  casse ni des accents, dans : n° de commande, n° de devis, libellé, code et
  raison sociale du client, libellé du contrat, montant (avec point ou virgule
  décimale). Jokers LIKE neutralisés.
- **Jours passés** = heures facturables pointées sur la commande ÷ heures d'une
  journée (paramètre `TDIV`/`HJOUR`, rubrique 02 ; 8 par défaut), comme dans la
  fiche client.
- Tri `statut` croissant : en cours d'abord, puis clôturées par date de clôture.
- Les commandes des clients supprimés ne sont pas renvoyées.

Ligne (`CommandeListItemResponseDto`) : `id`, `clientId`, `codeClient`,
`client`, `groupe` (clé), `groupeLibelle`, `dateCommande`, `numeroCommande`,
`numeroDevis`, `dateDevis`, `delai`, `libelle`, `joursPrevus`, `joursPasses`,
`joursCommandes`, `montant`, `dateCloture`.

### `GET /api/v1/commandes/clients`

Clients du filtre « Client » : clients (actifs ou non) ayant au moins une
commande, triés par raison sociale (`id`, `codeClient`, `raisonSociale`).

### `GET /api/v1/commandes/export`

Export Excel (`.xlsx`, fichier `commandes_AAAA-MM-JJ.xlsx`) de **toutes** les
commandes du filtre, dans l'ordre du tri : mêmes paramètres que la liste,
pagination ignorée. Réponse binaire, sans enveloppe JSON.

Colonnes : Client, Code client, Groupe, Date commande, N° commande, N° devis,
Date devis, Délai, Libellé, Jours prévus, Jours passés, Jours commandés,
Montant, Statut, Date de clôture. Dates et nombres sont de vraies valeurs
Excel (sommes possibles) ; ligne d'en-tête figée avec filtres automatiques.

## Architecture

- `domain/commande-list.port.ts` : modèle de ligne, filtres, ports
  `CommandeListPort` (lecture) et `CommandesSpreadsheetPort` (classeur).
- `application/list-commandes.use-case.ts` : liste paginée, clients du filtre,
  export (nom de fichier daté du jour).
- `infrastructure/typeorm-commande-list.repository.ts` : requêtes (jointures
  client, contrat, GSOC ; sous-requête des heures pointées).
- `infrastructure/exceljs-commandes.spreadsheet.ts` : génération du classeur
  (bibliothèque `exceljs`).
- `presentation/` : contrôleur et DTO.

Les dates des requêtes brutes passent par `common/utils/sql-date.util.ts` (le
driver renvoie un minuit local : `toISOString()` décalerait d'un jour).

Tests : `list-commandes.use-case.spec.ts`, `exceljs-commandes.spreadsheet.spec.ts`.
