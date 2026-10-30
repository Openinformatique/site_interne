import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/**
 * Fiche client (consultation / modification) et création d'un client.
 *
 * Emplacement réservé : la fiche sera conçue à l'étape suivante (maquette
 * validée puis implémentation). Ouverte dans un onglet depuis la liste.
 */
@Component({
  selector: 'app-client-fiche',
  imports: [EmptyStateComponent],
  template: `
    <nav class="fs-13px text-secondary mb-1" aria-label="Fil d'Ariane">Module clients / <span class="text-body">{{ title() }}</span></nav>
    <h1 class="fs-5 fw-medium mb-4">{{ title() }}</h1>
    <div class="card" style="border-style: dashed">
      <app-empty-state title="Écran en cours de conception" [message]="message()" />
    </div>
  `,
})
export class ClientFicheComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), { initialValue: null });

  readonly isNew = computed(() => this.id() === null);
  readonly title = computed(() => (this.isNew() ? 'Nouveau client' : 'Fiche client'));
  readonly message = computed(() =>
    this.isNew()
      ? 'La fiche de création d\'un client sera réalisée lors d\'une prochaine étape.'
      : `La fiche du client n° ${this.id()} sera réalisée lors d'une prochaine étape.`,
  );
}
