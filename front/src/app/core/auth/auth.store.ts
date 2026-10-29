import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { ApiClient } from '../api/api-client.service';
import { CurrentUser } from '../models/current-user.model';
import { UserRole } from '../models/enums';
import { UiAccessService } from '../ui-access/ui-access.service';

/** Réponse de POST /auth/login (le refresh token part en cookie HttpOnly, PAS ici). */
interface LoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: { id: string; email: string; displayName: string };
}
/** Réponse de POST /auth/refresh. */
interface RefreshResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
}
/** Réponse de GET /users/me (UserResponseDto) — c'est ICI qu'on obtient le rôle. */
interface MeResponse {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
/** Réponse de GET /auth/me — c'est ICI qu'on obtient les restrictions d'affichage UI. */
interface AuthMeResponse {
  id: string;
  email: string;
  displayName: string;
  uiAccess?: { hiddenElements: string[] };
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private api = inject(ApiClient);
  private router = inject(Router);
  private uiAccessService = inject(UiAccessService);

  // --- État (signaux privés + lectures publiques en lecture seule) ---
  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<CurrentUser | null>(null);

  /** Access token : EN MÉMOIRE uniquement, jamais persisté (le cookie porte la session). */
  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === UserRole.Admin);
  readonly isDirectionOrAdmin = computed(() => {
    const role = this._currentUser()?.role;
    return role === UserRole.Admin || role === UserRole.Direction;
  });

  /** Route d'accueil. (Dans erp : '/quotes' pour EMPLOYEE — page absente ici, tous → dashboard.) */
  landingRoute(): string {
    return '/dashboard';
  }

  /** Refresh partagé : N requêtes en 401 simultanées attendent le MÊME appel. */
  private refreshInFlight$: Observable<string> | null = null;

  /** Connexion : login → stocke le token → charge le profil (avec le rôle) via /users/me. */
  login(email: string, password: string): Observable<CurrentUser> {
    return this.api.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap((res) => this._accessToken.set(res.accessToken)),
      switchMap(() => this.loadCurrentUser()),
    );
  }

  /** Renouvelle l'access token depuis le cookie de refresh (single-flight). */
  refresh(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;
    this.refreshInFlight$ = this.api.post<RefreshResponse>('/auth/refresh', {}).pipe(
      map((res) => res.accessToken),
      tap((token) => this._accessToken.set(token)),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay(1),
    );
    return this.refreshInFlight$;
  }

  /**
   * Charge l'utilisateur connecté : rôle via /users/me, restrictions d'affichage UI via
   * /auth/me (deux endpoints distincts côté back).
   * ⚠️ /auth/me ne renvoie PAS le rôle. Si le back n'expose pas (encore) /users/me
   * (module users sans controller), on retombe sur l'identité de /auth/me et sur
   * le claim `role` de l'access token.
   */
  loadCurrentUser(): Observable<CurrentUser> {
    return forkJoin([
      this.api.get<MeResponse>('/users/me').pipe(catchError(() => of(null))),
      this.api.get<AuthMeResponse>('/auth/me'),
    ]).pipe(
      tap(([, authMe]) => this.uiAccessService.initialize(authMe.uiAccess?.hiddenElements ?? [])),
      map(([me, authMe]) => ({
        id: me?.id ?? authMe.id,
        email: me?.email ?? authMe.email,
        displayName: me?.displayName ?? authMe.displayName,
        role: me?.role ?? this.roleFromToken() ?? UserRole.Employee,
      })),
      tap((user) => this._currentUser.set(user)),
    );
  }

  /**
   * Rôle lu dans le claim `role` de l'access token — fallback uniquement : quand
   * /users/me existe, c'est lui qui fait foi. Le back reste l'autorité RBAC.
   */
  private roleFromToken(): UserRole | null {
    const token = this._accessToken();
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { role?: string };
      return (Object.values(UserRole) as string[]).includes(payload.role ?? '')
        ? (payload.role as UserRole)
        : null;
    } catch {
      return null;
    }
  }

  /** Déconnexion : révoque la session côté back, purge le store, retourne au login. */
  logout(): void {
    this.api
      .post<void>('/auth/logout')
      .pipe(
        catchError(() => of(void 0)), // même si le réseau échoue, on nettoie côté client
        finalize(() => {
          this.clearSession();
          void this.router.navigate(['/auth/login']);
        }),
      )
      .subscribe();
  }

  /** Purge locale sans appel réseau (utilisée quand le refresh échoue). */
  clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    this.uiAccessService.reset();
  }

  /**
   * Appelée au démarrage (provideAppInitializer). Tente de restaurer la session :
   * refresh (via cookie) puis chargement du profil. En cas d'échec → déconnecté, SILENCIEUX.
   */
  bootstrap(): Promise<void> {
    return new Promise((resolve) => {
      this.refresh()
        .pipe(
          switchMap(() => this.loadCurrentUser()),
          catchError(() => {
            this.clearSession();
            return of(null);
          }),
        )
        .subscribe(() => resolve());
    });
  }
}
