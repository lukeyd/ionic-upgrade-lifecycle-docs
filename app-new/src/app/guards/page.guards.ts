import { CanActivateFn, CanDeactivateFn, CanMatchFn, ResolveFn } from '@angular/router';
import { log } from '../shared/lifecycle-log';

function later<T>(value: T, page: string, hook: string): Promise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => {
      log(page, 'guard', hook, 'resolved(true)');
      resolve(value);
    }, 0);
  });
}

export function makeCanMatch(page: string): CanMatchFn {
  return () => { log(page, 'guard', 'canMatch'); return later(true, page, 'canMatch'); };
}

export function makeCanActivate(page: string): CanActivateFn {
  return () => { log(page, 'guard', 'canActivate'); return later(true, page, 'canActivate'); };
}

export function makeResolve(page: string): ResolveFn<{ page: string }> {
  return () => { log(page, 'guard', 'resolve'); return later({ page }, page, 'resolve'); };
}

export function makeCanDeactivate(page: string): CanDeactivateFn<unknown> {
  return (component) => {
    log(page, 'guard', 'canDeactivate', component ? 'has component instance' : 'no instance');
    return later(true, page, 'canDeactivate');
  };
}
