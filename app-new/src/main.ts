import { log } from './app/shared/lifecycle-log';
log('App', 'angular', 'main.ts');

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { buildAppConfig } from './app/app.config';
import { routes } from './app/app.routes';
import { compatRoutes } from './app/app.routes.compat';

const compat = new URLSearchParams(location.search).get('compat') === '1';

bootstrapApplication(AppComponent, buildAppConfig(compat ? compatRoutes : routes)).catch((err) =>
  console.error(err),
);
