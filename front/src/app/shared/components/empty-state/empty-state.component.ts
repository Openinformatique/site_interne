import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="text-center text-secondary py-5">
      <p class="mb-1 fw-semibold">{{ title() }}</p>
      @if (message()) {
        <p class="small mb-0">{{ message() }}</p>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input('Aucun élément à afficher');
  readonly message = input('');
}
