# Module clients (back)

Clients de l'entreprise, repris de l'application historique (tables `clients`,
`client_contrats`, `contacts` : voir [docs/schema-metier.md](../../../docs/schema-metier.md)).

Écrans servis : **liste des clients** et **fiche client** (consultation,
création, modification du client ; ses contrats avec leur suivi, ses
contacts et ses commandes). Toutes les routes sont accessibles à tout
utilisateur authentifié (tous les rôles consultent, créent et modifient).

## API

### `GET /api/v1/clients`

Liste paginée, accessible à tout utilisateur authentifié.

| Paramètre         | Défaut           | Rôle                                                                                               |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `page`, `limit`   | 1, 20 (max 1000) | pagination standard du socle                                                                       |
| `sortBy`          | `raisonSociale`  | `codeClient`, `raisonSociale`, `groupe`, `actif`, `adresse1..3`, `codePostal`, `ville`, `codePays` |
| `sortDirection`   | `ASC`            | `ASC` / `DESC` ; l'identifiant départage pour un ordre stable                                      |
| `includeInactive` | `false`          | `true` : actifs et inactifs                                                                        |
| `groupes`         | —                | clés GSOC séparées par des virgules (ex. `CFL`)                                                    |
| `sansGroupe`      | `false`          | inclut les clients sans groupe                                                                     |
| `search`          | —                | recherche multi-mots (ci-dessous)                                                                  |

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

### Fiche client

| Route                                                 | Rôle                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /clients/:id`                                    | fiche + traçabilité (`createdBy` / `updatedBy` = nom de l'utilisateur, null si repris) |
| `POST /clients` · `PUT /clients/:id`                  | création / modification (`SaveClientRequestDto`), renvoie la fiche                     |
| `GET /clients/:id/contrats`                           | contrats avec `credit`, `debit`, `restant` (heures)                                    |
| `POST /clients/:id/contrats` · `PUT …/contrats/:cid`  | création / modification d'un contrat                                                   |
| `GET /clients/:id/contrats/:cid/mouvements`           | suivi du contrat : commandes (crédit) et pointages (débit), date décroissante          |
| `GET /clients/:id/contacts`                           | contacts actifs et inactifs, triés par nom                                             |
| `POST /clients/:id/contacts` · `PUT …/contacts/:ctid` | création / modification d'un contact                                                   |
| `GET /clients/:id/commandes`                          | commandes du client (`includeClosed`, `du`, `au`)                                      |

Règles :

- champs obligatoires du client : code, raison sociale, code postal, ville,
  pays ; erreurs `VALIDATION_ERROR` par champ, message « Champ obligatoire. » ;
- **code client** enregistré en majuscules, unique sans tenir compte de la
  casse : sinon erreur sur le champ `codeClient` (« Ce code client est déjà
  utilisé. ») ; les autres textes sont enregistrés tels que saisis (espaces
  de bord retirés, vide → null) ;
- pas de suppression (client, contrat, contact) : statut actif / inactif ;
  le dernier enregistrement l'emporte ;
- `created_by` / `updated_by` = utilisateur connecté ;
- **suivi d'un contrat** (heures) : crédit = jours commandés des commandes du
  contrat × `HJOUR` (paramètre `TDIV`/`HJOUR`, rubrique 02, 8 par défaut) ;
  débit = temps facturable des pointages de ces commandes, quel que soit le
  code de facturation ; restant = crédit − débit (peut être négatif) ;
- **contacts** : le nom reste stocké au format historique « NOM,Prénom »
  (`domain/contact-name.ts`), nom en majuscules ; civilité 1 = M., 2 = Mme ;
  poste = libellé du paramétrage `FONC` ; e-mail au format valide ;
- **commandes** : non clôturées par défaut, triées par date de devis
  décroissante, sans pagination ; la période retient une commande dont la
  date du devis **ou** la date de commande est dans [`du`, `au`] ;
  `joursPasses` = heures pointées ÷ `HJOUR`.

## Organisation

| Couche         | Fichier                                                                                |
| -------------- | -------------------------------------------------------------------------------------- |
| domain         | `client-repository.port.ts` (liste), `client-fiche.port.ts` (fiche), `contact-name.ts` |
| application    | `list-clients.use-case.ts`, `client-fiche.use-case.ts`, `client-relations.use-case.ts` |
| infrastructure | `typeorm-client.repository.ts`, `typeorm-client-fiche.repository.ts`, `entities/`      |
| presentation   | `clients.controller.ts`, `dto/`                                                        |

Le libellé des groupes et des pays est servi par le module `parametres`
(`GET /api/v1/parametres/:codeTable`, ex. `GSOC`, `PAYS`).

## Tests

- `list-clients-query.dto.spec.ts` : conversion et validation des paramètres ;
- `list-clients.use-case.spec.ts` : pagination ;
- `client-fiche.use-case.spec.ts` : code en majuscules, unicité, client inconnu ;
- `contact-name.spec.ts` : découpage / recomposition « NOM,Prénom ».

Le SQL (filtres, recherche, tri) a été vérifié sur la base locale ; des tests
d'intégration nécessiteront une base de test (`.env.test`).
