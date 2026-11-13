// Shared lifecycle logger — see /LOG-CONTRACT.md (binding).
export interface LifecycleEntry {
  t: number;
  page: string;
  source: string;
  hook: string;
  detail?: string;
}

export function log(page: string, source: string, hook: string, detail?: string): void {
  const w = window as any;
  w.__lifecycleLog = w.__lifecycleLog || [];
  const t = performance.now();
  const entry: LifecycleEntry = { t, page, source, hook };
  if (detail) entry.detail = detail;
  w.__lifecycleLog.push(entry);
  console.log('[LC] +' + t.toFixed(1) + 'ms ' + page + ' ' + source + ' ' + hook + (detail ? ' (' + detail + ')' : ''));
}
