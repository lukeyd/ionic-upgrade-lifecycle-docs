// Hand-authored mapping old hook -> new equivalent, plus per-phase order analysis.

export const APP_LABELS = { old: 'Old', new: 'New', 'new-compat': 'New + compat shim' };
export const VERSIONS = {
  old: { ionic: '3.9.5', angular: '5.0.3', label: 'Ionic 3.9.5 / Angular 5.0.3' },
  new: { ionic: '8.4.3', angular: '20.1.3', label: 'Ionic 8.4.3 / Angular 20.1.3' },
  'new-compat': { ionic: '8.4.3', angular: '20.1.3', label: 'Ionic 8.4.3 / Angular 20.1.3 + compat shim' },
};

/**
 * scope: 'page' = compare per page (Home, Detail); 'app' = compare on page 'App'.
 * connector: draw a dashed Old->New connector in the swimlane (renamed hooks only, to keep
 *            the diagram readable; same-name hooks are compared in the table).
 * compatHook: in the compat capture, which hook name to look for (defaults to `old`, then `new`).
 */
export const MAPPING = [
  { old: 'ionViewCanEnter', new: 'canActivate', scope: 'page', connector: true,
    note: 'Router guard. Runs BEFORE the component exists; Ionic 3 constructed the component first (_viewInit) and then asked the instance.' },
  { old: 'ionViewCanLeave', new: 'canDeactivate', scope: 'page', connector: true,
    note: 'Router guard that receives the component instance; 1:1 replacement.' },
  { old: 'ionViewWillLoad', new: 'ngOnInit', scope: 'page', connector: true,
    note: 'Fired right before the first change detection in Ionic 3; ngOnInit is the first hook of that same pass.' },
  { old: 'ionViewDidLoad', new: 'ngOnInit', alt: 'ngAfterViewInit', scope: 'page', connector: true,
    note: 'Ionic docs say ngOnInit. Ionic 3 fired it after the first detectChanges (i.e. after ngAfterViewInit), so ngAfterViewInit is the closer match for "view exists" work.' },
  { old: 'ionViewWillUnload', new: 'ngOnDestroy', scope: 'page', connector: true,
    note: 'Ionic 3 fired it during _cleanup after the transition; ngOnDestroy runs when the router outlet destroys the leaving view.' },
  { old: 'ionViewWillEnter', new: 'ionViewWillEnter', scope: 'page', note: 'Same name. Dispatched by ion-router-outlet before the transition.' },
  { old: 'ionViewDidEnter', new: 'ionViewDidEnter', scope: 'page', note: 'Same name. Dispatched after the transition completes.' },
  { old: 'ionViewWillLeave', new: 'ionViewWillLeave', scope: 'page', note: 'Same name. Leaving page is told before the entering page.' },
  { old: 'ionViewDidLeave', new: 'ionViewDidLeave', scope: 'page', note: 'Same name. Entering page gets DidEnter first, then the leaving page gets DidLeave.' },
  { old: 'nav.push', new: 'nav.navigateForward', scope: 'page', connector: true,
    note: 'NavController.navigateForward(url) delegates to the Angular Router (NavigationStart..NavigationEnd events follow).' },
  { old: 'nav.pop', new: 'nav.pop', scope: 'page', note: 'NavController.pop() = router navigateBack to the previous stack entry (history.back semantics).' },
  { old: 'app.viewDidLoad', new: 'ionNavWillChange', scope: 'app', connector: true,
    note: 'App-level view emitters are gone; ion-router-outlet emits ionNavWillChange/ionNavDidChange, or subscribe to Router.events.' },
  { old: 'app.viewWillEnter', new: 'ionNavWillChange', scope: 'app', connector: true, note: 'See app.viewDidLoad.' },
  { old: 'app.viewDidEnter', new: 'ionNavDidChange', scope: 'app', connector: true, note: 'See app.viewDidLoad.' },
  { old: 'app.viewWillLeave', new: 'ionNavWillChange', scope: 'app', connector: true, note: 'See app.viewDidLoad.' },
  { old: 'app.viewDidLeave', new: 'ionNavDidChange', scope: 'app', connector: true, note: 'See app.viewDidLoad.' },
  { old: 'app.viewWillUnload', new: 'NavigationEnd', scope: 'app', connector: true, note: 'No equivalent emitter; the closest router signal is NavigationEnd (the leaving view is destroyed after the transition).' },
  { old: null, new: 'resolve', scope: 'page', note: 'No equivalent in Ionic 3: data loading was done in the constructor or ionViewDidLoad. Runs before the component exists.' },
  { old: null, new: 'canMatch', scope: 'page', note: 'New-only: route matching guard, runs during URL recognition.' },
  { old: null, new: 'NavigationStart', scope: 'app', note: 'New-only router event (Router.events).' },
  { old: null, new: 'NavigationEnd', scope: 'app', note: 'New-only router event; fires before the Ionic transition starts.' },
  { old: 'rAF-after-viewInit', new: 'afterNextRender', scope: 'page', connector: true,
    note: 'Ionic 3 apps approximated "after first paint" with requestAnimationFrame; Angular 16+ offers afterNextRender.' },
  { old: 'constructor', new: 'constructor', scope: 'page', note: 'Same. Note that in the new app the guards and resolvers run before it.' },
  { old: 'ngOnInit', new: 'ngOnInit', scope: 'page', note: 'Same name.' },
  { old: 'ngDoCheck', new: 'ngDoCheck', scope: 'page', note: 'Same name.' },
  { old: 'ngAfterContentInit', new: 'ngAfterContentInit', scope: 'page', note: 'Same name.' },
  { old: 'ngAfterContentChecked', new: 'ngAfterContentChecked', scope: 'page', note: 'Same name.' },
  { old: 'ngAfterViewInit', new: 'ngAfterViewInit', scope: 'page', note: 'Same name.' },
  { old: 'ngAfterViewChecked', new: 'ngAfterViewChecked', scope: 'page', note: 'Same name.' },
  { old: 'ngOnDestroy', new: 'ngOnDestroy', scope: 'page', note: 'Same name.' },
  { old: 'template-evaluated', new: 'template-evaluated', scope: 'page', note: 'Template binding evaluated. ViewEngine runs directive hooks before text bindings; Ivy interleaves them in template order.' },
  { old: 'directive:ngOnInit', new: 'directive:ngOnInit', scope: 'page', note: 'Same name (logRender directive on ion-content).' },
  { old: 'directive:ngAfterViewInit', new: 'directive:ngAfterViewInit', scope: 'page', note: 'Same name.' },
];

