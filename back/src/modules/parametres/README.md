# Module paramètres (back)

Paramétrage générique repris de l'application historique (voir
[docs/schema-metier.md](../../../docs/schema-metier.md)) :

- `parametres_tables` (PARTAB) : les tables (code sur 4 caractères) ;
- `parametres_rubriques` (PARRUB) : leurs rubriques, numérotées « 01 », « 02 »… ;
  la rubrique 01 est le libellé affiché dans les listes ;
- `parametres` (PARFIC) : une ligne par clé et par rubrique renseignée ;
- `parametres_integrite` (PARINT) : non utilisée (vide).

## Lecture — `GET /api/v1/parametres/:codeTable`

Valeurs **actives** d'une table (clé + libellé de la rubrique 01), triées par
libellé. Tout utilisateur authentifié. Sert les listes déroulantes.

## Administration — `/api/v1/parametres/admin/tables` (ADMIN, DIRECTION)

| Route | Rôle |
| --- | --- |
| `GET /` | tables par code, avec rubriques (`nbValeurs`) et `nbParametres` |
| `POST /` | créer une table et ses rubriques (`code`, `nom`, `nomCle`, `tailleCle`, `aide`, `codeDansCombo`, `rubriques`) |
| `PUT /:code` | modifier la table et ses rubriques |
| `DELETE /:code` | supprimer une table **vide** (et ses rubriques) |
| `GET /:code/parametres` | paramètres actifs et inactifs, par clé (`cle`, `actif`, `valeurs` par n° de rubrique) |
| `POST /:code/parametres`, `PUT /:code/parametres/:cle` | créer / modifier un paramètre |
| `DELETE /:code/parametres/:cle` | supprimer un paramètre **inutilisé** |

Règles (`application/parametres-admin.use-case.ts`) :

- **Table** : code de 4 lettres ou chiffres, en majuscules, unique, figé ;
  nom et libellé de la clé obligatoires ; taille de clé de 1 à 8, jamais sous
  la longueur d'une clé existante. `modifiable_super` (sémantique inconnue)
  est mis à 1 à la création et n'est pas exposé.
- **Rubriques** : renumérotées dans l'ordre reçu ; chaque rubrique saisie
  porte `ancienNum` (rubrique existante qu'elle remplace, null si nouvelle).
  La 01 reste en tête ; une rubrique retirée efface ses valeurs ; les valeurs
  des rubriques renumérotées suivent (transaction).
- **Paramètre** : clé obligatoire, sans espace, unique dans la table, limitée
  à la taille de la clé, figée (casse conservée) ; libellé (01) obligatoire,
  80 caractères par valeur ; une valeur vide supprime sa ligne (sauf 01) ;
  le statut actif s'applique à toutes les lignes de la clé.
- **Suppression d'un paramètre** refusée s'il est utilisé (le désactiver) :
  `commandes.type_commande` (TYPC), `documents_commande.type_document` (TDOC),
  `pointages.type_action` (TYPA), `clients.code_pays` (PAYS), `clients.groupe`
  (GSOC), `clients.mode_reglement` (REGL), `contacts.poste` (FONC, qui stocke
  le libellé). Les civilités des contacts sont stockées en nombre (1/2), pas
  par clé : CIVI n'est pas contrôlée.

Tests : `application/parametres-admin.use-case.spec.ts`,
`application/list-parametre-values.use-case.spec.ts`.
