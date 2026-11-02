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
  (`CommandesApi.changed$`, alimenté par la fiche commande).

### Droits (accès UI)

Manifeste `access/commandes-page.access.ts` : accès à la page
(`commandes.page.access`, entrée du menu et garde de route), bouton
« Nouvelle commande » (`commandes.button.create`), bouton « Export Excel »
(`commandes.button.export`). Visibles par défaut, pour tous les rôles.

## Fiche commande (`commande-fiche/`)

`/commandes/:id` (consultation / modification) et `/commandes/nouvelle`
(création ; `?client=<id>` préremplit le client, depuis la fiche client ;
`&contrat=<id>` préremplit aussi le contrat ; `&renouvellement=1`, depuis
« Renouveler » du tableau de bord, préremplit en plus le type « Assistance
sur contrat » (ASSC), les n° de devis et de commande « ASSISTANCE », le
libellé « Ajout de temps contrat d'assistance », et les dates du devis, de
commande et de clôture à la date du jour — `renouvellementContrat`).
Maquette validée le 31/10/2026 ; même style que la fiche client (mixins
`clients/client-fiche/_fiche-shared.scss`).

- **Bandeau** (collé en haut) : « Commande N° … » (n° de commande, à défaut
  de devis), client cliquable (ouvre sa fiche), type, statut (En cours,
  Clôturée le …, Nouvelle), « Modifications non enregistrées », bouton
  Enregistrer / Créer la commande (actif dès une modification).
- **Informations générales** : client* (actifs + client actuel s'il est
  inactif ; grisé si des pointages existent), contrat (contrats du client,
  vidé au changement de client), type* (TYPC), n° et date* du devis, n° et
  date* de commande, libellé*, jours commandés* et prévus* (virgule
  acceptée), délai, montant (€), date de clôture.
- Enregistrement : « Création effectuée » / « Modification effectuée »
  (sans bouton) ; à la création, l'onglet devient `/commandes/:id`. La liste
  des commandes et la fiche client concernée se rafraîchissent
  (`CommandesApi.changed$`). Erreurs du back affichées sous chaque champ.
- **Temps passé** (`commande-temps/`) : jours passés sur jours prévus (saisie
  en cours), jours commandés, reste ou dépassement, pourcentage ; barre bleue
  sous 80 %, orange de 80 à 100 %, rouge au-delà (« Dépassement de X j ») ;
  sans jours prévus, pas de pourcentage. Vue **synthétique** (par défaut :
  personne, jours, part des jours prévus, dernier pointage, total) ou
  **détaillée** (date, personne, action TYPA, description, temps).
- **Documents** (`commande-documents/`) : zone de dépôt (glisser-déposer ou
  parcourir, 20 Mo), puis type* (TDOC) et commentaire avant « Ajouter le
  document » (enregistré immédiatement). Vignettes : aperçu réel des images,
  sinon icône colorée du format ; clic = ouverture dans un onglet (PDF,
  images) ou téléchargement ; boutons télécharger / supprimer (confirmation).
- Temps passé et documents n'apparaissent qu'après la création.

Droits (manifeste) : `commandes.fiche.button.save`,
`commandes.fiche.documents.add` (zone de dépôt),
`commandes.fiche.documents.delete` (bouton supprimer).

Tests : `commande-fiche/commande-fiche.utils.spec.ts`.

## Fichiers

- `commandes.routes.ts` : `''` (liste), `nouvelle`, `:id`.
- `core/api/commandes-api.service.ts`, `core/models/commande.model.ts`.
