/** Session active (GET /auth/sessions). */
export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}
