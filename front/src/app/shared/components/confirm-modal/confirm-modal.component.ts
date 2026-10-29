import { Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirm-modal',
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ title }}</h5>
      <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
    </div>
    <div class="modal-body"><p class="mb-0">{{ message }}</p></div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">Annuler</button>
      <button
        type="button"
        class="btn"
        [class.btn-danger]="danger"
        [class.btn-primary]="!danger"
        (click)="modal.close(true)">
        {{ confirmLabel }}
      </button>
    </div>
  `,
})
export class ConfirmModalComponent {
  readonly modal = inject(NgbActiveModal);
  // Renseignés par ConfirmService via componentInstance.
  title = 'Confirmer';
  message = '';
  confirmLabel = 'Confirmer';
  danger = false;
}
