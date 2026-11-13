import { Routes } from '@angular/router';
import { makeCanActivate, makeCanDeactivate, makeCanMatch, makeResolve } from './guards/page.guards';
import { DetailPage } from './pages/detail.page';
import { HomePage } from './pages/home.page';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    component: HomePage,
    canMatch: [makeCanMatch('Home')],
    canActivate: [makeCanActivate('Home')],
    resolve: { data: makeResolve('Home') },
    canDeactivate: [makeCanDeactivate('Home')],
  },
  {
    path: 'detail',
    component: DetailPage,
    canMatch: [makeCanMatch('Detail')],
    canActivate: [makeCanActivate('Detail')],
    resolve: { data: makeResolve('Detail') },
    canDeactivate: [makeCanDeactivate('Detail')],
  },
];
