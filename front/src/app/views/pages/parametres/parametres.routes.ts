import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./parametres-page/parametres-page.component').then((c) => c.ParametresPageComponent),
  },
] as Routes;
