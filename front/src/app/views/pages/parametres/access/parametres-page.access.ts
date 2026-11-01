import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { PARAMETRES_UI_KEYS } from './parametres-access.keys';

/** Manifeste des éléments configurables de l'écran Paramètres (panneau d'administration). */
export const PARAMETRES_PAGE_ACCESS = {
  pageKey: 'parametres',
  pageLabel: 'Paramètres',
  moduleKey: 'admin',
  moduleLabel: 'Administration',
  route: '/parametres',
  order: 50,

  pageAccess: {
    key: PARAMETRES_UI_KEYS.PAGE_ACCESS,
    label: "Accéder à l'écran Paramètres",
    type: 'page',
    defaultVisible: true,
  },

  elements: [
    {
      key: PARAMETRES_UI_KEYS.CREATE_TABLE_BUTTON,
      label: 'Bouton Nouvelle table',
      type: 'button',
      defaultVisible: true,
      dependsOn: [PARAMETRES_UI_KEYS.PAGE_ACCESS],
    },
    {
      key: PARAMETRES_UI_KEYS.CREATE_PARAMETRE_BUTTON,
      label: 'Bouton Nouveau paramètre',
      type: 'button',
      defaultVisible: true,
      dependsOn: [PARAMETRES_UI_KEYS.PAGE_ACCESS],
    },
    {
      key: PARAMETRES_UI_KEYS.DELETE_BUTTON,
      label: 'Suppression (table, paramètre)',
      type: 'button',
      defaultVisible: true,
      dependsOn: [PARAMETRES_UI_KEYS.PAGE_ACCESS],
    },
  ],
} satisfies PageUiAccessManifest;
