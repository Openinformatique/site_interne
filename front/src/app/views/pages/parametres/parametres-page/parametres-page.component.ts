import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-angular';
import Swal from 'sweetalert2';

import { ParametresAdminApi } from '../../../../core/api/parametres-admin-api.service';
import { ApiError } from '../../../../core/models/api.model';
import { Parametre, TableParametres } from '../../../../core/models/parametre-admin.model';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { PageLoaderComponent } from '../../../../shared/components/page-loader/page-loader.component';
import { PARAMETRES_UI_KEYS } from '../access/parametres-access.keys';
import { ParametreModalComponent } from '../parametre-modal/parametre-modal.component';
import { TableModalComponent } from '../table-modal/table-modal.component';

const MODAL_OPTIONS: NgbModalOptions = { backdropClass: 'fiche-modal-backdrop', animation: true };

/** Minuscules sans accents (recherches). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Écran Paramètres (menu ADMINISTRATION) — voir ../README.md. À gauche les
 * tables de paramètres, à droite les paramètres de la table choisie (une
 * colonne par rubrique). Saisie dans des modales, enregistrée immédiatement.
 */
@Component({
  selector: 'app-parametres-page',
  imports: [LucideAngularModule, UiVisibleDirective, PageLoaderComponent],
  templateUrl: './parametres-page.component.html',
  styleUrl: './parametres-page.component.scss',
})
export class ParametresPageComponent {
  private readonly api = inject(ParametresAdminApi);
  private readonly modal = inject(NgbModal);

  readonly UiKeys = PARAMETRES_UI_KEYS;
  readonly icons = { Pencil, Plus, Search, SlidersHorizontal, Trash2 };

  readonly loading = signal(true);
  readonly tables = signal<TableParametres[]>([]);
  readonly selectedCode = signal<string | null>(null);
  readonly parametres = signal<Parametre[]>([]);
  readonly tableSearch = signal('');
  readonly parametreSearch = signal('');
  readonly showInactive = signal(false);

  readonly selected = computed(() => this.tables().find((table) => table.code === this.selectedCode()) ?? null);

  readonly visibleTables = computed(() => {
    const terms = normalize(this.tableSearch()).split(/\s+/).filter(Boolean);
    return this.tables().filter((table) => {
      const text = normalize(`${table.code} ${table.nom}`);
      return terms.every((term) => text.includes(term));
    });
  });

  readonly visibleParametres = computed(() => {
    const terms = normalize(this.parametreSearch()).split(/\s+/).filter(Boolean);
    return this.parametres().filter((parametre) => {
      if (!parametre.actif && !this.showInactive()) {
        return false;
      }
      const text = normalize([parametre.cle, ...Object.values(parametre.valeurs)].join(' '));
      return terms.every((term) => text.includes(term));
    });
  });

  readonly parametreCount = computed(() => this.parametres().filter((parametre) => this.showInactive() || parametre.actif).length);

  constructor() {
    this.loadTables();
  }

  // --- Tables --------------------------------------------------------------

  selectTable(code: string): void {
    if (code === this.selectedCode()) {
      return;
    }
    this.selectedCode.set(code);
    this.parametreSearch.set('');
    this.loadParametres(code);
  }

  openTable(table: TableParametres | null, event?: Event): void {
    event?.stopPropagation();
    const ref = this.modal.open(TableModalComponent, { ...MODAL_OPTIONS, modalDialogClass: 'fiche-modal fiche-modal-table' });
    (ref.componentInstance as TableModalComponent).init(table);
    ref.result.then(
      (result: TableParametres | 'deleted') => {
        if (result === 'deleted') {
          this.showToast('Table supprimée.');
          this.loadTables();
          return;
        }
        this.showToast('Table enregistrée.');
        this.loadTables(result.code);
      },
      () => undefined,
    );
  }

  // --- Paramètres ----------------------------------------------------------

  valeur(parametre: Parametre, num: string): string {
    return parametre.valeurs[num] ?? '';
  }

  openParametre(parametre: Parametre | null): void {
    const table = this.selected();
    if (!table) {
      return;
    }
    const ref = this.modal.open(ParametreModalComponent, { ...MODAL_OPTIONS, modalDialogClass: 'fiche-modal fiche-modal-contact' });
    (ref.componentInstance as ParametreModalComponent).init(table, parametre);
    ref.result.then(
      () => {
        this.showToast('Paramètre enregistré.');
        this.loadTables(table.code);
      },
      () => undefined,
    );
  }

  async deleteParametre(parametre: Parametre, event: Event): Promise<void> {
    event.stopPropagation();
    const table = this.selected();
    if (!table) {
      return;
    }
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Supprimer le paramètre ?',
      text: `« ${parametre.cle} — ${this.valeur(parametre, '01')} » sera supprimé de la table ${table.code}.`,
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      customClass: { confirmButton: 'swal-confirm-danger' },
    });
    if (!result.isConfirmed) {
      return;
    }
    this.api.deleteParametre(table.code, parametre.cle).subscribe({
      next: () => {
        this.showToast('Paramètre supprimé.');
        this.loadTables(table.code);
      },
      error: (error: HttpErrorResponse) => void this.showError(error),
    });
  }

  // --- Chargement ----------------------------------------------------------

  /** Recharge les tables (compteurs) puis les paramètres de la table choisie. */
  private loadTables(select?: string): void {
    this.api.tables().subscribe({
      next: (tables) => {
        this.tables.set(tables);
        this.loading.set(false);
        const code = select ?? (tables.some((table) => table.code === this.selectedCode()) ? this.selectedCode() : tables[0]?.code) ?? null;
        this.selectedCode.set(code);
        if (code) {
          this.loadParametres(code);
        } else {
          this.parametres.set([]);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadParametres(code: string): void {
    this.api.parametres(code).subscribe((parametres) => {
      if (this.selectedCode() === code) {
        this.parametres.set(parametres);
      }
    });
  }

  private showError(error: HttpErrorResponse): Promise<unknown> {
    const apiError = (error.error as { error?: ApiError } | null)?.error;
    return Swal.fire({ icon: 'error', title: 'Suppression impossible', text: apiError?.details?.[0]?.message ?? apiError?.message ?? '' });
  }

  private showToast(title: string): void {
    void Swal.fire({ toast: true, position: 'bottom-end', title, showConfirmButton: false, timer: 2600, customClass: { popup: 'fiche-toast' } });
  }
}
