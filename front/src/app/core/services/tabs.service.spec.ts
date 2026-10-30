import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TabsService } from './tabs.service';
import { DASHBOARD_TAB } from '../models/tab.model';

/** localStorage minimal : l'environnement de test n'en fournit pas. */
function stubLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
}

describe('TabsService — fermeture multiple', () => {
  let service: TabsService;

  /** Ouvre a, b, c, d (dans cet ordre) après le Tableau de bord. */
  function openFour(): void {
    ['/a', '/b', '/c', '/d'].forEach((url) => service.openTab(url, url.slice(1).toUpperCase()));
  }

  const ids = () => service.tabs().map((tab) => tab.id);

  beforeEach(() => {
    stubLocalStorage();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    service = TestBed.inject(TabsService);
    openFour();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('Tout fermer ne garde que le Tableau de bord, qui devient actif', async () => {
    await service.closeAllTabs();
    expect(ids()).toEqual([DASHBOARD_TAB.id]);
    expect(service.activeTabId()).toBe(DASHBOARD_TAB.id);
  });

  it('Fermer les autres garde le Tableau de bord et l\'onglet visé', async () => {
    await service.closeOtherTabs('/b');
    expect(ids()).toEqual([DASHBOARD_TAB.id, '/b']);
    expect(service.activeTabId()).toBe('/b');
  });

  it('Fermer à gauche ne ferme jamais le Tableau de bord', async () => {
    await service.closeTabsToLeft('/c');
    expect(ids()).toEqual([DASHBOARD_TAB.id, '/c', '/d']);
  });

  it('Fermer à droite garde l\'onglet actif s\'il n\'est pas fermé', async () => {
    service.activateTab('/a');
    await service.closeTabsToRight('/b');
    expect(ids()).toEqual([DASHBOARD_TAB.id, '/a', '/b']);
    expect(service.activeTabId()).toBe('/a');
  });

  it('Fermer à droite du Tableau de bord ferme tout le reste', async () => {
    await service.closeTabsToRight(DASHBOARD_TAB.id);
    expect(ids()).toEqual([DASHBOARD_TAB.id]);
  });

  it('Si l\'onglet actif est fermé, l\'onglet visé devient actif', async () => {
    // /d (dernier ouvert) est actif.
    await service.closeOtherTabs('/a');
    expect(service.activeTabId()).toBe('/a');
  });

  it('Les compteurs reflètent les onglets fermables (Tableau de bord exclu)', () => {
    expect(service.closableTabCounts('/b')).toEqual({ left: 1, right: 2, others: 3, all: 4 });
    expect(service.closableTabCounts(DASHBOARD_TAB.id)).toEqual({ left: 0, right: 4, others: 4, all: 4 });
  });

  it('Le Tableau de bord ne peut pas être fermé individuellement', async () => {
    await service.closeTab(DASHBOARD_TAB.id);
    expect(ids()[0]).toBe(DASHBOARD_TAB.id);
  });
});
