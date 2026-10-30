import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/**
 * Fiche commande (`/commandes/:id`) et création (`/commandes/nouvelle?client=:id`),
 * ouvertes dans un onglet depuis la fiche client.
 *
 * Emplacement réservé : l'écran sera conçu à une prochaine étape.
 */
@Component({
  selector: 'app-commande-fiche',
  imports: [EmptyStateComponent],
  template: `
    <nav class="fs-13px text-secondary mb-1" aria-label="Fil d'Ariane">Commandes / <span class="text-body">{{ title() }}</span></nav>
    <h1 class="fs-5 fw-medium mb-4">{{ title() }}</h1>
    <div class="card" style="border-style: dashed">
      <app-empty-state title="Écran en cours de conception" message="La fiche commande sera réalisée lors d'une prochaine étape." />
    </div>
  `,
})
export class CommandeFicheComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = computed(() => (this.route.snapshot.paramMap.get('id') ? 'Fiche commande' : 'Nouvelle commande'));
}
