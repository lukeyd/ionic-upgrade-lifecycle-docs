// Minimal linear flowchart: only the hooks a page author writes, one column per stack per phase.
// Section 1: old vs new. Section 2: how the shim is called. Section 3: old vs new + shim, with verdicts.
import { VERSIONS } from './mapping.mjs';

const KEEP = new Set([
  'constructor', 'ngOnInit', 'ngAfterViewInit', 'ngOnDestroy',
  'ionViewCanEnter', 'ionViewCanLeave', 'canActivate', 'canDeactivate', 'resolve',
  'ionViewWillLoad', 'ionViewDidLoad', 'ionViewWillEnter', 'ionViewDidEnter', 'ionViewWillLeave', 'ionViewDidLeave', 'ionViewWillUnload',
  'rAF-after-viewInit', 'afterNextRender',
]);
const GUARDS = new Set(['ionViewCanEnter', 'ionViewCanLeave', 'canActivate', 'canDeactivate', 'resolve']);
const PAINT = new Set(['rAF-after-viewInit', 'afterNextRender']);
const IGNORED = new Set(['ngOnInit', 'ngAfterViewInit', 'ionViewWillLoad', 'ionViewDidLoad', 'ionViewWillEnter', 'ionViewDidEnter']);
const PASS_THROUGH = new Set(['ionViewWillEnter', 'ionViewDidEnter', 'ionViewWillLeave', 'ionViewDidLeave']);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const label = (app) => VERSIONS[app]?.label || app;

function kindOf(e) {
  if (PAINT.has(e.hook)) return 'paint';
  if (e.source === 'ionic-compat') return PASS_THROUGH.has(e.hook) ? 'ionic' : 'shim';
  if (e.source === 'guard' || GUARDS.has(e.hook)) return 'guard';
  if (e.source === 'ionic') return 'ionic';
  return 'angular';
}
const keyOf = (r) => (r.kind === 'paint' ? `${r.page}:PAINT` : `${r.page}:${r.hook}`);

/** Reduce a phase's raw entries to the boxes shown. */
export function simplify(entries, { phase = '', app = '' } = {}) {
  const rows = [];
  for (const e of entries) {
    if (!KEEP.has(e.hook)) continue;
    if (GUARDS.has(e.hook) && e.detail && /resolved/.test(e.detail)) continue;
    const prev = rows[rows.length - 1];
    if (prev && prev.page === e.page && prev.hook === e.hook) continue;
    const row = { page: e.page, hook: e.hook, kind: kindOf(e), note: '' };
    if (GUARDS.has(e.hook)) row.awaited = app === 'old' ? 'awaits Promise' : 'awaits Promise | Observable';
    else if (IGNORED.has(e.hook)) row.ignored = true;
    if (e.hook === 'ionViewCanEnter' && e.detail && /static/.test(e.detail)) row.note = 'static, no instance yet';
    if (e.hook === 'ionViewDidEnter' && app.startsWith('new') && phase === 'boot') row.note = 'fires before the first paint';
    row.key = keyOf(row);
    rows.push(row);
  }
  return rows;
}

