# Ionic 3 → Ionic 8 lifecycle order comparison

Two minimal apps instrumented to log every Angular, Ionic, Router, render and change-detection hook,
an automated capture of the real firing order during **boot → push Detail → pop back**, and a generated
report comparing the two stacks plus a compatibility shim that re-creates the old hook names where possible.

| Folder     | Stack                                             | Node     | Port |
|------------|---------------------------------------------------|----------|------|
| `app-old/` | ionic-angular 3.9.5 + Angular 5.0.3 (NavController) | 16.20.2 | 8100 |
| `app-new/` | @ionic/angular 8.4.3 + Angular 20.1.3 (Router)      | 22.14.0 | 4200 |
| `tools/`   | Playwright capture + report generator               | 22.14.0 | –    |

The data contract every part follows is in [`LOG-CONTRACT.md`](LOG-CONTRACT.md).
**Start here:** [`docs/lifecycle-flow.md`](docs/lifecycle-flow.md) renders the flowcharts directly on GitHub (Mermaid), and the same content is in [`docs/lifecycle-flow.pdf`](docs/lifecycle-flow.pdf).

Outputs:
- `captures/*.json`: raw event logs from the three runs (old, new, new + compat shim).
- `docs/lifecycle-flow.md` / `.pdf` / `.html`: the linear flowchart, old vs new, how the shim is called, old vs new with the shim, first-visible-render marker.
- `docs/lifecycle-comparison.md` / `docs/lifecycle-report.html`: full detail, every change-detection pass, swimlanes, mapping tables.
- `docs/narrative.md`: the written analysis, inlined into the detailed report.

## Run it

Three terminals (or background processes). Node versions are pinned per folder via `.nvmrc`.

```bash
# 1. old app (Ionic 3)                      # 2. new app (Ionic 8)                 # 3. capture + report
cd app-old && nvm use && npm install        cd app-new && nvm use && npm install   cd tools && nvm use && npm install
npm start         # http://localhost:8100   npm start       # http://localhost:4200 npm run capture:all && npm run generate
```

`npm run capture:all` drives both apps headlessly (boot → Go to Detail → Back), writes `captures/{old,new,new-compat}.json`
and prints a PASS/FAIL table of expected hooks. `npm run generate` turns the captures into the two documents in `docs/`.
The written analysis lives in `docs/narrative.md` and is inlined into both outputs on every generate.

### app-old notes
- Needs Node 16 (webpack 3). Node 22 also happened to work on this machine, but 16 is the supported path.
- `node-sass` cannot build on arm64, so `package.json` aliases it to Dart Sass (`overrides`). Dart Sass rejects one file in
  Ionic 3's theme, so `config/sass.config.js` excludes `ionic-angular` from Sass and `config/copy.config.js` copies the
  prebuilt `ionic.css` instead. Styling is not the subject of this study, so that is acceptable.
- Served with `ionic-app-scripts` directly; the modern `@ionic/cli` cannot serve v3 projects.

### app-new notes
- Hand-written Angular 20.1.3 workspace (the global `ng` is 21.x, so it was not used to scaffold).
- `@ionic/angular` 8.4.3 ran unchanged on Angular 20.1.3.
- `?compat=1` swaps in the compat routes: pages extend `LegacyPage` (`src/app/compat/legacy-page.ts`) and the routes use
  `legacyCanEnter` / `legacyCanLeave` (`src/app/compat/legacy-guards.ts`) instead of the plain guards.

## Tools (`tools/`)

| Command | What it does |
|---|---|
| `npm run capture:old` | Drives app-old (http://localhost:8100), writes `captures/old.json` + `old.console.txt`, prints the PASS/FAIL table |
| `npm run capture:new` | Same for app-new (http://localhost:4200/home) → `captures/new.json` |
| `npm run capture:new-compat` | app-new in compat mode (`/home?compat=1`) → `captures/new-compat.json` |
| `npm run capture:all` | The three captures in sequence |
| `npm run generate` | Reads `captures/{old,new,new-compat}.json` and `docs/narrative.md`, writes `docs/lifecycle-flow.{html,md}` (linear flowchart) plus `docs/lifecycle-comparison.md` and `docs/lifecycle-report.html` (full detail) |
| `npm run generate:sample` | Same, from `captures/sample-*.json`, into `/tmp/sample-out` |
| `npm run fixture` | Serves a contract emulator on http://localhost:8999/?app=old (also `?app=new`, `?app=new-compat`) for testing the tools without the apps |
| `npm run pdf` | Renders `docs/lifecycle-flow.html` to `docs/lifecycle-flow.pdf` with headless Chromium |
| `npm run selftest` | Fixture → captures of all three emulations → generate → structural checks |

Direct use: `node capture.mjs <old|new|new-compat> [--url <url>] [--channel chrome] [--headed] [--out-dir <dir>]`,
`node generate.mjs [--captures <dir>] [--out <dir>] [--narrative <file>] [--sample] [--verbose]`.
Expectation rules live in the `RULES` table at the top of `capture.mjs`; the hook mapping in `tools/lib/mapping.mjs`.

