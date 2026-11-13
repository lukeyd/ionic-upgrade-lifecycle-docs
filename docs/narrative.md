All statements below come from the three captures in `captures/` (boot → push Detail → pop back to Home), not from documentation. CD passes are omitted from the sequences; the swimlanes and tables above show them.

### What actually changed, per phase

**Boot (first page).**
Old: `constructor` → `ionViewCanEnter` → `ionViewWillLoad` → `ngOnInit` → first CD pass → `ngAfterViewInit` → `ionViewDidLoad` → first paint (rAF) → `ionViewWillEnter` → `ionViewDidEnter`.
New: `NavigationStart` → `canMatch` → `canActivate` → `resolve` → `constructor` → `ngOnInit` → first CD pass → `ngAfterViewInit` → `NavigationEnd` → `ionNavWillChange` → `ionViewWillEnter` → `ionViewDidEnter` → `ionNavDidChange` → `afterNextRender` (first paint).
Two things moved. The guard and the resolver now run before the component exists. And on the first page, `ionViewWillEnter` and `ionViewDidEnter` fire synchronously before the first paint, where Ionic 3 painted first (there is no enter transition for a root page in Ionic 8, so "did enter" is immediate).

**Forward (Home → Detail).**
Old: `nav.push` → `Detail constructor` → `Home ionViewCanLeave` and `Detail ionViewCanEnter` asked together, resolved in order → `Detail ionViewWillLoad` → `ngOnInit` … `ngAfterViewInit` → `ionViewDidLoad` → paint → `Home ionViewWillLeave` → `Detail ionViewWillEnter` → `Detail ionViewDidEnter` → `Home ionViewDidLeave`.
New: `nav.navigateForward` → `NavigationStart` → `Detail canMatch` → `Home canDeactivate` (with the Home instance) → `Detail canActivate` → `Detail resolve` → `Detail constructor` → `ngOnInit` … `ngAfterViewInit` → `NavigationEnd` → `Detail afterNextRender` → `ionNavWillChange` → `Home ionViewWillLeave` → `Detail ionViewWillEnter` → `Detail ionViewDidEnter` → `Home ionViewDidLeave` → `ionNavDidChange`.
The four surviving Ionic hooks fire in exactly the same relative order in both stacks (leave-will, enter-will, enter-did, leave-did). The guards changed in two ways: they run before construction, and they run strictly one after another (`canDeactivate` must resolve before `canActivate` is even called), where Ionic 3 invoked `ionViewCanLeave` and `ionViewCanEnter` concurrently via `Promise.all`.

**Back (Detail → Home, Home reused from the stack).**
Old: `nav.pop` → `Detail ionViewCanLeave` + `Home ionViewCanEnter` → `Detail ionViewWillLeave` → `Home ionViewWillEnter` → `Home ionViewDidEnter` → `Detail ionViewDidLeave` → `Detail ionViewWillUnload` → `Detail ngOnDestroy`.
New: `nav.pop` → `NavigationStart` → `Home canMatch` → `Detail canDeactivate` → `Home canActivate` → `Home resolve` → `NavigationEnd` → `ionNavWillChange` → `Detail ionViewWillLeave` → `Home ionViewWillEnter` → `Home ionViewDidEnter` → `Detail ionViewDidLeave` → `ionNavDidChange` → `Detail ngOnDestroy`.
Neither stack re-constructs Home. Both re-run the enter guard for it. The new stack also re-runs Home's resolver, but the reused component only sees the new data if it subscribes to `ActivatedRoute.data`; it is not re-created and `ngOnInit` does not run again.

**Angular hooks and change detection.** Inside a page, the Angular order is identical in both versions: `constructor` → `ngOnInit` → `ngDoCheck` → `ngAfterContentInit` → `ngAfterContentChecked` → template evaluated (directive `ngOnInit`) → `ngAfterViewInit` → `ngAfterViewChecked`, and every later pass is `ngDoCheck` → `ngAfterContentChecked` → template → `ngAfterViewChecked`. Both apps run in dev mode, so each pass evaluates the template twice (`checkNoChanges`). `AppRef.tick` fires once per pass in both, and in the new app every async guard or resolver resolution costs one extra tick because zone.js schedules a tick when the promise settles. `ngOnChanges` never fires on a page in either stack because pages have no inputs.

