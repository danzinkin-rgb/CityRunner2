/**
 * Post the clip made by daily-clip.mjs to Bluesky and Mastodon.
 *
 * Both are posted through the services' own documented APIs using tokens the
 * account owner created, read from the environment (GitHub Actions secrets in
 * practice). A service whose variables are missing is skipped, so the workflow
 * can run before every account exists. Nothing here touches the game, and no
 * SDK is involved: it is plain fetch.
 *
 *   BLUESKY_HANDLE         e.g. cityrunner.bsky.social
 *   BLUESKY_APP_PASSWORD   Settings > Privacy and security > App passwords
 *   MASTODON_INSTANCE      e.g. https://mastodon.gamedev.place
 *   MASTODON_TOKEN         Preferences > Development > New application
 *                          (scopes: write:media write:statuses)
 *
 *   node marketing/post.mjs             post to every configured service
 *   node marketing/post.mjs --dry-run   print what would be posted
 *
 * NOT TESTED AGAINST THE LIVE SERVICES when this was written: there were no
 * accounts yet. The first real run is the test. A failure on one service is
 * reported and does not stop the other, and the script exits non-zero so the
 * workflow run shows red.
 */
import { readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');
const clip = JSON.parse(readFileSync(join(HERE, 'out', 'daily.json'), 'utf8'));
if (clip.collisions > 0 && !DRY) {
  console.error(`Not posting: the autopilot hit ${clip.collisions} obstacle(s) on this course, so the clip shows the runner passing through one.`);
  process.exit(1);
}
// mastodon.social answers 503 to any request without a User-Agent, and
// Node's fetch sends none on some versions, so every request names itself.
const UA = 'CityRunnerClipBot/1.0 (+https://github.com/danzinkin-rgb/CityRunner2)';
const nativeFetch = globalThis.fetch;
const fetch = (url, opts = {}) => nativeFetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const json = async (res, what) => {
  const body = await res.text();
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : {};
};

/** Fit the caption to a service's limit by dropping the fact, then the tags. */
function captionFor(limit) {
  const head = `Daily Challenge: ${clip.street}, ${clip.city}.`;
  const tail = `Same course for everyone today. Free on the App Store: ${clip.link}`;
  const tags = clip.caption.split('\n\n').pop();
  for (const parts of [[head, clip.fact, tail, tags], [head, clip.fact, tail], [head, tail]]) {
    const text = parts.filter(Boolean).join('\n\n');
    if ([...text].length <= limit) return text;
  }
  return `${head}\n\n${clip.link}`;
}

async function postBluesky() {
  const { BLUESKY_HANDLE: handle, BLUESKY_APP_PASSWORD: password } = process.env;
  if (!handle || !password) return 'skipped (no BLUESKY_HANDLE / BLUESKY_APP_PASSWORD)';
  if (!clip.file.endsWith('.mp4')) throw new Error('Bluesky needs the MP4 the CI runner makes, not a local WebM');
  const text = captionFor(300);
  if (DRY) return `dry run:\n${text}`;

  const session = await json(await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password }),
  }), 'Bluesky sign-in');
  const auth = { Authorization: `Bearer ${session.accessJwt}` };
  const pds = session.didDoc?.service?.find((s) => s.id === '#atproto_pds')?.serviceEndpoint || 'https://bsky.social';

  // Video goes to a separate service, which wants a short-lived token scoped
  // to uploading a blob on the account's own server.
  const svc = await json(await fetch(`${pds}/xrpc/com.atproto.server.getServiceAuth?${new URLSearchParams({
    aud: `did:web:${new URL(pds).host}`, lxm: 'com.atproto.repo.uploadBlob', exp: String(Math.floor(Date.now() / 1000) + 1800),
  })}`, { headers: auth }), 'Bluesky service auth');

  const upload = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?${new URLSearchParams({ did: session.did, name: basename(clip.file) })}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${svc.token}`, 'Content-Type': 'video/mp4', 'Content-Length': String(statSync(clip.file).size) },
    body: readFileSync(clip.file),
  });
  let job = await json(upload, 'Bluesky video upload');
  job = job.jobStatus || job;
  let blob = job.blob;
  for (let i = 0; !blob && i < 120; i++) {
    await sleep(2000);
    const status = await json(await fetch(`https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(job.jobId)}`), 'Bluesky video status');
    if (status.jobStatus?.state === 'JOB_STATE_FAILED') throw new Error(`Bluesky video processing failed: ${status.jobStatus.error || ''}`);
    blob = status.jobStatus?.blob;
  }
  if (!blob) throw new Error('Bluesky video was still processing after 4 minutes');

  // Links and hashtags are only clickable when marked up with byte offsets.
  const bytes = (s) => Buffer.byteLength(s, 'utf8');
  const facets = [];
  for (const m of text.matchAll(/https?:\/\/\S+/g)) {
    facets.push({ index: { byteStart: bytes(text.slice(0, m.index)), byteEnd: bytes(text.slice(0, m.index + m[0].length)) },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }] });
  }
  for (const m of text.matchAll(/#(\w+)/g)) {
    facets.push({ index: { byteStart: bytes(text.slice(0, m.index)), byteEnd: bytes(text.slice(0, m.index + m[0].length)) },
      features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[1] }] });
  }

  const made = await json(await fetch(`${pds}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record: {
      $type: 'app.bsky.feed.post', text, facets, langs: ['en'], createdAt: new Date().toISOString(),
      embed: { $type: 'app.bsky.embed.video', video: blob, alt: clip.alt, aspectRatio: { width: clip.width, height: clip.height } },
    } }),
  }), 'Bluesky post');
  return `posted ${made.uri}`;
}

