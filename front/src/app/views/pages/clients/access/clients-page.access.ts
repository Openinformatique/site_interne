import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { CLIENTS_UI_KEYS } from './clients-access.keys';

/** Manifeste des éléments configurables de la liste des clients (panneau d'administration). */
export const CLIENTS_PAGE_ACCESS = {
  pageKey: 'clients',
  pageLabel: 'Liste des clients',
  moduleKey: 'clients',
  moduleLabel: 'Module clients',
  route: '/clients',
  order: 10,

  pageAccess: {
    key: CLIENTS_UI_KEYS.PAGE_ACCESS,
    label: 'Accéder à la liste des clients',
    type: 'page',
    defaultVisible: true,
  },

  elements: [
    {
      key: CLIENTS_UI_KEYS.CREATE_BUTTON,
      label: 'Bouton Nouveau client',
      type: 'button',
      defaultVisible: true,
      dependsOn: [CLIENTS_UI_KEYS.PAGE_ACCESS],
    },
  ],
} satisfies PageUiAccessManifest;
