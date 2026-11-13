import { inject } from '@angular/core';
import {
  ActivationEnd, ActivationStart, GuardsCheckEnd, GuardsCheckStart, NavigationEnd, NavigationStart,
  ResolveEnd, ResolveStart, Router, RoutesRecognized,
} from '@angular/router';
import { log } from './lifecycle-log';

/** Logs the Router event stream as ('App','router',<EventClassName>, url). Injection context required. */
export function installRouterEventLogging(): void {
  const router = inject(Router);
  router.events.subscribe((e) => {
    let name: string | null = null;
    let url = '';
    if (e instanceof NavigationStart) { name = 'NavigationStart'; url = e.url; }
    else if (e instanceof RoutesRecognized) { name = 'RoutesRecognized'; url = e.urlAfterRedirects; }
    else if (e instanceof GuardsCheckStart) { name = 'GuardsCheckStart'; url = e.urlAfterRedirects; }
    else if (e instanceof GuardsCheckEnd) { name = 'GuardsCheckEnd'; url = e.urlAfterRedirects; }
    else if (e instanceof ResolveStart) { name = 'ResolveStart'; url = e.urlAfterRedirects; }
    else if (e instanceof ResolveEnd) { name = 'ResolveEnd'; url = e.urlAfterRedirects; }
    else if (e instanceof ActivationStart) { name = 'ActivationStart'; url = e.snapshot.routeConfig?.path ?? ''; }
    else if (e instanceof ActivationEnd) { name = 'ActivationEnd'; url = e.snapshot.routeConfig?.path ?? ''; }
    else if (e instanceof NavigationEnd) { name = 'NavigationEnd'; url = e.urlAfterRedirects; }
    if (name) log('App', 'router', name, url);
  });
}
