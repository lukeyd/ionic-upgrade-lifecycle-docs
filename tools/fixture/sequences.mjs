// Plausible lifecycle sequences for the fixture page and the sample captures.
// Each entry: [gapMs, page, source, hook, detail?]  (gap = ms since the previous entry).
// This is an emulation of LOG-CONTRACT.md based on how Ionic 3 (NavControllerBase)
// and Ionic 8 + Angular Router (ion-router-outlet + StackController) sequence their
// hooks. Real captures replace these; the shape, names and sources follow the contract.
//
// Browser-safe: no Node imports (served to the fixture page as an ES module).

const e = (gap, page, source, hook, detail) =>
  detail === undefined ? [gap, page, source, hook] : [gap, page, source, hook, detail];

// ---- change-detection bursts -------------------------------------------------

/** Steady-state CD pass for already-initialised pages (both apps). */
function cdPass(pages, { everyRender = false, gap = 0.4 } = {}) {
  const out = [e(gap, 'App', 'cd', 'AppRef.tick')];
  for (const p of pages) {
    out.push(
      e(0.2, p, 'angular', 'ngDoCheck'),
      e(0.1, p, 'angular', 'ngAfterContentChecked'),
      e(0.1, p, 'cd', 'template-evaluated'),
      e(0.1, p, 'angular', 'ngAfterViewChecked'),
    );
  }
  if (everyRender) for (const p of pages) out.push(e(0.1, p, 'render', 'afterEveryRender'));
  return out;
}

function cdPasses(n, pages, opts) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(...cdPass(pages, opts));
  return out;
}

/** First change detection of a freshly created page component.
 *  ViewEngine (old) runs all directive ngOnInit before text bindings;
 *  Ivy (new) interleaves them in template order (the trace binding sits in the title). */
function initPass(page, flavour) {
  const out = [
    e(0.3, page, 'angular', 'ngOnInit'),
    e(0.1, page, 'angular', 'ngDoCheck'),
    e(0.1, page, 'angular', 'ngAfterContentInit'),
    e(0.1, page, 'angular', 'ngAfterContentChecked'),
  ];
  if (flavour === 'old') {
    out.push(
      e(0.2, page, 'render', 'directive:ngOnInit'),
      e(0.2, page, 'cd', 'template-evaluated'),
      e(0.3, page, 'render', 'directive:ngAfterViewInit'),
    );
  } else {
    out.push(
      e(0.2, page, 'cd', 'template-evaluated'),
      e(0.2, page, 'render', 'directive:ngOnInit'),
      e(0.3, page, 'render', 'directive:ngAfterViewInit'),
    );
  }
  out.push(e(0.1, page, 'angular', 'ngAfterViewInit'), e(0.1, page, 'angular', 'ngAfterViewChecked'));
  return out;
}

// ---- OLD: Ionic 3.9.5 / Angular 5.0.3 ----------------------------------------
// NavControllerBase._nextTrns: _viewInit (constructor) -> _viewTest (canLeave, canEnter)
// -> _viewAttachToDOM (ionViewWillLoad, detectChanges, ionViewDidLoad) -> willLeave/willEnter
// -> transition -> didEnter/didLeave -> _cleanup (willUnload, destroy).

function oldGuard(page, hook, gapAfter = 1.0) {
  return [
    e(0.5, page, 'ionic', hook),
    e(gapAfter, page, 'ionic', hook, 'resolved(true)'),
  ];
}

