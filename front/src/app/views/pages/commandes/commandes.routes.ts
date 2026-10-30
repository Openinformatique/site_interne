import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./commandes-list/commandes-list.component').then((c) => c.CommandesListComponent),
  },
  // « nouvelle » avant « :id » pour ne pas être capturé par le paramètre.
  {
    path: 'nouvelle',
    loadComponent: () => import('./commande-fiche/commande-fiche.component').then((c) => c.CommandeFicheComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./commande-fiche/commande-fiche.component').then((c) => c.CommandeFicheComponent),
  },
] as Routes;
