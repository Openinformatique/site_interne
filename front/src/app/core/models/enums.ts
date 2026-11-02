/**
 * Miroir des enums du back (mêmes valeurs chaînes, stockées/attendues telles quelles).
 * Au socle : seul UserRole est requis (RBAC). Les autres enums (ContactType,
 * ProductType, QuoteStatus…) seront ajoutés ici par leur feature.
 */
export enum UserRole {
  Admin = 'ADMIN',
  Direction = 'DIRECTION',
  Employee = 'EMPLOYEE',
}

/** Libellés d'affichage (français) — jamais la valeur brute à l'écran. */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Admin]: 'Administrateur',
  [UserRole.Direction]: 'Direction',
  [UserRole.Employee]: 'Employé',
};

