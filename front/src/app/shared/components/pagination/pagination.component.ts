import { Component, input, output } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { PaginationMeta } from '../../../core/models/api.model';

/** Plafond appliqué à toute taille de page demandée (bouton "Tout afficher" ou saisie libre), pour éviter de charger des dizaines de milliers de lignes en une requête. */
const MAX_PAGE_SIZE = 1000;

/** Au-delà de ce nombre de lignes, on demande confirmation : le back n'impose plus de plafond, donc une valeur trop élevée peut ralentir l'application. */
const LARGE_PAGE_SIZE_THRESHOLD = 500;

@Component({
  selector: 'app-pagination',
  imports: [NgbPaginationModule],
  template: `
    @if (meta(); as m) {
      <div class="d-flex align-items-center flex-wrap gap-3 mt-3">
        <div class="d-flex align-items-center flex-wrap gap-1">
          <span class="text-secondary small">Afficher</span>
          <div class="btn-group btn-group-sm" role="group" aria-label="Nombre d'éléments par page">
            @for (size of pageSizeOptions; track size) {
              <button
                type="button"
                class="btn"
                [class.btn-primary]="isActiveSize(m, size)"
                [class.btn-outline-secondary]="!isActiveSize(m, size)"
                (click)="selectSize(size)">
                {{ size }}
              </button>
            }
          </div>
          <input
            #customSizeInput
            type="number"
            class="form-control form-control-sm page-size-custom"
            min="1"
            [max]="maxPageSize"
            [value]="m.limit"
            placeholder="Nombre"
            aria-label="Nombre d'éléments personnalisé"
            (keyup.enter)="applyCustomSize(customSizeInput.value)" />
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            (click)="applyCustomSize(customSizeInput.value)">
            OK
          </button>
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-primary]="isShowingAll(m)"
            [class.btn-outline-secondary]="!isShowingAll(m)"
            (click)="selectAll(m)">
            Tout afficher
          </button>
        </div>

        <div class="d-flex align-items-center flex-wrap gap-3 ms-auto">
          <span class="text-secondary small text-nowrap">
            {{ m.totalItems }} élément(s) — page {{ m.page }}/{{ m.totalPages }}
          </span>
          <ngb-pagination
            class="mb-0"
            [page]="m.page"
            [collectionSize]="m.totalItems"
            [pageSize]="m.limit"
            [maxSize]="5"
            [rotate]="true"
            [boundaryLinks]="true"
            (pageChange)="pageChange.emit($event)" />
        </div>
      </div>
    }
  `,
  styles: [`
    .page-size-custom { width: 90px; }
    :host ::ng-deep ngb-pagination ul.pagination { margin-bottom: 0; }
  `],
})
export class PaginationComponent {
  readonly meta = input<PaginationMeta | null>(null);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly pageSizeOptions = [50, 100, 250];
  readonly maxPageSize = MAX_PAGE_SIZE;

  isActiveSize(meta: PaginationMeta, size: number): boolean {
    return meta.limit === size;
  }

  isShowingAll(meta: PaginationMeta): boolean {
    return meta.totalItems > 0 && meta.limit >= meta.totalItems;
  }

  selectSize(size: number): void {
    void this.confirmAndEmit(size);
  }

  selectAll(meta: PaginationMeta): void {
    if (meta.totalItems <= 0) return;
    void this.confirmAndEmit(Math.min(meta.totalItems, MAX_PAGE_SIZE));
  }

  applyCustomSize(rawValue: string): void {
    const value = Math.trunc(Number(rawValue));
    if (!Number.isFinite(value) || value <= 0) return;
    void this.confirmAndEmit(Math.min(value, MAX_PAGE_SIZE));
  }

  private async confirmAndEmit(size: number): Promise<void> {
    if (size > LARGE_PAGE_SIZE_THRESHOLD) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Afficher un grand nombre de lignes ?',
        text: `Vous êtes sur le point d'afficher ${size} éléments sur la page. Cela peut provoquer des ralentissements.`,
        showCancelButton: true,
        confirmButtonText: 'Afficher quand même',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
    }
    this.pageSizeChange.emit(size);
  }
}
