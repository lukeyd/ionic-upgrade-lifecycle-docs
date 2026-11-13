import { ApplicationConfig, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { RouteReuseStrategy, Routes, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { installAppRefTickPatch } from './shared/app-ref-tick';
import { installRouterEventLogging } from './shared/router-events';

export function buildAppConfig(routes: Routes): ApplicationConfig {
  return {
    providers: [
      provideZoneChangeDetection({ eventCoalescing: true }),
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular({ mode: 'md' }),
      provideRouter(routes),
      provideAppInitializer(() => {
        installAppRefTickPatch();
        installRouterEventLogging();
      }),
    ],
  };
}
