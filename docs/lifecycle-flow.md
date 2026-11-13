# Lifecycle order flowchart

The hooks a page author writes, in the order they fire, measured in two instrumented apps: **Ionic 3.9.5 / Angular 5.0.3** and **Ionic 8.4.3 / Angular 20.1.3**. Change-detection passes and router events are left out. Generated from `captures/` by `tools/generate.mjs`; do not edit by hand. Also available as a [PDF](lifecycle-flow.pdf) and as an interactive page ([lifecycle-flow.html](lifecycle-flow.html), open locally).

| Mark | Meaning |
|---|---|
| 🟥 red | Angular hook |
| 🟦 blue | Ionic page hook |
| 🟨 amber | Guard or resolver |
| 🟪 purple | Old hook re-created by the compat shim |
| 👁 green | First visible render: the page DOM is complete and the next frame shows it |
| ⏳ | The framework awaits what you return (Ionic 3: a Promise; the Angular router: a Promise or an Observable). Navigation pauses. Load or check data here. |
| ✗ dashed | Cannot be put back where Ionic 3 had it |

## 1. Old vs new

### App start

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph old["Old: Ionic 3.9.5 / Angular 5.0.3"]
    direction TB
    old0["Home: constructor"]:::angular
    old1["Home: ionViewCanEnter ⏳"]:::guard
    old0 --> old1
    old2["Home: ionViewWillLoad"]:::ionic
    old1 --> old2
    old3["Home: ngOnInit"]:::angular
    old2 --> old3
    old4["Home: ngAfterViewInit"]:::angular
    old3 --> old4
    old5["Home: ionViewDidLoad"]:::ionic
    old4 --> old5
    old6["👁 FIRST VISIBLE RENDER"]:::paint
    old5 --> old6
    old7["Home: ionViewWillEnter"]:::ionic
    old6 --> old7
    old8["Home: ionViewDidEnter"]:::ionic
    old7 --> old8
  end
  subgraph new["New: Ionic 8.4.3 / Angular 20.1.3"]
    direction TB
    new0["Home: canActivate ⏳"]:::guard
    new1["Home: resolve ⏳"]:::guard
    new0 --> new1
    new2["Home: constructor"]:::angular
    new1 --> new2
    new3["Home: ngOnInit"]:::angular
    new2 --> new3
    new4["Home: ngAfterViewInit"]:::angular
    new3 --> new4
    new5["Home: ionViewWillEnter"]:::ionic
    new4 --> new5
    new6["Home: ionViewDidEnter"]:::ionic
    new5 --> new6
    new7["👁 FIRST VISIBLE RENDER"]:::paint
    new6 --> new7
  end
```

### Push Home → Detail

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph old["Old: Ionic 3.9.5 / Angular 5.0.3"]
    direction TB
    old0["Detail: constructor"]:::angular
    old1["Home: ionViewCanLeave ⏳"]:::guard
    old0 --> old1
    old2["Detail: ionViewCanEnter ⏳"]:::guard
    old1 --> old2
    old3["Detail: ionViewWillLoad"]:::ionic
    old2 --> old3
    old4["Detail: ngOnInit"]:::angular
    old3 --> old4
    old5["Detail: ngAfterViewInit"]:::angular
    old4 --> old5
    old6["Detail: ionViewDidLoad"]:::ionic
    old5 --> old6
    old7["👁 FIRST VISIBLE RENDER"]:::paint
    old6 --> old7
    old8["Home: ionViewWillLeave"]:::ionic
    old7 --> old8
    old9["Detail: ionViewWillEnter"]:::ionic
    old8 --> old9
    old10["Detail: ionViewDidEnter"]:::ionic
    old9 --> old10
    old11["Home: ionViewDidLeave"]:::ionic
    old10 --> old11
  end
  subgraph new["New: Ionic 8.4.3 / Angular 20.1.3"]
    direction TB
    new0["Home: canDeactivate ⏳"]:::guard
    new1["Detail: canActivate ⏳"]:::guard
    new0 --> new1
    new2["Detail: resolve ⏳"]:::guard
    new1 --> new2
    new3["Detail: constructor"]:::angular
    new2 --> new3
    new4["Detail: ngOnInit"]:::angular
    new3 --> new4
    new5["Detail: ngAfterViewInit"]:::angular
    new4 --> new5
    new6["👁 FIRST VISIBLE RENDER"]:::paint
    new5 --> new6
    new7["Home: ionViewWillLeave"]:::ionic
    new6 --> new7
    new8["Detail: ionViewWillEnter"]:::ionic
    new7 --> new8
    new9["Detail: ionViewDidEnter"]:::ionic
    new8 --> new9
    new10["Home: ionViewDidLeave"]:::ionic
    new9 --> new10
  end
```

