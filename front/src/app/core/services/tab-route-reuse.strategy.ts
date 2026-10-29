import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { tabUrlFromSnapshot } from '../models/tab.model';
import { TabsService } from './tabs.service';

@Injectable()
export class TabRouteReuseStrategy implements RouteReuseStrategy {
  private readonly tabsService = inject(TabsService);
  private readonly storedHandles = new Map<string, DetachedRouteHandle>();
  private readonly removeClosedTabListener: () => void;

  constructor() {
    this.removeClosedTabListener = this.tabsService.onTabClosed(tabId => {
      this.storedHandles.delete(tabId);
    });
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.isTabBoundary(route) && this.tabsService.hasTab(tabUrlFromSnapshot(route));
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    this.storedHandles.set(tabUrlFromSnapshot(route), handle);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.isTabBoundary(route) && this.storedHandles.has(tabUrlFromSnapshot(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.storedHandles.get(tabUrlFromSnapshot(route)) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === current.routeConfig && tabUrlFromSnapshot(future) === tabUrlFromSnapshot(current);
  }

  ngOnDestroy(): void {
    this.removeClosedTabListener();
    this.storedHandles.clear();
  }

  private isTabBoundary(route: ActivatedRouteSnapshot): boolean {
    const parent = route.parent;
    return parent?.routeConfig?.path === '' && parent.parent?.routeConfig === null;
  }
}