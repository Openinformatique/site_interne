# Onglets dynamiques

## Objectif

L'application dispose maintenant d'une navigation par onglets dans la zone principale. L'objectif est de pouvoir garder plusieurs consultations ouvertes et de passer de l'une a l'autre sans perdre l'instance Angular de la page tant que l'application reste ouverte.

Exemple de comportement :

1. Un clic sur `Commandes` ouvre l'ecran dans un onglet.
2. Depuis cet ecran, un clic sur un article peut ouvrir sa fiche dans un nouvel onglet.
3. Un clic sur un onglet deja ouvert l'active sans creer de doublon.
4. La fermeture de l'onglet actif revient d'abord a l'onglet situe a sa gauche.
5. L'onglet `Dashboard` est permanent et ne peut pas etre ferme.
6. La liste des onglets et l'onglet actif sont restaurees apres un rechargement de la page.

## Architecture retenue

La solution repose sur quatre niveaux :

- `TabsService` est la source unique de verite pour la liste des onglets et l'onglet actif.
- `TabRouteReuseStrategy` demande a Angular de detacher et de conserver les composants des routes ouvertes.
- `TabsComponent` affiche la barre d'onglets et transmet les actions utilisateur au service.
- `BaseComponent` integre la barre dans le layout global, au-dessus du `router-outlet`.

L'URL complete normalisee sert d'identifiant d'onglet. Deux consultations ayant des URLs differentes, notamment deux fiches avec des parametres differents, peuvent donc coexister.

## Fichiers ajoutes

### `src/app/core/models/tab.model.ts`

Contient le modele `AppTab` :

- `id` : identifiant unique, base sur l'URL normalisee ;
- `title` : libelle affiche dans la barre ;
- `url` : URL a restaurer lorsque l'onglet est active ;
- `closable` : indique si l'utilisateur peut fermer l'onglet.

Le fichier definit egalement :

- `DASHBOARD_TAB`, l'onglet permanent ;
- `normalizeTabUrl`, qui uniformise les URLs et conserve les query params et les fragments ;
- `tabUrlFromSnapshot`, qui reconstruit l'URL d'un snapshot Angular pour la strategie de reutilisation.

### `src/app/core/services/tabs.service.ts`

Service singleton responsable de la logique fonctionnelle.

Il expose deux signals en lecture seule :

- `tabs` : liste courante des onglets ;
- `activeTabId` : identifiant de l'onglet actif.

Methodes principales :

- `openTab(url, title?, closable?)` : cree un onglet ou active celui qui existe deja ;
- `navigate(url, options)` : choisit entre ouverture dans un nouvel onglet et remplacement du contenu courant ;
- `activateTab(tabId)` : active un onglet existant ;
- `closeTab(tabId)` : ferme un onglet fermable et revient a gauche si celui-ci etait actif ;
- `hasTab(url)` : permet a la strategie Angular de savoir si une route appartient a un onglet ouvert ;
- `onTabClosed(listener)` : permet de liberer le composant conserve lorsqu'un onglet est ferme.

La methode `initialize` ecoute les `NavigationEnd` du routeur. Elle synchronise ainsi l'URL, l'onglet actif et la liste des onglets, y compris lors d'une navigation declenchee ailleurs dans l'application.

Le routeur est recupere de maniere paresseuse avec `Injector`. Cette precaution evite la boucle d'injection suivante, qui avait provoque l'ecran blanc :

`Router -> RouteReuseStrategy -> TabsService -> Router`

### `src/app/core/services/tab-route-reuse.strategy.ts`

Implementation de `RouteReuseStrategy` pour conserver les composants des pages ouvertes.

Pour chaque route principale du layout :

- `shouldDetach` decide si la page doit etre mise en attente ;
- `store` conserve son `DetachedRouteHandle` en memoire ;
- `shouldAttach` et `retrieve` rebranchent la page lorsque son onglet est active ;
- `shouldReuseRoute` compare la configuration et l'URL normalisee ;
- le listener `onTabClosed` supprime le handle associe a un onglet ferme.

Cette partie est ce qui permet de conserver, pendant la session, l'etat local d'une page : formulaire en cours, pagination, filtres ou donnees chargees dans le composant.

### `src/app/views/layout/tabs/tabs.component.ts`

Composant standalone de presentation de la barre d'onglets. Il expose les signals du service et gere :

- l'activation d'un onglet ;
- la fermeture d'un onglet ;
- l'activation au clavier avec `Enter` ou `Espace`.

### `src/app/views/layout/tabs/tabs.component.html`

Template accessible de la barre :

- role `tablist` pour le conteneur ;
- role `tab` pour chaque onglet ;
- `aria-selected` et `tabindex` synchronises avec l'onglet actif ;
- bouton de fermeture uniquement pour les onglets fermables ;
- libelle tronque proprement si le titre est long.

### `src/app/views/layout/tabs/tabs.component.scss`

Styles de la barre :

- onglets alignes horizontalement ;
- defilement horizontal si la liste depasse la largeur disponible ;
- style visuel distinct pour l'onglet actif ;
- bouton de fermeture compact ;
- adaptation des largeurs sur mobile ;
- focus visible pour la navigation au clavier.

## Fichiers modifies

### `src/app/app.config.ts`

