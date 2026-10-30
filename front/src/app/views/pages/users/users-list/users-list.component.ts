import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import {
  CalendarDays, ChevronDown, ChevronUp, ChevronsUpDown, Eye, LayoutGrid, List, LucideAngularModule, Mail,
  MoreVertical, RotateCcw, Search, Shield, SlidersHorizontal, Trash2, UserPlus, UserRound, Users,
} from 'lucide-angular';

import { UsersApi } from '../../../../core/api/users-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { TabsService } from '../../../../core/services/tabs.service';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { User } from '../../../../core/models/user.model';
import { UserRole, USER_ROLE_LABELS } from '../../../../core/models/enums';

type SortField = 'displayName' | 'role' | 'isActive' | 'createdAt';
import { PaginationMeta } from '../../../../core/models/api.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { ChangeRoleModalComponent } from '../change-role-modal/change-role-modal.component';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';
import { USERS_UI_KEYS } from '../access/users-access.keys';

@Component({
  selector: 'app-users-list',
  imports: [
    ReactiveFormsModule, NgbDropdownModule, LucideAngularModule, PaginationComponent,
    EmptyStateComponent, PageLoaderComponent, DateFrPipe, UiVisibleDirective,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  private usersApi = inject(UsersApi);
  private authStore = inject(AuthStore);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private modal = inject(NgbModal);
  private tabsService = inject(TabsService);
  private destroyRef = inject(DestroyRef);

  readonly UsersUiKeys = USERS_UI_KEYS;
  readonly isAdmin = this.authStore.isAdmin;
  readonly currentUserId = computed(() => this.authStore.currentUser()?.id);
  readonly roleLabels = USER_ROLE_LABELS;
  readonly roles = [UserRole.Admin, UserRole.Direction, UserRole.Employee];
  readonly Role = UserRole;

  // Icônes Lucide
  readonly CalendarDays = CalendarDays;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly ChevronsUpDown = ChevronsUpDown;
  readonly Eye = Eye;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;
  readonly Mail = Mail;
  readonly MoreVertical = MoreVertical;
  readonly RotateCcw = RotateCcw;
  readonly Search = Search;
  readonly Shield = Shield;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Trash2 = Trash2;
  readonly UserPlus = UserPlus;
  readonly UserRound = UserRound;
  readonly Users = Users;

  readonly users = signal<User[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(true);
  readonly view = signal<'grid' | 'list'>('grid');

  // Filtres réactifs
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly roleControl = new FormControl<UserRole | ''>('', { nonNullable: true });
  readonly statusControl = new FormControl<'' | 'true' | 'false'>('', { nonNullable: true });

  private page = 1;
  private pageSize = 50;
  private sortField: SortField = 'createdAt';
  private sortDirection: 'ASC' | 'DESC' = 'DESC';
  private reload$ = new Subject<void>();

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetToFirstPage());

    this.roleControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.resetToFirstPage());
    this.statusControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.resetToFirstPage());
    // La liste est conservée dans son onglet : un utilisateur créé ailleurs la rafraîchit.
    this.usersApi.created$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload$.next());

    this.reload$
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.loading.set(true);
          const status = this.statusControl.value;
          return this.usersApi.list({
            page: this.page, limit: this.pageSize, sortBy: this.sortField, sortDirection: this.sortDirection,
            search: this.searchControl.value.trim() || undefined,
            role: this.roleControl.value || undefined,
            isActive: status === '' ? undefined : status === 'true',
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => { this.users.set(result.items); this.meta.set(result.pagination); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  private resetToFirstPage() { this.page = 1; this.reload$.next(); }
  onPage(page: number) { this.page = page; this.reload$.next(); }
  onPageSize(size: number) { this.pageSize = size; this.page = 1; this.reload$.next(); }

  sortBy(field: SortField) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortField = field;
      this.sortDirection = 'ASC';
    }
    this.resetToFirstPage();
  }
  sortIcon(field: SortField) {
    if (this.sortField !== field) return this.ChevronsUpDown;
    return this.sortDirection === 'ASC' ? this.ChevronUp : this.ChevronDown;
  }
  isSorted(field: SortField): boolean { return this.sortField === field; }
  setView(v: 'grid' | 'list') { this.view.set(v); }

  viewProfile(user: User) {
    if (user.id === this.currentUserId()) { this.tabsService.openTab('/profile', 'Mon profil'); return; }
    if (this.isAdmin()) {
      const ref = this.modal.open(UserProfileModalComponent, { centered: true });
      ref.componentInstance.user = user;
      return;
    }
    this.toast.info("Le profil détaillé d'un autre utilisateur n'est pas disponible.");
  }

  initials(user: User): string {
    return user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  }
  roleClass(role: UserRole): string {
    return role === UserRole.Admin ? 'role-admin' : role === UserRole.Direction ? 'role-direction' : 'role-employee';
  }

  /** La création d'un utilisateur se fait depuis la liste (plus d'entrée dédiée dans le menu). */
  createUser() {
    this.tabsService.openTab('/users/new', 'Nouvel utilisateur');
  }

  configureUiAccess(user: User) {
    this.tabsService.openTab(`/users/${user.id}/ui-access`, `Accès UI — ${user.displayName}`);
  }

  changeRole(user: User) {
    const ref = this.modal.open(ChangeRoleModalComponent, { centered: true });
    ref.componentInstance.user = user;
    ref.result.then(
      (newRole?: UserRole) => {
        if (!newRole || newRole === user.role) return;
        this.usersApi.changeRole(user.id, newRole).subscribe((updated) => {
          this.replace(updated);
          this.toast.success('Rôle mis à jour.');
        });
      },
      () => undefined,
    );
  }

  async deactivate(user: User) {
    const ok = await this.confirm.confirm(
      'Désactiver le compte',
      `Désactiver ${user.displayName} ? Il ne pourra plus se connecter (réversible).`,
      { danger: true, confirmLabel: 'Désactiver' },
    );
    if (!ok) return;
    this.usersApi.deactivate(user.id).subscribe(() => { this.reload$.next(); this.toast.success('Utilisateur désactivé.'); });
  }

  reactivate(user: User) {
    this.usersApi.reactivate(user.id).subscribe((updated) => { this.replace(updated); this.toast.success('Utilisateur réactivé.'); });
  }

  private replace(updated: User) {
    this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
  }
}
