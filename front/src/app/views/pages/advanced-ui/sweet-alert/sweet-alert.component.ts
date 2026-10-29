import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import Swal, { type SweetAlertOptions } from 'sweetalert2';
import { SwalDirective } from '@sweetalert2/ngx-sweetalert2';

/** Inline SVG for SweetAlert2 buttons (it renders raw HTML, not Angular components). */
const THUMBS_UP_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/></svg>';
const THUMBS_DOWN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/><path d="M17 14V2"/></svg>';

@Component({
    selector: 'app-sweet-alert',
    imports: [
        RouterLink,
        SwalDirective
    ],
    templateUrl: './sweet-alert.component.html'
})
export class SweetAlertComponent {

  readonly basicAlertSwal: SweetAlertOptions = {
    title: '',
    text: 'Any fool can use a computer',
    icon: undefined,
    confirmButtonText: 'Close'
  };

  readonly titleTextSwal: SweetAlertOptions = {
    title: 'The Internet?',
    text: 'That thing is still around?',
    icon: 'question'
  };

  readonly mixinSwal: SweetAlertOptions = {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    title: 'Signed in successfully',
    icon: 'success'
  };

  readonly htmlExampleSwal: SweetAlertOptions = {
    title: '<strong>HTML <u>example</u></strong>',
    icon: 'info',
    html: '(You can use <b>bold text</b>, <a href=\'http://github.com\'>links</a> and other HTML tags)',
    showCloseButton: true,
    showCancelButton: true,
    focusConfirm: false,
    confirmButtonText: THUMBS_UP_SVG + ' Great!',
    confirmButtonAriaLabel: 'Thumbs up, great!',
    cancelButtonText: THUMBS_DOWN_SVG,
    cancelButtonAriaLabel: 'Thumbs down'
  };

  readonly customPositionSwal: SweetAlertOptions = {
    position: 'top-end',
    title: 'Your work has been saved',
    text: '',
    showConfirmButton: false,
    timer: 1500,
    icon: 'success'
  };

  /** Used with [swal] for static options only (no didOpen/willClose to avoid ngx-sweetalert2 overwriting EventEmitters). */
  readonly autoCloseSwal: SweetAlertOptions = {
    title: 'Auto close alert!',
    html: 'I will close in <strong>2</strong> seconds.',
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false
  };

  /** Fires the auto-close alert with live millisecond countdown via Swal.fire() so didOpen/willClose work. */
  showAutoCloseAlert(): void {
    let timerInterval: ReturnType<typeof setInterval> | undefined;
    Swal.fire({
      title: 'Auto close alert!',
      html: 'I will close in <b></b> milliseconds.',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
      didOpen: (popup) => {
        Swal.showLoading();
        const timerEl = popup.querySelector('b');
        timerInterval = setInterval(() => {
          if (timerEl) {
            timerEl.textContent = String(Swal.getTimerLeft() ?? '');
          }
        }, 100);
      },
      willClose: () => {
        if (timerInterval !== undefined) {
          clearInterval(timerInterval);
        }
      }
    });
  }

}
