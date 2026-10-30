import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/**
 * Liste des clients (Module clients).
 *
 * Emplacement réservé : l'écran sera conçu à une prochaine étape
 * (maquette validée puis implémentation, voir views/layout/README.md).
 */
@Component({
  selector: 'app-clients-list',
  imports: [EmptyStateComponent],
  template: `
    <nav class="fs-13px text-secondary mb-1" aria-label="Fil d'Ariane">Module clients / <span class="text-body">Liste des clients</span></nav>
    <h1 class="fs-5 fw-medium mb-4">Liste des clients</h1>
    <div class="card" style="border-style: dashed">
      <app-empty-state title="Écran en cours de conception" message="La liste des clients sera réalisée lors d'une prochaine étape." />
    </div>
  `,
})
export class ClientsListComponent {}
