# Layout : menu latéral, barre du haut, onglets

Cadre commun à toutes les pages (`BaseComponent`) : menu latéral (`sidebar/`),
barre du haut (`navbar/`), barre d'onglets (`tabs/`) et pied de page (`footer/`).

## Menu latéral

Défini dans [`sidebar/menu.ts`](sidebar/menu.ts), affiché par `SidebarComponent`
(MetisMenu pour le dépliage des groupes).

| Section        | Entrée          | Sous-options                        | URL                       | Visible par         |
| -------------- | --------------- | ----------------------------------- | ------------------------- | ------------------- |
| GÉNÉRAL        | Tableau de bord | —                                   | `/dashboard`              | tous                |
| GESTION        | Module clients  | Liste des clients, Commandes        | `/clients`, `/commandes`  | tous                |
| ADMINISTRATION | Utilisateurs    | — (création depuis la liste)        | `/users`                  | ADMIN, DIRECTION    |

- Une entrée peut être restreinte par rôle (`roles`) et par clé d'accès UI
  (`uiAccessKey`) ; une section sans entrée visible est masquée.
- Les sous-options n'ont pas d'icône ; un groupe est replié par défaut et
  s'ouvre automatiquement quand on est sur une de ses pages.
- Chaque option ouvre sa page dans un onglet (`TabsService.openTab`).

### Menu replié

Le bouton aux trois traits replie le menu à 70 px (icônes seules) ; il est
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

Recherche globale, interrupteur jour/nuit, menu du profil.

L'interrupteur jour/nuit est une glissière encadrée d'un soleil et d'une lune ;
l'icône du thème actif est colorée (soleil doré, lune couleur primaire). Le
thème est mémorisé par `ThemeModeService` (`localStorage`). Styles :
`styles/_navbar.scss` (`.theme-switcher-wrapper`).

## Onglets

`TabsService` (`core/services/tabs.service.ts`) gère les onglets ouverts,
mémorisés dans `localStorage` :

- chaque page ouverte depuis le menu ajoute son onglet ; une page déjà ouverte
  réactive son onglet existant ;
- un onglet reste ouvert jusqu'à sa fermeture (croix ✕ ou menu contextuel) ;
- fermer l'onglet affiché réactive son voisin de gauche ;
- **le Tableau de bord ne peut jamais être fermé** (onglet non fermable,
  ignoré par toutes les actions de fermeture) ;
- une page peut signaler des modifications non enregistrées
  (`registerDirtyCheck`) : une confirmation est alors demandée avant fermeture.

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
