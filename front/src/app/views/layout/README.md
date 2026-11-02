# Layout : menu latéral, barre du haut, onglets

Cadre commun à toutes les pages (`BaseComponent`) : menu latéral (`sidebar/`),
barre du haut (`navbar/`), barre d'onglets (`tabs/`) et pied de page (`footer/`).

## Menu latéral

Défini dans [`sidebar/menu.ts`](sidebar/menu.ts), affiché par `SidebarComponent`
(MetisMenu pour le dépliage des groupes).

| Section        | Entrée          | Sous-options                        | URL                       | Visible par         |
| -------------- | --------------- | ----------------------------------- | ------------------------- | ------------------- |
| GÉNÉRAL        | Tableau de bord | —                                   | `/dashboard`              | tous                |
| GESTION        | Clients         | —                                   | `/clients`                | tous                |
| GESTION        | Commandes       | —                                   | `/commandes`              | tous                |
| ADMINISTRATION | Utilisateurs    | — (création depuis la liste)        | `/users`                  | ADMIN, DIRECTION    |
| ADMINISTRATION | Paramètres      | —                                   | `/parametres`             | ADMIN, DIRECTION    |

- Une entrée peut être restreinte par rôle (`roles`) et par clé d'accès UI
  (`uiAccessKey`) ; une section sans entrée visible est masquée.
- Les sous-options n'ont pas d'icône ; un groupe est replié par défaut et
  s'ouvre automatiquement quand on est sur une de ses pages.
- Chaque option ouvre sa page dans un onglet (`TabsService.openTab`).

### Menu replié

Le bouton à côté du logo affiche « Rabattre le menu » (`PanelLeftClose`) quand
le menu est déplié et le burger « Déplier le menu » (`Menu`) quand il est
replié ; son icône suit la classe `sidebar-folded` du body. Replié, le menu
fait 70 px (icônes seules) ; il est
aussi replié automatiquement entre 992 et 1199 px de large. Au survol, le
template le fait apparaître temporairement en entier.

Clic sur une icône en mode replié (`onTopLevelLinkClick`, `onGroupClick`) :

- option simple : ouvre sa page ;
- groupe : ouvre sa **première sous-option** ;
- dans les deux cas, le menu **se déplie**.

### Logo

