import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { ChevronDownIcon, XIcon, LucideAngularModule } from 'lucide-angular';
import { TabsService } from '../../../core/services/tabs.service';
import { menuIconForUrl } from '../sidebar/menu';

interface TabMenuAction {
  label: string;
  disabled: boolean;
  run: () => Promise<void>;
}

interface TabContextMenu {
  tabId: string;
  title: string;
  top: number;
  left: number;
  actions: TabMenuAction[];
}

/** Largeur du menu contextuel (doit correspondre au SCSS) pour le garder dans la fenêtre. */
const CONTEXT_MENU_WIDTH = 280;

/** Position de la liste des onglets ouverts (bouton flèche à gauche des onglets). */
interface TabsListPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-tabs',
  imports: [LucideAngularModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  readonly closeIcon = XIcon;
  readonly listIcon = ChevronDownIcon;
  readonly tabsService = inject(TabsService);
  readonly tabs = this.tabsService.tabs;
  readonly activeTabId = this.tabsService.activeTabId;
  readonly dirtyUrls = this.tabsService.dirtyUrls;
  readonly contextMenu = signal<TabContextMenu | null>(null);
  readonly tabsList = signal<TabsListPosition | null>(null);
  /** Icône du menu d'où provient chaque onglet (par id). */
  readonly tabIcons = computed(() => new Map(this.tabs().map(tab => [tab.id, menuIconForUrl(tab.url)])));

  /** Ouvre / ferme la liste de tous les onglets ouverts, sous le bouton. */
  toggleTabsList(event: MouseEvent): void {
    event.stopPropagation();
    this.contextMenu.set(null);
    if (this.tabsList()) {
      this.tabsList.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tabsList.set({ top: rect.bottom + 4, left: Math.max(8, rect.left) });
  }

  /** Option de la liste : bascule vers l'onglet et ferme la liste. */
  selectFromList(tabId: string): void {
    this.tabsList.set(null);
    this.activateTab(tabId);
  }

  /** Croix de la liste : ferme l'onglet, la liste reste ouverte. */
  closeFromList(event: MouseEvent, tabId: string): void {
    event.stopPropagation();
    void this.tabsService.closeTab(tabId);
  }

  activateTab(tabId: string): void {
    this.tabsService.activateTab(tabId);
  }

  closeTab(event: MouseEvent, tabId: string): void {
    event.stopPropagation();
    void this.tabsService.closeTab(tabId);
  }

  handleTabKeydown(event: KeyboardEvent, tabId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activateTab(tabId);
    }
  }

  /**
   * Menu contextuel (clic droit) d'un onglet, affiché sous l'onglet. Le
   * Tableau de bord n'est jamais fermé : TabsService ignore les onglets non
   * fermables, et les actions sans effet sont grisées.
   */
  openContextMenu(event: MouseEvent, tabId: string): void {
    event.preventDefault();
    this.tabsList.set(null);
    const tab = this.tabs().find(candidate => candidate.id === tabId);
    if (!tab) {
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const counts = this.tabsService.closableTabCounts(tabId);
    this.contextMenu.set({
      tabId,
      title: tab.title,
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - CONTEXT_MENU_WIDTH - 8)),
      actions: [
        { label: 'Tout fermer', disabled: counts.all === 0, run: () => this.tabsService.closeAllTabs() },
        { label: 'Fermer tous les onglets sauf celui-ci', disabled: counts.others === 0, run: () => this.tabsService.closeOtherTabs(tabId) },
        { label: 'Fermer tous les onglets à gauche', disabled: counts.left === 0, run: () => this.tabsService.closeTabsToLeft(tabId) },
        { label: 'Fermer tous les onglets à droite', disabled: counts.right === 0, run: () => this.tabsService.closeTabsToRight(tabId) },
      ],
    });
  }

  runAction(action: TabMenuAction): void {
    this.closeContextMenu();
    if (!action.disabled) {
      void action.run();
    }
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  @HostListener('window:resize')
  @HostListener('window:scroll')
  closeContextMenu(): void {
    if (this.contextMenu()) {
      this.contextMenu.set(null);
    }
    if (this.tabsList()) {
      this.tabsList.set(null);
    }
  }

  /** Un clic droit ailleurs que sur un onglet ferme le menu ouvert. */
  @HostListener('document:contextmenu', ['$event'])
  onDocumentContextMenu(event: MouseEvent): void {
    if (!(event.target as HTMLElement | null)?.closest('.workspace-tab')) {
      this.closeContextMenu();
    }
  }
}
