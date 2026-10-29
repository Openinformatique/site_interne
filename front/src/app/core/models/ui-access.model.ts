/**
 * Modèles de l'accès UI par utilisateur (masquage dynamique d'éléments d'interface).
 * Les clés (`key`) sont l'identifiant stable envoyé au backend dans `hiddenElements` :
 * format imposé par le back `^[a-z0-9]+([._-][a-z0-9]+)*$`, ex. `orders.button.delete`.
 */

export type UiAccessElementType =
  | 'button'
  | 'page'
  | 'tab'
  | 'column'
  | 'field'
  | 'section'
  | 'menu'
  | 'action'
  | 'other';

/** Élément configurable d'une page (bouton, onglet, colonne...). */
export interface UiAccessElementDefinition {
  key: string;
  label: string;
  type: UiAccessElementType;
  description?: string;
  group?: string;
  dependsOn?: string[];
  defaultVisible?: boolean;
}

/** Manifeste d'une page métier : identité + éléments configurables qu'elle expose. */
export interface PageUiAccessManifest {
  pageKey: string;
  pageLabel: string;
  moduleKey: string;
  moduleLabel: string;
  route: string;
  icon?: string;
  order?: number;

  pageAccess: UiAccessElementDefinition;
  elements: UiAccessElementDefinition[];
}

/** Configuration d'un utilisateur telle que renvoyée/attendue par le backend. */
export interface UserUiAccess {
  userId: string;
  hiddenElements: string[];
}
