import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

/**
 * Toasts applicatifs (coin haut-droit, auto-fermeture).
 * Enrobe SweetAlert2 pour une API simple : toast.success('Enregistré').
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  });

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message, 6000); // les erreurs restent un peu plus longtemps
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  private show(icon: SweetAlertIcon, title: string, timer = 4000): void {
    void this.toast.fire({ icon, title, timer });
  }
}
