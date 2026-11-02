import { Component, computed, input } from '@angular/core';

import { segments } from '../../utils/surlignage';

/** Texte dont les termes recherchés sont surlignés (casse et accents indifférents). */
@Component({
  selector: 'app-surligne',
  template: `@for (segment of segments(); track $index) {@if (segment.surligne) {<mark>{{ segment.texte }}</mark>} @else {{{ segment.texte }}}}`,
  styles: `
    :host { display: inline; }
    mark { padding: 0 1px; border-radius: 2px; background: #fff1b8; color: inherit; }
    :host-context([data-bs-theme='dark']) mark { background: rgba(251, 188, 6, .3); color: #fff; }
  `,
})
export class SurligneComponent {
  readonly texte = input<string | null | undefined>('');
  readonly termes = input<readonly string[]>([]);

  readonly segments = computed(() => segments(this.texte(), this.termes()));
}
