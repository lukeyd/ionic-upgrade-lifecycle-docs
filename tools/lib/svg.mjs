// Self-contained HTML report writer (inline CSS + inline SVG swimlanes) for docs/lifecycle-report.html
import { rowLabel } from './collapse.mjs';
import { narrativeToHtml } from './narrative.mjs';
import { APP_LABELS, VERSIONS, VERDICTS } from './mapping.mjs';

// ---- layout constants (px in SVG user units) --------------------------------
const STEP = 34;          // horizontal distance per ordinal
const LANE_H = 30;        // lane height
const LABEL_ROOM = 150;   // label strip above the lanes (labels are rotated -45deg)
const LEFT = 150;         // room for lane names
const RIGHT_PAD = 150;    // room for the last rotated label
const BAND_HEAD = 28;     // band title
const BAND_GAP = 30;
const DOT_R = 5;

const LANES = [
  { id: 'angular', label: 'angular', match: ['angular'] },
  { id: 'ionic', label: 'ionic', match: ['ionic'] },
  { id: 'ionic-app', label: 'ionic-app · compat', match: ['ionic-app', 'ionic-compat'] },
  { id: 'router', label: 'router', match: ['router'] },
  { id: 'guard', label: 'guard', match: ['guard'] },
  { id: 'render', label: 'render', match: ['render'] },
  { id: 'cd', label: 'cd', match: ['cd'] },
];
const BAND_H = BAND_HEAD + LABEL_ROOM + LANES.length * LANE_H;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ms = (t) => `+${Number(t).toFixed(1)} ms`;
const laneIndex = (source) => Math.max(0, LANES.findIndex((l) => l.match.includes(source)));
const pageClass = (p) => (['Home', 'Detail', 'App'].includes(p) ? `p-${p}` : 'p-Mixed');
const VERDICT_CLASS = { 'same-order': 'v-same', earlier: 'v-move', later: 'v-move', 'never-fires': 'v-never', 'new-only': 'v-new', 'n/a': 'v-na' };

function badge(verdict) {
  const v = VERDICTS[verdict] || VERDICTS['n/a'];
  return `<span class="badge ${VERDICT_CLASS[verdict] || 'v-na'}"><span class="sym" aria-hidden="true">${esc(v.symbol)}</span>${esc(v.text)}</span>`;
}

// ---- SVG ----------------------------------------------------------------------

function dotPosition(bandTop, rows, hook, page) {
  const k = rows.findIndex((r) => r.kind !== 'cycle' && r.hook === hook && r.page === page);
  if (k < 0) return null;
  const laneTop = bandTop + BAND_HEAD + LABEL_ROOM;
  return { x: LEFT + k * STEP + STEP / 2, y: laneTop + laneIndex(rows[k].source) * LANE_H + LANE_H / 2 };
}

function renderBand(app, col, bandTop, width) {
  const laneTop = bandTop + BAND_HEAD + LABEL_ROOM;
  const parts = [];
  parts.push(`<text class="band-title" x="${LEFT}" y="${bandTop + 18}">${esc(APP_LABELS[app])} <tspan class="band-sub">${esc(VERSIONS[app].label)} · ${col.entries.length} events, ${col.rows.length} rows, ${col.durationMs} ms</tspan></text>`);
  LANES.forEach((lane, k) => {
    const y = laneTop + k * LANE_H;
    parts.push(`<rect class="lane ${k % 2 ? 'odd' : 'even'}" x="${LEFT}" y="${y}" width="${width - LEFT}" height="${LANE_H}"/>`);
    parts.push(`<text class="lane-label" x="${LEFT - 10}" y="${y + LANE_H / 2 + 4}" text-anchor="end">${esc(lane.label)}</text>`);
  });
  parts.push(`<line class="axis" x1="${LEFT}" y1="${laneTop}" x2="${LEFT}" y2="${laneTop + LANES.length * LANE_H}"/>`);
  const labelY = laneTop - 8;
  col.rows.forEach((row, k) => {
    const x = LEFT + k * STEP + STEP / 2;
    const y = laneTop + laneIndex(row.source) * LANE_H + LANE_H / 2;
    const isCycle = row.kind === 'cycle';
    const label = rowLabel(row, { withPage: false });
    const detail = row.detail ? ` (${row.detail})` : '';
    const tip = `${row.page} · ${isCycle ? 'CD cycle' : row.hook}${detail} ×${row.count}\n${ms(row.t)}${row.count > 1 ? ` → ${ms(row.tEnd)}` : ''} · ordinal ${k + 1} · log #${row.i}${row.count > 1 ? `–${row.iEnd}` : ''}`;
    parts.push(`<g class="ev ${pageClass(row.page)}${isCycle ? ' cycle' : ''}" data-hook="${esc(isCycle ? 'CD cycle' : row.hook)}" data-page="${esc(row.page)}" tabindex="0">`);
    parts.push(`<title>${esc(tip)}</title>`);
    parts.push(`<line class="guide" x1="${x}" y1="${labelY + 4}" x2="${x}" y2="${y - DOT_R - 2}"/>`);
    parts.push(`<text class="ev-label" transform="translate(${x + 3} ${labelY}) rotate(-45)">${esc(label)}</text>`);
    parts.push(`<circle class="hit" cx="${x}" cy="${y}" r="12"/>`);
    parts.push(`<circle class="dot" cx="${x}" cy="${y}" r="${DOT_R}"/>`);
    parts.push('</g>');
  });
  return parts.join('\n');
}

