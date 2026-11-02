import { MenuItem } from './menu.model';
import { Building2Icon, CalendarClockIcon, ClipboardListIcon, LayoutDashboardIcon, LucideIconData, SearchIcon, SlidersHorizontalIcon, UsersIcon } from 'lucide-angular';
import { UserRole } from '../../../core/models/enums';
import { CLIENTS_UI_KEYS } from '../../pages/clients/access/clients-access.keys';
import { COMMANDES_UI_KEYS } from '../../pages/commandes/access/commandes-access.keys';
import { DASHBOARD_UI_KEYS } from '../../pages/dashboard/access/dashboard-access.keys';
import { PARAMETRES_UI_KEYS } from '../../pages/parametres/access/parametres-access.keys';
import { POINTAGES_UI_KEYS } from '../../pages/pointages/access/pointages-access.keys';
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
  { label: 'Pointages', icon: CalendarClockIcon, link: '/pointages', uiAccessKey: POINTAGES_UI_KEYS.PAGE_ACCESS },

  { label: 'Gestion', isTitle: true },
  { label: 'Clients', icon: Building2Icon, link: '/clients', uiAccessKey: CLIENTS_UI_KEYS.PAGE_ACCESS },
  { label: 'Commandes', icon: ClipboardListIcon, link: '/commandes', uiAccessKey: COMMANDES_UI_KEYS.PAGE_ACCESS },

  { label: 'Administration', isTitle: true },
  // La création d'un utilisateur se fait depuis la liste (bouton « Nouvel utilisateur »).
  {
    label: 'Utilisateurs',
    icon: UsersIcon,
    link: '/users',
    roles: [UserRole.Admin, UserRole.Direction],
    uiAccessKey: USERS_UI_KEYS.PAGE_ACCESS,
  },
  {
    label: 'Paramètres',
    icon: SlidersHorizontalIcon,
    link: '/parametres',
    roles: [UserRole.Admin, UserRole.Direction],
    uiAccessKey: PARAMETRES_UI_KEYS.PAGE_ACCESS,
  },
];

/** Icônes d'onglet des pages hors menu (ex. onglet « Recherche : terme »). */
const ICONES_HORS_MENU: Record<string, LucideIconData> = {
  '/recherche': SearchIcon,
};

/**
 * Icône de l'entrée de premier niveau d'où provient une page (onglets) : le
 * lien le plus long qui préfixe l'URL l'emporte (ex. /clients/196 → icône de
 * Clients) ; à défaut, icône des pages hors menu. Undefined si rien ne correspond.
 */
export function menuIconForUrl(url: string): LucideIconData | undefined {
  const path = url.split(/[?#]/)[0];
  let best: { length: number; icon: LucideIconData } | undefined;
  for (const item of MENU) {
    if (!item.icon) {
      continue;
    }
    for (const link of [item.link, ...(item.subItems ?? []).map(sub => sub.link)]) {
      if (link && (path === link || path.startsWith(link + '/')) && link.length > (best?.length ?? 0)) {
        best = { length: link.length, icon: item.icon };
      }
    }
  }
  return best?.icon ?? ICONES_HORS_MENU[path];
}
