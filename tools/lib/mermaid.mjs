// Markdown + Mermaid writer for docs/lifecycle-comparison.md
import { rowLabel } from './collapse.mjs';
import { APP_LABELS, VERSIONS, VERDICTS } from './mapping.mjs';

export const MAX_NODES_PER_COLUMN = 60;
const APPS = ['old', 'new', 'new-compat'];
const PREFIX = { old: 'O', new: 'N', 'new-compat': 'C' };
const SOURCES = ['angular', 'ionic', 'ionic-app', 'ionic-compat', 'router', 'guard', 'render', 'cd'];
const CLASS_DEFS = {
  angular: 'fill:#dbe8fb,stroke:#2a78d6,color:#111',
  ionic: 'fill:#ffe1d4,stroke:#eb6834,color:#111',
  'ionic-app': 'fill:#dcf3e8,stroke:#1baf7a,color:#111',
  'ionic-compat': 'fill:#e8e3fb,stroke:#4a3aa7,color:#111',
  router: 'fill:#fff1c7,stroke:#eda100,color:#111',
  guard: 'fill:#fde0ea,stroke:#e87ba4,color:#111',
  render: 'fill:#e2f0d9,stroke:#008300,color:#111',
  cd: 'fill:#eeeeea,stroke:#898781,color:#111',
};

