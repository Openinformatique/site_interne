import { Injectable } from '@angular/core';

import { PageUiAccessManifest } from '../models/ui-access.model';
import { CLIENTS_PAGE_ACCESS } from '../../views/pages/clients/access/clients-page.access';
import { DASHBOARD_PAGE_ACCESS } from '../../views/pages/dashboard/access/dashboard-page.access';
import { USERS_PAGE_ACCESS } from '../../views/pages/users/access/users-page.access';

/**
 * Registre central des manifestes d'accès UI de toutes les features.
 * Ajouter une page = ajouter son manifeste ici (un seul fichier touché,
 * jamais le composant du panneau d'administration).
 */
export const UI_ACCESS_MANIFESTS: PageUiAccessManifest[] = [
  DASHBOARD_PAGE_ACCESS,
  CLIENTS_PAGE_ACCESS,
  USERS_PAGE_ACCESS,
];

@Injectable({ providedIn: 'root' })
export class UiAccessRegistryService {
  getAll(): PageUiAccessManifest[] {
    return [...UI_ACCESS_MANIFESTS].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  }

  getByPageKey(pageKey: string): PageUiAccessManifest | undefined {
    return UI_ACCESS_MANIFESTS.find((manifest) => manifest.pageKey === pageKey);
  }

  /** Toutes les clés déclarées (accès page + éléments), tous manifestes confondus. */
  getAllKeys(): string[] {
    return UI_ACCESS_MANIFESTS.flatMap((manifest) => [
      manifest.pageAccess.key,
      ...manifest.elements.map((element) => element.key),
    ]);
  }
}
