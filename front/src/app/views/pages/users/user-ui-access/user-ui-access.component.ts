import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AlertTriangleIcon, ArrowLeft, ArrowLeftRightIcon, Boxes, Briefcase, Check, ChevronDown, ChevronUp,
  ContactIcon, CreditCardIcon, Eye, EyeOff, FileTextIcon, ImageIcon, LayersIcon, LayoutDashboardIcon,
  LayoutGrid, LayoutTemplateIcon, LucideAngularModule, LucideIconData, PackageIcon, ReceiptIcon,
  RotateCcw, Save, ScrollTextIcon, Search, Shield, ShoppingCartIcon, TagIcon, UsersIcon, WarehouseIcon,
} from 'lucide-angular';

import { UsersApi } from '../../../../core/api/users-api.service';
import { UiAccessApi } from '../../../../core/api/ui-access-api.service';
import { UiAccessRegistryService } from '../../../../core/ui-access/ui-access.registry';
import { AuthStore } from '../../../../core/auth/auth.store';
import { TabsService } from '../../../../core/services/tabs.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { User } from '../../../../core/models/user.model';
import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { USER_ROLE_LABELS, UserRole } from '../../../../core/models/enums';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

interface ModuleGroup {
  moduleKey: string;
  moduleLabel: string;
  pages: PageUiAccessManifest[];
}

/** Icône par module (navigation des catégories). */
const MODULE_ICONS: Record<string, LucideIconData> = {
  general: LayoutGrid,
  commercial: Briefcase,
  catalogue: PackageIcon,
  stock: Boxes,
  admin: Shield,
};

/** Icône par page (cartes de la zone principale) — reprend les icônes du menu quand elles existent. */
const PAGE_ICONS: Record<string, LucideIconData> = {
  dashboard: LayoutDashboardIcon,
  contacts: ContactIcon,
  quotes: FileTextIcon,
  orders: ShoppingCartIcon,
  invoices: ReceiptIcon,
  payments: CreditCardIcon,
  'payments-overdue': AlertTriangleIcon,
  products: PackageIcon,
  categories: TagIcon,
  stock: WarehouseIcon,
  'stock-movements': ArrowLeftRightIcon,
  warehouses: WarehouseIcon,
  users: UsersIcon,
  'document-templates': LayoutTemplateIcon,
  'document-templates-resources': ImageIcon,
  'document-templates-company-settings': ScrollTextIcon,
  'audit-logs': ScrollTextIcon,
};
const DEFAULT_PAGE_ICON: LucideIconData = FileTextIcon;

