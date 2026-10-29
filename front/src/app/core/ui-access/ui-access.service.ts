import { Injectable, signal } from '@angular/core';

/**
 * Store global des clés d'éléments d'UI masqués pour l'utilisateur connecté.
 * Initialisé par AuthStore (login/bootstrap) avant l'affichage du shell authentifié.
 * Confort d'affichage Angular uniquement : le backend reste seul responsable de la
 * vraie sécurité (voir cahier-des-charges-front-ui-access.md §18).
 */
@Injectable({ providedIn: 'root' })
export class UiAccessService {
  private readonly _hiddenElements = signal<ReadonlySet<string>>(new Set<string>());
  private readonly _initialized = signal(false);

  readonly hiddenElements = this._hiddenElements.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  initialize(keys: readonly string[]): void {
    this._hiddenElements.set(new Set(keys));
    this._initialized.set(true);
  }

  isInitialized(): boolean {
    return this._initialized();
  }

  /** Un élément absent de la liste masquée (ou non déclaré) est toujours visible. */
  isVisible(key: string): boolean {
    return !this._hiddenElements().has(key);
  }

  isHidden(key: string): boolean {
    return this._hiddenElements().has(key);
  }

  reset(): void {
    this._hiddenElements.set(new Set<string>());
    this._initialized.set(false);
  }
}