### Pop back to Home

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph old["Old: Ionic 3.9.5 / Angular 5.0.3"]
    direction TB
    old0["Detail: ionViewCanLeave ⏳"]:::guard
    old1["Home: ionViewCanEnter ⏳"]:::guard
    old0 --> old1
    old2["Detail: ionViewWillLeave"]:::ionic
    old1 --> old2
    old3["Home: ionViewWillEnter"]:::ionic
    old2 --> old3
    old4["Home: ionViewDidEnter"]:::ionic
    old3 --> old4
    old5["Detail: ionViewDidLeave"]:::ionic
    old4 --> old5
    old6["Detail: ionViewWillUnload"]:::ionic
    old5 --> old6
    old7["Detail: ngOnDestroy"]:::angular
    old6 --> old7
  end
  subgraph new["New: Ionic 8.4.3 / Angular 20.1.3"]
    direction TB
    new0["Detail: canDeactivate ⏳"]:::guard
    new1["Home: canActivate ⏳"]:::guard
    new0 --> new1
    new2["Home: resolve ⏳"]:::guard
    new1 --> new2
    new3["Detail: ionViewWillLeave"]:::ionic
    new2 --> new3
    new4["Home: ionViewWillEnter"]:::ionic
    new3 --> new4
    new5["Home: ionViewDidEnter"]:::ionic
    new4 --> new5
    new6["Detail: ionViewDidLeave"]:::ionic
    new5 --> new6
    new7["Detail: ngOnDestroy"]:::angular
    new6 --> new7
  end
```

### Where you can wait for data

Only the ⏳ hooks are awaited: Ionic 3 awaited a returned Promise, the Angular router awaits a Promise or an Observable. Everything else runs and the app moves on, so data loaded there needs its own loading state.

| You want to | Ionic 3 | Ionic 8 + Angular 20 | Page exists when it runs? |
|---|---|---|---|
| Block entering until data or permission is ready | `ionViewCanEnter` | `canActivate` for a yes/no, `resolve` for data; both await a Promise or Observable (`canMatch` too) | Old: yes, constructed first. New: no. |
| Block leaving (unsaved changes) | `ionViewCanLeave` | `canDeactivate` | Yes in both. |
| Show the page, then load | `ionViewDidLoad` or `ionViewWillEnter` | `ngOnInit` or `ionViewWillEnter`, not awaited | Yes in both. |
| Refresh every time the page is shown again | `ionViewWillEnter` | `ionViewWillEnter`, not awaited | Yes in both; the page is reused on pop. |

## 2. How the shim is called

Two route guards and one base class. The guards turn router calls into the old guard methods; the base class turns Angular hooks into the old load and unload hooks. The four enter and leave hooks need nothing: Ionic 8 still calls them by the same names.

```mermaid
flowchart LR
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph callers["Framework calls"]
    direction TB
    A1["Router: canActivate ⏳"]:::guard
    A2["Router: canDeactivate ⏳"]:::guard
    A3["Angular: ngOnInit"]:::angular
    A4["Angular: ngAfterViewInit"]:::angular
    A5["Ionic outlet: ionViewWillEnter … ionViewDidLeave"]:::ionic
    A6["Angular: ngOnDestroy"]:::angular
  end
  subgraph shim["Shim"]
    direction TB
    S1["legacyCanEnter(DetailPage)"]:::shim
    S2["legacyCanLeave"]:::shim
    S3["LegacyPage.ngOnInit()"]:::shim
    S4["LegacyPage.ngAfterViewInit()"]:::shim
    S6["LegacyPage.ngOnDestroy()"]:::shim
  end
  subgraph page["Your page"]
    direction TB
    P1["static DetailPage.ionViewCanEnter(route, state) ✗ no instance, no this"]:::no
    P2["page.ionViewCanLeave() — has the instance"]
    P3["page.ionViewWillLoad()"]
    P4["page.ionViewDidLoad()"]
    P5["page.ionViewWillEnter() … unchanged"]
    P6["page.ionViewWillUnload()"]
  end
  A1 --> S1 --> P1
  A2 --> S2 --> P2
  A3 --> S3 --> P3
  A4 --> S4 --> P4
  A5 --> P5
  A6 --> S6 --> P6
