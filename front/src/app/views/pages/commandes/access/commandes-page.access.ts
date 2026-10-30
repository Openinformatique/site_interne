import { PageUiAccessManifest } from '../../../../core/models/ui-access.model';
import { COMMANDES_UI_KEYS } from './commandes-access.keys';

/** Manifeste des éléments configurables de la liste des commandes (panneau d'administration). */
export const COMMANDES_PAGE_ACCESS = {
  pageKey: 'commandes',
  pageLabel: 'Liste des commandes',
  moduleKey: 'commandes',
  moduleLabel: 'Commandes',
  route: '/commandes',
  order: 20,

  pageAccess: {
    key: COMMANDES_UI_KEYS.PAGE_ACCESS,
    label: 'Accéder à la liste des commandes',
    type: 'page',
    defaultVisible: true,
  },

  elements: [
    {
      key: COMMANDES_UI_KEYS.CREATE_BUTTON,
      label: 'Bouton Nouvelle commande',
      type: 'button',
      defaultVisible: true,
      dependsOn: [COMMANDES_UI_KEYS.PAGE_ACCESS],
    },
    {
      key: COMMANDES_UI_KEYS.EXPORT_BUTTON,
      label: 'Bouton Export Excel',
      type: 'button',
      defaultVisible: true,
      dependsOn: [COMMANDES_UI_KEYS.PAGE_ACCESS],
    },
  ],
} satisfies PageUiAccessManifest;
