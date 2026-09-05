/* Minimal static file server for local dev & smoke tests (no dependencies). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const DEFAULT_PORT = Number(process.env.PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function requestHandler(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') {
    urlPath = '/landing.html';
  } else if (urlPath.endsWith('/')) {
    urlPath += 'index.html';
  }
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

function listen(port) {
  const server = http.createServer(requestHandler);
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port ' + port + ' is already in use. Stop the existing dev server or run with PORT=<port> npm run dev.');
      process.exit(1);
    }
    throw err;
  });
  server.listen(port, () => console.log('serving on http://localhost:' + port));
}

listen(DEFAULT_PORT);
