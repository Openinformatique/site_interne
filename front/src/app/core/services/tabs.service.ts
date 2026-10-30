import { Injectable, inject, Injector, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AppTab, DASHBOARD_TAB, normalizeTabUrl } from '../models/tab.model';

export interface TabNavigationOptions {
  title?: string;
  openInTab?: boolean;
  closable?: boolean;
}

interface StoredTab {
  title: string;
  url: string;
  closable: boolean;
}

interface StoredTabsState {
  tabs: StoredTab[];
  activeTabId: string;
}

@Injectable({ providedIn: 'root' })
export class TabsService {
  private static readonly storageKey = 'nobleui.dynamic-tabs';

  private readonly injector = inject(Injector);
  private readonly tabsState = signal<AppTab[]>([{ ...DASHBOARD_TAB }]);
  private readonly activeTabIdState = signal(DASHBOARD_TAB.id);
  private readonly routerEventsSubscription?: Subscription;

  readonly tabs = this.tabsState.asReadonly();
  readonly activeTabId = this.activeTabIdState.asReadonly();
  readonly tabClosed = new EventTarget();

  private restoredActiveTabId: string | null = null;
  private initialized = false;
  private routerSubscription: Subscription | undefined;
  private readonly closedTabListeners = new Set<(tabId: string) => void>();
  /** Onglets (par URL) qui ont signalé des modifications non enregistrées, via `registerDirtyCheck`. */
  private readonly dirtyChecks = new Map<string, () => boolean>();

  private get router(): Router {
    return this.injector.get(Router);
  }

  constructor() {
    this.restoreState();
  }

