import { LucideIconData } from 'lucide-angular';
import { UserRole } from '../../../core/models/enums';

export interface MenuItem {
  label?: string;
  icon?: LucideIconData;
  link?: string;
  subItems?: MenuItem[];
  isTitle?: boolean;
  isExternalLink?: boolean;
  badge?: { variant: string; text: string };
  /** Rôles autorisés à voir l'entrée. Absent/vide = visible par tous. */
  roles?: UserRole[];
  /** Clé d'accès UI (manifeste) contrôlant la visibilité de l'entrée. Absente = toujours visible. */
  uiAccessKey?: string;
}