import { ComponentRef, Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { tabUrlFromSnapshot } from '../models/tab.model';
import { TabsService } from './tabs.service';

@Injectable()
export class TabRouteReuseStrategy implements RouteReuseStrategy {
  private readonly tabsService = inject(TabsService);
  private readonly storedHandles = new Map<string, DetachedRouteHandle>();
  private readonly removeClosedTabListener: () => void;

  constructor() {
    // Onglet fermé : la page conservée (détachée) est détruite pour de bon.
    this.removeClosedTabListener = this.tabsService.onTabClosed(tabId => {
      destroyHandle(this.storedHandles.get(tabId));
      this.storedHandles.delete(tabId);
    });
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.isTabBoundary(route) && this.tabsService.hasTab(tabUrlFromSnapshot(route));
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const url = tabUrlFromSnapshot(route);
    if (!handle) {
      this.storedHandles.delete(url);
      return;
    }
    this.storedHandles.set(url, handle);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.isTabBoundary(route) && this.storedHandles.has(tabUrlFromSnapshot(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.storedHandles.get(tabUrlFromSnapshot(route)) ?? null;
  }

  /**
   * Le layout et les routes de module (sans composant) sont réutilisés ; la
   * page d'un onglet ne l'est que pour la même URL (sinon elle est détachée
   * puis conservée, ex. /clients/196 → /clients/200).
   */
  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    if (future.routeConfig !== current.routeConfig) {
      return false;
    }
    return !this.isTabBoundary(future) || tabUrlFromSnapshot(future) === tabUrlFromSnapshot(current);
  }

  ngOnDestroy(): void {
    this.removeClosedTabListener();
    this.storedHandles.forEach(handle => destroyHandle(handle));
    this.storedHandles.clear();
  }

  /**
   * Page d'un onglet = première route avec composant sous le layout (route ''
   * de premier niveau). Les routes de module (loadChildren) n'ont pas de
   * composant : le routeur Angular ne peut détacher que des routes à composant.
   */
  private isTabBoundary(route: ActivatedRouteSnapshot): boolean {
    const path = route.pathFromRoot;
    const layout = path[1];
    if (!hasComponent(route) || path.length < 3 || layout?.routeConfig?.path !== '') {
      return false;
    }
    return path.slice(2, -1).every(ancestor => !hasComponent(ancestor));
  }
}

function hasComponent(route: ActivatedRouteSnapshot): boolean {
  return Boolean(route.routeConfig?.component || route.routeConfig?.loadComponent);
}

/** Détruit le composant d'une page détachée (structure interne du routeur Angular). */
function destroyHandle(handle: DetachedRouteHandle | undefined): void {
  (handle as { componentRef?: ComponentRef<unknown> } | undefined)?.componentRef?.destroy();
}
