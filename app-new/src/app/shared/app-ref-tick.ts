import { ApplicationRef, inject } from '@angular/core';
import { log } from './lifecycle-log';

/**
 * Patches ApplicationRef so that every outermost change-detection pass logs
 * ('App','cd','AppRef.tick'). Angular 20 runs CD through the private `_tick`
 * (called from the scheduler as well as from the public `tick()`), so we patch
 * `_tick` when present and fall back to `tick`.
 * Must be called inside an injection context (e.g. provideAppInitializer).
 */
export function installAppRefTickPatch(): void {
  const appRef = inject(ApplicationRef) as any;
  const name = typeof appRef._tick === 'function' ? '_tick' : 'tick';
  const original: (...args: unknown[]) => unknown = appRef[name];
  let depth = 0;
  appRef[name] = function (this: unknown, ...args: unknown[]) {
    if (depth === 0) log('App', 'cd', 'AppRef.tick');
    depth++;
    try {
      return original.apply(this, args);
    } finally {
      depth--;
    }
  };
}
