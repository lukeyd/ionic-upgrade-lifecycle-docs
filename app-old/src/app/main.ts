import { log } from '../shared/lifecycle-log';
log('App', 'angular', 'main.ts');

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
