import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, X } from 'lucide-angular';

import { ParametresAdminApi } from '../../../../core/api/parametres-admin-api.service';
import { ApiError } from '../../../../core/models/api.model';
import { Parametre, TableParametres } from '../../../../core/models/parametre-admin.model';

const RUBRIQUE_LIBELLE = '01';

/**
 * Modale « Nouveau paramètre » / « Modifier le paramètre » : clé (figée en
 * modification), statut et une valeur par rubrique de la table (la 01,
 * libellé, est obligatoire). Enregistre immédiatement et renvoie le paramètre.
 */
@Component({
  selector: 'app-parametre-modal',
  imports: [LucideAngularModule],
  templateUrl: './parametre-modal.component.html',
  styleUrl: './parametre-modal.component.scss',
})
export class ParametreModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly api = inject(ParametresAdminApi);

  readonly X = X;

  readonly table = signal<TableParametres | null>(null);
  readonly parametre = signal<Parametre | null>(null);
  readonly cle = signal('');
  readonly actif = signal(true);
  readonly valeurs = signal<Record<string, string>>({});
  readonly errors = signal<Record<string, string>>({});
  readonly saving = signal(false);

  readonly isNew = computed(() => this.parametre() === null);
  readonly title = computed(() => (this.parametre() ? `Modifier le paramètre ${this.parametre()?.cle}` : 'Nouveau paramètre'));

  /** À appeler juste après l'ouverture (parametre null = création). */
  init(table: TableParametres, parametre: Parametre | null): void {
    this.table.set(table);
    this.parametre.set(parametre);
    if (parametre) {
      this.cle.set(parametre.cle);
      this.actif.set(parametre.actif);
      this.valeurs.set({ ...parametre.valeurs });
    }
  }

  setCle(event: Event): void {
    this.cle.set((event.target as HTMLInputElement).value);
    this.errors.update((errors) => ({ ...errors, cle: '' }));
  }

  setValeur(num: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.valeurs.update((valeurs) => ({ ...valeurs, [num]: value }));
    this.errors.update((errors) => ({ ...errors, [`valeurs.${num}`]: '' }));
  }

  close(): void {
    this.activeModal.dismiss();
  }

  save(): void {
    const table = this.table();
    if (!table) {
      return;
    }
    const cle = this.cle().trim();
    const errors: Record<string, string> = {};
    if (this.isNew()) {
      if (!cle || /\s/.test(cle)) errors['cle'] = 'Clé obligatoire, sans espace.';
      else if (cle.length > table.tailleCle) errors['cle'] = `${table.tailleCle} caractères maximum.`;
    }
    if (!(this.valeurs()[RUBRIQUE_LIBELLE] ?? '').trim()) {
      errors[`valeurs.${RUBRIQUE_LIBELLE}`] = 'Champ obligatoire.';
    }
    if (Object.keys(errors).length > 0) {
      this.errors.set(errors);
      return;
    }

    const parametre: Parametre = {
      cle: this.isNew() ? cle : (this.parametre()?.cle ?? cle),
      actif: this.actif(),
      valeurs: Object.fromEntries(table.rubriques.map((rubrique) => [rubrique.num, (this.valeurs()[rubrique.num] ?? '').trim()])),
    };
    this.saving.set(true);
    (this.isNew() ? this.api.createParametre(table.code, parametre) : this.api.updateParametre(table.code, parametre)).subscribe({
      next: (saved) => this.activeModal.close(saved),
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
        const byField: Record<string, string> = {};
        details.forEach((detail) => (byField[detail.field] ??= detail.message));
        this.errors.set(byField);
      },
    });
  }
}
