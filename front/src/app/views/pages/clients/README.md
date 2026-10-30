# Module clients (front)

Menu : GESTION › **Clients** (`/clients`).
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
- La liste, conservée dans son onglet, se recharge après chaque création ou
  modification d'un client (`ClientsApi.changed$`).

### Mémorisation

`ClientsListStateService` garde recherche, groupes, inactifs, tri, page et
taille de page **pendant la session** (on les retrouve en revenant sur
l'onglet) et les remet à zéro à la déconnexion. La vue (liste / tuiles) n'est
pas mémorisée.

## Fiche client (`client-fiche/`)

Ouverte dans un onglet : `/clients/:id` (consultation / modification) ou
`/clients/nouveau` (création). La fiche est **toujours modifiable**.

### Disposition (maquette validée, thèmes clair et sombre)

- **Bandeau** collé en haut de la zone qui défile (sous la navbar et la barre
  d'onglets, elles aussi fixes) : initiales, raison sociale, code, statut,
  groupe, drapeau + pays ; « Modifications non enregistrées » (point orange)
  et bouton « Enregistrer » (grisé tant que rien n'a changé) ou « Créer le
  client ».
- Colonne gauche : **Identification** (code client\*, statut, raison
  sociale\*, adresses 1 à 3, code postal\* + ville\*, pays\*, groupe) et
  **Informations fiscales** (n° TVA, mode de règlement). Listes issues du
  paramétrage `PAYS`, `GSOC`, `REGL` ; une valeur absente du paramétrage
  reste affichée par son code.
- Colonne droite : **Contrats** (libellé, temps restant, mise en place,
  échéance, état En cours / Échu) et **Contacts** (cartes ; inactifs masqués,
  « Afficher les inactifs (n) »). Clic sur une ligne / carte ou sur l'œil :
  modale ; le téléphone et l'e-mail ouvrent l'appel / la messagerie.
- **Commandes** : interrupteur « Afficher les commandes clôturées » (désactivé
  par défaut), « Filtrer par période » (Du / au : date du devis ou date de
  commande), délai en rouge s'il est dépassé et la commande non clôturée,
  commandes clôturées grisées. Clic sur une ligne ou l'œil : onglet
  `/commandes/:id` ; « Nouvelle commande » : `/commandes/nouvelle?client=:id`
  (écrans commandes : emplacements réservés).
- Traçabilité : « Créé le … par … · Modifié le … par … » (sans auteur pour les
  données reprises).
- En création, seuls Identification et Informations fiscales sont saisis ; un
  encart indique qu'il faut enregistrer le client pour lui ajouter contrats,
  contacts et commandes.

### Enregistrement

- Champs obligatoires signalés par une étoile ; manquants : bordure rouge et
  « Champ obligatoire. » sous le champ. Erreurs du back affichées sous le
  champ concerné (ex. code client déjà utilisé). Code client saisi en
  majuscules.
- Réussite : alerte « Modifications enregistrées » / « Création effectuée »
  sans bouton (1,4 s) ; on reste sur la fiche. Après une création, l'onglet
  devient `/clients/:id` et prend le nom du client.
- **Modales** (`contrat-modal/`, `contact-modal/`) : « Enregistrer » enregistre
  immédiatement, puis petit message en bas à droite (« Contrat enregistré. » /
  « Contact enregistré. »).
  - Contrat (libellé\*, mise en place\*, échéance) avec totaux du suivi (temps
    crédité, débité, restant — rouge si négatif) et mouvements : présentation
    **Synthétique** (par défaut : pointages consécutifs regroupés en une ligne
    « Développement » sans date) ou **Détaillée**, filtre Tout / Commandes /
    Pointages. « Imprimer le suivi » : prévu plus tard, sans effet pour
    l'instant.
  - Contact : civilité\*, statut, nom\*, prénom, poste\* (paramétrage `FONC`),
    téléphone, e-mail (format vérifié).

### Onglets

La fiche est conservée quand on change d'onglet (`TabRouteReuseStrategy`) et
détruite à la fermeture de son onglet. Tant qu'elle a des modifications non
enregistrées, son onglet porte une pastille orange (`TabsService.setDirty`) et
sa fermeture demande confirmation (une seule pour plusieurs fiches :
« … de N fiches »).

## Droits

- Liste visible par tous les rôles.
- Clés d'accès UI (`access/`) : `clients.page.access` (page et entrée de
  menu), `clients.button.create` (bouton « Nouveau client »),
  `clients.fiche.button.save` (bouton « Enregistrer » / « Créer le client » de
  la fiche), configurables par utilisateur depuis l'écran « Accès UI ».

## Fichiers

| Fichier                                        | Rôle                                   |
| ---------------------------------------------- | -------------------------------------- |
| `clients-list/clients-list.component.*`        | écran de liste                         |
| `clients-list/clients-list-state.service.ts`   | état mémorisé pour la session (+ spec) |
| `client-fiche/client-fiche.component.*`        | fiche client                           |
| `client-fiche/contrat-modal/`, `contact-modal/` | modales contrat / contact              |
| `client-fiche/client-fiche.utils.ts`           | formats, suivi synthétique (+ spec)    |
| `client-fiche/_fiche-shared.scss`              | styles communs fiche / modales         |
| `access/`                                      | clés et manifeste d'accès UI           |
| `core/api/clients-api.service.ts`              | liste, fiche, contrats, contacts, commandes |
| `core/api/parametres-api.service.ts`           | `GET /parametres/:codeTable` (cache de session) |
