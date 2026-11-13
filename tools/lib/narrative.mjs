// Hand-written narrative (docs/narrative.md) that the generator inlines into both outputs.
import fs from 'node:fs';

export function loadNarrative(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

/** Minimal Markdown → HTML for the narrative: headings, paragraphs, bullet/numbered lists, tables. */
export function narrativeToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const flushPara = (buf) => { if (buf.length) out.push(`<p>${buf.map(inline).join('<br>')}</p>`); buf.length = 0; };
  const para = [];
  while (i < lines.length) {
    const line = lines[i];
    if (/^###\s/.test(line)) { flushPara(para); out.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue; }
    if (/^##\s/.test(line)) { flushPara(para); out.push(`<h3>${inline(line.slice(3))}</h3>`); i++; continue; }
    if (/^\|/.test(line)) {
      flushPara(para);
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<div class="table-wrap"><table><thead><tr>' + head.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>'
        + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^(\s*[-*]\s|\s*\d+\.\s)/.test(line)) {
      flushPara(para);
      const ordered = /^\s*\d+\.\s/.test(line);
      const items = [];
      while (i < lines.length && /^(\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) { items.push(lines[i].replace(/^(\s*[-*]\s|\s*\d+\.\s)/, '')); i++; }
      out.push(`<${ordered ? 'ol' : 'ul'}>` + items.map((t) => `<li>${inline(t)}</li>`).join('') + `</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (line.trim() === '') { flushPara(para); i++; continue; }
    para.push(line); i++;
  }
  flushPara(para);
  return out.join('\n');
}
