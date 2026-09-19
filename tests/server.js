/* Minimal static file server for local dev & smoke tests (no dependencies). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  beginLogin,
  beginLogout,
  handleCallback,
  readSession,
  readUserEmail
} from './sso.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const DEFAULT_PORT = Number(process.env.PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

/* The editor app (index.html) requires a Toggle Account SSO session;
   the landing page stays public. */
function isProtectedFile(urlPath) {
  return urlPath === '/index.html';
}

function parseQuery(rawUrl) {
  const query = {};
  for (const [key, value] of new URLSearchParams(new URL(rawUrl, 'http://localhost').search)) {
    query[key] = value;
  }
  return query;
}

async function authRoutes(req, res, urlPath, query) {
  switch (urlPath) {
    case '/auth/login': {
      res.writeHead(302, { Location: beginLogin(res) });
      res.end();
      return true;
    }
    case '/auth/callback': {
      try {
        await handleCallback(req, res, query);
        res.writeHead(302, { Location: '/index.html' });
        res.end();
      } catch (error) {
        console.error('SSO callback failed:', error.message);
        res.writeHead(302, { Location: '/auth/login' });
        res.end();
      }
      return true;
    }
    case '/auth/logout': {
      res.writeHead(302, { Location: beginLogout(res) });
      res.end();
      return true;
    }
    case '/auth/session': {
      const session = readSession(req);
      res.writeHead(200, { 'Content-Type': MIME['.json'] });
      res.end(JSON.stringify({
        authenticated: Boolean(session),
        email: session ? (readUserEmail(req) || session.email) : null
      }));
      return true;
    }
    default:
      return false;
  }
}

function requestHandler(req, res) {
  void handleRequest(req, res);
}

async function handleRequest(req, res) {
  const query = parseQuery(req.url);
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') {
    urlPath = '/landing.html';
  } else if (urlPath.endsWith('/')) {
    urlPath += 'index.html';
  }

  if (await authRoutes(req, res, urlPath, query)) {
    return;
  }

  /* Gate the editor behind the SSO session. */
  if (isProtectedFile(urlPath) && !readSession(req)) {
    res.writeHead(302, { Location: '/auth/login' });
    res.end();
    return;
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
