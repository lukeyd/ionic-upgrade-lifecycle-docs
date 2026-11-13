// Collapse a phase's entry list for display.
//  1. consecutive runs of identical (page, source, hook, detail) -> one row with `count`
//  2. "CD bursts": a consecutive run made only of change-detection hooks whose cycle
//     pattern repeats more than once -> the first cycle is kept as-is (so the first CD after
//     a non-CD hook stays visible) and the remaining full cycles become one row
//     { hook: 'CD cycle', source: 'cd', count: N, cycle: [...] }.
// `verbose: true` disables both groupings except nothing (returns rows with count 1).

export const CD_HOOKS = new Set(['ngDoCheck', 'ngAfterContentChecked', 'ngAfterViewChecked', 'template-evaluated', 'afterEveryRender', 'AppRef.tick']);

export const keyOf = (e) => `${e.page}\u0000${e.source}\u0000${e.hook}\u0000${e.detail ?? ''}`;
export const isCd = (e) => CD_HOOKS.has(e.hook);

function runLength(entries) {
  const rows = [];
  for (const e of entries) {
    const last = rows[rows.length - 1];
    if (last && last.key === keyOf(e) && last.kind !== 'cycle') {
      last.count++;
      last.tEnd = e.t;
      last.iEnd = e.i;
    } else {
      rows.push({ ...e, key: keyOf(e), count: 1, tEnd: e.t, iEnd: e.i });
    }
  }
  return rows;
}

/** Find the shortest period p (<= L/2) such that rows[0..k*p) are k>=2 identical repeats. */
function findCycle(rows) {
  const L = rows.length;
  for (let p = 1; p <= Math.floor(L / 2); p++) {
    let k = 1;
    while ((k + 1) * p <= L) {
      let same = true;
      for (let j = 0; j < p; j++) if (rows[k * p + j].key !== rows[j].key) { same = false; break; }
      if (!same) break;
      k++;
    }
    if (k >= 2) return { period: p, repeats: k };
  }
  return null;
}

function groupCd(rows) {
  const out = [];
  let i = 0;
  while (i < rows.length) {
    if (!isCd(rows[i])) { out.push(rows[i++]); continue; }
    let j = i;
    while (j < rows.length && isCd(rows[j])) j++;
    const run = rows.slice(i, j);
    let pos = 0;
    while (pos < run.length) {
      const cyc = findCycle(run.slice(pos));
      if (!cyc) { out.push(...run.slice(pos)); break; }
      const { period, repeats } = cyc;
      const first = run.slice(pos, pos + period);
      out.push(...first); // keep the first cycle visible
      const rest = run.slice(pos + period, pos + period * repeats);
      const pages = [...new Set(rest.map((r) => r.page))];
      out.push({
        kind: 'cycle',
        page: pages.length === 1 ? pages[0] : 'Mixed',
        pages,
        source: 'cd',
        hook: 'CD cycle',
        detail: first.map((r) => `${r.page}.${r.hook}${r.count > 1 ? `×${r.count}` : ''}`).join(' → '),
        cycle: first.map((r) => ({ page: r.page, source: r.source, hook: r.hook, count: r.count })),
        count: repeats - 1,
        t: rest[0].t,
        tEnd: rest[rest.length - 1].tEnd,
        tAbs: rest[0].tAbs,
        i: rest[0].i,
        iEnd: rest[rest.length - 1].iEnd,
        key: `cycle\u0000${first.map((r) => r.key).join('|')}`,
      });
      pos += period * repeats;
    }
    i = j;
  }
  return out;
}

/**
 * @param {Array} entries phase entries (non-marker)
 * @param {{verbose?: boolean}} opts
 * @returns {Array} rows: { page, source, hook, detail?, count, t, tEnd, i, iEnd, kind? , cycle? }
 */
export function collapse(entries, { verbose = false, compact = false } = {}) {
  if (verbose) return entries.map((e) => ({ ...e, key: keyOf(e), count: 1, tEnd: e.t, iEnd: e.i }));
  if (compact) return compactCd(runLength(entries));
  return groupCd(runLength(entries));
}

/** Compact mode: every maximal run of CD-class rows (even a single pass) becomes one row
 *  { hook: 'CD pass', count: number of ticks } so long columns fit the diagram limit. */
function compactCd(rows) {
  const out = [];
  let i = 0;
  while (i < rows.length) {
    if (!isCd(rows[i])) { out.push(rows[i++]); continue; }
    let j = i;
    while (j < rows.length && isCd(rows[j])) j++;
    const run = rows.slice(i, j);
    const ticks = run.filter((r) => r.hook === 'AppRef.tick').reduce((n, r) => n + r.count, 0) || 1;
    const pages = [...new Set(run.map((r) => r.page))];
    const hooks = [...new Set(run.map((r) => `${r.page}.${r.hook}`))];
    out.push({
      kind: 'cycle', page: pages.length === 1 ? pages[0] : 'Mixed', pages, source: 'cd', hook: 'CD pass',
      detail: hooks.join(', '), cycle: run.map((r) => ({ page: r.page, source: r.source, hook: r.hook, count: r.count })),
      count: ticks, t: run[0].t, tEnd: run[run.length - 1].tEnd, tAbs: run[0].tAbs, i: run[0].i, iEnd: run[run.length - 1].iEnd,
      key: `pass\u0000${hooks.join('|')}`,
    });
    i = j;
  }
  return out;
}

/** Human label for a collapsed row: "Page · hook ×N". */
export function rowLabel(row, { withPage = true } = {}) {
  const n = row.count > 1 ? ` ×${row.count}` : '';
  const resolved = row.kind !== 'cycle' && /^resolved\(/.test(row.detail || '') ? ' (resolved)' : '';
  return `${withPage ? `${row.page} · ` : ''}${row.hook}${resolved}${n}`;
}
