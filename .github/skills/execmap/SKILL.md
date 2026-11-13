---
name: execmap
description: Diagram how execution reaches a function or method, or the lifecycle order of an Ionic/Angular page. Use when asked "how is X called", "who calls X", "when does X run", "what runs before X", or "draw the lifecycle of PageY".
allowed-tools: shell
license: MIT
---

# execmap

execmap answers "how does execution reach this code?" for TypeScript/JavaScript projects by walking the
call graph backwards from a symbol to its roots (framework hooks, user events, routes, module init) and
labelling each root with what triggers it. Framework knowledge comes from profiles (Ionic 8 / Angular,
Ionic 3, Angular router, RxJS, DOM events, timers); some facts are measured on instrumented apps, the rest
come from the framework docs.

## When to use

- "How is `X` called?", "who calls `X`?", "what has to happen before `X` runs?"
- "When does `ngOnInit` / `ionViewWillEnter` / a guard run relative to `X`?"
- "Draw the lifecycle of `DetailPage`" (boot, push or pop sequence).
- Before changing a method whose callers you do not know.

## Procedure

1. Index the project once per session, or whenever `.execmap/index.json` is missing or the code changed a lot:

   ```sh
   npx -y github:lukeyd/execmap scan
   ```

   Options: `scan [dir] [--project tsconfig.json] [--include-tests]`.

2. Ask the question with JSON output, which is the easiest to read programmatically:

   ```sh
   npx -y github:lukeyd/execmap callers DetailPage.back --json
   npx -y github:lukeyd/execmap flow DetailPage --sequence push --json
   ```

   Symbol notation: `name`, `Class.method`, `Class#method`, `src/path/file.ts:name`, optionally `--file <path>`.
   Other options for `callers`: `--depth 12`, `--max-callers 25`, `--max-nodes 200`, `--include-tests`.
   Options for `flow`: `--sequence boot|push|pop`, `--from <LeavingPage>`.

3. Write the diagram the user will keep:

   ```sh
   npx -y github:lukeyd/execmap callers DetailPage.back --out docs/diagrams/DetailPage.back.md --html
   npx -y github:lukeyd/execmap flow DetailPage --out docs/diagrams/DetailPage-flow.md --html
   ```

   `--out` writes Markdown with a GitHub-safe Mermaid block; `--html` also writes a self-contained
   `<basename>.html` beside it (open it locally; it needs no network).

## How to read the JSON

- `roots` lists the node ids where execution starts. For each, `nodes[].profile.trigger` says what fires
  it ("Ionic calls it on the entering page before the transition", "user event (click) in …"). Together they
  answer the question.
- `nodes[].profile.awaited` says whether the framework waits for that hook (`false`, `"promise"`,
  `"promise|observable"`); `instanceExists` says whether the page instance exists when it runs.
- `nodes[].profile.measured` + `measuredOn` tell you whether the fact was measured on an instrumented app or
  comes from the docs. Say which.
- `edges[].awaited` says whether the caller awaits the callee at that call site. `edges[].kind` is `call`,
  `callback` (with `callee`, e.g. `subscribe`), `passed`, `template`, `route` or `module-init`.
  `edges[].cycle` marks back edges.
- `truncated.depth` / `truncated.callers` / `truncated.nodes`: the graph was cut. Re-run with a larger
  `--depth`, `--max-callers` or `--max-nodes` before drawing conclusions.
- Flow JSON: `rows[]` in firing order; `kind` (angular, ionic, guard, paint, marker, shim), `awaited`,
  `ignored: true` when a returned Promise is not awaited, `implementedBy` when a base class provides the hook.

## Presentation rules

- Write the diagram with `--out docs/diagrams/<symbol>.md` and paste the Mermaid block into the reply.
- Then one sentence per root: what triggers it, whether it is awaited, and its `measured on …` or
  `per docs` tag.
- Never invent lifecycle order. If the order matters, quote `profile.notes` and the `flow` rows verbatim
  rather than reasoning from memory.
- If `truncated` has anything set, say so and offer to re-run with larger limits.
- Mention `edges[].awaited === false` on a root chain when the user asked about timing: nothing waits for
  that step.

## Ambiguity

Exit code 2 means the symbol matched several declarations; the candidates are printed one per line as
`file:line  Class.member`. Ask the user which one they mean, or pass `--file <path>` (or the
`src/path/file.ts:name` form) and re-run. Exit code 1 is an error: show the message.
