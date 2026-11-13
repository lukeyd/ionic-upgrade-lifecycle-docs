// Shared lifecycle logger. See ../../../LOG-CONTRACT.md (binding).
// Written to be TypeScript 2.4-safe: no optional chaining, nullish coalescing,
// `unknown`, definite-assignment assertions or `as const`.

export interface LifecycleEntry {
  t: number;
  page: string;
  source: string;
  hook: string;
  detail?: string;
}

function now(): number {
  var w: any = window as any;
  if (w.performance && typeof w.performance.now === 'function') {
    return w.performance.now();
  }
  return Date.now();
}

export function log(page: string, source: string, hook: string, detail?: string): void {
  var w: any = window as any;
  w.__lifecycleLog = w.__lifecycleLog || [];
  var t = now();
  var entry: LifecycleEntry = { t: t, page: page, source: source, hook: hook };
  if (detail) {
    entry.detail = detail;
  }
  w.__lifecycleLog.push(entry);
  console.log('[LC] +' + t.toFixed(1) + 'ms ' + page + ' ' + source + ' ' + hook + (detail ? ' (' + detail + ')' : ''));
}
