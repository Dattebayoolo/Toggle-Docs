/* ==========================================================================
   Toggle Docs - SSO client helpers for the zero-dependency dev server.
   Mirrors the Toggle Account System's src/apps/shared/ssoClient.js flow
   (OAuth2 authorization-code + PKCE, state carried in a short-lived cookie).
   No npm dependencies — uses only Node built-ins.
   ========================================================================== */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Tiny .env loader so the dev server picks up AUTH_BASE_URL etc. without dotenv. */
loadDotEnv(path.join(__dirname, '..', '.env'));

function loadDotEnv(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const name = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(name in process.env)) process.env[name] = value;
    }
  } catch (_error) {
    /* No .env file is fine — defaults are used. */
  }
}

export const SSO = {
  authBaseUrl: process.env.AUTH_BASE_URL || 'http://localhost:4000',
  clientId: 'toggle-docs',
  audience: 'toggle-docs',
  appBaseUrl: process.env.TOGGLE_DOCS_BASE_URL || `http://localhost:${Number(process.env.PORT || 8765)}`,
  redirectPath: '/auth/callback',
  scopes: ['profile.read', 'offline_access'],
  stateCookieName: 'toggle_docs_oauth_state',
  sessionCookieName: 'toggle_docs_access_token',
  userCookieName: 'toggle_docs_user'
};

/* ----------------------------- Cookie helpers ---------------------------- */

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  parts.push(`Path=${options.path || '/'}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function parseCookies(cookieHeader = '') {
  const cookies = {};
  for (const pair of String(cookieHeader || '').split(';')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    cookies[trimmed.slice(0, eq)] = decodeURIComponent(trimmed.slice(eq + 1));
  }
  return cookies;
}

export function setCookie(res, name, value, options = {}) {
  res.setHeader('Set-Cookie', [...(res.getHeader('Set-Cookie') || []), serializeCookie(name, value, options)]);
}

export function clearCookie(res, name, options = {}) {
  setCookie(res, name, '', { ...options, expires: new Date(0), maxAge: 0 });
}

function base64url(buffer) {
  return buffer.toString('base64url');
}

function createPkcePair() {
  const codeVerifier = base64url(crypto.randomBytes(48));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

/* Step 1: kick off the browser login at the SSO service. */
export function beginLogin(res) {
  const state = crypto.randomUUID();
  const { codeVerifier, codeChallenge } = createPkcePair();

  setCookie(res, SSO.stateCookieName, base64url(Buffer.from(JSON.stringify({ state, codeVerifier }))), {
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 10 * 60
  });

  const authorizeUrl = new URL('/authorize', SSO.authBaseUrl);
  authorizeUrl.searchParams.set('client_id', SSO.clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${SSO.appBaseUrl}${SSO.redirectPath}`);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', SSO.scopes.join(' '));
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  return authorizeUrl.toString();
}

function readStateCookie(req) {
  const raw = parseCookies(req.headers.cookie)[SSO.stateCookieName];
  if (!raw) return { state: '', codeVerifier: '' };
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return { state: String(parsed.state || ''), codeVerifier: String(parsed.codeVerifier || '') };
  } catch (_error) {
    return { state: raw, codeVerifier: '' };
  }
}

/* Step 2: handle the ?code=...&state=... callback from the SSO service. */
export async function handleCallback(req, res, query) {
  const { state, codeVerifier } = readStateCookie(req);
  clearCookie(res, SSO.stateCookieName, { httpOnly: true, sameSite: 'Lax' });

  if (!state || !codeVerifier || !query.code || String(query.state || '') !== state) {
    throw new Error('Login state mismatch — please start the sign-in again.');
  }

  const tokenResponse = await fetch(new URL('/token', SSO.authBaseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: String(query.code),
      client_id: SSO.clientId,
      redirect_uri: `${SSO.appBaseUrl}${SSO.redirectPath}`,
      code_verifier: codeVerifier
    })
  });

  const payload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(payload.error || 'Token exchange failed.');
  }

  /* HttpOnly session cookie carries the access token; a JS-readable cookie
     carries just the email so the app UI can render the account chip. */
  setCookie(res, SSO.sessionCookieName, payload.access_token, {
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 15 * 60
  });
  setCookie(res, SSO.userCookieName, payload?.user?.email || '', {
    sameSite: 'Lax',
    maxAge: 15 * 60
  });

  return payload;
}

/* Step 3: sign out locally, then end the SSO session at the auth service. */
export function beginLogout(res) {
  clearCookie(res, SSO.sessionCookieName, { httpOnly: true, sameSite: 'Lax' });
  clearCookie(res, SSO.userCookieName, { sameSite: 'Lax' });
  return new URL('/logout', SSO.authBaseUrl).toString();
}

/* Session check: is there an unexpired access-token cookie for this app?
   (Signature verification happens at the Account System; this is just the
   cheap gate for the static dev server.) */
export function readSession(req) {
  const token = parseCookies(req.headers.cookie)[SSO.sessionCookieName];
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.aud !== SSO.audience) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { userId: payload.sub, email: payload.email, expiresAt: payload.exp };
  } catch (_error) {
    return null;
  }
}

export function readUserEmail(req) {
  return parseCookies(req.headers.cookie)[SSO.userCookieName] || '';
}

