import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./users-list/users-list.component').then((c) => c.UsersListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./user-create/user-create.component').then((c) => c.UserCreateComponent),
  },
  {
    path: ':id/ui-access',
    loadComponent: () => import('./user-ui-access/user-ui-access.component').then((c) => c.UserUiAccessComponent),
  },
] as Routes;