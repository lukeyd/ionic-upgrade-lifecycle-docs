#!/usr/bin/env node
// Self-test without the real apps: fixture server -> capture old/new/new-compat -> generate
// against the fixture captures and against the sample captures. Exit 1 on any failure.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixture } from './fixture/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.FIXTURE_PORT || 8999);
const OUT = process.env.SELFTEST_OUT || '/tmp/lifecycle-selftest';
const APPS = [['old', 'old'], ['new', 'new'], ['new-compat', 'new&compat=1']];

function run(args, label) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, args, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      const summary = out.split('\n').filter((l) => /checks passed|FAIL|\[generate\] (wrote|boot|forward|back)|FAILED|Error/.test(l)).join('\n      ');
      console.log(`[selftest] ${code === 0 ? 'PASS' : 'FAIL'} ${label} (${((Date.now() - t0) / 1000).toFixed(1)} s)\n      ${summary}`);
      if (code !== 0) console.log(out);
      resolve(code === 0);
    });
  });
}

function checkHtml(file) {
  const html = fs.readFileSync(file, 'utf8');
  const svgs = (html.match(/<svg /g) || []).length;
  const dots = (html.match(/class="dot"/g) || []).length;
  const sections = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
  const ok = svgs === 3 && dots > 50 && sections.includes('narrative') && (html.includes('<!-- NARRATIVE:') || html.includes('How to make Ionic 8 match')) && !/https?:\/\/[^"' ]+\.(js|css)/.test(html) && html.length < 2 * 1024 * 1024;
  console.log(`[selftest] ${ok ? 'PASS' : 'FAIL'} html structure ${path.basename(file)}: ${svgs} svg, ${dots} dots, sections ${sections.join(',')}, ${(html.length / 1024).toFixed(0)} KB`);
  return ok;
}

function checkMarkdown(file) {
  const md = fs.readFileSync(file, 'utf8');
  const blocks = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
  let ok = blocks.length >= 1;
  for (const b of blocks) {
    const lines = b.split('\n').filter(Boolean);
    if (lines[0] !== 'flowchart TD') ok = false;
    const ids = new Set();
    for (const l of lines) {
      const m = /^\s{4}([A-Z]\d+)\["([^"\]]*)"\]:::src_[a-z_]+$/.exec(l);
      if (m) ids.add(m[1]);
      else if (/^\s{4}([A-Z]\d+) --> ([A-Z]\d+)$/.test(l)) {
        const [, a, c] = /^\s{4}([A-Z]\d+) --> ([A-Z]\d+)$/.exec(l);
        if (!ids.has(a) || !ids.has(c)) ok = false;
      } else if (!/^(flowchart TD|  classDef |  subgraph [A-Z]G\["[^"\]]*"\]|    direction TB|  end)/.test(l)) { ok = false; console.log('[selftest] odd mermaid line: ' + l); }
    }
    if (ids.size > 3 * 60) ok = false;
  }
  const hasNarrative = md.includes('## How to make Ionic 8 match the Ionic 3 order');
  console.log(`[selftest] ${ok && hasNarrative ? 'PASS' : 'FAIL'} markdown ${path.basename(file)}: ${blocks.length} mermaid blocks, narrative placeholder ${hasNarrative ? 'present' : 'MISSING'}`);
  return ok && hasNarrative;
}

const server = await startFixture(PORT);
console.log(`[selftest] fixture on http://localhost:${PORT}, output in ${OUT}`);
fs.mkdirSync(OUT, { recursive: true });
let ok = true;
try {
  for (const [name, q] of APPS) {
    ok = (await run(['capture.mjs', name, '--url', `http://localhost:${PORT}/?app=${q}`, '--out-dir', path.join(OUT, 'captures')], `capture ${name} (fixture)`)) && ok;
  }
  ok = (await run(['generate.mjs', '--captures', path.join(OUT, 'captures'), '--out', path.join(OUT, 'fixture-out')], 'generate (fixture captures)')) && ok;
  ok = (await run(['generate.mjs', '--sample', '--captures', path.resolve(here, '../captures'), '--out', path.join(OUT, 'sample-out')], 'generate --sample')) && ok;
  for (const dir of ['fixture-out', 'sample-out']) {
    ok = checkHtml(path.join(OUT, dir, 'lifecycle-report.html')) && ok;
    ok = checkMarkdown(path.join(OUT, dir, 'lifecycle-comparison.md')) && ok;
  }
} finally {
  server.close();
}
console.log(`[selftest] ${ok ? 'ALL PASS' : 'FAILED'}`);
process.exit(ok ? 0 : 1);