function renderSwimlane(phase, apps) {
  const maxRows = Math.max(1, ...apps.map((a) => phase.byApp[a].rows.length));
  const width = LEFT + maxRows * STEP + RIGHT_PAD;
  const height = apps.length * BAND_H + (apps.length - 1) * BAND_GAP + 10;
  const bandTop = {};
  apps.forEach((a, i) => { bandTop[a] = 5 + i * (BAND_H + BAND_GAP); });
  const parts = [];
  parts.push(`<svg class="swim" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(`${phase.name} phase: lifecycle event order per app, one dot per collapsed event, lanes by source`)}">`);
  // connectors first (under the dots)
  if (apps.includes('old') && apps.includes('new')) {
    for (const r of phase.mapping) {
      if (!r.connector || !r.oldPos || !r.newPos) continue;
      const a = dotPosition(bandTop.old, phase.byApp.old.rows, r.old, r.page);
      const b = dotPosition(bandTop.new, phase.byApp.new.rows, r.new, r.page);
      if (!a || !b) continue;
      parts.push(`<g class="link"><title>${esc(`${r.page}: ${r.old} → ${r.new} (${VERDICTS[r.verdict].text})`)}</title><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/></g>`);
    }
  }
  for (const a of apps) parts.push(renderBand(a, phase.byApp[a], bandTop[a], width - RIGHT_PAD + 40));
  parts.push('</svg>');
  return parts.join('\n');
}

// ---- tables ----------------------------------------------------------------------

function mappingTableHtml(rows, apps) {
  const hasCompat = apps.includes('new-compat');
  const pos = (p) => (p ? `#${p.ordinal}` : '–');
  const head = ['Old hook', 'New equivalent', 'Page', 'Old #', 'New #', ...(hasCompat ? ['Compat #'] : []), 'Verdict', ...(hasCompat ? ['Compat verdict'] : []), 'Note'];
  const out = [`<table class="map"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>`];
  for (const r of rows) {
    const cells = [
      r.old ? `<code>${esc(r.old)}</code>` : '<span class="muted">—</span>',
      `<code>${esc(r.new)}</code>${r.alt ? ` / <code>${esc(r.alt)}</code>` : ''}`,
      esc(r.page),
      `<span class="num">${pos(r.oldPos)}</span>`,
      `<span class="num">${pos(r.newPos)}</span>`,
    ];
    if (hasCompat) cells.push(r.compatPos ? `<span class="num">${pos(r.compatPos)}</span> <code class="muted">${esc(r.compatHook)}</code>` : '–');
    cells.push(badge(r.verdict));
    if (hasCompat) cells.push(badge(r.verdictCompat));
    cells.push(`<span class="note">${esc(r.note)}</span>`);
    out.push(`<tr class="${VERDICT_CLASS[r.verdict]}">${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`);
  }
  out.push('</tbody></table>');
  return out.join('\n');
}

