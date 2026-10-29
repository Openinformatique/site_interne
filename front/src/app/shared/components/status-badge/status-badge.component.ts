import { Component, computed, input } from '@angular/core';

/** Badge coloré selon un statut métier (devis, commande, facture…). */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge {{ badgeClass() }}">{{ label() || status() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>('');

  private readonly classes: Record<string, string> = {
    DRAFT: 'bg-secondary',
    SENT: 'bg-primary',
    ACCEPTED: 'bg-success',
    PAID: 'bg-success',
    DELIVERED: 'bg-success',
    REJECTED: 'bg-danger',
    CANCELLED: 'bg-danger',
    EXPIRED: 'bg-warning text-dark',
    OVERDUE: 'bg-warning text-dark',
    PARTIALLY_PAID: 'bg-warning text-dark',
    CONFIRMED: 'bg-info',
    IN_PROGRESS: 'bg-info',
  };

  readonly badgeClass = computed(() => this.classes[this.status()] ?? 'bg-secondary');
}
