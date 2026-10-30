import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/**
 * Commandes (menu GESTION › Commandes).
 *
 * Emplacement réservé : l'écran sera conçu à une prochaine étape
 * (maquette validée puis implémentation, voir views/layout/README.md).
 */
@Component({
  selector: 'app-commandes-list',
  imports: [EmptyStateComponent],
  template: `
    <nav class="fs-13px text-secondary mb-1" aria-label="Fil d'Ariane">Gestion / <span class="text-body">Commandes</span></nav>
    <h1 class="fs-5 fw-medium mb-4">Commandes</h1>
    <div class="card" style="border-style: dashed">
      <app-empty-state title="Écran en cours de conception" message="L'écran des commandes sera réalisé lors d'une prochaine étape." />
    </div>
  `,
})
export class CommandesListComponent {}
