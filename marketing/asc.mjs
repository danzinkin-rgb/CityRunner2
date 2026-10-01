/**
 * Minimal App Store Connect API client: signs a short-lived token with the
 * team API key and makes GET/POST requests. No SDK, only node:crypto.
 *
 * The key never lives in this repo. It is read from disk at run time:
 *   ASC_KEY_DIR   folder holding AuthKey_<KEYID>.p8   (default ~/.appstoreconnect)
 *   ASC_KEY_ID    the key's ID
 *   ASC_ISSUER_ID the team's issuer ID
 * Key ID and issuer ID are identifiers, not secrets; the .p8 file is the secret.
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const KEY_DIR = process.env.ASC_KEY_DIR || join(homedir(), '.appstoreconnect');
const KEY_ID = process.env.ASC_KEY_ID || '9VQQLZP4DA';
const ISSUER = process.env.ASC_ISSUER_ID || 'bfb53530-0304-4ee0-bec8-a9ccd0cc1459';
const API = 'https://api.appstoreconnect.apple.com';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function token() {
  const key = createPrivateKey(readFileSync(join(KEY_DIR, `AuthKey_${KEY_ID}.p8`)));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  // Apple rejects tokens that live longer than 20 minutes.
  const body = b64url(JSON.stringify({ iss: ISSUER, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64url(sig)}`;
}

/** GET or POST a path (or full URL). Returns parsed JSON, or a Buffer for non-JSON bodies. */
export async function asc(path, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  if (raw) return Buffer.from(await res.arrayBuffer());
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
