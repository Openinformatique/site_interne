import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/**
 * Tableau de bord.
 *
 * Contenu de démonstration du template retiré : l'écran sera conçu à une
 * prochaine étape (maquette validée puis implémentation).
 */
@Component({
  selector: 'app-dashboard',
  imports: [EmptyStateComponent],
  template: `
    <h1 class="fs-5 fw-medium mb-4">Tableau de bord</h1>
    <div class="card" style="border-style: dashed">
      <app-empty-state title="Écran en cours de conception" message="Le tableau de bord sera réalisé lors d'une prochaine étape." />
    </div>
  `,
})
export class DashboardComponent {}
