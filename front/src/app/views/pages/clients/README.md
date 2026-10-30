# Module clients (front)

Menu : GESTION › **Module clients** › Liste des clients (`/clients`).
API : voir [back/src/modules/clients/README.md](../../../../../../back/src/modules/clients/README.md).

## Liste des clients (`clients-list/`)

Même langage visuel que la liste des utilisateurs : en-tête (icône, titre
« Clients » avec compteur, sous-titre), barre de filtres, vue liste ou tuiles,
pagination.

### Filtres

| Filtre                 | Comportement                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| Recherche              | un seul champ, déclenché après 300 ms ; plusieurs mots = tous requis ; insensible à la casse et aux accents ; porte sur code, raison sociale, adresses, CP, ville, pays (code ou nom), n° TVA, groupe |
| Groupes                | liste déroulante à sélection multiple : groupes du paramétrage `GSOC` + « Sans groupe », avec le nombre de clients de chacun (selon le filtre actifs / tous) ; les groupes choisis s'affichent en étiquettes ; « Effacer » vide la sélection |
| Afficher les inactifs  | interrupteur, désactivé par défaut (actifs uniquement)                       |

Les filtres s'appliquent immédiatement (pas de bouton « Appliquer ») et
ramènent en page 1.

### Affichage

- **Vue liste** (par défaut, à chaque arrivée) : Code, Raison sociale,
  Groupe (étiquette), Statut (Actif / Inactif), Adresse 1 à 3, CP, Ville,
  Pays (**drapeau seul**, nom du pays au survol et pour les lecteurs d'écran ;
  code affiché si ce n'est pas un code ISO à 2 lettres). Tri par clic sur les
  en-têtes, par défaut raison sociale A → Z. Le tableau défile horizontalement
  si l'écran est étroit. Clients inactifs grisés.
- **Vue tuiles** : initiales, raison sociale, code, groupe, statut, adresse,
  CP + ville, drapeau + nom du pays, bouton « Voir la fiche ».
- Pagination partagée (`app-pagination`), 50 clients par page par défaut.

Drapeaux : bibliothèque `flag-icons` (classes `fi fi-<code>`, format 4:3
uniquement, importée dans `styles.scss`). Noms des pays : paramétrage `PAYS`.

### Navigation

- Clic sur une ligne, sur l'œil (colonne « Fiche ») ou sur « Voir la fiche » :
  ouvre la fiche dans un onglet (`/clients/:id`, titre = raison sociale).
- « Nouveau client » : onglet `/clients/nouveau`.
- La fiche (`client-fiche/`) est pour l'instant un emplacement réservé.

### Mémorisation

`ClientsListStateService` garde recherche, groupes, inactifs, tri, page et
taille de page **pendant la session** (on les retrouve en revenant sur
l'onglet) et les remet à zéro à la déconnexion. La vue (liste / tuiles) n'est
pas mémorisée.

### Droits

- Liste visible par tous les rôles.
- Clés d'accès UI (`access/`) : `clients.page.access` (page et entrée de
  menu), `clients.button.create` (bouton « Nouveau client »), configurables
  par utilisateur depuis l'écran « Accès UI ».

### Fichiers

| Fichier                                        | Rôle                                   |
| ---------------------------------------------- | -------------------------------------- |
| `clients-list/clients-list.component.*`        | écran de liste                         |
| `clients-list/clients-list-state.service.ts`   | état mémorisé pour la session (+ spec) |
| `client-fiche/client-fiche.component.ts`       | fiche (emplacement réservé)            |
| `access/`                                      | clés et manifeste d'accès UI           |
| `core/api/clients-api.service.ts`              | `GET /clients`                         |
| `core/api/parametres-api.service.ts`           | `GET /parametres/:codeTable` (cache de session) |