export const VERDICTS = {
  'same-order': { symbol: '=', text: 'same order' },
  earlier: { symbol: '↑', text: 'earlier' },
  later: { symbol: '↓', text: 'later' },
  'never-fires': { symbol: '×', text: 'never fires' },
  'new-only': { symbol: '+', text: 'new only' },
  'n/a': { symbol: '–', text: 'n/a' },
};

/** First-occurrence ordinal of each hook on a page: { hook: { ordinal (1-based), t, i, source, count } } */
export function firstOccurrences(entries, page) {
  const map = new Map();
  for (const e of entries) {
    if (e.page !== page) continue;
    const cur = map.get(e.hook);
    if (cur) { cur.count++; continue; }
    map.set(e.hook, { ordinal: map.size + 1, t: e.t, i: e.i, source: e.source, count: 1 });
  }
  return map;
}

/**
 * Relative-order verdicts for the rows of one page. Rows that are part of the longest common
 * subsequence of the old and new orderings keep "same-order"; the remaining rows are the
 * minimal set of movers, flagged earlier/later by their position among the stable rows.
 * (Pairwise comparison would flag every neighbour of a single big mover.)
 * `getNew` selects which position to compare against the old one (new or compat).
 */
function assignVerdicts(rows, getNew, setVerdict) {
  for (const r of rows) {
    const n = getNew(r);
    if (!r.oldPos && !n) setVerdict(r, 'n/a');
    else if (r.oldPos && !n) setVerdict(r, 'never-fires');
    else if (!r.oldPos && n) setVerdict(r, 'new-only');
  }
  const pages = [...new Set(rows.map((r) => r.page))];
  for (const page of pages) {
    const both = rows.filter((r) => r.page === page && r.oldPos && getNew(r));
    if (!both.length) continue;
    const byOld = [...both].sort((a, b) => a.oldPos.ordinal - b.oldPos.ordinal || rows.indexOf(a) - rows.indexOf(b));
    const byNew = [...both].sort((a, b) => getNew(a).ordinal - getNew(b).ordinal || rows.indexOf(a) - rows.indexOf(b));
    // LCS over row identities
    const n = byOld.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = byOld[i] === byNew[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    const stable = new Set();
    for (let i = 0, j = 0; i < n && j < n;) {
      if (byOld[i] === byNew[j]) { stable.add(byOld[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    for (const r of both) {
      if (stable.has(r)) { setVerdict(r, 'same-order'); continue; }
      const beforeOld = [...stable].filter((s) => s.oldPos.ordinal < r.oldPos.ordinal).length;
      const beforeNew = [...stable].filter((s) => getNew(s).ordinal < getNew(r).ordinal).length;
      if (beforeNew < beforeOld) setVerdict(r, 'earlier');
      else if (beforeNew > beforeOld) setVerdict(r, 'later');
      else {
        // tie among stable rows: fall back to discordant-pair direction
        let before = 0, after = 0;
        for (const s of both) {
          if (s === r) continue;
          const o = Math.sign(r.oldPos.ordinal - s.oldPos.ordinal), nn = Math.sign(getNew(r).ordinal - getNew(s).ordinal);
          if (o !== nn) { if (nn < 0) before++; else after++; }
        }
        setVerdict(r, before === after ? 'same-order' : before > after ? 'earlier' : 'later');
      }
    }
  }
}

/**
 * Analyse one phase. `byApp` = { old?: entries, new?: entries, 'new-compat'?: entries } (phase entries).
 * Returns rows: { old, new, page, oldPos, newPos, compatPos, compatHook, verdict, verdictCompat, note, connector }.
 */
export function analysePhase(byApp) {
  const rows = [];
  const pagesFor = (scope) => (scope === 'app' ? ['App'] : ['Home', 'Detail']);
  const occ = {};
  for (const app of Object.keys(byApp)) {
    occ[app] = {};
    for (const page of ['Home', 'Detail', 'App']) occ[app][page] = firstOccurrences(byApp[app], page);
  }
  const lookup = (app, page, hook) => (hook && occ[app] ? occ[app][page].get(hook) || null : null);

  for (const m of MAPPING) {
    for (const page of pagesFor(m.scope)) {
      const oldPos = byApp.old ? lookup('old', page, m.old) : null;
      const newPos = byApp.new ? lookup('new', page, m.new) : null;
      let compatHook = null, compatPos = null;
      if (byApp['new-compat']) {
        for (const h of [m.compatHook, m.old, m.new]) {
          if (!h) continue;
          const p = lookup('new-compat', page, h);
          if (p && !(p.source === 'ionic' && m.old && h === m.old && m.old !== m.new && !p.count)) { compatHook = h; compatPos = p; break; }
        }
      }
      if (!oldPos && !newPos && !compatPos) continue;
      rows.push({ ...m, page, oldPos, newPos, compatHook, compatPos, verdict: 'n/a', verdictCompat: 'n/a' });
    }
  }
  if (byApp.old && byApp.new) assignVerdicts(rows, (r) => r.newPos, (r, v) => { r.verdict = v; });
  if (byApp.old && byApp['new-compat']) assignVerdicts(rows, (r) => r.compatPos, (r, v) => { r.verdictCompat = v; });
  return rows;
}

/** Auto-generated bullet facts for the narrative placeholder. */
export function narrativeFacts(phaseName, rows, byApp) {
  const facts = [];
  const nameOf = (s) => (s.old && s.old !== s.new ? `\`${s.new}\` (was \`${s.old}\`)` : `\`${s.new}\``);
  for (const r of rows) {
    const who = r.old ? `\`${r.old}\`` : `\`${r.new}\``;
    const as = r.old && r.new && r.old !== r.new ? ` (as \`${r.new}\`)` : '';
    const pg = r.page;
    if (r.verdict === 'earlier' || r.verdict === 'later') {
      // which hooks did it cross?
      const crossed = rows.filter((s) => s !== r && s.page === r.page && s.oldPos && s.newPos &&
        Math.sign(r.oldPos.ordinal - s.oldPos.ordinal) !== Math.sign(r.newPos.ordinal - s.newPos.ordinal));
      const nowAfter = crossed.filter((s) => r.newPos.ordinal > s.newPos.ordinal).map(nameOf);
      const nowBefore = crossed.filter((s) => r.newPos.ordinal < s.newPos.ordinal).map(nameOf);
      const parts = [];
      if (nowAfter.length) parts.push(`AFTER ${nowAfter.join(', ')} in new but BEFORE in old`);
      if (nowBefore.length) parts.push(`BEFORE ${nowBefore.join(', ')} in new but AFTER in old`);
      facts.push(`${phaseName}/${pg}: ${who}${as} fires ${r.verdict}: ${parts.join('; ') || `old #${r.oldPos.ordinal}, new #${r.newPos.ordinal}`}.`);
    } else if (r.verdict === 'never-fires') {
      facts.push(`${phaseName}/${pg}: ${who} never fires in new; use \`${r.new}\` (${r.note}).`);
    } else if (r.verdict === 'new-only' && r.old === null) {
      facts.push(`${phaseName}/${pg}: \`${r.new}\` is new-only (#${r.newPos.ordinal} on ${pg}); ${r.note}`);
    }
    if (r.old && r.compatPos && r.compatHook === r.old && r.old !== r.new && (r.verdictCompat === 'earlier' || r.verdictCompat === 'later')) {
      facts.push(`${phaseName}/${pg}: with the compat shim \`${r.old}\` is re-emitted at #${r.compatPos.ordinal} but ${VERDICTS[r.verdictCompat].text} than in old (old #${r.oldPos ? r.oldPos.ordinal : '–'}).`);
    }
  }
  return facts;
}