const esc = (s) => String(s).replace(/"/g, '#quot;').replace(/[<>]/g, '');
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const ms = (t) => `+${Number(t).toFixed(1)} ms`;
const pos = (p) => (p ? `#${p.ordinal}` : '–');
const code = (s) => (s ? `\`${s}\`` : '—');

function mermaidPhase(phase, apps, rowsKey = 'rows') {
  const lines = ['flowchart TD'];
  for (const s of SOURCES) lines.push(`  classDef src_${s.replace('-', '_')} ${CLASS_DEFS[s]}`);
  for (const app of apps) {
    const rows = phase.byApp[app][rowsKey];
    const id = PREFIX[app];
    lines.push(`  subgraph ${id}G["${esc(APP_LABELS[app])} — ${esc(VERSIONS[app].label)}"]`);
    lines.push('    direction TB');
    rows.forEach((row, k) => {
      lines.push(`    ${id}${k}["${esc(rowLabel(row))}"]:::src_${row.source.replace('-', '_')}`);
    });
    for (let k = 1; k < rows.length; k++) lines.push(`    ${id}${k - 1} --> ${id}${k}`);
    lines.push('  end');
  }
  return lines.join('\n');
}

function sideBySideTable(phase, apps) {
  const n = Math.max(...apps.map((a) => phase.byApp[a].rows.length));
  const head = `| # | ${apps.map((a) => APP_LABELS[a]).join(' | ')} |`;
  const sep = `|---|${apps.map(() => '---').join('|')}|`;
  const lines = [head, sep];
  for (let i = 0; i < n; i++) {
    const cells = apps.map((a) => {
      const r = phase.byApp[a].rows[i];
      if (!r) return '';
      const d = r.kind === 'cycle' ? ` _(${r.detail})_` : r.detail ? ` _(${r.detail})_` : '';
      return cell(`${rowLabel(r)}${d} ${ms(r.t)}`);
    });
    lines.push(`| ${i + 1} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

function mappingTable(rows, apps) {
  const hasCompat = apps.includes('new-compat');
  const head = ['Old hook', 'New equivalent', 'Page', 'Old #', 'New #'];
  if (hasCompat) head.push('Compat # (hook)');
  head.push('Verdict');
  if (hasCompat) head.push('Compat verdict');
  head.push('Note');
  const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  for (const r of rows) {
    const c = [code(r.old), code(r.new) + (r.alt ? ` / ${code(r.alt)}` : ''), r.page, pos(r.oldPos), pos(r.newPos)];
    if (hasCompat) c.push(r.compatPos ? `${pos(r.compatPos)} (${code(r.compatHook)})` : '–');
    c.push(`${VERDICTS[r.verdict].symbol} ${VERDICTS[r.verdict].text}`);
    if (hasCompat) c.push(`${VERDICTS[r.verdictCompat].symbol} ${VERDICTS[r.verdictCompat].text}`);
    c.push(cell(r.note));
    lines.push(`| ${c.join(' | ')} |`);
  }
  return lines.join('\n');
}

export function renderMarkdown(report) {
  const apps = report.apps;
  const out = [];
  out.push('# Ionic 3 → Ionic 8 page lifecycle order comparison', '');
  out.push(`Generated ${report.generatedAt} by \`tools/generate.mjs\`${report.sample ? ' from **sample** captures (emulated, not real app runs)' : ''}.`);
  out.push('Phases: **boot** (first load until Home settles), **forward** (Home → Detail), **back** (Detail → Home).');
  out.push('Consecutive identical events are collapsed to `×N`; repeated change-detection cycles are collapsed to `CD cycle ×N` after their first occurrence.', '');

  out.push('## Versions and captures', '');
  out.push('| Capture | Versions | URL | Captured at | Log entries |', '|---|---|---|---|---|');
  for (const app of apps) {
    const c = report.captures[app];
    out.push(`| ${APP_LABELS[app]} (\`${app}\`) | ${VERSIONS[app].label} | ${c.meta.url} | ${c.meta.capturedAt} | ${c.meta.total} |`);
  }
  out.push('');
  out.push('Node colors in the diagrams follow the log `source`: angular (blue), ionic (orange), ionic-app (green), ionic-compat (violet), router (yellow), guard (pink), render (dark green), cd (grey).', '');

  for (const phase of report.phases) {
    out.push(`## Phase: ${phase.name}`, '');
    out.push(`| App | Raw events | Collapsed rows | Duration |`, '|---|---|---|---|');
    for (const app of apps) {
      const col = phase.byApp[app];
      out.push(`| ${APP_LABELS[app]} | ${col.entries.length} | ${col.rows.length} | ${col.durationMs} ms |`);
    }
    out.push('');
    const tooBig = apps.filter((a) => phase.byApp[a].rows.length > MAX_NODES_PER_COLUMN);
    const tooBigCompact = apps.filter((a) => phase.byApp[a].rowsCompact.length > MAX_NODES_PER_COLUMN);
    out.push(`### ${phase.name}: flow`, '');
    if (tooBigCompact.length) {
      out.push(`_Diagram skipped: ${tooBigCompact.map((a) => `${APP_LABELS[a]} has ${phase.byApp[a].rowsCompact.length} rows even with every change-detection pass folded`).join(', ')} (limit ${MAX_NODES_PER_COLUMN} per column). See the table below._`, '');
    } else if (tooBig.length) {
      out.push(`_Compact diagram: ${tooBig.map((a) => `${APP_LABELS[a]} has ${phase.byApp[a].rows.length} collapsed rows`).join(', ')} (limit ${MAX_NODES_PER_COLUMN} per column), so every change-detection run is folded into one \`CD pass ×ticks\` node here. The side-by-side table below keeps the first pass of each run expanded._`, '');
      out.push('```mermaid', mermaidPhase(phase, apps, 'rowsCompact'), '```', '');
    } else {
      out.push('```mermaid', mermaidPhase(phase, apps), '```', '');
    }
    out.push(`### ${phase.name}: side by side (collapsed events, row i = i-th event)`, '');
    out.push(sideBySideTable(phase, apps), '');
    out.push(`### ${phase.name}: hook mapping and observed order`, '');
    out.push('Positions are first-occurrence ordinals among the hooks of that page in that phase. "same order" means the relative order against the other mapped hooks of the page is unchanged.', '');
    out.push(mappingTable(phase.mapping, apps), '');
  }

  out.push('## How to make Ionic 8 match the Ionic 3 order', '');
  if (report.narrative) out.push(report.narrative.trim(), '');
  else out.push('<!-- NARRATIVE: docs/narrative.md not found -->', '');
  out.push('### Auto-generated facts from the verdict columns', '');
  for (const phase of report.phases) for (const f of phase.facts) out.push(`- ${f}`);
  if (!report.phases.some((p) => p.facts.length)) out.push('- (no order differences detected)');
  out.push('');
  return out.join('\n');
}
