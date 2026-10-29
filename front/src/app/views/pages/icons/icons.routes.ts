import { Routes } from "@angular/router";

export default [
  {
    path: '',
    loadComponent: () => import('./icons.component').then(c => c.IconsComponent)
  },
] as Routes;