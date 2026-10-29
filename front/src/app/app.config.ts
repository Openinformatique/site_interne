import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { routes } from './app.routes';
import { TabRouteReuseStrategy } from './core/services/tab-route-reuse.strategy';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideSweetAlert2 } from '@sweetalert2/ngx-sweetalert2';
import { provideHighlightOptions } from 'ngx-highlightjs';

import { authTokenInterceptor } from './core/auth/auth-token.interceptor';
import { apiErrorInterceptor } from './core/auth/api-error.interceptor';
import { refreshInterceptor } from './core/auth/refresh.interceptor';
import { AuthStore } from './core/auth/auth.store';

// Enregistre les données de formatage françaises (chiffres, dates, monnaie).
registerLocaleData(localeFr);

const highlightOptions = {
  coreLibraryLoader: () => import('highlight.js/lib/core'),
  languages: {
    typescript: () => import('highlight.js/lib/languages/typescript'),
    scss: () => import('highlight.js/lib/languages/scss'),
    xml: () => import('highlight.js/lib/languages/xml'),
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: RouteReuseStrategy, useClass: TabRouteReuseStrategy },
    provideAnimationsAsync(),

    // Intercepteurs dans l'ordre voulu : sur la réponse, la chaîne se rejoue à
    // l'envers — refreshInterceptor voit le 401 avant apiErrorInterceptor.
    provideHttpClient(
      withInterceptors([authTokenInterceptor, apiErrorInterceptor, refreshInterceptor]),
    ),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    // Restaure la session (refresh silencieux) AVANT le premier rendu.
    provideAppInitializer(() => inject(AuthStore).bootstrap()),

    provideSweetAlert2(), // ngx-sweetalert2: https://github.com/sweetalert2/ngx-sweetalert2
    provideHighlightOptions(highlightOptions), // ngx-highlightjs: https://github.com/murhafsousli/ngx-highlightjs
  ],
};