/** Panneau d'admin : configure les éléments d'UI visibles/masqués pour un utilisateur donné. */
@Component({
  selector: 'app-user-ui-access',
  imports: [ReactiveFormsModule, LucideAngularModule, PageLoaderComponent, EmptyStateComponent, DateFrPipe],
  templateUrl: './user-ui-access.component.html',
  styleUrl: './user-ui-access.component.scss',
})
export class UserUiAccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersApi = inject(UsersApi);
  private uiAccessApi = inject(UiAccessApi);
  private registry = inject(UiAccessRegistryService);
  private authStore = inject(AuthStore);
  private tabsService = inject(TabsService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  readonly ArrowLeft = ArrowLeft;
  readonly Check = Check;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly LayersIcon = LayersIcon;
  readonly LayoutGrid = LayoutGrid;
  readonly RotateCcw = RotateCcw;
  readonly Save = Save;
  readonly Search = Search;

  readonly roleLabels = USER_ROLE_LABELS;
  readonly isAdmin = this.authStore.isAdmin;

  private readonly userId = this.route.snapshot.paramMap.get('id')!;
  private readonly manifests = this.registry.getAll();

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly notFound = signal(false);

  /** Clés actuellement masquées dans le formulaire (pas nécessairement enregistrées). */
  readonly formHidden = signal<Set<string>>(new Set());
  private savedHidden = new Set<string>();

  readonly expandedPages = signal<Set<string>>(new Set(this.manifests.map((m) => m.pageKey)));
  readonly selectedModuleKey = signal<string | null>(null);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchTerm = signal('');

  /** N'est connu qu'après un enregistrement de cette session (l'API ne renvoie pas d'historique à la lecture). */
  readonly lastSavedAt = signal<string | null>(null);
  readonly lastSavedBy = signal<string | null>(null);

  readonly dirty = computed(() => {
    const current = [...this.formHidden()].sort().join('|');
    const saved = [...this.savedHidden].sort().join('|');
    return current !== saved;
  });

  /** Tous les modules (non filtrés par recherche) — alimente la navigation de gauche. */
  readonly baseGroups = computed<ModuleGroup[]>(() => this.groupByModule(this.manifests));

  /** Modules affichés dans la zone principale : filtrés par recherche + catégorie sélectionnée. */
  readonly groups = computed<ModuleGroup[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selected = this.selectedModuleKey();
    const matches = (manifest: PageUiAccessManifest) =>
      (!selected || manifest.moduleKey === selected) &&
      (!term ||
        manifest.pageLabel.toLowerCase().includes(term) ||
        manifest.moduleLabel.toLowerCase().includes(term) ||
        manifest.elements.some((element) => element.label.toLowerCase().includes(term)));

    return this.groupByModule(this.manifests.filter(matches));
  });

  private readonly allKeys = this.registry.getAllKeys();
  readonly totalModulesCount = computed(() => this.baseGroups().length);
  readonly totalElementsCount = computed(() => this.allKeys.length);
  readonly visibleElementsCount = computed(
    () => this.allKeys.filter((key) => this.isChecked(key)).length,
  );

  constructor() {
    this.searchControl.valueChanges.subscribe((value) => this.searchTerm.set(value));
    inject(DestroyRef).onDestroy(this.tabsService.registerDirtyCheck(() => this.dirty()));
  }

  ngOnInit(): void {
    forkJoin([this.usersApi.getById(this.userId), this.uiAccessApi.get(this.userId)]).subscribe({
      next: ([user, access]) => {
        this.user.set(user);
        this.savedHidden = new Set(access.hiddenElements);
        this.formHidden.set(new Set(access.hiddenElements));
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInputRef?.nativeElement.focus();
    }
  }

  private groupByModule(manifests: PageUiAccessManifest[]): ModuleGroup[] {
    const byModule = new Map<string, ModuleGroup>();
    for (const manifest of manifests) {
      const group = byModule.get(manifest.moduleKey);
      if (group) {
        group.pages.push(manifest);
      } else {
        byModule.set(manifest.moduleKey, {
          moduleKey: manifest.moduleKey,
          moduleLabel: manifest.moduleLabel,
          pages: [manifest],
        });
      }
    }
    return [...byModule.values()];
  }

  moduleIcon(moduleKey: string): LucideIconData {
    return MODULE_ICONS[moduleKey] ?? LayoutGrid;
  }

  pageIcon(pageKey: string): LucideIconData {
    return PAGE_ICONS[pageKey] ?? DEFAULT_PAGE_ICON;
  }

  /** Nombre de clés masquées appartenant à ce module (badge de la navigation). */
  hiddenCountForModule(moduleKey: string): number {
    const hidden = this.formHidden();
    let count = 0;
    for (const manifest of this.manifests) {
      if (manifest.moduleKey !== moduleKey) continue;
      if (hidden.has(manifest.pageAccess.key)) count++;
      for (const element of manifest.elements) {
        if (hidden.has(element.key)) count++;
      }
    }
    return count;
  }

  selectModule(moduleKey: string): void {
    this.selectedModuleKey.update((current) => (current === moduleKey ? null : moduleKey));
  }

  isChecked(key: string): boolean {
    return !this.formHidden().has(key);
  }

  pageChecked(manifest: PageUiAccessManifest): boolean {
    return this.isChecked(manifest.pageAccess.key);
  }

  isExpanded(pageKey: string): boolean {
    return this.expandedPages().has(pageKey);
  }

  toggleExpand(pageKey: string): void {
    this.expandedPages.update((set) => {
      const next = new Set(set);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });
  }

  toggle(key: string): void {
    if (!this.isAdmin()) return;
    this.formHidden.update((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  toggleAll(visible: boolean): void {
    if (!this.isAdmin()) return;
    if (visible) {
      this.formHidden.set(new Set());
      return;
    }
    this.formHidden.set(new Set(this.registry.getAllKeys()));
  }

  hideAllForPage(manifest: PageUiAccessManifest): void {
    if (!this.isAdmin()) return;
    const keys = [manifest.pageAccess.key, ...manifest.elements.map((element) => element.key)];
    this.formHidden.update((set) => {
      const next = new Set(set);
      keys.forEach((key) => next.add(key));
      return next;
    });
  }

  showAllForPage(manifest: PageUiAccessManifest): void {
    if (!this.isAdmin()) return;
    const keys = [manifest.pageAccess.key, ...manifest.elements.map((element) => element.key)];
    this.formHidden.update((set) => {
      const next = new Set(set);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  }

  save(): void {
    if (!this.isAdmin() || this.saving()) return;
    const hiddenElements = [...this.formHidden()].sort();
    this.saving.set(true);
    this.uiAccessApi.replace(this.userId, hiddenElements).subscribe({
      next: () => {
        this.savedHidden = new Set(hiddenElements);
        this.saving.set(false);
        this.lastSavedAt.set(new Date().toISOString());
        this.lastSavedBy.set(this.authStore.currentUser()?.displayName ?? null);
        this.toast.success('Configuration enregistrée.');
      },
      error: () => this.saving.set(false),
    });
  }

  async reset(): Promise<void> {
    if (!this.isAdmin() || this.saving()) return;
    const ok = await this.confirm.confirm(
      "Réinitialiser l'affichage",
      `Tous les éléments configurables redeviendront visibles pour ${this.user()?.displayName ?? 'cet utilisateur'}.`,
      { danger: true, confirmLabel: 'Réinitialiser' },
    );
    if (!ok) return;
    this.saving.set(true);
    this.uiAccessApi.reset(this.userId).subscribe({
      next: () => {
        this.savedHidden = new Set();
        this.formHidden.set(new Set());
        this.saving.set(false);
        this.lastSavedAt.set(new Date().toISOString());
        this.lastSavedBy.set(this.authStore.currentUser()?.displayName ?? null);
        this.toast.success('Restrictions réinitialisées.');
      },
      error: () => this.saving.set(false),
    });
  }

  initials(user: User): string {
    return user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  }

  roleClass(role: UserRole): string {
    return role === UserRole.Admin ? 'role-admin' : role === UserRole.Direction ? 'role-direction' : 'role-employee';
  }

  back(): void {
    this.router.navigateByUrl('/users');
  }
}
