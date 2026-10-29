import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { USERS_UI_KEYS } from './users-access.keys';

/** Manifeste des éléments configurables de la page Utilisateurs (panneau d'administration). */
export const USERS_PAGE_ACCESS = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs',
  moduleKey: 'admin',
  moduleLabel: 'Administration',
  route: '/users',
  order: 40,

  pageAccess: {
    key: USERS_UI_KEYS.PAGE_ACCESS,
    label: 'Accéder à la page Utilisateurs',
    type: 'page',
    defaultVisible: true,
  },

  elements: [
    {
      key: USERS_UI_KEYS.CREATE_BUTTON,
      label: 'Bouton Nouvel utilisateur',
      type: 'button',
      defaultVisible: true,
      dependsOn: [USERS_UI_KEYS.PAGE_ACCESS],
    },
    {
      key: USERS_UI_KEYS.CHANGE_ROLE_BUTTON,
      label: 'Action Gérer les rôles',
      type: 'button',
      defaultVisible: true,
      dependsOn: [USERS_UI_KEYS.PAGE_ACCESS],
    },
    {
      key: USERS_UI_KEYS.DEACTIVATE_BUTTON,
      label: 'Action Désactiver / Réactiver',
      type: 'button',
      defaultVisible: true,
      dependsOn: [USERS_UI_KEYS.PAGE_ACCESS],
    },
  ],
} satisfies PageUiAccessManifest;
