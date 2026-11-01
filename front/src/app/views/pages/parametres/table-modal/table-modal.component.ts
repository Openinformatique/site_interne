import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LucideAngularModule, Plus, Trash2, X } from 'lucide-angular';
import Swal from 'sweetalert2';

import { ParametresAdminApi } from '../../../../core/api/parametres-admin-api.service';
import { ApiError } from '../../../../core/models/api.model';
import { TableInput, TableParametres } from '../../../../core/models/parametre-admin.model';
import { UiVisibleDirective } from '../../../../core/ui-access/ui-visible.directive';
import { PARAMETRES_UI_KEYS } from '../access/parametres-access.keys';

interface RubriqueDraft {
  /** Numéro de la rubrique existante (null : nouvelle). */
  ancienNum: string | null;
  nom: string;
  aide: string;
  nbValeurs: number;
}

interface TableDraft {
  code: string;
  nom: string;
  nomCle: string;
  tailleCle: string;
  aide: string;
  codeDansCombo: boolean;
  rubriques: RubriqueDraft[];
}

/**
 * Modale « Nouvelle table » / « Modifier la table » : informations de la
 * table et liste éditable de ses rubriques (renumérotées 01, 02… ; la 01,
 * libellé, n'est pas supprimable). Enregistre immédiatement et renvoie la
 * table, ou « deleted » après la suppression d'une table vide.
 */
@Component({
  selector: 'app-table-modal',
  imports: [LucideAngularModule, UiVisibleDirective],
  templateUrl: './table-modal.component.html',
  styleUrl: './table-modal.component.scss',
})
export class TableModalComponent {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly api = inject(ParametresAdminApi);

  readonly UiKeys = PARAMETRES_UI_KEYS;
  readonly icons = { Plus, Trash2, X };

  readonly table = signal<TableParametres | null>(null);
  readonly draft = signal<TableDraft>({
    code: '', nom: '', nomCle: '', tailleCle: '8', aide: '', codeDansCombo: false,
    rubriques: [{ ancienNum: null, nom: 'Libellé', aide: '', nbValeurs: 0 }],
  });
  readonly errors = signal<Record<string, string>>({});
  readonly saving = signal(false);

  readonly isNew = computed(() => this.table() === null);
  readonly title = computed(() => (this.table() ? `Modifier la table ${this.table()?.code}` : 'Nouvelle table de paramètres'));

  /** À appeler juste après l'ouverture (table null = création). */
  init(table: TableParametres | null): void {
    this.table.set(table);
    if (table) {
      this.draft.set({
        code: table.code,
        nom: table.nom,
        nomCle: table.nomCle,
        tailleCle: String(table.tailleCle),
        aide: table.aide,
        codeDansCombo: table.codeDansCombo,
        rubriques: table.rubriques.map((rubrique) => ({ ancienNum: rubrique.num, nom: rubrique.nom, aide: rubrique.aide, nbValeurs: rubrique.nbValeurs })),
      });
    }
  }

  num(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  set(field: 'code' | 'nom' | 'nomCle' | 'tailleCle' | 'aide', event: Event): void {
    let value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    if (field === 'code') {
      value = value.toUpperCase();
    }
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: '' }));
  }

  toggleCombo(): void {
    this.draft.update((draft) => ({ ...draft, codeDansCombo: !draft.codeDansCombo }));
  }

  setRubrique(index: number, field: 'nom' | 'aide', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => ({
      ...draft,
      rubriques: draft.rubriques.map((rubrique, i) => (i === index ? { ...rubrique, [field]: value } : rubrique)),
    }));
    this.errors.update((errors) => ({ ...errors, [`rubriques.${index}.nom`]: '', rubriques: '' }));
  }

  addRubrique(): void {
    this.draft.update((draft) => ({ ...draft, rubriques: [...draft.rubriques, { ancienNum: null, nom: '', aide: '', nbValeurs: 0 }] }));
  }

  /** Supprimer une rubrique renseignée efface ses valeurs : confirmation. */
  async removeRubrique(index: number): Promise<void> {
    const rubrique = this.draft().rubriques[index];
    if (!rubrique || index === 0) {
      return;
    }
    if (rubrique.nbValeurs > 0) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Supprimer la rubrique ?',
        text: `${rubrique.nbValeurs} valeur${rubrique.nbValeurs > 1 ? 's' : ''} de la rubrique « ${rubrique.nom} » ser${rubrique.nbValeurs > 1 ? 'ont' : 'a'} effacée${rubrique.nbValeurs > 1 ? 's' : ''} à l'enregistrement.`,
        showCancelButton: true,
        confirmButtonText: 'Supprimer',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
        customClass: { confirmButton: 'swal-confirm-danger' },
      });
      if (!result.isConfirmed) {
        return;
      }
    }
    this.draft.update((draft) => ({ ...draft, rubriques: draft.rubriques.filter((_, i) => i !== index) }));
  }

  close(): void {
    this.activeModal.dismiss();
  }

  save(): void {
    const draft = this.draft();
    const errors: Record<string, string> = {};
    const required = 'Champ obligatoire.';
    if (this.isNew() && !/^[A-Z0-9]{4}$/.test(draft.code)) {
      errors['code'] = '4 lettres ou chiffres.';
    }
    if (!draft.nom.trim()) errors['nom'] = required;
    if (!draft.nomCle.trim()) errors['nomCle'] = required;
    const taille = Number(draft.tailleCle);
    if (!Number.isInteger(taille) || taille < 1 || taille > 8) errors['tailleCle'] = 'Taille de 1 à 8.';
    draft.rubriques.forEach((rubrique, index) => {
      if (!rubrique.nom.trim()) errors[`rubriques.${index}.nom`] = required;
    });
    if (Object.keys(errors).length > 0) {
      this.errors.set(errors);
      return;
    }

    const input: TableInput = {
      nom: draft.nom.trim(),
      nomCle: draft.nomCle.trim(),
      tailleCle: taille,
      aide: draft.aide.trim(),
      codeDansCombo: draft.codeDansCombo,
      rubriques: draft.rubriques.map((rubrique) => ({ ancienNum: rubrique.ancienNum, nom: rubrique.nom.trim(), aide: rubrique.aide.trim() })),
    };
    const table = this.table();
    this.saving.set(true);
    (table ? this.api.updateTable(table.code, input) : this.api.createTable(draft.code, input)).subscribe({
      next: (saved) => this.activeModal.close(saved),
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errors.set(fieldErrors(error));
      },
    });
  }

  async deleteTable(): Promise<void> {
    const table = this.table();
    if (!table) {
      return;
    }
    if (table.nbParametres > 0) {
      this.errors.set({ code: 'Cette table contient des paramètres : supprimez-les ou désactivez-les d’abord.' });
      return;
    }
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Supprimer la table ?',
      text: `La table ${table.code} et ses rubriques seront supprimées.`,
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      customClass: { confirmButton: 'swal-confirm-danger' },
    });
    if (!result.isConfirmed) {
      return;
    }
    this.api.deleteTable(table.code).subscribe({
      next: () => this.activeModal.close('deleted'),
      error: (error: HttpErrorResponse) => this.errors.set(fieldErrors(error)),
    });
  }
}

/** Erreurs du back par champ (premier message de chaque champ). */
function fieldErrors(error: HttpErrorResponse): Record<string, string> {
  const details = (error.error as { error?: ApiError } | null)?.error?.details ?? [];
  const errors: Record<string, string> = {};
  details.forEach((detail) => (errors[detail.field] ??= detail.message));
  return errors;
}
