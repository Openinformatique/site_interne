# Schéma métier

Le schéma métier reprend l'analyse `OPEN_PROJECT.wda` de l'application
historique (WebDev / HFSQL) : clients, contrats, commandes et pointages
horaires des salariés. Il est créé par la migration `CreateSchemaMetier`.

## Conventions

- Tables et colonnes en `snake_case`, en français, sans accents.
- Clé primaire `id` entière (IDENTITY) via `IdentityAuditableEntity`, pour
  conserver les identifiants d'origine lors de la reprise de données
  (`SET IDENTITY_INSERT`). Les références à `users` restent des UUID.
- Toutes les tables portent les colonnes d'audit (`created_at`, `updated_at`,
  `deleted_at`, `created_by`, `updated_by`), qui remplacent
  `IDUtilisateur_creation/maj` et `DateH_creation/maj`.
- `actif` (ex-`Enr_Actif`) est distinct de la suppression logique.
- Les colonnes alimentées par le paramétrage (`type_action`, `type_commande`,
  `mode_reglement`, `groupe`, `poste`, `type_document`) stockent une
  `cle_parametre` de la table `parametres`, sans clé étrangère.

## Correspondance avec l'ancien schéma

| Table historique       | Table                   | Module     |
| ---------------------- | ----------------------- | ---------- |
| `Client`               | `clients`               | clients    |
| `Client_contrat`       | `client_contrats`       | clients    |
| `Contact`              | `contacts`              | clients    |
| `Commande`             | `commandes`             | commandes  |
| `Commande_repartition` | `commande_repartitions` | commandes  |
| `Document_Commande`    | `documents_commande`    | commandes  |
| `Pointage`             | `pointages`             | pointages  |
| `PARTAB`               | `parametres_tables`     | parametres |
| `PARRUB`               | `parametres_rubriques`  | parametres |
| `PARFIC`               | `parametres`            | parametres |
| `PARINT`               | `parametres_integrite`  | parametres |
| `UTILISATEUR`          | `users` (existante)     | users      |

Non repris pour le moment : `Pointage_previsionnel`, `Utilisateur_planning`.

Colonnes renommées ou retypées notables :

| Ancien                                       | Nouveau                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `Client.ID_TVA`                              | `clients.numero_tva`                                                           |
| `Contact.NumTel`                             | `contacts.numero_telephone`                                                    |
| `Commande.Num_Devis` / `Num_Commande_Client` | `numero_devis` / `numero_commande_client`                                      |
| `Commande.Date_Cloture_Commande`             | `commandes.date_cloture`                                                       |
| `Commande.Type_cde`                          | `commandes.type_commande`                                                      |
| `Commande.Montant` NUMERIC(24,6)             | `montant` decimal(18,2)                                                        |
| `Nb_Jours_*` REAL, `nbjours` INTEGER         | decimal(7,2) / decimal(5,2)                                                    |
| `Document_Commande.Doc_Bin`                  | fichier dans le stockage (`fichier_identifiant`, `type_mime`, `taille_octets`) |
| `Pointage.DateH_debut` / `DateH_fin`         | `date_heure_debut` / `date_heure_fin`                                          |
| `Pointage.Facturable` INTEGER                | `facturable` bit                                                               |
| `IDUTILISATEUR` (INTEGER)                    | `utilisateur_id` (UUID vers `users`)                                           |
| `UTILISATEUR.Login` / `MotdePasse`           | `users.email` / non repris (nouveau mot de passe)                              |

## Règles d'intégrité

- Une commande est rattachée à un contrat **de son propre client** : clé
  étrangère composite `(client_contrat_id, client_id)` →
  `client_contrats (id, client_id)`.
- Un pointage sans client correspond à du temps interne ; client, commande
  et contact y sont facultatifs.
- Ajouts par rapport à l'ancien schéma : clés étrangères vers `users`
  (`pointages`, `commande_repartitions`) et de `parametres` vers
  `parametres_tables` ; unicité de `(code_table, num_rubrique)` sur
  `parametres_rubriques` et de `(code_table, cle_parametre, num_rubrique)`
  sur `parametres`.

## Points ouverts

- Unité de `pointages.temps_facturable` (heures, minutes ou jours).
- Sémantique de `parametres_tables.modifiable_super`.
