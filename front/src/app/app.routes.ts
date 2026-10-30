import { Routes } from '@angular/router';
import { BaseComponent } from './views/layout/base/base.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { uiAccessGuard } from './core/ui-access/ui-access.guard';
import { UserRole } from './core/models/enums';
import { CLIENTS_UI_KEYS } from './views/pages/clients/access/clients-access.keys';
import { DASHBOARD_UI_KEYS } from './views/pages/dashboard/access/dashboard-access.keys';
import { USERS_UI_KEYS } from './views/pages/users/access/users-access.keys';

export const routes: Routes = [
  { path: 'auth', loadChildren: () => import('./views/pages/auth/auth.routes')},
  {
    path: '',
    component: BaseComponent,
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./views/pages/dashboard/dashboard.routes'),
        canActivate: [uiAccessGuard],
        data: { uiAccessKey: DASHBOARD_UI_KEYS.PAGE_ACCESS },
      },
      {
        path: 'users',
        loadChildren: () => import('./views/pages/users/users.routes'),
        canActivate: [roleGuard, uiAccessGuard],
        data: { roles: [UserRole.Admin, UserRole.Direction], uiAccessKey: USERS_UI_KEYS.PAGE_ACCESS },
      },
      // Module clients (visible par tous les rôles).
      {
        path: 'clients',
        loadChildren: () => import('./views/pages/clients/clients.routes'),
        canActivate: [uiAccessGuard],
        data: { uiAccessKey: CLIENTS_UI_KEYS.PAGE_ACCESS },
      },
      {
        path: 'commandes',
        loadChildren: () => import('./views/pages/commandes/commandes.routes'),
      },
      {
        path: 'profile',
        loadChildren: () => import('./views/pages/profile/profile.routes'),
      },
    ]
  },
  {
    path: 'error',
    loadComponent: () => import('./views/pages/error/error.component').then(c => c.ErrorComponent),
  },
  {
    path: 'error/:type',
    loadComponent: () => import('./views/pages/error/error.component').then(c => c.ErrorComponent)
  },
  { path: '**', redirectTo: 'error/404', pathMatch: 'full' }
];