function lcsKeys(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = new Set(); let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { out.add(a[i]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return out;
}

const WHY = {
  ionViewCanEnter: 'router runs it before the constructor',
  ionViewCanLeave: 'router runs it before the next page is constructed',
  ionViewWillEnter: 'root page: fires before the first paint',
  ionViewDidEnter: 'root page: fires before the first paint',
  PAINT: 'root page: paint comes after both enter hooks',
};
const whyFor = (r) => { const k = r.kind === 'paint' ? 'PAINT' : r.hook; return Object.hasOwn(WHY, k) ? WHY[k] : ''; };
const ATTACHED = { ionViewWillLoad: 'ngOnInit', ionViewDidLoad: 'ngAfterViewInit', ionViewWillUnload: 'ngOnDestroy' };
const isAnchor = (r) => r.kind === 'angular' || r.kind === 'paint';

/** ok = same neighbours among shared anchors (Angular hooks, first paint) as in old; moved = different; new = not in old. */
export function verdicts(oldRows, compatRows) {
  const oldKeys = new Set(oldRows.map((r) => r.key));
  const compatKeys = new Set(compatRows.map((r) => r.key));
  const shared = (k) => oldKeys.has(k) && compatKeys.has(k);
  const stable = lcsKeys(oldRows.filter((r) => isAnchor(r) && shared(r.key)).map((r) => r.key), compatRows.filter((r) => isAnchor(r) && shared(r.key)).map((r) => r.key));
  const isStable = (r) => isAnchor(r) && stable.has(r.key);
  const neighbours = (rows, idx) => {
    let prev = null, next = null;
    for (let i = idx - 1; i >= 0; i--) if (isStable(rows[i])) { prev = rows[i].key; break; }
    for (let i = idx + 1; i < rows.length; i++) if (isStable(rows[i])) { next = rows[i].key; break; }
    return [prev, next];
  };
  const result = new Map();
  compatRows.forEach((r, i) => {
    if (!oldKeys.has(r.key)) { result.set(r, 'new'); return; }
    if (isAnchor(r)) { result.set(r, stable.has(r.key) ? 'ok' : 'moved'); return; }
    const [op, on] = neighbours(oldRows, oldRows.findIndex((x) => x.key === r.key));
    const [cp, cn] = neighbours(compatRows, i);
    if (op === cp && on === cn) { result.set(r, 'ok'); return; }
    const host = ATTACHED[r.hook];
    const touches = (k) => k && k === `${r.page}:${host}`;
    if (host && (touches(op) || touches(on)) && (touches(cp) || touches(cn))) { result.set(r, 'ok'); return; }
    result.set(r, 'moved');
  });
  return result;
}
const refine = (r, v) => (v === 'moved' && (GUARDS.has(r.hook) || r.kind === 'paint' || r.hook === 'ionViewWillEnter' || r.hook === 'ionViewDidEnter') ? 'no' : v);

const PHASE_TITLES = { boot: 'App start', forward: 'Push Home → Detail', back: 'Pop back to Home' };

function boxHtml(r, verdict) {
  const cls = ['box', `k-${r.kind}`];
  if (verdict === 'no' || verdict === 'moved') cls.push(`v-${verdict}`);
  const chip = r.page === 'App' ? '' : `<span class="chip p-${esc(r.page)}">${esc(r.page)}</span>`;
  const title = r.kind === 'paint' ? 'First visible render' : esc(r.hook);
  const eye = r.kind === 'paint' ? '<svg class="eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>' : '';
  const wait = r.awaited ? `<span class="tag tag-wait">${esc(r.awaited)}</span>` : (r.ignored ? '<span class="tag tag-none">return ignored</span>' : '');
  const tag = wait + (verdict === 'no' ? '<span class="tag tag-no">cannot match</span>' : verdict === 'moved' ? '<span class="tag tag-moved">moved</span>' : '');
  const note = (verdict === 'no' || verdict === 'moved') && whyFor(r) ? `<span class="note">${esc(whyFor(r))}</span>` : (r.note ? `<span class="note">${esc(r.note)}</span>` : '');
  return `<li class="${cls.join(' ')}">${eye}<div class="txt">${chip}<code>${title}</code>${tag}${note}</div></li>`;
}
const columnHtml = (title, sub, rows, vmap) =>
  `<div class="col"><h3>${esc(title)}<span>${esc(sub)}</span></h3><ol class="flow">${rows.map((r) => boxHtml(r, vmap ? refine(r, vmap.get(r)) : null)).join('')}</ol></div>`;

function phaseBlock(id, phase, left, right) {
  return `<section class="phase" id="${id}"><h3 class="phase">${esc(PHASE_TITLES[phase.name] || phase.name)}</h3><div class="cols">${left}${right}</div></section>`;
}

function shimSection() {
  const chain = (caller, callerKind, shim, target, outcome, outcomeKind, awaited) => `
<li class="chain">
  <div class="cell c-${callerKind}"><span class="role">${callerKind === 'router' ? 'Router' : callerKind === 'angular' ? 'Angular' : 'Ionic outlet'} calls</span><code>${caller}</code></div>
  <span class="arr" aria-hidden="true">→</span>
  <div class="cell c-shim"><span class="role">shim</span><code>${shim}</code></div>
  <span class="arr" aria-hidden="true">→</span>
  <div class="cell c-page"><span class="role">your page</span><code>${target}</code></div>
  <span class="tags">${awaited ? '<span class="tag tag-wait">awaits Promise | Observable</span>' : '<span class="tag tag-none">return ignored</span>'}<span class="tag tag-${outcomeKind}">${outcome}</span></span>
</li>`;
  return `<h2 id="shim"><span class="num">2</span>How the shim is called</h2>
<p class="lead">Two route guards and one base class. The guards turn router calls into the old guard methods; the base class turns Angular hooks into the old load and unload hooks. The four enter and leave hooks need nothing: Ionic 8 still calls them by the same names.</p>
<ol class="chains">
${chain('canActivate', 'router', 'legacyCanEnter(DetailPage)', 'static DetailPage.ionViewCanEnter(route, state)', 'no instance, no this', 'no', true)}
${chain('canDeactivate', 'router', 'legacyCanLeave', 'page.ionViewCanLeave()', 'has the instance', 'ok', true)}
${chain('ngOnInit', 'angular', 'LegacyPage.ngOnInit()', 'page.ionViewWillLoad()', 'same place', 'ok', false)}
${chain('ngAfterViewInit', 'angular', 'LegacyPage.ngAfterViewInit()', 'page.ionViewDidLoad()', 'same place', 'ok', false)}
${chain('ionViewWillEnter … ionViewDidLeave', 'ionic', '(none)', 'page.ionViewWillEnter() …', 'unchanged', 'ok', false)}
${chain('ngOnDestroy', 'angular', 'LegacyPage.ngOnDestroy()', 'page.ionViewWillUnload()', 'same place', 'ok', false)}
</ol>
<div class="code2">
<figure><figcaption>Route</figcaption><pre><code>{
  path: 'detail',
  component: DetailPage,
  canActivate:   [legacyCanEnter(DetailPage)],
  canDeactivate: [legacyCanLeave],
}</code></pre></figure>
<figure><figcaption>Guards</figcaption><pre><code>export const legacyCanLeave: CanDeactivateFn&lt;LegacyPage&gt; =
  (page) =&gt; page?.ionViewCanLeave?.() ?? true;

export function legacyCanEnter(Page): CanActivateFn {
  return (route, state) =&gt;
    Page.ionViewCanEnter ? Page.ionViewCanEnter(route, state) : true;
}</code></pre></figure>
<figure><figcaption>Base class</figcaption><pre><code>@Directive()
export abstract class LegacyPage {
  static ionViewCanEnter?(route, state): boolean | Promise&lt;boolean&gt;;

  ngOnInit()        { this.ionViewWillLoad(); }
  ngAfterViewInit() { this.ionViewDidLoad(); }
  ngOnDestroy()     { this.ionViewWillUnload(); }

  ionViewCanLeave(): boolean | Promise&lt;boolean&gt; { return true; }
  ionViewWillLoad() {}  ionViewDidLoad() {}  ionViewWillUnload() {}
}</code></pre></figure>
<figure><figcaption>A page</figcaption><pre><code>export class DetailPage extends LegacyPage {
  static override ionViewCanEnter(route, state) {
    return inject(AuthService).isAllowed();   // no this here
  }
  override ionViewCanLeave() { return !this.form.dirty; }
  override ionViewDidLoad()  { /* DOM exists, same as Ionic 3 */ }
}</code></pre></figure>
</div>
<p>The one thing that does not come back is an <code>ionViewCanEnter</code> that reads instance state. The router decides before the page exists, so the check has to be static or live in a service. If it must see the instance, let the guard pass and check in <code>ionViewWillEnter</code>, then navigate back; that restores "construct first, then decide" at the cost of a possible flash.</p>`;
}

const CSS = `
/* Layout: three numbered sections; phases are two short columns of boxes joined by arrows; the shim section is caller → shim → page chains. */
:root {
  --bg: #f7f6f2; --surface: #ffffff; --fg: #17161a; --fg-2: #5a5861; --muted: #8b8894; --line: #d9d6cf;
  --angular: #c23d4b; --ionic: #2d6cdf; --guard: #9a6a00; --shim: #5b4bd6; --shim-bg: #e9e6fb; --paint: #0f8a5f; --paint-bg: #e3f5ec;
  --ok: #0f8a5f; --ok-bg: #e3f5ec; --moved: #9a6a00; --moved-bg: #fbf1d6; --no: #c23d4b; --no-bg: #fbe3e5;
  --home: #2d6cdf; --detail: #d8691f; --code-bg: #f0efe9;
  --sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #121216; --surface: #1c1c22; --fg: #f1f0f4; --fg-2: #b9b6c2; --muted: #807d8a; --line: #33323b;
  --angular: #ef6b78; --ionic: #6f9cf0; --guard: #e0ad2a; --shim: #a99bff; --shim-bg: #2a2546; --paint: #3ccf93; --paint-bg: #14352a;
  --ok: #3ccf93; --ok-bg: #14352a; --moved: #e0ad2a; --moved-bg: #3a2f10; --no: #ef6b78; --no-bg: #3d1a1f;
  --home: #6f9cf0; --detail: #f0924f; --code-bg: #15151a; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #121216; --surface: #1c1c22; --fg: #f1f0f4; --fg-2: #b9b6c2; --muted: #807d8a; --line: #33323b;
  --angular: #ef6b78; --ionic: #6f9cf0; --guard: #e0ad2a; --shim: #a99bff; --shim-bg: #2a2546; --paint: #3ccf93; --paint-bg: #14352a;
  --ok: #3ccf93; --ok-bg: #14352a; --moved: #e0ad2a; --moved-bg: #3a2f10; --no: #ef6b78; --no-bg: #3d1a1f;
  --home: #6f9cf0; --detail: #f0924f; --code-bg: #15151a; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--sans); font-size: 15px; line-height: 1.5; padding-block: 28px 72px; padding-inline: 16px; }
main { max-width: 1080px; margin: 0 auto; min-width: 0; }
h1 { font-size: 1.9rem; font-weight: 600; letter-spacing: -.01em; margin: 0 0 .3rem; text-wrap: balance; }
h2 { font-size: 1.45rem; font-weight: 600; margin: 3rem 0 .3rem; padding-top: 1.1rem; border-top: 2px solid var(--line); text-wrap: balance; }
h2 .num { font-family: var(--mono); font-size: .8rem; color: var(--muted); margin-right: 10px; vertical-align: middle; }
h3.phase { font-size: 1.1rem; font-weight: 600; margin: 2rem 0 .4rem; }
.col h3 { font-size: .95rem; font-weight: 600; margin: 0 0 10px; display: flex; flex-direction: column; gap: 2px; }
.col h3 span { font-weight: 400; color: var(--fg-2); font-size: .82rem; }
p { max-width: 66ch; margin: .3rem 0; color: var(--fg-2); }
p.lead { color: var(--fg); }
code { font-family: var(--mono); font-size: .92em; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 14px 0 0; padding: 0; list-style: none; font-size: .85rem; color: var(--fg-2); }
.legend li { display: inline-flex; align-items: center; gap: 7px; }
.legend .sw { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: start; }
.col { min-width: 0; }
.flow { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.box { position: relative; display: flex; align-items: flex-start; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--k, var(--line)); border-radius: 6px; padding: 7px 12px; min-width: 0; }
.box + .box { margin-top: 24px; }
.box + .box::before { content: ""; position: absolute; left: 50%; top: -24px; height: 18px; border-left: 2px solid var(--muted); transform: translateX(-50%); }
.box + .box::after { content: ""; position: absolute; left: 50%; top: -9px; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid var(--muted); transform: translateX(-50%); }
.k-angular { --k: var(--angular); } .k-ionic { --k: var(--ionic); } .k-guard { --k: var(--guard); } .k-shim { --k: var(--shim); }
.k-shim code { color: var(--shim); }
.k-paint { --k: var(--paint); background: var(--paint-bg); border-color: var(--paint); border-width: 2px; border-left-width: 6px; }
.k-paint code { font-family: var(--sans); font-weight: 600; color: var(--paint); font-size: 1rem; }
.v-no { border-color: var(--no); border-style: dashed; }
.v-moved { border-color: var(--moved); border-style: dashed; }
.eye { width: 22px; height: 22px; flex: none; color: var(--paint); margin-top: 1px; }
.txt { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; min-width: 0; }
.txt code { overflow-wrap: anywhere; }
.chip { font-size: .68rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; padding: 0 6px; border-radius: 999px; border: 1px solid currentColor; line-height: 1.5; }
.chip.p-Home { color: var(--home); } .chip.p-Detail { color: var(--detail); }
.tag { font-size: .72rem; font-weight: 600; padding: 1px 7px; border-radius: 4px; line-height: 1.5; white-space: nowrap; }
.tag-ok { color: var(--ok); background: var(--ok-bg); } .tag-wait { color: var(--guard); background: var(--moved-bg); } .tag-none { color: var(--muted); border: 1px solid var(--line); font-weight: 500; }
.tags { display: inline-flex; flex-direction: column; gap: 3px; align-items: flex-start; }
.load { margin-top: 2rem; } .load table { border-collapse: collapse; width: 100%; font-size: .88rem; margin-top: 8px; } .load th, .load td { text-align: left; vertical-align: top; padding: 6px 10px; border-bottom: 1px solid var(--line); } .load th { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--fg-2); } .table-wrap { overflow-x: auto; max-width: 100%; } .tag-moved { color: var(--moved); background: var(--moved-bg); } .tag-no { color: var(--no); background: var(--no-bg); }
.note { flex-basis: 100%; font-size: .78rem; color: var(--muted); }
/* shim call chains */
.chains { list-style: none; margin: 18px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.chain { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1.3fr) auto; align-items: center; gap: 8px; }
.cell { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; min-width: 0; display: flex; flex-direction: column; gap: 1px; border-left: 4px solid var(--k, var(--line)); }
.cell .role { font-size: .68rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; }
.cell code { overflow-wrap: anywhere; }
.c-router { --k: var(--guard); } .c-angular { --k: var(--angular); } .c-ionic { --k: var(--ionic); } .c-shim { --k: var(--shim); background: var(--shim-bg); } .c-page { --k: var(--fg); }
.arr { color: var(--muted); font-size: 1.1rem; }
.code2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
.code2 figure { margin: 0; min-width: 0; }
.code2 figcaption { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
pre { margin: 0; background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; overflow-x: auto; font-size: .82rem; line-height: 1.45; }
.sum { margin-top: 14px; }
.sum ul { margin: 0; padding-left: 1.2rem; color: var(--fg-2); max-width: 72ch; }
.sum li { margin: 4px 0; }
@media (max-width: 760px) {
  .cols, .code2 { grid-template-columns: 1fr; }
  .chain { grid-template-columns: 1fr; gap: 4px; } .arr { transform: rotate(90deg); justify-self: start; margin-left: 14px; }
  body { font-size: 14px; }
}
`;

export function renderFlowHtml(report) {
  const has = (a) => report.apps.includes(a);
  const out = [];
  out.push('<title>Lifecycle Order Flowchart</title>');
  out.push('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">');
  out.push(`<style>${CSS}</style>`);
  out.push('<main>');
  out.push('<h1>Lifecycle Order Flowchart</h1>');
  out.push('<p class="lead">The hooks a page author writes, in the order they fire. Only those: no change-detection passes, no router events. Measured, not quoted from docs.</p>');
  out.push(`<ul class="legend">
<li><span class="sw" style="background:var(--angular)"></span>Angular</li>
<li><span class="sw" style="background:var(--ionic)"></span>Ionic page hook</li>
<li><span class="sw" style="background:var(--guard)"></span>Guard or resolver</li>
<li><span class="sw" style="background:var(--shim)"></span>Old hook, re-created by the shim</li>
<li><span class="sw" style="background:var(--paint)"></span>First visible render</li>
<li><span class="tag tag-wait">awaits Promise</span> the framework awaits what you return (Ionic 3: a Promise; the Angular router: a Promise or an Observable) and navigation pauses until it settles. Load or check data here.</li>
<li><span class="tag tag-none">return ignored</span> you can write the hook as <code>async</code>, but nothing waits for it; show your own loading state</li>
</ul>`);

  out.push('<h2 id="changed"><span class="num">1</span>Old vs new</h2>');
  out.push(`<p>Left ${esc(label('old'))}. Right ${esc(label('new'))}.</p>`);
  for (const phase of report.phases) {
    const o = simplify(phase.byApp.old.entries, { phase: phase.name, app: 'old' });
    const n = simplify(phase.byApp.new.entries, { phase: phase.name, app: 'new' });
    out.push(phaseBlock(`changed-${phase.name}`, phase, columnHtml('Old', label('old'), o), columnHtml('New', label('new'), n)));
  }

  out.push(`<section class="load"><h3 class="phase">Where you can wait for data</h3>
<p>Only the amber-tagged hooks are awaited: Ionic 3 awaited a returned Promise, the Angular router awaits a Promise or an Observable. Everything else runs and the app moves on, so data loaded there needs its own loading state.</p>
<div class="table-wrap"><table>
<thead><tr><th>You want to</th><th>Ionic 3</th><th>Ionic 8 + Angular 20</th><th>Page exists when it runs?</th></tr></thead>
<tbody>
<tr><td>Block entering until data or permission is ready</td><td><code>ionViewCanEnter</code></td><td><code>canActivate</code> for a yes/no, <code>resolve</code> for data; both await a Promise or Observable (<code>canMatch</code> too)</td><td>Old: yes, constructed first. New: no.</td></tr>
<tr><td>Block leaving (unsaved changes)</td><td><code>ionViewCanLeave</code></td><td><code>canDeactivate</code></td><td>Yes in both.</td></tr>
<tr><td>Show the page, then load</td><td><code>ionViewDidLoad</code> or <code>ionViewWillEnter</code></td><td><code>ngOnInit</code> or <code>ionViewWillEnter</code>, not awaited</td><td>Yes in both.</td></tr>
<tr><td>Refresh every time the page is shown again</td><td><code>ionViewWillEnter</code></td><td><code>ionViewWillEnter</code>, not awaited</td><td>Yes in both; the page is reused on pop.</td></tr>
</tbody></table></div></section>`);
  if (has('new-compat')) {
    out.push(shimSection());
    out.push('<h2 id="match"><span class="num">3</span>Old vs new with the shim</h2>');
    out.push('<p>Same phases, with the shim wired in. A box without a tag is in the same place as Ionic 3. Dashed red boxes cannot be moved back; the reason is under each.</p>');
    for (const phase of report.phases) {
      const o = simplify(phase.byApp.old.entries, { phase: phase.name, app: 'old' });
      const c = simplify(phase.byApp['new-compat'].entries, { phase: phase.name, app: 'new-compat' });
      out.push(phaseBlock(`match-${phase.name}`, phase, columnHtml('Old', label('old'), o), columnHtml('New + shim', label('new-compat'), c, verdicts(o, c))));
    }
  }
  out.push(`<section class="sum"><h2><span class="num">·</span>First visible render</h2><p>There is no "painted" event in either stack. The green box is the earliest point where the page's DOM is complete and the next frame will show it: a <code>requestAnimationFrame</code> after <code>ngAfterViewInit</code> in the old app, <code>afterNextRender</code> in the new one. On a push the page then slides in and is fully visible at <code>ionViewDidEnter</code>. On app start the root page has nothing to leave, so Ionic 8 fires both enter hooks at once, before anything is painted.</p></section>`);
  out.push('</main>');
  return out.join('\n');
}

export function renderFlowMarkdown(report) {
  const has = (a) => report.apps.includes(a);
  const out = [];
  out.push('# Lifecycle order flowchart', '',
    'The hooks a page author writes, in the order they fire, measured in two instrumented apps: ' +
    `**${label('old')}** and **${label('new')}**. Change-detection passes and router events are left out. ` +
    'Generated from `captures/` by `tools/generate.mjs`; do not edit by hand. Also available as a [PDF](lifecycle-flow.pdf) and as an interactive page ([lifecycle-flow.html](lifecycle-flow.html), open locally).', '',
    '| Mark | Meaning |', '|---|---|',
    '| 🟥 red | Angular hook |', '| 🟦 blue | Ionic page hook |', '| 🟨 amber | Guard or resolver |', '| 🟪 purple | Old hook re-created by the compat shim |',
    '| 👁 green | First visible render: the page DOM is complete and the next frame shows it |',
    '| ⏳ | The framework awaits what you return (Ionic 3: a Promise; the Angular router: a Promise or an Observable). Navigation pauses. Load or check data here. |',
    '| ✗ dashed | Cannot be put back where Ionic 3 had it |', '');
  const CLASSES = [
    '  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a',
    '  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a',
    '  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a',
    '  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a',
    '  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f',
    '  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3',
  ];
  const block = (phase, cols) => {
    out.push('```mermaid', 'flowchart TB', ...CLASSES);
    for (const [app, title, vmap] of cols) {
      const rows = simplify(phase.byApp[app].entries, { phase: phase.name, app });
      const id = app.replace(/[^a-z]/gi, '');
      out.push(`  subgraph ${id}["${title}"]`, '    direction TB');
      rows.forEach((r, i) => {
        const v = vmap ? refine(r, vmap.get(r)) : null;
        const page = r.page === 'App' ? '' : `${r.page}: `;
        const lbl = r.kind === 'paint' ? '👁 FIRST VISIBLE RENDER' : `${page}${r.hook}${r.awaited ? ' ⏳' : ''}${v === 'no' ? ' ✗' : ''}`;
        const cls = [r.kind === 'paint' ? 'paint' : r.kind, v === 'no' ? 'no' : ''].filter(Boolean).join(',');
        out.push(`    ${id}${i}["${lbl.replace(/"/g, "'")}"]:::${cls.includes(',') ? cls.split(',')[0] : cls}`);
        if (v === 'no') out.push(`    class ${id}${i} no`);
        if (i > 0) out.push(`    ${id}${i - 1} --> ${id}${i}`);
      });
      out.push('  end');
    }
    out.push('```', '');
  };

  out.push('## 1. Old vs new', '');
  for (const phase of report.phases) {
    out.push(`### ${PHASE_TITLES[phase.name]}`, '');
    block(phase, [['old', `Old: ${label('old')}`], ['new', `New: ${label('new')}`]]);
  }
  out.push('### Where you can wait for data', '',
    'Only the ⏳ hooks are awaited: Ionic 3 awaited a returned Promise, the Angular router awaits a Promise or an Observable. Everything else runs and the app moves on, so data loaded there needs its own loading state.', '',
    '| You want to | Ionic 3 | Ionic 8 + Angular 20 | Page exists when it runs? |', '|---|---|---|---|',
    '| Block entering until data or permission is ready | `ionViewCanEnter` | `canActivate` for a yes/no, `resolve` for data; both await a Promise or Observable (`canMatch` too) | Old: yes, constructed first. New: no. |',
    '| Block leaving (unsaved changes) | `ionViewCanLeave` | `canDeactivate` | Yes in both. |',
    '| Show the page, then load | `ionViewDidLoad` or `ionViewWillEnter` | `ngOnInit` or `ionViewWillEnter`, not awaited | Yes in both. |',
    '| Refresh every time the page is shown again | `ionViewWillEnter` | `ionViewWillEnter`, not awaited | Yes in both; the page is reused on pop. |', '');

  if (has('new-compat')) {
    out.push('## 2. How the shim is called', '',
      'Two route guards and one base class. The guards turn router calls into the old guard methods; the base class turns Angular hooks into the old load and unload hooks. The four enter and leave hooks need nothing: Ionic 8 still calls them by the same names.', '',
      '```mermaid', 'flowchart LR', ...CLASSES,
      '  subgraph callers["Framework calls"]', '    direction TB',
      '    A1["Router: canActivate ⏳"]:::guard', '    A2["Router: canDeactivate ⏳"]:::guard',
      '    A3["Angular: ngOnInit"]:::angular', '    A4["Angular: ngAfterViewInit"]:::angular',
      '    A5["Ionic outlet: ionViewWillEnter … ionViewDidLeave"]:::ionic', '    A6["Angular: ngOnDestroy"]:::angular',
      '  end',
      '  subgraph shim["Shim"]', '    direction TB',
      '    S1["legacyCanEnter(DetailPage)"]:::shim', '    S2["legacyCanLeave"]:::shim',
      '    S3["LegacyPage.ngOnInit()"]:::shim', '    S4["LegacyPage.ngAfterViewInit()"]:::shim', '    S6["LegacyPage.ngOnDestroy()"]:::shim',
      '  end',
      '  subgraph page["Your page"]', '    direction TB',
      '    P1["static DetailPage.ionViewCanEnter(route, state) ✗ no instance, no this"]:::no',
      '    P2["page.ionViewCanLeave() — has the instance"]',
      '    P3["page.ionViewWillLoad()"]', '    P4["page.ionViewDidLoad()"]', '    P5["page.ionViewWillEnter() … unchanged"]', '    P6["page.ionViewWillUnload()"]',
      '  end',
      '  A1 --> S1 --> P1', '  A2 --> S2 --> P2', '  A3 --> S3 --> P3', '  A4 --> S4 --> P4', '  A5 --> P5', '  A6 --> S6 --> P6',
      '```', '',
      '**Route**', '', '```ts', '{', "  path: 'detail',", '  component: DetailPage,', '  canActivate:   [legacyCanEnter(DetailPage)],', '  canDeactivate: [legacyCanLeave],', '}', '```', '',
      '**Guards**', '', '```ts',
      'export const legacyCanLeave: CanDeactivateFn<LegacyPage> =', '  (page) => page?.ionViewCanLeave?.() ?? true;', '',
      'export function legacyCanEnter(Page): CanActivateFn {', '  return (route, state) =>', '    Page.ionViewCanEnter ? Page.ionViewCanEnter(route, state) : true;', '}', '```', '',
      '**Base class**', '', '```ts', '@Directive()', 'export abstract class LegacyPage {',
      '  static ionViewCanEnter?(route, state): boolean | Promise<boolean>;', '',
      '  ngOnInit()        { this.ionViewWillLoad(); }', '  ngAfterViewInit() { this.ionViewDidLoad(); }', '  ngOnDestroy()     { this.ionViewWillUnload(); }', '',
      '  ionViewCanLeave(): boolean | Promise<boolean> { return true; }', '  ionViewWillLoad() {}  ionViewDidLoad() {}  ionViewWillUnload() {}', '}', '```', '',
      '**A page**', '', '```ts', 'export class DetailPage extends LegacyPage {',
      '  static override ionViewCanEnter(route, state) {', '    return inject(AuthService).isAllowed();   // no this here', '  }',
      '  override ionViewCanLeave() { return !this.form.dirty; }', '  override ionViewDidLoad()  { /* DOM exists, same as Ionic 3 */ }', '}', '```', '',
      'The one thing that does not come back is an `ionViewCanEnter` that reads instance state. The router decides before the page exists, so the check has to be static or live in a service. If it must see the instance, let the guard pass and check in `ionViewWillEnter`, then navigate back; that restores "construct first, then decide" at the cost of a possible flash.', '');

    out.push('## 3. Old vs new with the shim', '',
      'Same phases, with the shim wired in. A box without ✗ is in the same place as Ionic 3. Dashed ✗ boxes cannot be moved back; the reasons are listed under each diagram.', '');
    for (const phase of report.phases) {
      const o = simplify(phase.byApp.old.entries, { phase: phase.name, app: 'old' });
      const c = simplify(phase.byApp['new-compat'].entries, { phase: phase.name, app: 'new-compat' });
      const vmap = verdicts(o, c);
      out.push(`### ${PHASE_TITLES[phase.name]}`, '');
      block(phase, [['old', `Old: ${label('old')}`], ['new-compat', `New + shim: ${label('new-compat')}`, vmap]]);
      const nos = c.filter((r) => refine(r, vmap.get(r)) === 'no');
      for (const r of nos) out.push(`- ✗ \`${r.page === 'App' ? '' : r.page + '.'}${r.kind === 'paint' ? 'first visible render' : r.hook}\`: ${whyFor(r) || 'see the diagram'}.`);
      if (nos.length) out.push('');
    }
  }
  out.push('## First visible render', '',
    'There is no "painted" event in either stack. The green box is the earliest point where the page DOM is complete and the next frame will show it: a `requestAnimationFrame` after `ngAfterViewInit` in the old app, `afterNextRender` in the new one. On a push the page then slides in and is fully visible at `ionViewDidEnter`. On app start the root page has nothing to leave, so Ionic 8 fires both enter hooks at once, before anything is painted.', '');
  return out.join('\n');
}