  initialize(currentUrl: string): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => this.handleNavigation((event as NavigationEnd).urlAfterRedirects));

    this.handleInitialRoute(currentUrl);
  }

  openTab(url: string, title?: string, closable = true): void {
    const normalizedUrl = normalizeTabUrl(url);
    const existingTab = this.findByUrl(normalizedUrl);

    if (existingTab) {
      this.activateTab(existingTab.id);
      return;
    }

    const tab = this.createTab(normalizedUrl, title, closable);
    this.tabsState.update(tabs => [...tabs, tab]);
    this.setActiveTab(tab.id);
    this.persistState();
    this.navigateToTab(tab);
  }

  navigate(url: string, options: TabNavigationOptions = {}): void {
    const normalizedUrl = normalizeTabUrl(url);
    const existingTab = this.findByUrl(normalizedUrl);

    if (existingTab) {
      this.activateTab(existingTab.id);
      return;
    }

    if (options.openInTab !== false) {
      this.openTab(normalizedUrl, options.title, options.closable ?? true);
      return;
    }

    const activeTab = this.findById(this.activeTabIdState());
    if (!activeTab || activeTab.id === DASHBOARD_TAB.id) {
      void this.router.navigateByUrl(normalizedUrl);
      return;
    }

    this.replaceTab(activeTab.id, this.createTab(normalizedUrl, options.title, options.closable ?? true));
    void this.router.navigateByUrl(normalizedUrl);
  }

  activateTab(tabId: string): void {
    const tab = this.findById(tabId);
    if (!tab) {
      return;
    }

    this.setActiveTab(tab.id);
    this.persistState();
    this.navigateToTab(tab);
  }

  async closeTab(tabId: string): Promise<void> {
    const tabs = this.tabsState();
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const tab = tabs[tabIndex];

    if (!tab || !tab.closable) {
      return;
    }

    if (this.isTabDirty(tab) && !(await this.confirmDiscardChanges())) {
      return;
    }

    const wasActive = this.activeTabIdState() === tab.id;
    const fallbackTab = tabs[tabIndex - 1] ?? tabs[tabIndex + 1] ?? DASHBOARD_TAB;
    this.tabsState.set(tabs.filter(currentTab => currentTab.id !== tab.id));
    this.dirtyChecks.delete(tab.url);
    this.notifyTabClosed(tab.id);

    if (wasActive) {
      this.setActiveTab(fallbackTab.id);
      this.persistState();
      this.navigateToTab(fallbackTab);
      return;
    }

    this.persistState();
  }

  /** Ferme tous les onglets fermables ; le Tableau de bord devient l'onglet actif. */
  async closeAllTabs(): Promise<void> {
    await this.closeTabs(this.tabsState(), DASHBOARD_TAB.id, true);
  }

  /** Ferme tous les onglets sauf `tabId` (et le Tableau de bord, jamais fermable). */
  async closeOtherTabs(tabId: string): Promise<void> {
    await this.closeTabs(this.tabsState().filter(tab => tab.id !== tabId), tabId);
  }

  /** Ferme les onglets situés à gauche de `tabId`. */
  async closeTabsToLeft(tabId: string): Promise<void> {
    const tabs = this.tabsState();
    const index = tabs.findIndex(tab => tab.id === tabId);
    if (index < 0) {
      return;
    }
    await this.closeTabs(tabs.slice(0, index), tabId);
  }

  /** Ferme les onglets situés à droite de `tabId`. */
  async closeTabsToRight(tabId: string): Promise<void> {
    const tabs = this.tabsState();
    const index = tabs.findIndex(tab => tab.id === tabId);
    if (index < 0) {
      return;
    }
    await this.closeTabs(tabs.slice(index + 1), tabId);
  }

  /** Nombre d'onglets fermables respectivement à gauche, à droite et autour de `tabId`. */
  closableTabCounts(tabId: string): { left: number; right: number; others: number; all: number } {
    const tabs = this.tabsState();
    const index = tabs.findIndex(tab => tab.id === tabId);
    const closable = (list: AppTab[]) => list.filter(tab => tab.closable).length;
    return {
      left: index < 0 ? 0 : closable(tabs.slice(0, index)),
      right: index < 0 ? 0 : closable(tabs.slice(index + 1)),
      others: closable(tabs.filter(tab => tab.id !== tabId)),
      all: closable(tabs),
    };
  }

  /**
   * Ferme les onglets `candidates` (les onglets non fermables, dont le Tableau
   * de bord, sont toujours ignorés), après une seule confirmation si l'un
   * d'eux a des modifications non enregistrées. Si l'onglet actif est fermé,
   * `focusTabId` devient l'onglet actif ; `alwaysFocus` l'active dans tous
   * les cas.
   */
  private async closeTabs(candidates: AppTab[], focusTabId: string, alwaysFocus = false): Promise<void> {
    const toClose = candidates.filter(tab => tab.closable);
    if (toClose.length === 0) {
      return;
    }

    if (toClose.some(tab => this.isTabDirty(tab)) && !(await this.confirmDiscardChanges())) {
      return;
    }

    const closedIds = new Set(toClose.map(tab => tab.id));
    toClose.forEach(tab => {
      this.dirtyChecks.delete(tab.url);
      this.notifyTabClosed(tab.id);
    });
    this.tabsState.update(tabs => tabs.filter(tab => !closedIds.has(tab.id)));

    if (alwaysFocus || closedIds.has(this.activeTabIdState())) {
      const focusTab = this.findById(focusTabId) ?? DASHBOARD_TAB;
      this.setActiveTab(focusTab.id);
      this.persistState();
      this.navigateToTab(focusTab);
      return;
    }

    this.persistState();
  }

  /**
   * Permet à la page ouverte dans l'onglet courant de signaler qu'elle a des
   * modifications non enregistrées (ex. `registerDirtyCheck(() => this.form.dirty)`).
   * Retourne une fonction à appeler pour se désinscrire (ex. dans `ngOnDestroy`).
   */
  registerDirtyCheck(check: () => boolean): () => void {
    const url = normalizeTabUrl(this.router.url);
    this.dirtyChecks.set(url, check);
    return () => {
      if (this.dirtyChecks.get(url) === check) {
        this.dirtyChecks.delete(url);
      }
    };
  }

  private isTabDirty(tab: AppTab): boolean {
    return this.dirtyChecks.get(tab.url)?.() ?? false;
  }

  private async confirmDiscardChanges(): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Modifications non enregistrées',
      text: 'Vous allez perdre vos modifications non enregistrées. Voulez-vous continuer ?',
      showCancelButton: true,
      confirmButtonText: 'Continuer sans enregistrer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  hasTab(url: string): boolean {
    return Boolean(this.findByUrl(normalizeTabUrl(url)));
  }

  /**
   * Renomme l'onglet correspondant à une URL (ex. une fiche qui affiche son
   * numéro de document une fois chargé, à la place du `:id` de l'URL).
   */
  setTabTitle(url: string, title: string): void {
    const normalizedUrl = normalizeTabUrl(url);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    let changed = false;
    this.tabsState.update(tabs =>
      tabs.map(tab => {
        if (tab.url === normalizedUrl && tab.title !== trimmedTitle) {
          changed = true;
          return { ...tab, title: trimmedTitle };
        }
        return tab;
      }),
    );

    if (changed) {
      this.persistState();
    }
  }

  onTabClosed(listener: (tabId: string) => void): () => void {
    this.closedTabListeners.add(listener);
    return () => this.closedTabListeners.delete(listener);
  }

  private handleInitialRoute(currentUrl: string): void {
    const normalizedUrl = normalizeTabUrl(currentUrl);
    const currentTab = this.findByUrl(normalizedUrl);

    if (!currentTab && normalizedUrl !== DASHBOARD_TAB.url) {
      this.tabsState.update(tabs => [...tabs, this.createTab(normalizedUrl)]);
    }

    const restoredTab = this.restoredActiveTabId ? this.findById(this.restoredActiveTabId) : undefined;
    this.restoredActiveTabId = null;

    if (restoredTab && restoredTab.url !== normalizedUrl) {
      this.setActiveTab(restoredTab.id);
      this.persistState();
      this.navigateToTab(restoredTab);
      return;
    }

    const activeTab = this.findByUrl(normalizedUrl) ?? this.findById(DASHBOARD_TAB.id);
    this.setActiveTab(activeTab?.id ?? DASHBOARD_TAB.id);
    this.persistState();
  }

  private handleNavigation(url: string): void {
    const normalizedUrl = normalizeTabUrl(url);
    const existingTab = this.findByUrl(normalizedUrl);

    if (existingTab) {
      this.setActiveTab(existingTab.id);
      this.persistState();
      return;
    }

    const activeTab = this.findById(this.activeTabIdState());
    if (activeTab && activeTab.id !== DASHBOARD_TAB.id) {
      this.replaceTab(activeTab.id, this.createTab(normalizedUrl));
      return;
    }

    const tab = this.createTab(normalizedUrl);
    this.tabsState.update(tabs => [...tabs, tab]);
    this.setActiveTab(tab.id);
    this.persistState();
  }

  private replaceTab(tabId: string, replacement: AppTab): void {
    this.tabsState.update(tabs => tabs.map(tab => tab.id === tabId ? replacement : tab));
    this.dirtyChecks.delete(tabId);
    this.notifyTabClosed(tabId);
    this.setActiveTab(replacement.id);
    this.persistState();
  }

  private createTab(url: string, title?: string, closable = true): AppTab {
    const normalizedUrl = normalizeTabUrl(url);

    if (normalizedUrl === DASHBOARD_TAB.url) {
      return { ...DASHBOARD_TAB };
    }

    return {
      id: normalizedUrl,
      title: title?.trim() || this.titleFromUrl(normalizedUrl),
      url: normalizedUrl,
      closable
    };
  }

  private findById(tabId: string): AppTab | undefined {
    return this.tabsState().find(tab => tab.id === tabId);
  }

  private findByUrl(url: string): AppTab | undefined {
    return this.tabsState().find(tab => tab.url === url);
  }

  private setActiveTab(tabId: string): void {
    this.activeTabIdState.set(tabId);
  }

  private navigateToTab(tab: AppTab): void {
    if (normalizeTabUrl(this.router.url) !== tab.url) {
      void this.router.navigateByUrl(tab.url);
    }
  }

  private titleFromUrl(url: string): string {
    const path = url.split(/[?#]/)[0];
    const segment = path.split('/').filter(Boolean).pop() ?? 'Page';
    const readableTitle = decodeURIComponent(segment).replace(/[-_]+/g, ' ');
    return readableTitle.charAt(0).toUpperCase() + readableTitle.slice(1);
  }

  private restoreState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const rawState = window.localStorage.getItem(TabsService.storageKey);
      if (!rawState) {
        return;
      }

      const parsedState = JSON.parse(rawState) as Partial<StoredTabsState>;
      if (!Array.isArray(parsedState.tabs)) {
        return;
      }

      const restoredTabs = parsedState.tabs
        .filter(tab => this.isStoredTab(tab))
        .map(tab => this.createTab(tab.url, tab.title, tab.closable))
        .filter(tab => tab.id !== DASHBOARD_TAB.id);

      this.tabsState.set([{ ...DASHBOARD_TAB }, ...this.uniqueTabs(restoredTabs)]);

      if (typeof parsedState.activeTabId === 'string' && this.findById(parsedState.activeTabId)) {
        this.restoredActiveTabId = parsedState.activeTabId;
        this.setActiveTab(parsedState.activeTabId);
      }
    } catch {
      window.localStorage.removeItem(TabsService.storageKey);
    }
  }

  private isStoredTab(tab: StoredTab): boolean {
    return Boolean(
      tab &&
      typeof tab.title === 'string' &&
      typeof tab.url === 'string' &&
      typeof tab.closable === 'boolean'
    );
  }

  private uniqueTabs(tabs: AppTab[]): AppTab[] {
    return tabs.filter((tab, index, allTabs) => allTabs.findIndex(candidate => candidate.id === tab.id) === index);
  }

  private persistState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const state: StoredTabsState = {
      tabs: this.tabsState().map(tab => ({
        title: tab.title,
        url: tab.url,
        closable: tab.closable
      })),
      activeTabId: this.activeTabIdState()
    };

    window.localStorage.setItem(TabsService.storageKey, JSON.stringify(state));
  }

  private notifyTabClosed(tabId: string): void {
    this.closedTabListeners.forEach(listener => listener(tabId));
  }
}