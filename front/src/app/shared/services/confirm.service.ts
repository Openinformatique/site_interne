import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

/** Ouvre une modale de confirmation. Résout à true si l'utilisateur confirme. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private modalService = inject(NgbModal);

  confirm(
    title: string,
    message: string,
    options: { danger?: boolean; confirmLabel?: string } = {},
  ): Promise<boolean> {
    const ref = this.modalService.open(ConfirmModalComponent, { centered: true });
    ref.componentInstance.title = title;
    ref.componentInstance.message = message;
    ref.componentInstance.danger = options.danger ?? false;
    ref.componentInstance.confirmLabel =
      options.confirmLabel ?? (options.danger ? 'Supprimer' : 'Confirmer');
    return ref.result.then((r) => r === true).catch(() => false);
  }
}
