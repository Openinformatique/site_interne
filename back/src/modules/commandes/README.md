# Module commandes (back)

Commandes clients, reprises de l'application historique (table `commandes` :
voir [docs/schema-metier.md](../../../docs/schema-metier.md)).

Écrans servis : **liste des commandes** (menu GESTION › Commandes) et **fiche
commande** (consultation, création, modification ; temps passé ; documents).
Toutes les routes sont accessibles à tout utilisateur authentifié (tous les
rôles). Pas de suppression de commande.

## API

### `GET /api/v1/commandes`

Liste paginée.

| Paramètre       | Défaut           | Rôle                                                                                                                                                                      |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`, `limit` | 1, 20 (max 1000) | pagination standard du socle                                                                                                                                              |
| `sortBy`        | `client`         | `client`, `groupe`, `dateCommande`, `numeroCommande`, `numeroDevis`, `dateDevis`, `delai`, `libelle`, `joursPrevus`, `joursPasses`, `joursCommandes`, `montant`, `statut` |
| `sortDirection` | `ASC`            | `ASC` / `DESC` ; puis date de commande décroissante et identifiant                                                                                                        |
| `includeClosed` | `false`          | `true` : en cours et clôturées                                                                                                                                            |
| `du`, `au`      | —                | période (AAAA-MM-JJ) : date du devis **ou** date de commande comprise                                                                                                     |
| `clientId`      | —                | un seul client                                                                                                                                                            |
| `groupes`       | —                | clés GSOC du client, séparées par des virgules ; combinées en OU avec `sansGroupe`                                                                                        |
| `sansGroupe`    | `false`          | inclut les commandes des clients sans groupe                                                                                                                              |
| `search`        | —                | recherche multi-mots (ci-dessous)                                                                                                                                         |

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

### Fiche commande

| Route | Rôle |
| --- | --- |
| `POST /commandes`, `GET/PUT /commandes/:id` | création, consultation, modification |
| `GET /commandes/:id/temps` | temps passé : `personnes` (cumul, décroissant) et `pointages` (plus récents d'abord) |
| `GET/POST /commandes/:id/documents` | documents (plus récents d'abord) ; ajout en multipart : `file`, `typeDocument` (TDOC), `commentaire` |
| `GET /commandes/:id/documents/:documentId/fichier` | contenu (`inline=true` : affichage, PDF et images seulement) |
| `DELETE /commandes/:id/documents/:documentId` | suppression définitive (référence et fichier) |

- **Obligatoires** : client, type (TYPC), dates du devis et de commande,
  libellé, jours commandés et prévus (positifs, 4 décimales au plus). N° de
  devis et de commande facultatifs, non uniques. Montant ≥ 0, 2 décimales.
- **Client** : existant et actif à la création ou lors d'un changement ; un
  client devenu inactif reste sur ses commandes. Changement refusé dès qu'un
  pointage est rattaché (`hasPointages`). Contrat facultatif, du client.
- **Clôture** : simple date ; une commande clôturée reste modifiable.
- **Temps passé** : heures facturables des pointages ÷ heures par jour
  (TDIV/HJOUR), cumul par personne calculé en heures puis converti.
- **Documents** : fichier confié au module storage (`FileStoragePort`), types
  MIME et taille limités par `STORAGE_ALLOWED_MIME_TYPES` /
  `STORAGE_MAX_FILE_SIZE` (20 Mo, formats bureautiques, images, PDF, zip,
  e-mails) ; la table `documents_commande` garde la référence et les
  métadonnées. Si l'enregistrement en base échoue, le fichier stocké est
  supprimé. Nom de fichier multipart redécodé en UTF-8.

## Architecture

- `domain/commande-list.port.ts` : modèle de ligne, filtres, ports
  `CommandeListPort` (lecture) et `CommandesSpreadsheetPort` (classeur).
- `application/list-commandes.use-case.ts` : liste paginée, clients du filtre,
  export (nom de fichier daté du jour).
- `application/commande-fiche.use-case.ts` : fiche (contrôles des références,
  verrou du client) et temps passé ; `commande-documents.use-case.ts` : documents.
- `domain/commande-fiche.port.ts`, `infrastructure/typeorm-commande-fiche.repository.ts`.
- `infrastructure/typeorm-commande-list.repository.ts` : requêtes (jointures
  client, contrat, GSOC ; sous-requête des heures pointées).
- `infrastructure/exceljs-commandes.spreadsheet.ts` : génération du classeur
  (bibliothèque `exceljs`).
- `presentation/` : contrôleur et DTO.

Les dates des requêtes brutes passent par `common/utils/sql-date.util.ts` (le
driver renvoie un minuit local : `toISOString()` décalerait d'un jour).

Tests : `list-commandes.use-case.spec.ts`, `exceljs-commandes.spreadsheet.spec.ts`,
`commande-fiche.use-case.spec.ts`, `commande-documents.use-case.spec.ts`.