Enregistre `TabRouteReuseStrategy` comme strategie de routes globale :

```ts
{ provide: RouteReuseStrategy, useClass: TabRouteReuseStrategy }
```

Sans ce provider, Angular detruirait le composant de la page a chaque changement de route et les consultations ne conserveraient pas leur etat.

### `src/app/views/layout/base/base.component.ts`

Le layout racine injecte `TabsService` et l'initialise avec l'URL courante dans `ngOnInit`.

Le composant conserve aussi la gestion existante du spinner pendant le chargement des routes lazy.

### `src/app/views/layout/base/base.component.html`

La structure du layout a ete separee en deux zones :

```html
<div class="workspace-tabs-row">
  <app-tabs />
</div>

<div class="page-content container-xxl workspace-page-content">
  <router-outlet></router-outlet>
</div>
```

La barre est donc au niveau du `page-wrapper`, et non a l'interieur du `container-xxl`. Elle occupe toute la largeur disponible a droite de la sidebar. Le contenu des pages reste, lui, contraint par `container-xxl`.

### `src/app/views/layout/sidebar/sidebar.component.ts`

Le menu lateral injecte `TabsService`. La methode `openMenuItem` intercepte le clic sur un lien interne et appelle :

```ts
this.tabsService.openTab(link, label);
```

Le comportement par defaut du lien est bloque afin d'eviter une navigation classique qui contournerait la gestion des onglets. Les liens externes continuent d'ouvrir leur cible selon le comportement existant.

### `src/app/views/layout/sidebar/sidebar.component.html`

Les liens internes du menu passent maintenant par `openMenuItem`, pour que les elements de premier, deuxieme et troisieme niveau puissent ouvrir ou reactiver un onglet.

### `src/styles/_vertical-wrapper.scss`

Ajoute les regles de layout suivantes :

- `.workspace-tabs-row` prend `width: 100%` et se place sous la navbar ;
- `.workspace-page-content` annule la marge superieure devenue inutile ;
- le contenu conserve ses paddings et son comportement responsive existants.

Cette modification corrige le probleme visuel ou les onglets semblaient limites par la meme ligne que le contenu centre.

## Ouvrir une consultation depuis une page metier

Depuis une page comme `Commandes`, il est possible de choisir explicitement le comportement.

### Ouvrir dans un nouvel onglet

```ts
import { inject } from '@angular/core';
import { TabsService } from 'src/app/core/services/tabs.service';

export class CommandesComponent {
  private readonly tabsService = inject(TabsService);

  consulterArticle(articleId: string): void {
    this.tabsService.openTab(
      `/articles/${articleId}`,
      `Article ${articleId}`
    );
  }
}
```

L'URL devient la cle de deduplication. Un second clic sur la meme fiche active l'onglet existant au lieu d'en creer un autre.

### Choisir avec `navigate`

```ts
this.tabsService.navigate('/articles/ART-10234', {
  title: 'ART-10234',
  openInTab: true,
  closable: true
});
```

Pour remplacer l'onglet courant :

```ts
this.tabsService.navigate('/articles', {
  title: 'Articles',
  openInTab: false
});
```

`openInTab` vaut `true` par defaut. `closable` vaut egalement `true` par defaut pour les nouveaux onglets. Si l'URL existe deja dans la liste, les options de creation ne sont pas reappliquees : l'onglet existant est simplement active.

## Persistance

Les metadonnees sont stockees dans `localStorage` sous la cle :

```text
nobleui.dynamic-tabs
```

La valeur conserve :

- la liste des onglets ;
- le titre de chaque onglet ;
- l'URL de chaque onglet ;
- le caractere fermable ;
- l'identifiant de l'onglet actif.

Au demarrage, le service restaure cette liste puis revient sur l'onglet actif precedent.

La persistance concerne les onglets et les URLs, pas les instances JavaScript des composants. Un rechargement complet recree donc les composants et leurs donnees ; l'etat local d'un formulaire ou d'un filtre n'est conserve que pendant la session en memoire.

## Regles de fermeture

- `Dashboard` ne peut pas etre ferme ;
- la fermeture d'un onglet inactif conserve l'onglet actif courant ;
- la fermeture de l'onglet actif active en priorite celui de gauche ;
- si aucun onglet n'est disponible a gauche, l'onglet de droite est choisi ;
- en dernier recours, `Dashboard` est active.

## Verification effectuee

La compilation de production a ete executee avec :

```bash
npm run build
```

Le build Angular aboutit sans erreur de compilation. Les avertissements Sass et la feuille de style du splash screen signales pendant le build sont independants de la fonctionnalite des onglets.

## Points d'attention pour les evolutions

- Les appels `routerLink` places dans d'autres zones de l'interface, par exemple certains raccourcis du navbar, ne passent pas automatiquement par `TabsService`. Pour leur appliquer le meme comportement, il faut intercepter leur clic et appeler `openTab` ou `navigate`.
- Pour les fiches, il est recommande d'inclure l'identifiant metier dans l'URL afin que chaque consultation ait une cle d'onglet distincte.
- Si l'etat d'un formulaire doit survivre a un rechargement complet, il faudra ajouter une persistance metier dediee. `RouteReuseStrategy` ne peut conserver cet etat qu'en memoire.