function eventsTableHtml(phase, apps) {
  const n = Math.max(...apps.map((a) => phase.byApp[a].rows.length));
  const out = [`<table class="events"><thead><tr><th>#</th>${apps.map((a) => `<th>${esc(APP_LABELS[a])}</th>`).join('')}</tr></thead><tbody>`];
  for (let i = 0; i < n; i++) {
    const cells = apps.map((a) => {
      const r = phase.byApp[a].rows[i];
      if (!r) return '<td></td>';
      return `<td><span class="sw ${pageClass(r.page)}${r.kind === 'cycle' ? ' cycle' : ''}" aria-hidden="true"></span>${esc(rowLabel(r))}${r.detail ? ` <span class="muted">(${esc(r.detail)})</span>` : ''} <span class="num muted">${ms(r.t)}</span></td>`;
    });
    out.push(`<tr><td class="num">${i + 1}</td>${cells.join('')}</tr>`);
  }
  out.push('</tbody></table>');
  return out.join('\n');
}

// ---- page -----------------------------------------------------------------------

const CSS = `
/* Layout: one column of phase sections; each swimlane scrolls sideways inside its own frame. */
:root {
  --bg: #f9f9f7; --surface: #fcfcfb; --fg: #0b0b0b; --fg-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --border: rgba(11,11,11,.10); --lane-odd: rgba(11,11,11,.025);
  --home: #2a78d6; --detail: #eb6834; --app: #1baf7a; --mixed: #898781;
  --good: #0ca30c; --warn: #fab219; --crit: #d03b3b;
  --font: system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d0d0d; --surface: #1a1a19; --fg: #ffffff; --fg-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,.10); --lane-odd: rgba(255,255,255,.035);
    --home: #3987e5; --detail: #d95926; --app: #199e70; --mixed: #898781;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0d0d0d; --surface: #1a1a19; --fg: #ffffff; --fg-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,.10); --lane-odd: rgba(255,255,255,.035);
  --home: #3987e5; --detail: #d95926; --app: #199e70; --mixed: #898781;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { font-size: 14px; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); line-height: 1.5; padding-block: 24px 64px; padding-inline: 16px; }
main { max-width: 1240px; margin: 0 auto; min-width: 0; }
h1 { font-size: 1.85rem; line-height: 1.15; margin: 0 0 .35rem; text-wrap: balance; letter-spacing: -.01em; }
h2 { font-size: 1.35rem; margin: 2.6rem 0 .6rem; text-wrap: balance; }
h3 { font-size: 1rem; margin: 1.6rem 0 .5rem; }
p { max-width: 68ch; margin: .4rem 0; }
.sub { color: var(--fg-2); }
code { font-family: var(--mono); font-size: .92em; }
.muted { color: var(--muted); }
.num { font-variant-numeric: tabular-nums; }
.eyebrow { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }
.banner { border: 1px solid var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); border-radius: 6px; padding: 8px 12px; margin: 12px 0; max-width: none; }

table { border-collapse: collapse; width: 100%; font-size: .92rem; }
th, td { text-align: left; vertical-align: top; padding: 6px 10px; border-bottom: 1px solid var(--grid); }
th { font-weight: 600; color: var(--fg-2); font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }
.table-wrap { overflow-x: auto; max-width: 100%; }
table.meta td:first-child { white-space: nowrap; font-weight: 600; }
table.map td .note { color: var(--fg-2); font-size: .88rem; display: block; min-width: 18rem; }
table.map code { white-space: nowrap; }
table.events td { white-space: nowrap; }
.sw { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: 0; background: var(--mixed); }
.sw.cycle { background: var(--surface); border: 2px solid var(--mixed); width: 9px; height: 9px; }
.p-Home .dot, .sw.p-Home { fill: var(--home); background: var(--home); }
.p-Detail .dot, .sw.p-Detail { fill: var(--detail); background: var(--detail); }
.p-App .dot, .sw.p-App { fill: var(--app); background: var(--app); }
.p-Mixed .dot, .sw.p-Mixed { fill: var(--mixed); background: var(--mixed); }

.badge { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--bc, var(--axis)); border-radius: 999px; padding: 1px 9px 1px 7px; font-size: .8rem; white-space: nowrap; background: color-mix(in srgb, var(--bc, var(--axis)) 14%, transparent); color: var(--fg); }
.badge .sym { font-weight: 700; color: var(--bc, var(--muted)); }
.badge.v-same { --bc: var(--good); }
.badge.v-move { --bc: var(--warn); }
.badge.v-never { --bc: var(--crit); }
.badge.v-new { --bc: var(--home); }
.badge.v-na { --bc: var(--axis); }
.badge.v-move .sym { color: color-mix(in srgb, var(--warn) 70%, var(--fg)); }

.stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 14px; padding: 0; list-style: none; }
.stats li { border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; background: var(--surface); min-width: 0; flex: 1 1 200px; }
.stats b { display: block; font-size: 1.2rem; font-weight: 600; }
.stats span { color: var(--fg-2); font-size: .85rem; }

figure { margin: 0; }
.frame { overflow-x: auto; overflow-y: hidden; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); max-width: 100%; }
svg.swim { display: block; max-width: none; font-family: var(--font); }
figcaption { color: var(--fg-2); font-size: .88rem; margin: 8px 0 0; max-width: 68ch; }

.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; font-size: .85rem; color: var(--fg-2); margin: 10px 0 0; }
.legend .key { display: inline-flex; align-items: center; gap: 6px; }
.legend .dash { width: 26px; border-top: 2px dashed var(--muted); display: inline-block; }

/* SVG parts */
.band-title { font-size: 13px; font-weight: 600; fill: var(--fg); }
.band-sub { font-weight: 400; fill: var(--fg-2); font-size: 11.5px; }
.lane.even { fill: transparent; }
.lane.odd { fill: var(--lane-odd); }
.lane-label { font-size: 11px; fill: var(--muted); }
.axis { stroke: var(--axis); stroke-width: 1; }
.guide { stroke: var(--grid); stroke-width: 1; }
.ev-label { font-family: var(--mono); font-size: 10.5px; fill: var(--fg-2); }
.ev .dot { stroke: var(--surface); stroke-width: 2; }
.ev.cycle .dot { fill: var(--surface); stroke: var(--mixed); stroke-width: 2; }
.ev .hit { fill: transparent; }
.ev { cursor: default; outline: none; }
.ev:hover .dot, .ev:focus-visible .dot, .ev.hl .dot { stroke: var(--fg); r: 7; }
.ev:hover .ev-label, .ev:focus-visible .ev-label, .ev.hl .ev-label { fill: var(--fg); font-weight: 600; }
.ev:hover .guide, .ev:focus-visible .guide, .ev.hl .guide { stroke: var(--fg-2); }
.link line { stroke: var(--muted); stroke-width: 1.5; stroke-dasharray: 5 4; opacity: .8; }
.link:hover line { stroke: var(--fg); opacity: 1; }

details { margin: 12px 0; }
summary { cursor: pointer; color: var(--fg-2); }
#narrative { border-top: 1px solid var(--grid); margin-top: 2.5rem; padding-top: 1rem; }
#narrative li { margin: 4px 0; max-width: 90ch; }
:focus-visible { outline: 2px solid var(--home); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) { .ev .dot { transition: r .12s ease; } }
@media (max-width: 600px) { html { font-size: 13px; } th, td { padding: 5px 7px; } }
`;

