import { Component } from '@angular/core';

@Component({
  selector: 'app-page-loader',
  template: `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement…</span>
      </div>
    </div>
  `,
})
export class PageLoaderComponent {}
