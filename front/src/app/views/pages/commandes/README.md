# Commandes (front)

Menu : GESTION › **Commandes** (`/commandes`). API : voir
`back/src/modules/commandes/README.md`.

## Liste des commandes (`commandes-list/`)

Consulter les commandes, ouvrir une commande ou en créer une (dans un
onglet), exporter la liste en Excel. Maquette validée le 30/10/2026.

### Filtres

- **Recherche générique** (300 ms après la saisie) : n° de commande, n° de
  devis, libellé, client (code, raison sociale), contrat, montant ; chaque mot
  doit être trouvé.
- **Client** : sélection unique dans les clients ayant au moins une commande
  (inactifs compris), liste filtrable par saisie (sans tenir compte des
  accents).
- **Groupe** : sélection multiple (groupes GSOC + « Sans groupe »), comme la
  liste des clients.
- **Afficher les commandes clôturées** : désactivé par défaut.
- **Filtrer par période** : même fonctionnement que la fiche client (date du
  devis ou date de commande dans la période) ; la croix retire le filtre.

Tout changement de filtre ou de tri revient en page 1. Filtres, tri, page et
vue sont conservés tant que l'onglet reste ouvert (page conservée par
`TabRouteReuseStrategy`) ; à la réouverture, valeurs par défaut.

### Tableau et tuiles

- Colonnes triables : Client, Groupe, Date commande, N° commande, N° devis,
  Date devis, Délai, Libellé, Jours prévus, Jours passés, Jours commandés,
  Montant, Statut ; puis l'œil (ouvrir). Tri par défaut : client, puis date de
  commande la plus récente.
- Marges serrées et en-têtes longs sur deux lignes pour tenir dans la carte ;
  défilement horizontal seulement sur écran étroit.
- **Statut** : « En cours » (vert) ou « Clôturée » (gris) avec « le JJ/MM/AAAA »
  dessous. **Délai** dépassé d'une commande en cours : rouge et gras.
- Commande clôturée : rendu « inactif » commun (fond `--app-inactive-bg`,
  contenu estompé et désaturé) ; l'œil reste net.
- Jours : jusqu'à 4 décimales, virgule. Montant : format monétaire français.
- **Vue tuiles** : n° de commande, client et groupe, statut, libellé, dates
  (commande, devis, délai), jours et montant, bouton « Voir la commande ».

### Actions

- Clic sur une ligne, l'œil ou « Voir la commande » : onglet
  « Commande N° … » (`/commandes/:id`).
- **Nouvelle commande** : onglet « Nouvelle commande » (`/commandes/nouvelle`,
  sans client prérempli).
- **Export Excel** : toutes les commandes du filtre (toutes les pages) dans
  l'ordre du tri ; fichier `commandes_AAAA-MM-JJ.xlsx` généré par le back.
- La liste se rafraîchit quand une commande est créée ou modifiée ailleurs
  (`CommandesApi.changed$`, alimenté par l'écran Commande à venir).

### Droits (accès UI)

Manifeste `access/commandes-page.access.ts` : accès à la page
(`commandes.page.access`, entrée du menu et garde de route), bouton
« Nouvelle commande » (`commandes.button.create`), bouton « Export Excel »
(`commandes.button.export`). Visibles par défaut, pour tous les rôles.

## Commande (`commande-fiche/`)

Emplacement réservé : l'écran sera conçu à l'étape suivante.

## Fichiers

- `commandes.routes.ts` : `''` (liste), `nouvelle`, `:id`.
- `core/api/commandes-api.service.ts`, `core/models/commande.model.ts`.