Logo OpenInformatique (`public/images/logo-openinformatique.png`, 50 px de
haut dans l'encart de 240 × 60 px). En thème sombre, une variante dont le
slogan noir est passé en blanc (`logo-openinformatique-sombre.png`) le
remplace. Le pictogramme « oi » seul sert de mini-logo sur mobile
(`logo-mini-light.png` / `logo-mini-dark.png`). Styles : `styles/_custom.scss`.

L'écran de connexion (`pages/auth/login`) reprend les deux variantes du logo,
avec à gauche `login-illustration.png` : découpe verticale (groupe de quatre
personnages) de l'illustration `Fichier-2.png` du site openinformatique.com.

## Barre du haut

Recherche globale (clients, commandes, pointages : `views/pages/recherche/README.md`), interrupteur jour/nuit, cloche d'alertes, menu du profil.

### Cloche d'alertes (pointages incomplets)

Entre l'interrupteur jour/nuit et la pastille de profil. Maquette validée le
02/11/2026.

- **Contenu** : jours ouvrés (lundi à vendredi) des 14 jours précédant
  aujourd'hui où l'utilisateur connecté a pointé moins de 7 h, du plus récent
  au plus ancien (`GET /pointages/alertes`, règles dans le README du module
  pointages back). Chacun ne voit que ses propres jours.
- **Pastille** rouge avec le nombre de jours ; absente quand tout est à jour.
- **Liste** (`ngbDropdown`) : en-tête « Pointages incomplets » + pastille
  « N jours » ; par jour, date complète, « 3,50 h saisies · 3,50 h
  manquantes » (ou « Aucun pointage »), ancienneté (« hier », « il y a N
  jours ») ; icône orange (jour partiel) ou rouge (aucun pointage). Plus de
  6 jours : défilement. Aucune alerte : « Tous tes pointages sont à jour ».
- **Clic** sur un jour : onglet Pointages sur la semaine du jour, pour
  l'utilisateur connecté (`PointagesNavigation` : la page lit la demande à sa
  création ou, déjà ouverte, dès qu'elle est émise).
- **Mise à jour** (`AlertesPointageStore`) : au démarrage, après chaque
  création, modification ou suppression de pointage dans l'application
  (`PointagesApi.changed$`), à l'ouverture de la cloche et toutes les
  5 minutes.
- Couleurs : variables `--alertes-*` de `navbar.component.scss` (clair et
  sombre, valeurs de la maquette).

L'interrupteur jour/nuit est une glissière encadrée d'un soleil et d'une lune ;
l'icône du thème actif est colorée (soleil doré, lune couleur primaire). Le
thème est mémorisé par `ThemeModeService` (`localStorage`). Styles :
`styles/_navbar.scss` (`.theme-switcher-wrapper`).

## Bandeau de fin de mois (`bandeau-fin-de-mois/`)

Affiché le **dernier jour ouvré du mois** (dernier jour du lundi au vendredi,
fériés non pris en compte : `fin-de-mois.utils.ts`), entre la barre du haut
et les onglets, quel que soit l'onglet ouvert. Maquette validée le
02/11/2026.

- Texte : « Dernier jour ouvré d'octobre » + rappel d'envoyer le relevé
  mensuel en fin de journée. Fond orange clair (variables `--bandeau-*`,
  clair et sombre). Pas de fermeture.
- Boutons « Relevé détaillé (PDF) » et « Relevé synthétique (PDF) » : relevé
  mensuel du mois en cours de l'utilisateur connecté
  (`GET /pointages/releve.pdf`, contenu `detail` / `synthese`), ouvert dans un
  nouvel onglet ; « Génération… » pendant l'appel.
- La date est réévaluée chaque minute (application laissée ouverte d'un jour
  à l'autre).
- **Test** : en développement, `environment.development.ts` →
  `dateDuJourSimulee` (AAAA-MM-JJ) remplace la date du jour ; `null` = date
  réelle ; toujours `null` en production.
- Placement : quand il est affiché, le bandeau prend la marge qui place les
  onglets sous la barre fixe et reste ancré sous elle au défilement
  (`position: sticky`, `styles/_vertical-wrapper.scss`) ; les onglets se fixent
  juste dessous. Sa hauteur est publiée dans `--bandeau-fin-de-mois-h`
  (position des onglets, pages à hauteur fixe comme le planning des
  pointages).

## Onglets

`TabsService` (`core/services/tabs.service.ts`) gère les onglets ouverts,
mémorisés dans `localStorage` (retrouvés après un rechargement de la page) :

- à la **déconnexion** (menu du profil), `AuthStore.logout` appelle
  `TabsService.reinitialiser()` : seul le Tableau de bord reste, les pages
  conservées sont détruites (modifications non enregistrées abandonnées) et
  les onglets mémorisés sont effacés ; la connexion suivante repart du
  Tableau de bord seul. Une session expirée (refresh refusé) ne ferme pas les
  onglets ;

- chaque page ouverte depuis le menu ajoute son onglet ; une page déjà ouverte
  réactive son onglet existant ;
- devant son titre, l'onglet affiche l'icône de l'entrée du menu d'où provient
  la page (`menuIconForUrl` dans `sidebar/menu.ts` : le lien le plus long qui
  préfixe l'URL, ex. `/clients/196` → icône de Clients) ;
- le bouton flèche ▾ à gauche du premier onglet ouvre la liste de tous les
  onglets ouverts (pastille orange, icône, titre ; onglet actif en gras) :
  un clic bascule vers l'onglet et ferme la liste, la croix ferme l'onglet et
  laisse la liste ouverte (fermée par clic ailleurs, Échap, défilement) ;
- un onglet reste ouvert jusqu'à sa fermeture (croix ✕ ou menu contextuel) ;
- fermer l'onglet affiché réactive son voisin de gauche ;
- **le Tableau de bord ne peut jamais être fermé** (onglet non fermable,
  ignoré par toutes les actions de fermeture) ;
- une page peut signaler des modifications non enregistrées
  (`setDirty(url, true)`, ou `registerDirtyCheck`) : son onglet porte une
  pastille orange et une confirmation est demandée avant fermeture (une seule
  pour plusieurs onglets : « … de N fiches ») ;
- la page d'un onglet est **conservée** quand on passe à un autre onglet
  (`TabRouteReuseStrategy`) et détruite à la fermeture de l'onglet. La route
  conservée est la première route **à composant** sous le layout (la page :
  `/clients/:id`, pas la route de module `clients` en `loadChildren`, que le
  routeur ne sait pas détacher) ; une page conservée qui doit refléter des
  créations faites ailleurs s'abonne à l'API (`ClientsApi.changed$`,
  `UsersApi.created$`). Le
  router-outlet n'est jamais retiré pendant un chargement différé (le
  spinner le masque seulement) ;
- `replaceTabUrl` change l'URL d'un onglet sans le fermer (ex. fiche créée :
  `/clients/nouveau` → `/clients/42`) ;
- la navbar et la barre d'onglets restent fixes ; seule la page défile.

### Menu contextuel (clic droit sur un onglet)

| Action                                  | Effet                                                        |
| --------------------------------------- | ------------------------------------------------------------ |
| Tout fermer                             | ferme tout sauf le Tableau de bord, qui devient actif        |
| Fermer tous les onglets sauf celui-ci   | garde l'onglet cliqué et le Tableau de bord                  |
| Fermer tous les onglets à gauche        | ferme les onglets avant l'onglet cliqué                      |
| Fermer tous les onglets à droite        | ferme les onglets après l'onglet cliqué                      |

Une action sans effet est grisée. Si l'onglet affiché est fermé, l'onglet
cliqué devient l'onglet affiché. Le menu se ferme au clic ailleurs, avec
Échap, au défilement ou au redimensionnement. Il est positionné en `fixed`
pour ne pas être coupé par le défilement horizontal de la barre d'onglets.
Tests : `core/services/tabs.service.spec.ts`.

## Éléments inactifs

Les éléments inactifs (clients, utilisateurs, contacts, commandes clôturées) ont un rendu commun défini dans `styles/_custom.scss` : fond `--app-inactive-bg` (#e9ecf1 en clair, #070d19 en sombre) et contenu estompé (`--app-inactive-opacity`, .5) et désaturé. Les boutons d'action restent nets. Chaque écran applique ces variables à ses lignes et cartes inactives.
