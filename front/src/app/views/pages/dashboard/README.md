# Tableau de bord (front)

Menu : GÉNÉRAL › **Tableau de bord** (`/dashboard`). API et règles de calcul :
voir `back/src/modules/tableau-de-bord/README.md`. Maquette validée le
02/11/2026.

## Disposition

- Page sur toute la largeur de la zone de contenu (pas de limite
  `container-xxl`, règle dans `styles/_custom.scss`, comme les pointages).
- Titre « Tableau de bord », puis deux colonnes : **Commandes à livrer** à
  gauche, **Contrats à renouveler** à droite ; **Congés des 15 prochains
  jours** dessous, sur toute la largeur. Une carte par ligne quand la zone de
  contenu fait moins de 1 200 px (container query).
- Commandes et contrats : 10 lignes visibles au plus (hauteur de ligne fixe,
  62 px), défilement vertical au-delà, en-tête de colonnes figé.
- Colonnes resserrées pour tenir dans une demi-largeur : la colonne client
  prend la place restante, sur deux lignes fixes (nom, puis code et contrat
  ou libellé de la commande) coupées avec « … », texte complet au survol ;
  heures sans unité (« Crédit (h) ») ; badge sous la date ; boutons
  Renouveler et Clôturer réduits à leur icône (libellé au survol).
- Chaque carte : en-tête (icône, titre, pastilles de comptage à droite),
  tableau, pied de carte (règle de sélection et tri, légende pour les congés).
- Un liseré à gauche de chaque ligne indique la gravité : rouge, orange, ou
  gris (commande à plus de 7 jours).
- Couleurs propres à l'écran (rouge, orange, bleu des congés, hachures,
  week-ends) : variables `--dash-*` de `dashboard.component.scss`, valeurs de
  la maquette en thème clair et sombre ; fonds, bordures et textes : variables
  du thème.

## Modules

### Contrats à renouveler

- Contrats de plus d'1 h de crédit dont il reste 1 h ou moins (négatif compris), du restant le
  plus bas au plus haut.
- Pastilles « N épuisés » (restant ≤ 0, rouge) et « N bientôt épuisés » (orange).
- Colonnes : client (raison sociale ; code et libellé du contrat dessous),
  crédit, débit, restant (heures, rouge si ≤ 0), jauge de consommation avec
  pourcentage, échéance (badge « Dans N j » si elle tombe dans les 30 jours),
  bouton **Renouveler**.
- **Renouveler** ouvre un onglet « Nouvelle commande »
  (`/commandes/nouvelle?client=…&contrat=…&renouvellement=1`) : client et
  contrat préremplis, ainsi que les valeurs d'un renouvellement (type
  « Assistance sur contrat », n° de devis et de commande « ASSISTANCE »,
  libellé « Ajout de temps contrat d'assistance », dates du devis, de
  commande et de clôture du jour). Restent à saisir : jours commandés et
  prévus. La commande, clôturée dès sa création, n'apparaît pas dans les
  commandes à livrer ; elle augmente le crédit du contrat, qui sort de la
  liste s'il lui reste ensuite plus d'1 h.
- Pas d'action au clic sur la ligne.

### Commandes à livrer

- Pastilles « N en retard » et « N à livrer sous 2 semaines ».
- Colonnes : client (libellé de la commande dessous), n° de commande, délai
  avec badge (« N j de retard » rouge, « Aujourd'hui » / « Dans N j » orange
  jusqu'à 7 jours, gris au-delà), jours commandés, jours passés (rouge s'ils
  dépassent les jours commandés).
- **Clic sur une ligne** (ou Entrée) : ouvre la commande dans un onglet
  « Commande N° », comme la liste des commandes.
- Bouton **Clôturer** en fin de ligne : confirmation (« Clôturer la commande
  N° (client) à la date du jour ? »), puis `POST /commandes/:id/cloture` ; la
  commande sort de la liste. Si la clôture est refusée (déjà clôturée), le
  message du serveur s'affiche.

### Congés des 15 prochains jours

- Pastilles « N absents aujourd'hui » et « N personnes ».
- Colonnes : personne, période (« Du 09/11 au 13/11 », « Le 13/11
  après-midi ») avec badge « En cours · retour le … » ou « Dans N j », nombre
  de jours du congé entier, puis une frise d'une colonne par jour : congé en
  bleu (demi-case pour une demi-journée), férié pointé hachuré, week-ends
  grisés, aujourd'hui souligné. Disposition fixe (`table-layout: fixed`) :
  les jours se partagent la largeur restante, sans défilement horizontal
  (sauf sous 760 px).

## Comportement

- Chaque module est un élément de l'accès UI (`dashboard.section.contrats`,
  `.commandes`, `.conges`), visible par défaut. Un module masqué n'est ni
  affiché ni chargé ; si l'un des deux premiers est masqué, l'autre prend
  toute la largeur. Le bouton Clôturer est aussi un élément
  (`dashboard.commandes.button.cloturer`).
- La page reste ouverte dans son onglet : après chaque création ou
  modification de commande (`CommandesApi.changed$`), contrats et commandes
  sont rechargés (un contrat renouvelé sort de la liste).
- Chargement et erreur sont affichés par module.
