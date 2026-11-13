#!/usr/bin/env node
// Tiny static server for the lifecycle fixture: node fixture/serve.mjs [--port 8999]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const portIdx = argv.indexOf('--port');
const PORT = Number(process.env.FIXTURE_PORT || (portIdx >= 0 ? argv[portIdx + 1] : 8999));

const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

export function createFixtureServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
    const abs = path.join(here, file);
    if (!abs.startsWith(here)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(abs);
      res.writeHead(200, { 'content-type': TYPES[path.extname(abs)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found: ' + file);
    }
  });
}

export function startFixture(port = PORT) {
  return new Promise((resolve, reject) => {
    const server = createFixtureServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startFixture(PORT).then((s) => {
    console.log(`[fixture] serving ${here} on http://localhost:${PORT}/?app=old  (also ?app=new, ?app=new-compat)`);
    const stop = () => s.close(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }).catch((err) => { console.error('[fixture] failed to start:', err.message); process.exit(1); });
}
