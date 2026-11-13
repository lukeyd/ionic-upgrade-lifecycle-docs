# DetailPage lifecycle: Push into DetailPage

Profile `ionic-angular` · measured on @ionic/angular 8.4.3. Only hooks the page implements and guards on its route are shown; change-detection passes are left out. ⏳ = the framework awaits what you return.

```mermaid
flowchart TB
  classDef angular fill:#fbe3e5,stroke:#c23d4b,color:#17161a
  classDef ionic fill:#e4ecfb,stroke:#2d6cdf,color:#17161a
  classDef guard fill:#fbf1d6,stroke:#9a6a00,color:#17161a
  classDef shim fill:#e9e6fb,stroke:#5b4bd6,color:#17161a
  classDef marker fill:#f0efe9,stroke:#8b8894,color:#5a5861,stroke-dasharray:5 3
  classDef paint fill:#e3f5ec,stroke:#0f8a5f,stroke-width:2px,color:#0f8a5f
  subgraph spush["Push into DetailPage"]
    direction TB
    spush0["Detail: canMatch ⏳"]:::guard
    spush1["Home: canDeactivate ⏳"]:::guard
    spush0 --> spush1
    spush2["Detail: canActivate ⏳"]:::guard
    spush1 --> spush2
    spush3["Detail: resolve ⏳"]:::guard
    spush2 --> spush3
    spush4["Detail: constructor"]:::angular
    spush3 --> spush4
    spush5["Detail: ngOnInit"]:::angular
    spush4 --> spush5
    spush6["Detail: ngAfterContentInit"]:::angular
    spush5 --> spush6
    spush7["Detail: ngAfterViewInit"]:::angular
    spush6 --> spush7
    spush8["👁 FIRST VISIBLE RENDER"]:::paint
    spush7 --> spush8
    spush9["Home: ionViewWillLeave"]:::ionic
    spush8 --> spush9
    spush10["Detail: ionViewWillEnter"]:::ionic
    spush9 --> spush10
    spush11["Detail: ionViewDidEnter"]:::ionic
    spush10 --> spush11
    spush12["Home: ionViewDidLeave"]:::ionic
    spush11 --> spush12
  end
```

| # | Page | Hook | Kind | Awaited | Implemented by | Note |
|---|---|---|---|---|---|---|
| 1 | Detail | `canMatch` | guard | ⏳ promise|observable | makeCanMatch | doc-derived |
| 2 | Home | `canDeactivate` | guard | ⏳ promise|observable | makeCanDeactivate |  |
| 3 | Detail | `canActivate` | guard | ⏳ promise|observable | makeCanActivate |  |
| 4 | Detail | `resolve` | guard | ⏳ promise|observable | makeResolve |  |
| 5 | Detail | `constructor` | angular |  | DetailPage |  |
| 6 | Detail | `ngOnInit` | angular |  | DetailPage |  |
| 7 | Detail | `ngAfterContentInit` | angular |  | DetailPage |  |
| 8 | Detail | `ngAfterViewInit` | angular |  | DetailPage |  |
| 9 | App | 👁 first visible render | paint |  |  |  |
| 10 | Home | `ionViewWillLeave` | ionic |  | HomePage |  |
| 11 | Detail | `ionViewWillEnter` | ionic |  | DetailPage |  |
| 12 | Detail | `ionViewDidEnter` | ionic |  | DetailPage |  |
| 13 | Home | `ionViewDidLeave` | ionic |  | HomePage |  |

## Notes

- Leaving HomePage (inferred from navigation calls; pass --from to override).
- DetailPage declares `ionViewCanEnter`, `ionViewCanLeave`, `ionViewWillLoad`, `ionViewDidLoad`, `ionViewWillUnload`: removed in Ionic 4+, never called unless a compat base class re-emits them (ionViewWillLoad from ngOnInit, ionViewDidLoad from ngAfterViewInit, ionViewWillUnload from ngOnDestroy) or a route guard forwards to them (legacyCanEnter -> static ionViewCanEnter, legacyCanLeave -> ionViewCanLeave).
