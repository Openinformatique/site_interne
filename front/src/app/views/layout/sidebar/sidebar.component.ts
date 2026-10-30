import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnInit, Renderer2, signal, ViewChild, DOCUMENT } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { NgScrollbar } from 'ngx-scrollbar';
import MetisMenu from 'metismenujs';

import { MENU } from './menu';
import { MenuItem } from './menu.model';

import { ChevronDownIcon, HashIcon, LucideAngularModule, MenuIcon, PanelLeftCloseIcon } from 'lucide-angular';
import { TabsService } from '../../../core/services/tabs.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { UiAccessService } from '../../../core/ui-access/ui-access.service';
import { UserRole } from '../../../core/models/enums';

@Component({
    selector: 'app-sidebar',
    imports: [
        RouterLink,
        NgScrollbar,
        LucideAngularModule,
    ],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, AfterViewInit {

  readonly hashIcon = HashIcon;
  readonly chevronDownIcon = ChevronDownIcon;
  readonly menuIcon = MenuIcon;
  readonly collapseIcon = PanelLeftCloseIcon;

  /** Menu replié (classe `sidebar-folded` du body, posée ici ou par la largeur d'écran). */
  readonly folded = signal(false);

  @ViewChild('sidebarToggler') sidebarToggler: ElementRef;

  menuItems: MenuItem[] = [];
  @ViewChild('sidebarMenu') sidebarMenu: ElementRef;

  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  private router = inject(Router);
  private tabsService = inject(TabsService);
  private authStore = inject(AuthStore);
  private uiAccessService = inject(UiAccessService);
  private destroyRef = inject(DestroyRef);

  constructor() { 
    this.router.events.forEach((event) => {
      if (event instanceof NavigationEnd) {

        /**
         * Activating the current active item dropdown
         */
        this._activateMenuDropdown();

        /**
         * closing the sidebar
         */
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && 
            window.matchMedia('(max-width: 991px)').matches) {
          this.document.body.classList.remove('sidebar-open');
        }

      }
    });
  }

  ngOnInit(): void {
    // Icône du bouton du menu : suit la classe du body, quel que soit qui la change.
    const syncFolded = () => this.folded.set(this.document.body.classList.contains('sidebar-folded'));
    syncFolded();
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(syncFolded);
      observer.observe(this.document.body, { attributes: true, attributeFilter: ['class'] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    }

    this.menuItems = this.filterByRole(MENU, this.authStore.currentUser()?.role);

    /**
     * Sidebar-folded on desktop (min-width:992px and max-width: 1199px)
     */
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const desktopMedium = window.matchMedia('(min-width:992px) and (max-width: 1199px)');
      desktopMedium.addEventListener('change', () => {
        this.iconSidebar;
      });
      this.iconSidebar(desktopMedium);
    }
  }

  ngAfterViewInit() {
    // activate menu items
    new MetisMenu(this.sidebarMenu.nativeElement);
    
    this._activateMenuDropdown();
  }

  /**
   * Toggle the sidebar when the hamburger button is clicked
   */
  toggleSidebar(e: Event) {
    this.sidebarToggler.nativeElement.classList.toggle('active');
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(min-width: 992px)').matches) {
        e.preventDefault();
        this.document.body.classList.toggle('sidebar-folded');
      } else if (window.matchMedia('(max-width: 991px)').matches) {
        e.preventDefault();
        this.document.body.classList.toggle('sidebar-open');
      }
    }
  }


  /**
   * Open the sidebar on hover when it is in a folded state
   */
  operSidebarFolded() {
    if (this.document.body.classList.contains('sidebar-folded')){
      this.document.body.classList.add("open-sidebar-folded");
    }
  }


  /**
   * Fold sidebar after mouse leave (in folded state)
   */
  closeSidebarFolded() {
    if (this.document.body.classList.contains('sidebar-folded')){
      this.document.body.classList.remove("open-sidebar-folded");
    }
  }

  /**
   * Sidebar folded on desktop screens with a width between 992px and 1199px
   */
  iconSidebar(mq: MediaQueryList) {
    if (mq.matches) {
      this.document.body.classList.add('sidebar-folded');
    } else {
      this.document.body.classList.remove('sidebar-folded');
    }
  }


  /**
   * Returns true or false depending on whether the given menu item has a child
   * @param item menuItem
   */
  hasItems(item: MenuItem) {
    return item.subItems !== undefined ? item.subItems.length > 0 : false;
  }

  openMenuItem(event: Event, link?: string, label?: string): void {
    if (!link) {
      return;
    }

    event.preventDefault();
    this.tabsService.openTab(link, label);
  }

  /** Entrée de premier niveau sans sous-option : ouvre sa page (et déplie le menu s'il est replié). */
  onTopLevelLinkClick(event: Event, item: MenuItem): void {
    this.unfoldSidebarIfFolded();
    this.openMenuItem(event, item.link, item.label);
  }

  /**
   * Entrée à sous-options. Menu déplié : MetisMenu ouvre/ferme le groupe.
   * Menu replié (y compris survolé) : ouvre directement la première
   * sous-option et déplie le menu. `stopImmediatePropagation` empêche
   * MetisMenu, dont l'écouteur est posé après celui d'Angular, de basculer le
   * groupe : c'est la navigation (_activateMenuDropdown) qui l'ouvre.
   */
  onGroupClick(event: Event, item: MenuItem): void {
    if (!this.document.body.classList.contains('sidebar-folded')) {
      return;
    }

    const target = this.firstLeaf(item);
    if (!target?.link) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.unfoldSidebarIfFolded();
    this.tabsService.openTab(target.link, target.label);
  }

  private firstLeaf(item: MenuItem): MenuItem | undefined {
    const first = item.subItems?.[0];
    return first && this.hasItems(first) ? this.firstLeaf(first) : first;
  }

  private unfoldSidebarIfFolded(): void {
    const body = this.document.body;
    if (!body.classList.contains('sidebar-folded')) {
      return;
    }
    body.classList.remove('sidebar-folded', 'open-sidebar-folded');
    this.sidebarToggler?.nativeElement.classList.remove('active');
  }


  /**
   * Reset the menus, then highlight the currently active menu item
   */
  _activateMenuDropdown() {
    this.resetMenuItems();
    this.activateMenuItems();
  }


  /**
   * Resets the menus
   */
  resetMenuItems() {

    const links = document.getElementsByClassName('nav-link-ref');
    
    for (let i = 0; i < links.length; i++) {
      const menuItemEl = links[i];
      menuItemEl.classList.remove('mm-active');
      const parentEl = menuItemEl.parentElement;

      if (parentEl) {
          parentEl.classList.remove('mm-active');
          const parent2El = parentEl.parentElement;
          
          if (parent2El) {
            parent2El.classList.remove('mm-show');
          }

          const parent3El = parent2El?.parentElement;
          if (parent3El) {
            parent3El.classList.remove('mm-active');

            if (parent3El.classList.contains('side-nav-item')) {
              const firstAnchor = parent3El.querySelector('.side-nav-link-a-ref');

              if (firstAnchor) {
                firstAnchor.classList.remove('mm-active');
              }
            }

            const parent4El = parent3El.parentElement;
            if (parent4El) {
              parent4El.classList.remove('mm-show');

              const parent5El = parent4El.parentElement;
              if (parent5El) {
                parent5El.classList.remove('mm-active');
              }
            }
          }
      }
    }
  };


  /**
   * Toggles the state of the menu items
   */
  activateMenuItems() {

    const links: any = document.getElementsByClassName('nav-link-ref');

    let menuItemEl = null;
    
    for (let i = 0; i < links.length; i++) {
      // tslint:disable-next-line: no-string-literal
        if (window.location.pathname === links[i]['pathname']) {
          
            menuItemEl = links[i];
            
            break;
        }
    }

    if (menuItemEl) {
        menuItemEl.classList.add('mm-active');
        const parentEl = menuItemEl.parentElement;

        if (parentEl) {
            parentEl.classList.add('mm-active');

            const parent2El = parentEl.parentElement;
            if (parent2El) {
                parent2El.classList.add('mm-show');
            }

            const parent3El = parent2El.parentElement;
            if (parent3El) {
                parent3El.classList.add('mm-active');

                if (parent3El.classList.contains('side-nav-item')) {
                    const firstAnchor = parent3El.querySelector('.side-nav-link-a-ref');

                    if (firstAnchor) {
                        firstAnchor.classList.add('mm-active');
                    }
                }

                const parent4El = parent3El.parentElement;
                if (parent4El) {
                    parent4El.classList.add('mm-show');

                    const parent5El = parent4El.parentElement;
                    if (parent5El) {
                        parent5El.classList.add('mm-active');
                    }
                }
            }
        }
    }
  };

   /** Ne garde que les entrées autorisées pour le rôle (récursif sur les sous-menus). */
  private filterByRole(items: MenuItem[], role?: UserRole): MenuItem[] {
    if (!role) {
      return [];
    }
    const result: MenuItem[] = [];
    for (const item of items) {
      if (item.isTitle) {
        result.push(item);
        continue;
      }
      if (item.roles && item.roles.length > 0 && !item.roles.includes(role)) {
        continue;
      }
      if (item.uiAccessKey && !this.uiAccessService.isVisible(item.uiAccessKey)) {
        continue;
      }
      if (item.subItems?.length) {
        const sub = this.filterByRole(item.subItems, role);
        if (sub.length === 0) {
          continue;
        }
        result.push({ ...item, subItems: sub });
      } else {
        result.push(item);
      }
    }
    return this.dropEmptyTitles(result);
  }

  /** Retire un titre de section qui n'est plus suivi d'aucune entrée. */
  private dropEmptyTitles(items: MenuItem[]): MenuItem[] {
    return items.filter((item, index) => {
      if (!item.isTitle) {
        return true;
      }
      const next = items[index + 1];
      return next !== undefined && !next.isTitle;
    });
  }


}