```

**Route**

```ts
{
  path: 'detail',
  component: DetailPage,
  canActivate:   [legacyCanEnter(DetailPage)],
  canDeactivate: [legacyCanLeave],
}
```

**Guards**

```ts
export const legacyCanLeave: CanDeactivateFn<LegacyPage> =
  (page) => page?.ionViewCanLeave?.() ?? true;

export function legacyCanEnter(Page): CanActivateFn {
  return (route, state) =>
    Page.ionViewCanEnter ? Page.ionViewCanEnter(route, state) : true;
}
```

**Base class**

```ts
@Directive()
export abstract class LegacyPage {
  static ionViewCanEnter?(route, state): boolean | Promise<boolean>;

  ngOnInit()        { this.ionViewWillLoad(); }
  ngAfterViewInit() { this.ionViewDidLoad(); }
  ngOnDestroy()     { this.ionViewWillUnload(); }

  ionViewCanLeave(): boolean | Promise<boolean> { return true; }
  ionViewWillLoad() {}  ionViewDidLoad() {}  ionViewWillUnload() {}
}
```

**A page**

```ts
export class DetailPage extends LegacyPage {
  static override ionViewCanEnter(route, state) {
    return inject(AuthService).isAllowed();   // no this here
  }
  override ionViewCanLeave() { return !this.form.dirty; }
  override ionViewDidLoad()  { /* DOM exists, same as Ionic 3 */ }
}
```

The one thing that does not come back is an `ionViewCanEnter` that reads instance state. The router decides before the page exists, so the check has to be static or live in a service. If it must see the instance, let the guard pass and check in `ionViewWillEnter`, then navigate back; that restores "construct first, then decide" at the cost of a possible flash.

## 3. Old vs new with the shim

Same phases, with the shim wired in. A box without ✗ is in the same place as Ionic 3. Dashed ✗ boxes cannot be moved back; the reasons are listed under each diagram.

### App start

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph old["Old: Ionic 3.9.5 / Angular 5.0.3"]
    direction TB
    old0["Home: constructor"]:::angular
    old1["Home: ionViewCanEnter ⏳"]:::guard
    old0 --> old1
    old2["Home: ionViewWillLoad"]:::ionic
    old1 --> old2
    old3["Home: ngOnInit"]:::angular
    old2 --> old3
    old4["Home: ngAfterViewInit"]:::angular
    old3 --> old4
    old5["Home: ionViewDidLoad"]:::ionic
    old4 --> old5
    old6["👁 FIRST VISIBLE RENDER"]:::paint
    old5 --> old6
    old7["Home: ionViewWillEnter"]:::ionic
    old6 --> old7
    old8["Home: ionViewDidEnter"]:::ionic
    old7 --> old8
  end
  subgraph newcompat["New + shim: Ionic 8.4.3 / Angular 20.1.3 + compat shim"]
    direction TB
    newcompat0["Home: ionViewCanEnter ⏳"]:::shim
    newcompat1["Home: resolve ⏳"]:::guard
    newcompat0 --> newcompat1
    newcompat2["Home: constructor"]:::angular
    newcompat1 --> newcompat2
    newcompat3["Home: ngOnInit"]:::angular
    newcompat2 --> newcompat3
    newcompat4["Home: ionViewWillLoad"]:::shim
    newcompat3 --> newcompat4
    newcompat5["Home: ngAfterViewInit"]:::angular
    newcompat4 --> newcompat5
    newcompat6["Home: ionViewDidLoad"]:::shim
    newcompat5 --> newcompat6
    newcompat7["Home: ionViewWillEnter"]:::ionic
    newcompat6 --> newcompat7
    newcompat8["Home: ionViewDidEnter"]:::ionic
    newcompat7 --> newcompat8
    newcompat9["👁 FIRST VISIBLE RENDER"]:::paint
    newcompat8 --> newcompat9
  end
```

- ✗ `Home.ionViewCanEnter`: router runs it before the constructor.
- ✗ `Home.ionViewWillEnter`: root page: fires before the first paint.
- ✗ `Home.ionViewDidEnter`: root page: fires before the first paint.

