#!/usr/bin/env node
// Capture the lifecycle log of one app variant (see ../LOG-CONTRACT.md).
//
//   node capture.mjs <old|new|new-compat> [--url <override>] [--channel chrome] [--headed]
//                    [--out-dir <dir>] [--timeout <ms>]
//
// Writes captures/<name>.json and captures/<name>.console.txt, then prints a PASS/FAIL
// table of the expectations below. Exit code 1 on any FAIL.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// ============================================================================
// Expectation tables (edit here). A rule expands to one check per page x hook.
//   apps:    which capture names the rule applies to
//   pages:   list of pages, or undefined = any page
//   sources: list of sources, or undefined = any source
//   hooks:   list of hooks, or undefined = any hook
//   min/max: inclusive bounds on the number of matching entries
// ============================================================================
const ALL = ['old', 'new', 'new-compat'];
const NEW = ['new', 'new-compat'];
const EACH_PAGE = ['Home', 'Detail'];
const REMOVED_IONIC_HOOKS = ['ionViewCanEnter', 'ionViewWillLoad', 'ionViewDidLoad', 'ionViewCanLeave', 'ionViewWillUnload'];

const RULES = [
  { label: 'core hooks on each page', apps: ALL, pages: EACH_PAGE, min: 1, hooks: [
    'constructor', 'ngOnInit', 'ngDoCheck', 'ngAfterContentInit', 'ngAfterContentChecked', 'ngAfterViewInit',
    'ngAfterViewChecked', 'ionViewWillEnter', 'ionViewDidEnter', 'ionViewWillLeave', 'ionViewDidLeave', 'template-evaluated',
  ] },
  { label: 'AppRef.tick', apps: ALL, pages: ['App'], hooks: ['AppRef.tick'], min: 1 },
  { label: 'render entries', apps: ALL, sources: ['render'], min: 1 },
  { label: 'Ionic 3 hooks present', apps: ['old'], hooks: REMOVED_IONIC_HOOKS, min: 1 },
  { label: 'Detail destroyed', apps: ['old'], pages: ['Detail'], hooks: ['ngOnDestroy'], min: 1 },
  { label: 'router/guard hooks present', apps: NEW, min: 1, hooks: [
    'resolve', 'NavigationStart', 'NavigationEnd', 'afterNextRender',
  ] },
  { label: 'router guards present', apps: ['new'], min: 1, hooks: ['canActivate', 'canDeactivate'] },
  // compat mode replaces canActivate/canDeactivate with legacyCanEnter/legacyCanLeave (source ionic-compat)
  { label: 'router guards replaced by legacy guards', apps: ['new-compat'], sources: ['guard'], hooks: ['canActivate', 'canDeactivate'], max: 0 },
  { label: 'removed hooks never fire (source ionic)', apps: ['new'], sources: ['ionic'], hooks: REMOVED_IONIC_HOOKS, max: 0 },
  { label: 'compat shim re-emits removed hooks', apps: ['new-compat'], sources: ['ionic-compat'], hooks: REMOVED_IONIC_HOOKS, min: 1 },
];

const DEFAULT_URLS = {
  old: 'http://localhost:8100',
  new: 'http://localhost:4200/home',
  'new-compat': 'http://localhost:4200/home?compat=1',
};

const QUIET_MS = 600;       // no new entries for this long = quiet
const QUIET_MAX_MS = 3000;  // give up waiting for quiet after this
const POLL_MS = 50;

// ============================================================================

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { name: null, url: null, channel: null, headed: false, outDir: path.resolve(here, '../captures'), timeout: 30000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') opts.url = argv[++i];
    else if (a === '--channel') opts.channel = argv[++i];
    else if (a === '--headed') opts.headed = true;
    else if (a === '--out-dir') opts.outDir = path.resolve(argv[++i]);
    else if (a === '--timeout') opts.timeout = Number(argv[++i]);
    else if (!a.startsWith('--') && !opts.name) opts.name = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!ALL.includes(opts.name)) throw new Error(`usage: capture.mjs <${ALL.join('|')}> [--url <url>] [--channel chrome] [--headed] [--out-dir <dir>]`);
  if (!opts.url) opts.url = DEFAULT_URLS[opts.name];
  return opts;
}

