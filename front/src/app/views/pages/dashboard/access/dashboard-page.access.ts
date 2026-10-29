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

  elements: [
    {
      key: DASHBOARD_UI_KEYS.RECENT_ORDERS_SECTION,
      label: 'Section Commandes récentes',
      type: 'section',
      defaultVisible: true,
      dependsOn: [DASHBOARD_UI_KEYS.PAGE_ACCESS],
    },
    {
      key: DASHBOARD_UI_KEYS.RECENT_INVOICES_SECTION,
      label: 'Section Factures récentes',
      type: 'section',
      defaultVisible: true,
      dependsOn: [DASHBOARD_UI_KEYS.PAGE_ACCESS],
    },
  ],
} satisfies PageUiAccessManifest;
