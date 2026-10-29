import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./profile-page/profile-page.component').then((c) => c.ProfilePageComponent),
  },
  {
    path: 'sessions',
    loadComponent: () => import('./sessions-page/sessions-page.component').then((c) => c.SessionsPageComponent),
  },
] as Routes;