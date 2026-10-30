import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./commandes-list/commandes-list.component').then((c) => c.CommandesListComponent),
  },
] as Routes;