async function launchBrowser(opts) {
  const launch = { headless: !opts.headed };
  let channel = opts.channel;
  if (!channel) {
    let exe = null;
    try { exe = chromium.executablePath(); } catch { /* no bundled browser known */ }
    if (!exe || !fs.existsSync(exe)) {
      console.log(`[capture] bundled Chromium not found (${exe || 'no executable path'}); falling back to channel 'chrome'`);
      channel = 'chrome';
    }
  }
  if (channel) launch.channel = channel;
  const browser = await chromium.launch(launch);
  console.log(`[capture] browser: ${channel ? `channel ${channel}` : 'bundled chromium'} ${browser.version()} (playwright ${playwrightVersion()})`);
  return browser;
}

function playwrightVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(here, 'node_modules/playwright/package.json'), 'utf8')).version; } catch { return '?'; }
}

/** Resolve once the log has an entry matching {page, hook} at index > afterIndex. Returns the index. */
async function waitForEntry(page, { page: pg, hook, afterIndex = -1 }, timeout) {
  const handle = await page.waitForFunction(({ pg, hook, afterIndex }) => {
    const log = window.__lifecycleLog || [];
    for (let i = afterIndex + 1; i < log.length; i++) {
      const e = log[i];
      if (e && e.page === pg && e.hook === hook && e.source !== 'marker') return i + 1; // +1 so 0 is falsy-safe
    }
    return 0;
  }, { pg, hook, afterIndex }, { timeout, polling: POLL_MS });
  return (await handle.jsonValue()) - 1;
}

/** Poll until the log length has been stable for QUIET_MS (bounded by QUIET_MAX_MS). */
async function quietWait(page) {
  const start = Date.now();
  let last = await page.evaluate(() => (window.__lifecycleLog || []).length);
  let lastChange = Date.now();
  while (Date.now() - start < QUIET_MAX_MS) {
    await page.waitForTimeout(POLL_MS);
    const len = await page.evaluate(() => (window.__lifecycleLog || []).length);
    if (len !== last) { last = len; lastChange = Date.now(); }
    else if (Date.now() - lastChange >= QUIET_MS) return { quiet: true, length: len, waitedMs: Date.now() - start };
  }
  return { quiet: false, length: last, waitedMs: Date.now() - start };
}

async function injectMarker(page, phase) {
  return page.evaluate((hook) => {
    window.__lifecycleLog = window.__lifecycleLog || [];
    const entry = { t: performance.now(), page: 'App', source: 'marker', hook };
    window.__lifecycleLog.push(entry);
    console.log('[LC] +' + entry.t.toFixed(1) + 'ms App marker ' + hook);
    return window.__lifecycleLog.length - 1;
  }, `PHASE:${phase}`);
}

function matches(entry, rule, page, hook) {
  if (page && entry.page !== page) return false;
  if (hook && entry.hook !== hook) return false;
  if (rule.sources && !rule.sources.includes(entry.source)) return false;
  return entry.source !== 'marker';
}

/** Expand RULES for an app name and evaluate them. */
export function evaluateRules(name, entries) {
  const results = [];
  for (const rule of RULES) {
    if (!rule.apps.includes(name)) continue;
    const pages = rule.pages || [null];
    const hooks = rule.hooks || [null];
    for (const page of pages) for (const hook of hooks) {
      const count = entries.filter((e) => matches(e, rule, page, hook)).length;
      const okMin = rule.min === undefined || count >= rule.min;
      const okMax = rule.max === undefined || count <= rule.max;
      const bound = rule.max === 0 ? '= 0' : rule.min !== undefined ? `>= ${rule.min}` : `<= ${rule.max}`;
      const what = [page || '*', rule.sources ? rule.sources.join('|') : '*', hook || '*'].join(' ');
      results.push({ label: rule.label, what, bound, count, pass: okMin && okMax });
    }
  }
  return results;
}

