import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { DASHBOARD_UI_KEYS } from './dashboard-access.keys';

/** Manifeste des éléments configurables de la page Tableau de bord (panneau d'administration). */
export const DASHBOARD_PAGE_ACCESS = {
  pageKey: 'dashboard',
  pageLabel: 'Tableau de bord',
  moduleKey: 'general',
  moduleLabel: 'Général',
  route: '/dashboard',
  order: 0,

  pageAccess: {
    key: DASHBOARD_UI_KEYS.PAGE_ACCESS,
    label: 'Accéder au tableau de bord',
    type: 'page',
    defaultVisible: true,
  },

  // Aucun élément configurable tant que le tableau de bord n'est pas conçu.
  elements: [],
} satisfies PageUiAccessManifest;
