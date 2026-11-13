# Shared lifecycle log contract (binding for app-old, app-new, tools)

## Entry shape
Every lifecycle event is one object pushed onto `window.__lifecycleLog` (a plain array created on first use):

```ts
{ t: number,        // performance.now() at the moment of the hook, ms (float)
  page: string,     // 'Home' | 'Detail' | 'App'
  source: string,   // 'angular' | 'ionic' | 'ionic-app' | 'ionic-compat' | 'router' | 'guard' | 'render' | 'cd' | 'marker'
  hook: string,     // exact hook name, see list below
  detail?: string } // optional free text, e.g. 'resolved(true)', 'has component instance'
```

`log(page, source, hook, detail?)` must ALSO print one console.log line in exactly this format
(so console captures are parseable):

```
[LC] +12.3ms Home ionic ionViewDidEnter
[LC] +12.3ms Home guard canActivate (resolved(true))
```
i.e. `'[LC] +' + t.toFixed(1) + 'ms ' + page + ' ' + source + ' ' + hook + (detail ? ' (' + detail + ')' : '')`.

`window.__lifecycleLog` must be created by the logger module on first call (`(window as any).__lifecycleLog = (window as any).__lifecycleLog || []`).
`t` is raw `performance.now()`; the generator rebases it.

## DOM markers
- `<html data-app="old">` in app-old, `<html data-app="new">` in app-new (the capture tool asserts this).
- Home page button: `data-test="go-detail"`; Detail page button: `data-test="back"`.
- The capture tool injects `{ t, page:'App', source:'marker', hook:'PHASE:boot'|'PHASE:forward'|'PHASE:back'|'PHASE:end' }`
  entries via `page.evaluate`. Apps never emit `marker` entries themselves.

## Hook names (exact strings in `hook`), per page component (Home and Detail)
source `angular`: `constructor`, `ngOnChanges`, `ngOnInit`, `ngDoCheck`, `ngAfterContentInit`, `ngAfterContentChecked`, `ngAfterViewInit`, `ngAfterViewChecked`, `ngOnDestroy`
source `ionic`:   `ionViewCanEnter`, `ionViewWillLoad`, `ionViewDidLoad`, `ionViewWillEnter`, `ionViewDidEnter`, `ionViewWillLeave`, `ionViewDidLeave`, `ionViewCanLeave`, `ionViewWillUnload`
  - async guards log the hook when asked, then log the same hook again with detail `resolved(true)` when the promise resolves (after a `setTimeout(0)`).
  - navigation triggers: `nav.push` (old, Home), `nav.pop` (old, Detail), `nav.navigateForward` (new, Home), `nav.pop` (new, Detail) — source `ionic`, logged right before the call.
  - app-new keeps the five removed hooks (`ionViewCanEnter`, `ionViewWillLoad`, `ionViewDidLoad`, `ionViewCanLeave`, `ionViewWillUnload`) as methods that log with source `ionic` so the report can show they never fire. In compat mode they are re-emitted with source `ionic-compat`.
source `guard` (app-new only; `page` = the route's page name): `canMatch`, `canActivate`, `resolve`, `canDeactivate` (+ `resolved(true)` detail entries).
source `router` (app-new only, page 'App'): `NavigationStart`, `RoutesRecognized`, `GuardsCheckStart`, `GuardsCheckEnd`, `ResolveStart`, `ResolveEnd`, `ActivationStart`, `ActivationEnd`, `NavigationEnd` with detail = url.
source `ionic-app` (page 'App'): old: `app.viewDidLoad`, `app.viewWillEnter`, `app.viewDidEnter`, `app.viewWillLeave`, `app.viewDidLeave`, `app.viewWillUnload` (detail = view name); new: `ionNavWillChange`, `ionNavDidChange`.
source `render` (page = page name, emitted by the `logRender` directive on `<ion-content>`): `directive:ngOnInit`, `directive:ngAfterViewInit`, old only: `rAF-after-viewInit` (approximation of first paint), new only: `afterNextRender`, `afterEveryRender`.
source `cd`: `template-evaluated` (from `{{ trace('template-evaluated') }}` in each page template, page = page name), `AppRef.tick` (page 'App').
source `angular` page 'App': `main.ts` (first thing in main.ts), `AppComponent.constructor`.

## Ports
app-old dev server: http://localhost:8100   app-new dev server: http://localhost:4200  (compat mode: http://localhost:4200/?compat=1)
