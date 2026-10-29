import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';

import { UiAccessService } from './ui-access.service';

/**
 * Masque l'élément du DOM si sa clé d'accès UI est masquée pour l'utilisateur connecté.
 * Usage : `<button *appUiVisible="ORDERS_UI_KEYS.CREATE_BUTTON">Créer</button>`.
 * Un élément sans cette directive reste toujours visible (non administrable).
 */
@Directive({
  selector: '[appUiVisible]',
  standalone: true,
})
export class UiVisibleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly uiAccessService = inject(UiAccessService);

  private key: string | null = null;
  private hasView = false;

  constructor() {
    // Réagit aux changements du store (ex. reset() au logout) pour la clé courante.
    effect(() => {
      if (this.key === null) return;
      this.render(this.uiAccessService.isVisible(this.key));
    });
  }

  @Input()
  set appUiVisible(key: string) {
    this.key = key;
    this.render(this.uiAccessService.isVisible(key));
  }

  private render(visible: boolean): void {
    if (visible && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!visible && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