async function postMastodon() {
  const { MASTODON_INSTANCE: instance, MASTODON_TOKEN: token } = process.env;
  if (!instance || !token) return 'skipped (no MASTODON_INSTANCE / MASTODON_TOKEN)';
  const text = captionFor(500);
  if (DRY) return `dry run:\n${text}`;
  const auth = { Authorization: `Bearer ${token}` };
  const base = instance.replace(/\/$/, '');

  const form = new FormData();
  const type = clip.file.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
  form.append('file', new Blob([readFileSync(clip.file)], { type }), basename(clip.file));
  form.append('description', clip.alt);
  let media = await json(await fetch(`${base}/api/v2/media`, { method: 'POST', headers: auth, body: form }), 'Mastodon upload');
  // A video is processed after upload; the status cannot attach it until its url appears.
  for (let i = 0; !media.url && i < 120; i++) {
    await sleep(2000);
    const res = await fetch(`${base}/api/v1/media/${media.id}`, { headers: auth });
    if (res.status === 200) media = await json(res, 'Mastodon media status');
    else if (res.status !== 206) await json(res, 'Mastodon media status');
  }
  if (!media.url) throw new Error('Mastodon video was still processing after 4 minutes');

  const status = await json(await fetch(`${base}/api/v1/statuses`, {
    method: 'POST',
    // One post per course per day, even if the workflow is re-run.
    headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': `cityrunner-daily-${clip.day}` },
    body: JSON.stringify({ status: text, media_ids: [media.id], visibility: 'public', language: 'en' }),
  }), 'Mastodon post');
  return `posted ${status.url}`;
}

// POST_ONLY limits a manual re-run to some services, so a service that
// already posted today is not posted to twice.
const only = (process.env.POST_ONLY || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
let failed = false;
for (const [name, run] of [['Bluesky', postBluesky], ['Mastodon', postMastodon]]) {
  if (only.length && !only.includes(name.toLowerCase())) { console.log(`${name}: skipped (not in POST_ONLY)`); continue; }
  try {
    console.log(`${name}: ${await run()}`);
  } catch (err) {
    failed = true;
    console.error(`${name}: FAILED: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
