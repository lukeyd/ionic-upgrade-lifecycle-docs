import { Routes } from '@angular/router';
import { legacyCanEnter, legacyCanLeave } from './compat/legacy-guards';
import { makeCanMatch, makeResolve } from './guards/page.guards';
import { DetailCompatPage } from './pages/compat/detail-compat.page';
import { HomeCompatPage } from './pages/compat/home-compat.page';

/** Same shape as app.routes.ts, but canActivate/canDeactivate are driven by the legacy shim. */
export const compatRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    component: HomeCompatPage,
    canMatch: [makeCanMatch('Home')],
    canActivate: [legacyCanEnter(HomeCompatPage)],
    resolve: { data: makeResolve('Home') },
    canDeactivate: [legacyCanLeave],
  },
  {
    path: 'detail',
    component: DetailCompatPage,
    canMatch: [makeCanMatch('Detail')],
    canActivate: [legacyCanEnter(DetailCompatPage)],
    resolve: { data: makeResolve('Detail') },
    canDeactivate: [legacyCanLeave],
  },
];
