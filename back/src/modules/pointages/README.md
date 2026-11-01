# Module pointages (back)

Temps passé par les salariés, repris de l'application historique (table
`pointages` : voir [docs/schema-metier.md](../../../docs/schema-metier.md)).

Écran servi : **Pointages** (menu GÉNÉRAL › Pointages) — planning hebdomadaire
d'une personne, saisie, déplacement, changement de durée et suppression.

## Droits

- Tout utilisateur authentifié consulte et saisit **ses** pointages.
- Les profils **Admin** et **Direction** consultent et saisissent ceux de toute
  personne. Sinon : `403 ACCESS_DENIED` (liste, création, modification,
  suppression), et la liste des personnes du référentiel se limite à
  l'utilisateur connecté.

## Dates et heures

`date_heure_debut` / `date_heure_fin` (datetime2) contiennent des **instants
UTC** — données reprises comprises (constaté : début de journée à 7 h UTC en
hiver, 6 h UTC en été, soit 8 h en France). L'API échange des instants ISO
8601 ; le front les affiche en heure locale.

Le pilote mssql de TypeORM lit et écrit les `datetime2` en heure locale du
serveur Node : le dépôt passe donc par du texte UTC explicite, en lecture
(`CONVERT(varchar(23), …, 126)` + `Z`), en filtre de période et en écriture
(`CAST(:debut AS datetime2)`).

## Codes `facturable`

| Code | Signification                                                  |
| ---- | -------------------------------------------------------------- |
| 0    | non facturable                                                 |
| 1    | facturable                                                     |
| 2    | en attente (nouveau code, propre à la nouvelle application)    |
| 3, 4 | codes repris de l'ancienne application, affichés « en attente » |

`temps_facturable` (« durée contrat », heures) : temps imputé à la commande / au
contrat (fiche commande, fiche client). Par défaut égal à la durée du créneau ;
il la suit pour un pointage non facturable.

## Règles de saisie

Contrôlées par `PointagesUseCase` (erreurs `VALIDATION_ERROR` par champ) :

- début et fin obligatoires, fin après début, 24 h au plus ;
- personne existante ; type d'action (`typeAction`) du paramétrage `TYPA` ;
- **client** obligatoire, sauf `AUTRE` (temps interne), `CP`, `FERIE`, `ARRET`
  (jamais de client dans les données reprises) ;
- `DEVIS` (développement sur devis) : **commande** du client **hors contrat**
  (`client_contrat_id` vide) ;
- `ASSC` / `ASST` (assistance sur contrat / téléphonique) : **commande** du
  client **sous contrat** (`client_contrat_id` renseigné) et **contact** ;
- commande et contact appartiennent au client ; pas de commande ni de contact
  sans client.

Les chevauchements de pointages sont admis (12 dans les données reprises).

## API

### `GET /api/v1/pointages/reference`

Référentiels de l'écran : `types` (`cle`, `libelle`, `couleur` « R,V,B » —
rubrique 02 de `TYPA`), `tags` (libellés de `TAGS`), `personnes` (utilisateurs
actifs, ou l'utilisateur seul — voir Droits), `clients` (clients actifs : `id`,
`code`, `nom`).

### `GET /api/v1/pointages/clients/:clientId/options`

`contacts` (`id`, `nom`, `actif`) et `commandes` (`id`, `numero` — n° de
commande client sinon n° de devis —, `libelle`, `contrat`, `cloturee`) du
client, commandes les plus récentes d'abord.

### `GET /api/v1/pointages?utilisateurId=…&du=…&au=…`

Pointages de la personne qui chevauchent `[du, au[` (instants ISO, 42 jours au
plus), par début croissant. Ligne : `id`, `utilisateurId`, `debut`, `fin`,
`typeAction`, `clientId`, `clientCode`, `clientNom`, `commandeId`,
`commandeNumero`, `contactId`, `contactNom`, `description`, `facturable`,
`tempsFacturable`.

### `POST /api/v1/pointages` — `PUT /api/v1/pointages/:id`

Corps : `utilisateurId`, `debut`, `fin`, `typeAction`, `clientId`,
`commandeId`, `contactId`, `description` (tags entre crochets en tête :
`[Tag 1] [Tag 2] texte`), `facturable` (0 à 4), `tempsFacturable` (0 à 24,
4 décimales). Renvoie le pointage enregistré. Le `PUT` sert aussi au
déplacement et au redimensionnement depuis le planning.

### `DELETE /api/v1/pointages/:id`

Suppression définitive (`204`).

## Structure

- `domain/pointage.port.ts` — port, types, codes facturable, types d'action
  soumis à règle.
- `application/pointages.use-case.ts` (+ spec) — droits et règles de saisie.
- `infrastructure/typeorm-pointage.repository.ts` — requêtes TypeORM.
- `presentation/pointages.controller.ts`, `presentation/dto/pointage.dto.ts`.
