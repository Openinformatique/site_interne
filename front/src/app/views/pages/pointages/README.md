# Pointages (front)

Menu : GÉNÉRAL › **Pointages** (`/pointages`, icône calendrier-horloge). API :
voir `back/src/modules/pointages/README.md`. Maquette validée le 01/11/2026.

## Écran (`pointages-page/`)

Pas d'en-tête (titre porté par l'onglet) : barre d'outils puis planning, qui
prend toute la hauteur et toute la largeur disponibles (pas de limite
`container-xxl`, marges latérales de 16 px : règle dans `styles/_custom.scss`). La page ne défile jamais ; seul le planning
défile (0 h – 24 h), positionné sur 7 h. L'heure affichée en haut est mémorisée
et retrouvée au retour sur l'onglet (la page conservée revient avec un
défilement remis à zéro) et au redimensionnement.

### Barre d'outils

- **Personne** : l'utilisateur connecté par défaut (« (moi) »). Seuls les
  profils Admin et Direction peuvent en choisir une autre ; sinon liste grisée
  avec une bulle d'explication.
- **‹ / Aujourd'hui / ›** : semaine précédente, courante, suivante.
- **Semaine N · du … au …** (numéro ISO).
- **Choisir une semaine** (à la demande, comme le filtre de période des
  commandes) : un jour choisi affiche la semaine qui le contient ; la croix
  referme.
- **Week-end** : affiche samedi et dimanche (jours ouvrés par défaut).
- **Semaine : x h** : total des jours affichés.

### Planning (FullCalendar, vue semaine)

- En-tête de chaque jour : « lun. 26/10 » et total des heures du jour ; jour
  courant souligné ; week-end grisé.
- Hauteur d'une heure = hauteur visible ÷ 11 (la plage 7 h – 18 h remplit la
  zone visible ; 30 px minimum), recalculée au redimensionnement.
- Grille au quart d'heure : trait plein à l'heure, tirets à la demi-heure.
- **Blocs** colorés selon le type d'action (`TYPA`, rubrique 02 « R,V,B »),
  texte en haut à gauche : titre `[ commande ] CLIENT ( 2 h )` ou
  `INTERNE ( x h )`, séparé par un filet ; tags en pastilles (paramétrés
  pleins, libres en pointillés) ; description tronquée selon la hauteur.
- **Survol** : bulle (titre, type · horaires · client, tags, description
  complète) et boutons Modifier / Copier / Supprimer.
- **Créer** : glisser sur une plage d'une même journée ; la modale s'ouvre au
  relâchement (un simple clic ne crée rien).
- **Modifier** : double-clic sur le bloc ou bouton « Modifier ».
- **Déplacer / changer la durée** : glisser le bloc ou sa poignée basse (pas
  de 15 min, même journée) ; enregistré aussitôt, annulé si le back refuse
  (message d'erreur). La durée contrat suit la nouvelle durée si elle suivait
  l'ancienne.
- **Copier / coller** : « Copier » sur un bloc, puis clic sur un créneau : même
  pointage, même durée (limitée à minuit), pour la personne affichée. Bandeau
  « Pointage copié » avec Annuler, flottant en bas du planning (ne décale pas
  la grille). Au survol, un **fantôme** (bordure en tirets, couleur du type,
  pastille « mer. 10:30 – 12:30 ») montre le créneau exact du collage : quart
  d'heure sous la souris, durée limitée à minuit. Pendant la copie, les blocs
  laissent passer le clic : on peut coller par-dessus un pointage existant.
- **Bulle** : remise à jour dès l'enregistrement d'un déplacement ou d'une
  nouvelle durée si la souris est toujours sur le bloc.
- **Supprimer** : confirmation, depuis le bloc ou la modale.

## Modale (`pointage-modal/`)

Disposition de l'ancien écran (libellés à gauche) : Date + De / à (pas de
15 min) + Durée ; Action ; Tags ; Description ; Client ; Contact ; Commande ;
Facturable + Durée contrat. Pied : Supprimer (modification), Annuler,
Enregistrer.

- **Tags** : saisie assistée sur la table `TAGS` ou tag libre, ajouté par
  Entrée, Tab ou en quittant le champ ; Retour arrière retire le dernier.
  Enregistrés en tête de la description : `[Tag 1] [Tag 2] texte`.
- **Facturable** : En attente / Facturable / Non facturable (défaut
  Facturable ; `AUTRE`, `CP`, `FERIE`, `ARRET` → Non facturable). Durée
  contrat saisissable sauf pour un pointage non facturable (elle vaut alors la
  durée du créneau).
- **Règles** (étoiles et messages sous les champs, effacés à la saisie) : date,
  heures et type obligatoires ; client obligatoire sauf `AUTRE`, `CP`,
  `FERIE`, `ARRET` ; « Développement sur devis » : commande de type commande
  (liste filtrée) ; « Assistance sur contrat / téléphonique » : contact et
  commande de type contrat (liste filtrée, suffixe « (contrat) »). Commandes
  clôturées et contacts inactifs masqués, sauf ceux du pointage.

## Fichiers

- `pointages.utils.ts` (+ spec) : tags, titres, semaines, heures.
- `access/` : clé `pointages.page.access` (manifeste pour le panneau
  d'administration des accès UI).