### Push Home → Detail

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph old["Old: Ionic 3.9.5 / Angular 5.0.3"]
    direction TB
    old0["Detail: constructor"]:::angular
    old1["Home: ionViewCanLeave ⏳"]:::guard
    old0 --> old1
    old2["Detail: ionViewCanEnter ⏳"]:::guard
    old1 --> old2
    old3["Detail: ionViewWillLoad"]:::ionic
    old2 --> old3
    old4["Detail: ngOnInit"]:::angular
    old3 --> old4
    old5["Detail: ngAfterViewInit"]:::angular
    old4 --> old5
    old6["Detail: ionViewDidLoad"]:::ionic
    old5 --> old6
    old7["👁 FIRST VISIBLE RENDER"]:::paint
    old6 --> old7
    old8["Home: ionViewWillLeave"]:::ionic
    old7 --> old8
    old9["Detail: ionViewWillEnter"]:::ionic
    old8 --> old9
    old10["Detail: ionViewDidEnter"]:::ionic
    old9 --> old10
    old11["Home: ionViewDidLeave"]:::ionic
    old10 --> old11
  end
  subgraph newcompat["New + shim: Ionic 8.4.3 / Angular 20.1.3 + compat shim"]
    direction TB
    newcompat0["Home: ionViewCanLeave ⏳"]:::shim
    newcompat1["Detail: ionViewCanEnter ⏳"]:::shim
    newcompat0 --> newcompat1
    newcompat2["Detail: resolve ⏳"]:::guard
    newcompat1 --> newcompat2
    newcompat3["Detail: constructor"]:::angular
    newcompat2 --> newcompat3
    newcompat4["Detail: ngOnInit"]:::angular
    newcompat3 --> newcompat4
    newcompat5["Detail: ionViewWillLoad"]:::shim
    newcompat4 --> newcompat5
    newcompat6["Detail: ngAfterViewInit"]:::angular
    newcompat5 --> newcompat6
    newcompat7["Detail: ionViewDidLoad"]:::shim
    newcompat6 --> newcompat7
    newcompat8["👁 FIRST VISIBLE RENDER"]:::paint
    newcompat7 --> newcompat8
    newcompat9["Home: ionViewWillLeave"]:::ionic
    newcompat8 --> newcompat9
    newcompat10["Detail: ionViewWillEnter"]:::ionic
    newcompat9 --> newcompat10
    newcompat11["Detail: ionViewDidEnter"]:::ionic
    newcompat10 --> newcompat11
    newcompat12["Home: ionViewDidLeave"]:::ionic
    newcompat11 --> newcompat12
  end
```

- ✗ `Home.ionViewCanLeave`: router runs it before the next page is constructed.
- ✗ `Detail.ionViewCanEnter`: router runs it before the constructor.

### Pop back to Home

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  classDef no stroke:#c23d4b,stroke-width:2px,stroke-dasharray:5 3
  subgraph old["Old: Ionic 3.9.5 / Angular 5.0.3"]
    direction TB
    old0["Detail: ionViewCanLeave ⏳"]:::guard
    old1["Home: ionViewCanEnter ⏳"]:::guard
    old0 --> old1
    old2["Detail: ionViewWillLeave"]:::ionic
    old1 --> old2
    old3["Home: ionViewWillEnter"]:::ionic
    old2 --> old3
    old4["Home: ionViewDidEnter"]:::ionic
    old3 --> old4
    old5["Detail: ionViewDidLeave"]:::ionic
    old4 --> old5
    old6["Detail: ionViewWillUnload"]:::ionic
    old5 --> old6
    old7["Detail: ngOnDestroy"]:::angular
    old6 --> old7
  end
  subgraph newcompat["New + shim: Ionic 8.4.3 / Angular 20.1.3 + compat shim"]
    direction TB
    newcompat0["Detail: ionViewCanLeave ⏳"]:::shim
    newcompat1["Home: ionViewCanEnter ⏳"]:::shim
    newcompat0 --> newcompat1
    newcompat2["Home: resolve ⏳"]:::guard
    newcompat1 --> newcompat2
    newcompat3["Detail: ionViewWillLeave"]:::ionic
    newcompat2 --> newcompat3
    newcompat4["Home: ionViewWillEnter"]:::ionic
    newcompat3 --> newcompat4
    newcompat5["Home: ionViewDidEnter"]:::ionic
    newcompat4 --> newcompat5
    newcompat6["Detail: ionViewDidLeave"]:::ionic
    newcompat5 --> newcompat6
    newcompat7["Detail: ngOnDestroy"]:::angular
    newcompat6 --> newcompat7
    newcompat8["Detail: ionViewWillUnload"]:::shim
    newcompat7 --> newcompat8
  end
```

## First visible render

There is no "painted" event in either stack. The green box is the earliest point where the page DOM is complete and the next frame will show it: a `requestAnimationFrame` after `ngAfterViewInit` in the old app, `afterNextRender` in the new one. On a push the page then slides in and is fully visible at `ionViewDidEnter`. On app start the root page has nothing to leave, so Ionic 8 fires both enter hooks at once, before anything is painted.
