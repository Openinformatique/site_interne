import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./clients-list/clients-list.component').then((c) => c.ClientsListComponent),
  },
  // « nouveau » avant « :id » pour ne pas être capturé par le paramètre.
  {
    path: 'nouveau',
    loadComponent: () => import('./client-fiche/client-fiche.component').then((c) => c.ClientFicheComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./client-fiche/client-fiche.component').then((c) => c.ClientFicheComponent),
  },
] as Routes;
