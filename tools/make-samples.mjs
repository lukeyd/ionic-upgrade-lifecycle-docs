#!/usr/bin/env node
// Write captures/sample-{old,new,new-compat}.json from fixture/sequences.mjs in the exact
// shape capture.mjs produces (markers included), so generate.mjs --sample can run without apps.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEQUENCES, PHASES } from './fixture/sequences.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(here, '../captures'));
fs.mkdirSync(outDir, { recursive: true });

const URLS = { old: 'http://localhost:8100/', new: 'http://localhost:4200/home', 'new-compat': 'http://localhost:4200/home?compat=1' };
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.8010.12 Safari/537.36';
const QUIET = 650; // ms the capture tool waited before injecting the next marker

for (const app of Object.keys(SEQUENCES)) {
  const entries = [{ t: 0, page: 'App', source: 'marker', hook: 'PHASE:boot' }];
  let t = app === 'old' ? 61.4 : 48.2; // first script evaluation
  const marker = (hook) => entries.push({ t: +t.toFixed(2), page: 'App', source: 'marker', hook });
  for (const phase of PHASES) {
    if (phase !== 'boot') marker(`PHASE:${phase}`);
    let first = true;
    for (const [gap, page, source, hook, detail] of SEQUENCES[app][phase]) {
      t += first && phase !== 'boot' ? 35 + gap : gap; // click -> handler latency
      first = false;
      const e = { t: +t.toFixed(2), page, source, hook };
      if (detail !== undefined) e.detail = detail;
      entries.push(e);
    }
    t += QUIET;
  }
  marker('PHASE:end');
  const capture = { app, url: URLS[app], userAgent: UA, capturedAt: '2026-11-13T12:00:00.000Z', sample: true, entries };
  const file = path.join(outDir, `sample-${app}.json`);
  fs.writeFileSync(file, JSON.stringify(capture, null, 2) + '\n');
  console.log(`[samples] wrote ${file} (${entries.length} entries)`);
}