### Mapping old hooks to the new stack, with the order you get

| Ionic 3 hook | Use in Ionic 8 / Angular 20 | Same position as before? |
|---|---|---|
| `ionViewCanLeave` | `canDeactivate` guard calling the component's method (the shim's `legacyCanLeave`) | Yes. The guard receives the live instance; only difference is it now completes before the enter guard starts. |
| `ionViewCanEnter` | `canActivate` guard | No, and it cannot be. The router runs it before the component is constructed; the old hook ran after the constructor on the real instance. See the options below. |
| `ionViewWillLoad` | `ngOnInit` | Yes. Old `ionViewWillLoad` fired immediately before `ngOnInit`. |
| `ionViewDidLoad` | `ngAfterViewInit`, not `ngOnInit` | Yes if you use `ngAfterViewInit`. The old hook fired after the first CD pass and after `ngAfterViewInit`, when the page DOM already existed. The usual migration advice (`ngOnInit`) moves that code to before the view exists. |
| `ionViewWillEnter` / `ionViewDidEnter` / `ionViewWillLeave` / `ionViewDidLeave` | Same names, implement the `ViewWillEnter` etc. interfaces | Yes during navigation. On the very first page `ionViewDidEnter` now fires before the first paint. |
| `ionViewWillUnload` | `ngOnDestroy` | Yes. Both fire after `ionViewDidLeave` once the transition is done and the view is removed. |
| Data loading in `constructor` / `ionViewDidLoad` | Either keep it in `ngOnInit` / `ionViewWillEnter` (same timing as before) or move it to a `resolve` | A resolver changes the order: it runs before construction and the page is not created until it settles. Keep loading inside the page if you need the old "render first, load after" behaviour. |
| `App.viewDidLoad` / `viewWillEnter` / … emitters | `Router.events` plus `ionNavWillChange` / `ionNavDidChange` on `ion-router-outlet` | Partially. `NavigationEnd` fires before the Ionic transition starts, so it is not an `app.viewDidEnter` replacement; `ionNavDidChange` is the closest. |
| `rAF` after `ngAfterViewInit` (first paint) | `afterNextRender` | Yes, and it is a real hook now. Put paint-dependent code here rather than in `ionViewDidEnter`. |

### What the compat shim recovers (third capture)

The `LegacyPage` base class plus the two functional guards give you the old names back in these positions: `ionViewCanLeave` in the `canDeactivate` slot with the instance, `ionViewWillLoad` right after `ngOnInit`, `ionViewDidLoad` right after `ngAfterViewInit`, and `ionViewWillUnload` inside `ngOnDestroy`. The four surviving hooks pass straight through. Two caveats show in the compat capture:

- `ionViewCanEnter` is only recoverable as a **static** method (no `this`, no injected services from the component; use `inject()` inside the guard instead). It runs in the `canActivate` slot, before construction. If the old implementation needed the instance, choose one of: move the check into an injectable service and call it from the guard; or let the guard pass and run the check in `ngOnInit` / `ionViewWillEnter`, navigating back when it fails. The second option reproduces the Ionic 3 order (construct first, then check) at the cost of the page being created and possibly flashing.
- `ionViewWillUnload` is re-emitted from the base class's `ngOnDestroy`. Call `super.ngOnDestroy()` first in the subclass if the old code expected `ionViewWillUnload` to run before the page's own teardown.

### Checklist for the migration

1. Replace `ionViewCanLeave` with a `canDeactivate` guard that calls the component method. No order change.
2. Replace `ionViewCanEnter` with a `canActivate` guard backed by a service, or with an in-page check in `ionViewWillEnter`. Decide per page which order matters.
3. Move `ionViewWillLoad` code to `ngOnInit` and `ionViewDidLoad` code to `ngAfterViewInit`.
4. Move `ionViewWillUnload` code to `ngOnDestroy`.
5. Do not introduce resolvers for data the old page loaded after rendering, unless you want the page to wait.
6. Move first-paint code (measurements, scroll restoration) to `afterNextRender`; do not rely on `ionViewDidEnter` on the first page.
7. Replace `App` view emitters with `ionNavWillChange` / `ionNavDidChange` on the outlet, or `Router.events` when you need the URL.
8. Expect more change-detection ticks during navigation (one per async guard or resolver step); this is zone.js, not Ionic.
