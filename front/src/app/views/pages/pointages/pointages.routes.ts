import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pointages-page/pointages-page.component').then((c) => c.PointagesPageComponent),
  },
] as Routes;