const OLD = {
  boot: [
    e(0, 'App', 'angular', 'main.ts'),
    e(180, 'App', 'angular', 'AppComponent.constructor'),
    e(6, 'App', 'cd', 'AppRef.tick'),
    e(12, 'App', 'cd', 'AppRef.tick'),
    e(40, 'Home', 'angular', 'constructor'),
    ...oldGuard('Home', 'ionViewCanEnter', 2.5),
    e(0.3, 'App', 'cd', 'AppRef.tick'),
    e(0.8, 'Home', 'ionic', 'ionViewWillLoad'),
    ...initPass('Home', 'old'),
    e(0.2, 'Home', 'ionic', 'ionViewDidLoad'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidLoad', 'HomePage'),
    e(1.5, 'Home', 'ionic', 'ionViewWillEnter'),
    e(0.1, 'App', 'ionic-app', 'app.viewWillEnter', 'HomePage'),
    e(14, 'Home', 'render', 'rAF-after-viewInit'),
    ...cdPasses(2, ['Home'], { gap: 16 }),
    e(30, 'Home', 'ionic', 'ionViewDidEnter'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidEnter', 'HomePage'),
    ...cdPasses(3, ['Home'], { gap: 9 }),
  ],
  forward: [
    e(2, 'Home', 'ionic', 'nav.push'),
    e(1.2, 'Detail', 'angular', 'constructor'),
    ...oldGuard('Home', 'ionViewCanLeave', 1.8),
    e(0.3, 'App', 'cd', 'AppRef.tick'),
    ...oldGuard('Detail', 'ionViewCanEnter', 1.6),
    ...cdPass(['Home']),
    e(0.6, 'Detail', 'ionic', 'ionViewWillLoad'),
    ...initPass('Detail', 'old'),
    e(0.2, 'Detail', 'ionic', 'ionViewDidLoad'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidLoad', 'DetailPage'),
    e(1.1, 'Home', 'ionic', 'ionViewWillLeave'),
    e(0.1, 'App', 'ionic-app', 'app.viewWillLeave', 'HomePage'),
    e(0.2, 'Detail', 'ionic', 'ionViewWillEnter'),
    e(0.1, 'App', 'ionic-app', 'app.viewWillEnter', 'DetailPage'),
    e(12, 'Detail', 'render', 'rAF-after-viewInit'),
    ...cdPasses(3, ['Home', 'Detail'], { gap: 16 }),
    e(310, 'Detail', 'ionic', 'ionViewDidEnter'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidEnter', 'DetailPage'),
    e(0.2, 'Home', 'ionic', 'ionViewDidLeave'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidLeave', 'HomePage'),
    ...cdPasses(2, ['Home', 'Detail'], { gap: 8 }),
  ],
  back: [
    e(2, 'Detail', 'ionic', 'nav.pop'),
    ...oldGuard('Detail', 'ionViewCanLeave', 1.7),
    e(0.3, 'App', 'cd', 'AppRef.tick'),
    ...oldGuard('Home', 'ionViewCanEnter', 1.5),
    ...cdPass(['Home', 'Detail']),
    e(1.0, 'Detail', 'ionic', 'ionViewWillLeave'),
    e(0.1, 'App', 'ionic-app', 'app.viewWillLeave', 'DetailPage'),
    e(0.2, 'Home', 'ionic', 'ionViewWillEnter'),
    e(0.1, 'App', 'ionic-app', 'app.viewWillEnter', 'HomePage'),
    ...cdPasses(3, ['Home', 'Detail'], { gap: 16 }),
    e(300, 'Home', 'ionic', 'ionViewDidEnter'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidEnter', 'HomePage'),
    e(0.2, 'Detail', 'ionic', 'ionViewDidLeave'),
    e(0.1, 'App', 'ionic-app', 'app.viewDidLeave', 'DetailPage'),
    e(0.4, 'Detail', 'ionic', 'ionViewWillUnload'),
    e(0.1, 'App', 'ionic-app', 'app.viewWillUnload', 'DetailPage'),
    e(0.3, 'Detail', 'angular', 'ngOnDestroy'),
    ...cdPasses(2, ['Home'], { gap: 8 }),
  ],
};

// ---- NEW: Ionic 8.4.3 / Angular 20.1.3 ---------------------------------------
// Angular Router: NavigationStart -> canMatch (recognize) -> RoutesRecognized -> GuardsCheckStart
// -> canDeactivate -> ActivationStart -> canActivate -> GuardsCheckEnd -> ResolveStart -> resolve
// -> ResolveEnd -> outlet.activateWith (constructor) -> ActivationEnd -> NavigationEnd -> tick
// (ngOnInit...) -> ion-router-outlet commit (writeTask/rAF): ionNavWillChange, ionViewWillLeave,
// ionViewWillEnter -> transition -> ionViewDidEnter, ionViewDidLeave, ionNavDidChange.

function newGuard(page, hook, detail) {
  return [
    e(0.4, page, 'guard', hook, detail),
    e(1.2, page, 'guard', hook, 'resolved(true)'),
  ];
}

/** Build a router navigation up to NavigationEnd. */
function routerNav({ url, target, leaving, alive, compat, create }) {
  const cd = (pages) => cdPass(pages, { everyRender: true });
  const seq = [
    e(0.6, 'App', 'router', 'NavigationStart', url),
    ...newGuard(target, 'canMatch'),
    ...cd(alive),
    e(0.3, 'App', 'router', 'RoutesRecognized', url),
    e(0.2, 'App', 'router', 'GuardsCheckStart', url),
  ];
  if (leaving) {
    // compat mode replaces the canDeactivate guard with legacyCanLeave (instance method, source ionic-compat)
    if (compat) {
      seq.push(e(0.3, leaving, 'ionic-compat', 'ionViewCanLeave'));
      seq.push(e(1.2, leaving, 'ionic-compat', 'ionViewCanLeave', 'resolved(true)'));
    } else {
      seq.push(e(0.3, leaving, 'guard', 'canDeactivate', 'has component instance'));
      seq.push(e(1.2, leaving, 'guard', 'canDeactivate', 'resolved(true)'));
    }
    seq.push(...cd(alive));
  }
  seq.push(e(0.2, 'App', 'router', 'ActivationStart', url));
  // compat mode replaces the canActivate guard with legacyCanEnter (static method, no instance yet)
  if (compat) {
    seq.push(e(0.3, target, 'ionic-compat', 'ionViewCanEnter', 'static (no instance exists yet)'));
    seq.push(e(0.1, target, 'ionic-compat', 'ionViewCanEnter'));
    seq.push(e(1.2, target, 'ionic-compat', 'ionViewCanEnter', 'resolved(true)'));
  } else {
    seq.push(e(0.3, target, 'guard', 'canActivate'));
    seq.push(e(1.2, target, 'guard', 'canActivate', 'resolved(true)'));
  }
  seq.push(...cd(alive));
  seq.push(
    e(0.2, 'App', 'router', 'GuardsCheckEnd', url),
    e(0.2, 'App', 'router', 'ResolveStart', url),
    ...newGuard(target, 'resolve'),
    ...cd(alive),
    e(0.2, 'App', 'router', 'ResolveEnd', url),
  );
  if (create) {
    seq.push(e(0.8, target, 'angular', 'constructor'));
    if (compat) seq.push(e(0.1, target, 'ionic-compat', 'ionViewWillLoad'));
  }
  seq.push(e(0.2, 'App', 'router', 'ActivationEnd', url), e(0.3, 'App', 'router', 'NavigationEnd', url));
  return seq;
}

/** First tick after activation: steady pages are checked, the new page is initialised. */
function firstTick({ steady, created, compat }) {
  const seq = [e(0.5, 'App', 'cd', 'AppRef.tick')];
  for (const p of steady) seq.push(...cdPass([p]).slice(1));
  if (created) {
    seq.push(...initPass(created, 'new'));
    if (compat) seq.push(e(0.1, created, 'ionic-compat', 'ionViewDidLoad'));
    seq.push(e(0.4, created, 'render', 'afterNextRender'));
  }
  for (const p of [...steady, ...(created ? [created] : [])]) seq.push(e(0.1, p, 'render', 'afterEveryRender'));
  return seq;
}

function ionicTransition({ entering, leaving, alive, gapDid = 300 }) {
  const seq = [e(9, 'App', 'ionic-app', 'ionNavWillChange')];
  if (leaving) seq.push(e(0.3, leaving, 'ionic', 'ionViewWillLeave'));
  seq.push(e(0.2, entering, 'ionic', 'ionViewWillEnter'));
  seq.push(...cdPasses(3, alive, { everyRender: true, gap: 16 }));
  seq.push(e(gapDid, entering, 'ionic', 'ionViewDidEnter'));
  if (leaving) seq.push(e(0.2, leaving, 'ionic', 'ionViewDidLeave'));
  seq.push(e(0.2, 'App', 'ionic-app', 'ionNavDidChange'));
  return seq;
}

function buildNew(compat) {
  return {
    boot: [
      e(0, 'App', 'angular', 'main.ts'),
      e(95, 'App', 'angular', 'AppComponent.constructor'),
      e(4, 'App', 'cd', 'AppRef.tick'),
      ...routerNav({ url: '/home', target: 'Home', leaving: null, alive: [], compat, create: true }),
      ...firstTick({ steady: [], created: 'Home', compat }),
      ...ionicTransition({ entering: 'Home', leaving: null, alive: ['Home'], gapDid: 40 }),
      ...cdPasses(2, ['Home'], { everyRender: true, gap: 9 }),
    ],
    forward: [
      e(2, 'Home', 'ionic', 'nav.navigateForward'),
      ...routerNav({ url: '/detail', target: 'Detail', leaving: 'Home', alive: ['Home'], compat, create: true }),
      ...firstTick({ steady: ['Home'], created: 'Detail', compat }),
      ...ionicTransition({ entering: 'Detail', leaving: 'Home', alive: ['Home', 'Detail'] }),
      ...cdPasses(2, ['Home', 'Detail'], { everyRender: true, gap: 8 }),
    ],
    back: [
      e(2, 'Detail', 'ionic', 'nav.pop'),
      ...routerNav({ url: '/home', target: 'Home', leaving: 'Detail', alive: ['Home', 'Detail'], compat, create: false }),
      ...firstTick({ steady: ['Home', 'Detail'], created: null, compat }),
      ...ionicTransition({ entering: 'Home', leaving: 'Detail', alive: ['Home', 'Detail'] }),
      ...(compat ? [e(0.3, 'Detail', 'ionic-compat', 'ionViewWillUnload')] : []),
      e(0.4, 'Detail', 'angular', 'ngOnDestroy'),
      ...cdPasses(2, ['Home'], { everyRender: true, gap: 8 }),
    ],
  };
}

export const SEQUENCES = {
  old: OLD,
  new: buildNew(false),
  'new-compat': buildNew(true),
};

export const PHASES = ['boot', 'forward', 'back'];
