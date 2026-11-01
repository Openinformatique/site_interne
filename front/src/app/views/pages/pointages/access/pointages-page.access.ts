import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { POINTAGES_UI_KEYS } from './pointages-access.keys';

/** Manifeste des éléments configurables de l'écran Pointages (panneau d'administration). */
export const POINTAGES_PAGE_ACCESS = {
  pageKey: 'pointages',
  pageLabel: 'Pointages',
  moduleKey: 'pointages',
  moduleLabel: 'Pointages',
  route: '/pointages',
  order: 5,

  pageAccess: {
    key: POINTAGES_UI_KEYS.PAGE_ACCESS,
    label: "Accéder à l'écran des pointages",
    type: 'page',
    defaultVisible: true,
  },

  elements: [],
} satisfies PageUiAccessManifest;