function printTable(results) {
  const w1 = Math.max(...results.map((r) => r.label.length), 5);
  const w2 = Math.max(...results.map((r) => r.what.length), 4);
  console.log(`\n${'RESULT'.padEnd(6)}  ${'rule'.padEnd(w1)}  ${'page source hook'.padEnd(w2)}  expected  count`);
  console.log('-'.repeat(6 + 2 + w1 + 2 + w2 + 2 + 8 + 2 + 5));
  for (const r of results) {
    console.log(`${(r.pass ? 'PASS' : 'FAIL').padEnd(6)}  ${r.label.padEnd(w1)}  ${r.what.padEnd(w2)}  ${r.bound.padEnd(8)}  ${r.count}`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ''}`);
  return failed === 0;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { name, url, timeout } = opts;
  fs.mkdirSync(opts.outDir, { recursive: true });
  const jsonPath = path.join(opts.outDir, `${name}.json`);
  const consolePath = path.join(opts.outDir, `${name}.console.txt`);
  const consoleLines = [];
  const pageErrors = [];

  console.log(`[capture] ${name} <- ${url}`);
  const browser = await launchBrowser(opts);
  const context = await browser.newContext({ viewport: { width: 420, height: 820 } });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => { pageErrors.push(err); console.log(`[capture] pageerror: ${err.message}`); });

  // PHASE:boot marker at index 0, created before any app script runs. Idempotent and
  // compatible with the app's own lazy `window.__lifecycleLog = window.__lifecycleLog || []`.
  await page.addInitScript(() => {
    const w = window;
    w.__lifecycleLog = w.__lifecycleLog || [];
    if (!w.__lifecycleLog.some((e) => e && e.source === 'marker' && e.hook === 'PHASE:boot')) {
      w.__lifecycleLog.unshift({ t: 0, page: 'App', source: 'marker', hook: 'PHASE:boot' });
    }
  });

  const flush = () => fs.writeFileSync(consolePath, consoleLines.join('\n') + '\n');
  let ok = false;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    const dataApp = await page.evaluate(() => document.documentElement.dataset.app);
    const expectedApp = name === 'old' ? 'old' : 'new';
    if (dataApp !== expectedApp) {
      throw new Error(`<html data-app> is ${JSON.stringify(dataApp)} but capture "${name}" expects "${expectedApp}" (wrong URL or app?)`);
    }
    console.log(`[capture] data-app=${dataApp} OK`);

    // --- boot ---------------------------------------------------------------
    let idx = await waitForEntry(page, { page: 'Home', hook: 'ionViewDidEnter' }, timeout);
    console.log(`[capture] Home ionViewDidEnter at #${idx}`);
    let q = await quietWait(page);
    console.log(`[capture] quiet after boot: ${q.quiet ? 'yes' : 'NO (bounded)'} (${q.length} entries, waited ${q.waitedMs} ms)`);
    const forwardMarker = await injectMarker(page, 'forward');

    // --- forward ------------------------------------------------------------
    await page.click('[data-test=go-detail]', { timeout });
    idx = await waitForEntry(page, { page: 'Detail', hook: 'ionViewDidEnter', afterIndex: forwardMarker }, timeout);
    console.log(`[capture] Detail ionViewDidEnter at #${idx}`);
    q = await quietWait(page);
    console.log(`[capture] quiet after forward: ${q.quiet ? 'yes' : 'NO (bounded)'} (${q.length} entries, waited ${q.waitedMs} ms)`);
    const backMarker = await injectMarker(page, 'back');

    // --- back ---------------------------------------------------------------
    await page.click('[data-test=back]', { timeout });
    idx = await waitForEntry(page, { page: 'Home', hook: 'ionViewDidEnter', afterIndex: backMarker }, timeout);
    console.log(`[capture] Home ionViewDidEnter (again) at #${idx}`);
    q = await quietWait(page);
    console.log(`[capture] quiet after back: ${q.quiet ? 'yes' : 'NO (bounded)'} (${q.length} entries, waited ${q.waitedMs} ms)`);
    await injectMarker(page, 'end');

    // --- dump ---------------------------------------------------------------
    const entries = await page.evaluate(() => window.__lifecycleLog);
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const capture = { app: name, url, userAgent, capturedAt: new Date().toISOString(), entries };
    fs.writeFileSync(jsonPath, JSON.stringify(capture, null, 2) + '\n');
    flush();
    console.log(`[capture] wrote ${jsonPath} (${entries.length} entries) and ${consolePath} (${consoleLines.length} lines)`);
    if (pageErrors.length) console.log(`[capture] ${pageErrors.length} page error(s) were reported (see above)`);

    ok = printTable(evaluateRules(name, entries));
  } catch (err) {
    flush();
    console.error(`[capture] FAILED: ${err.message}`);
    try {
      const partial = await page.evaluate(() => window.__lifecycleLog || []);
      const partialPath = path.join(opts.outDir, `${name}.partial.json`);
      fs.writeFileSync(partialPath, JSON.stringify({ app: name, url, error: err.message, entries: partial }, null, 2));
      console.error(`[capture] partial log (${partial.length} entries) written to ${partialPath}`);
    } catch { /* page may be gone */ }
  } finally {
    await browser.close();
  }
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
