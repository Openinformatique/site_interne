import { MenuItem } from './menu.model';
import { Building2Icon, LayoutDashboardIcon, UsersIcon } from 'lucide-angular';
import { UserRole } from '../../../core/models/enums';
import { CLIENTS_UI_KEYS } from '../../pages/clients/access/clients-access.keys';
import { DASHBOARD_UI_KEYS } from '../../pages/dashboard/access/dashboard-access.keys';
import { USERS_UI_KEYS } from '../../pages/users/access/users-access.keys';

/**
 * Menu latéral (voir views/layout/README.md).
 *
 * Une entrée à sous-options (groupe) ne porte pas de lien : en menu replié,
 * un clic sur son icône ouvre sa première sous-option et déplie le menu.
 */
export const MENU: MenuItem[] = [
  { label: 'Général', isTitle: true },
  { label: 'Tableau de bord', icon: LayoutDashboardIcon, link: '/dashboard', uiAccessKey: DASHBOARD_UI_KEYS.PAGE_ACCESS },

  { label: 'Gestion', isTitle: true },
  {
    label: 'Module clients',
    icon: Building2Icon,
    subItems: [
      { label: 'Liste des clients', link: '/clients', uiAccessKey: CLIENTS_UI_KEYS.PAGE_ACCESS },
      { label: 'Commandes', link: '/commandes' },
    ],
  },

  { label: 'Administration', isTitle: true },
  // La création d'un utilisateur se fait depuis la liste (bouton « Nouvel utilisateur »).
  {
    label: 'Utilisateurs',
    icon: UsersIcon,
    link: '/users',
    roles: [UserRole.Admin, UserRole.Direction],
    uiAccessKey: USERS_UI_KEYS.PAGE_ACCESS,
  },
];
