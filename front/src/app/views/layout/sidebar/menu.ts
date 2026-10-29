import { MenuItem } from './menu.model';
import { LayoutDashboardIcon, UsersIcon } from 'lucide-angular';
import { UserRole } from '../../../core/models/enums';
import { DASHBOARD_UI_KEYS } from '../../pages/dashboard/access/dashboard-access.keys';
import { USERS_UI_KEYS } from '../../pages/users/access/users-access.keys';

export const MENU: MenuItem[] = [
  { label: 'Général', isTitle: true },
  // Dans erp le dashboard est réservé ADMIN/MANAGER (les employés atterrissent sur /quotes) ;
  // ici /quotes n'existe pas encore, on le laisse donc visible par tous.
  { label: 'Tableau de bord', icon: LayoutDashboardIcon, link: '/dashboard', uiAccessKey: DASHBOARD_UI_KEYS.PAGE_ACCESS },

  { label: 'Administration', isTitle: true },
  {
    label: 'Utilisateurs',
    icon: UsersIcon,
    roles: [UserRole.Admin, UserRole.Manager],
    subItems: [
      { label: 'Liste utilisateurs', link: '/users', uiAccessKey: USERS_UI_KEYS.PAGE_ACCESS },
      { label: 'Nouvel utilisateur', link: '/users/new', uiAccessKey: USERS_UI_KEYS.CREATE_BUTTON },
    ],
  },
];
