// Render docs/lifecycle-flow.html to docs/lifecycle-flow.pdf with headless Chromium (light theme, backgrounds on).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = path.resolve(here, '../docs/lifecycle-flow.html');
const pdf = path.resolve(here, '../docs/lifecycle-flow.pdf');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
await page.emulateMedia({ colorScheme: 'light', media: 'print' });
await page.goto('file://' + html);
await page.waitForTimeout(800);
await page.addStyleTag({ content: '.phase, .chains, .code2, .load { break-inside: avoid; } h2 { break-before: page; } h2:first-of-type { break-before: auto; } body { padding-block: 0; }' });
await page.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' }, scale: 0.72 });
await browser.close();
console.log('[pdf] wrote ' + pdf);
