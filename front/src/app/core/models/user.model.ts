import { UserRole } from './enums';

/** Utilisateur d'administration (miroir de UserResponseDto ; pas d'updatedAt). */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