const SCRIPT = `
(function () {
  var all = document.querySelectorAll('.ev[data-hook]');
  function mark(hook, on) {
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-hook') === hook) all[i].classList.toggle('hl', on);
    }
  }
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    el.addEventListener('pointerenter', function (e) { mark(e.currentTarget.getAttribute('data-hook'), true); });
    el.addEventListener('pointerleave', function (e) { mark(e.currentTarget.getAttribute('data-hook'), false); });
    el.addEventListener('focus', function (e) { mark(e.currentTarget.getAttribute('data-hook'), true); });
    el.addEventListener('blur', function (e) { mark(e.currentTarget.getAttribute('data-hook'), false); });
  }
})();
`;

export function renderHtml(report) {
  const apps = report.apps;
  const out = [];
  out.push('<!doctype html>', '<html lang="en">', '<head>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
  out.push('<title>Lifecycle Order Comparison</title>', `<style>${CSS}</style>`, '</head>', '<body>', '<main>');
  out.push('<header>');
  out.push('<div class="eyebrow">Ionic 3 → Ionic 8 upgrade research</div>');
  out.push('<h1>Lifecycle Order Comparison</h1>');
  out.push(`<p class="sub">Page lifecycle hooks as logged by the two reference apps, split into boot, forward (Home → Detail) and back (Detail → Home). Generated ${esc(report.generatedAt)}.</p>`);
  if (report.sample) out.push('<p class="banner"><strong>Sample data.</strong> These captures are emulated from <code>tools/fixture/sequences.mjs</code>, not from real app runs.</p>');
  out.push('<div class="table-wrap"><table class="meta"><thead><tr><th>Capture</th><th>Versions</th><th>URL</th><th>Captured at</th><th>Log entries</th></tr></thead><tbody>');
  for (const app of apps) {
    const c = report.captures[app];
    out.push(`<tr><td>${esc(APP_LABELS[app])} <code class="muted">${esc(app)}</code></td><td>${esc(VERSIONS[app].label)}</td><td><code>${esc(c.meta.url)}</code></td><td class="num">${esc(c.meta.capturedAt)}</td><td class="num">${c.meta.total}</td></tr>`);
  }
  out.push('</tbody></table></div>');
  out.push('<p class="legend"><span class="key"><span class="sw p-Home"></span>Home</span><span class="key"><span class="sw p-Detail"></span>Detail</span><span class="key"><span class="sw p-App"></span>App</span><span class="key"><span class="sw cycle"></span>CD cycle ×N (repeated change-detection pass)</span><span class="key"><span class="dash"></span>mapped Old → New hook (renamed hooks only)</span></p>');
  out.push('<p class="sub">Each dot is one collapsed event; identical consecutive events show <code>×N</code>. Position is by ordinal, not by time; hover or focus a dot for its millisecond offset and log index. Hovering highlights the same hook in every band.</p>');
  out.push('</header>');

  for (const phase of report.phases) {
    out.push(`<section id="phase-${phase.name}">`);
    out.push(`<h2>${esc(phase.name)} phase</h2>`);
    out.push('<ul class="stats">');
    for (const app of apps) {
      const col = phase.byApp[app];
      out.push(`<li><span>${esc(APP_LABELS[app])}</span><b class="num">${col.entries.length} events → ${col.rows.length} rows</b><span class="num">${col.durationMs} ms from phase marker</span></li>`);
    }
    out.push('</ul>');
    out.push('<figure>');
    out.push(`<div class="frame">${renderSwimlane(phase, apps)}</div>`);
    out.push(`<figcaption>${esc(phase.name)} phase: one swimlane band per app, lanes by log source, events left to right in observed order. Dashed lines join an Ionic 3 hook to its renamed Ionic 8 equivalent.</figcaption>`);
    out.push('</figure>');
    out.push(`<details><summary>Collapsed event list (${apps.map((a) => `${APP_LABELS[a]}: ${phase.byApp[a].rows.length}`).join(', ')})</summary><div class="table-wrap">${eventsTableHtml(phase, apps)}</div></details>`);
    out.push(`<h3>Hook mapping and observed order</h3>`);
    out.push('<p class="sub">Positions are first-occurrence ordinals among the hooks of that page in this phase. "Same order" means the relative order against the other mapped hooks of the page is unchanged.</p>');
    out.push(`<div class="table-wrap">${mappingTableHtml(phase.mapping, apps)}</div>`);
    out.push('</section>');
  }

  out.push('<section id="narrative">');
  out.push('<h2>How to make Ionic 8 match the Ionic 3 order</h2>');
  if (report.narrative) out.push(narrativeToHtml(report.narrative));
  else out.push('<!-- NARRATIVE: docs/narrative.md not found -->');
  out.push('<h3>Auto-generated facts from the verdict columns</h3>');
  out.push('<ul>');
  let any = false;
  for (const phase of report.phases) for (const f of phase.facts) { any = true; out.push(`<li>${esc(f).replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`); }
  if (!any) out.push('<li>(no order differences detected)</li>');
  out.push('</ul>');
  out.push('</section>');
  out.push('</main>', `<script>${SCRIPT}</script>`, '</body>', '</html>', '');
  return out.join('\n');
}
