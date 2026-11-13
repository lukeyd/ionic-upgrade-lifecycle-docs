#!/usr/bin/env node
// Generate docs/lifecycle-comparison.md and docs/lifecycle-report.html from captures.
//
//   node generate.mjs [--captures <dir>] [--out <dir>] [--sample] [--verbose]
//
// --sample maps sample-{old,new,new-compat}.json onto the three slots.
// --verbose disables collapsing (every event is a row/node; diagrams may be skipped).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { phasesOf, PHASE_NAMES } from './lib/phases.mjs';
import { collapse } from './lib/collapse.mjs';
import { analysePhase, narrativeFacts } from './lib/mapping.mjs';
import { loadNarrative } from './lib/narrative.mjs';
import { renderMarkdown } from './lib/mermaid.mjs';
import { renderHtml } from './lib/svg.mjs';
import { renderFlowHtml, renderFlowMarkdown } from './lib/flow.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SLOTS = ['old', 'new', 'new-compat'];

function parseArgs(argv) {
  const o = { captures: path.resolve(here, '../captures'), out: path.resolve(here, '../docs'), sample: false, verbose: false, narrative: path.resolve(here, '../docs/narrative.md') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--captures') o.captures = path.resolve(argv[++i]);
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a === '--sample') o.sample = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--narrative') o.narrative = path.resolve(argv[++i]);
    else throw new Error(`unknown argument: ${a}`);
  }
  return o;
}

export function loadCaptures(dir, { sample = false } = {}) {
  const captures = {};
  for (const slot of SLOTS) {
    const file = path.join(dir, `${sample ? 'sample-' : ''}${slot}.json`);
    if (!fs.existsSync(file)) { console.warn(`[generate] warning: ${file} missing, skipping slot "${slot}"`); continue; }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(raw.entries)) throw new Error(`${file}: no entries[]`);
    captures[slot] = { ...phasesOf(raw), file, sample: !!raw.sample };
  }
  return captures;
}

export function buildReport(captures, { verbose = false, sample = false, narrative = '' } = {}) {
  const apps = SLOTS.filter((s) => captures[s]);
  if (!apps.length) throw new Error('no captures found');
  const phases = PHASE_NAMES.map((name) => {
    const byApp = {};
    const entriesByApp = {};
    for (const app of apps) {
      const p = captures[app].phases[name];
      entriesByApp[app] = p.entries;
      byApp[app] = { entries: p.entries, rows: collapse(p.entries, { verbose }), rowsCompact: collapse(p.entries, { compact: true }), startT: p.startT, durationMs: p.durationMs };
    }
    const mapping = analysePhase(entriesByApp);
    const facts = narrativeFacts(name, mapping, entriesByApp);
    return { name, byApp, mapping, facts };
  });
  return {
    apps, captures, phases,
    narrative,
    generatedAt: new Date().toISOString(),
    sample: sample || apps.some((a) => captures[a].sample),
    verbose,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const captures = loadCaptures(opts.captures, { sample: opts.sample });
  const report = buildReport(captures, { verbose: opts.verbose, sample: opts.sample, narrative: loadNarrative(opts.narrative) });
  fs.mkdirSync(opts.out, { recursive: true });
  const mdPath = path.join(opts.out, 'lifecycle-comparison.md');
  const htmlPath = path.join(opts.out, 'lifecycle-report.html');
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  const flowHtml = path.join(opts.out, 'lifecycle-flow.html');
  const flowMd = path.join(opts.out, 'lifecycle-flow.md');
  fs.writeFileSync(flowHtml, renderFlowHtml(report));
  fs.writeFileSync(flowMd, renderFlowMarkdown(report));
  console.log(`[generate] apps: ${report.apps.join(', ')}${report.sample ? ' (sample data)' : ''}`);
  for (const p of report.phases) {
    const parts = report.apps.map((a) => `${a}: ${p.byApp[a].entries.length} events -> ${p.byApp[a].rows.length} rows`);
    console.log(`[generate] ${p.name.padEnd(7)} ${parts.join(' | ')}; ${p.facts.length} facts`);
  }
  console.log(`[generate] wrote ${mdPath} (${(fs.statSync(mdPath).size / 1024).toFixed(1)} KB)`);
  console.log(`[generate] wrote ${htmlPath} (${(fs.statSync(htmlPath).size / 1024).toFixed(1)} KB)`);
  console.log(`[generate] wrote ${flowHtml} (${(fs.statSync(flowHtml).size / 1024).toFixed(1)} KB) and ${flowMd}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (err) { console.error(`[generate] ${err.message}`); process.exit(1); }
}
