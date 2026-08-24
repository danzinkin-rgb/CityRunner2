/**
 * The static server the suites run against — owned by the test run itself.
 *
 * WHY THIS EXISTS. Every suite used to assume something was already serving
 * the repo on :4173, started by hand in another terminal. That assumption
 * failed in two different ways, both of which cost real time:
 *
 *   1. The server was not running at all, so the first page.goto threw
 *      "Could not connect to server" and the suite reported a failure that
 *      had nothing to do with the code under test.
 *   2. Worse, the server DIED PART-WAY THROUGH a long run. The first dozen
 *      checks passed, then everything after the death failed. That looks
 *      exactly like a flaky test — and it was logged as one, against an
 *      innocent screenshot, for weeks.
 *
 * A shared external server is the wrong shape for this. The fix is that the
 * process running the assertions also owns the thing serving the files, so
 * the two cannot get out of step: it is impossible to run a suite against a
 * server that is not up, and impossible for the server to outlive or predecease
 * the run.
 *
 * THREE PROPERTIES THAT MAKE THIS SAFE, none of them incidental:
 *
 *   - Port 0. The OS picks a free port, so two suites can run at the same time
 *     without fighting over :4173, and a stale server left over from an earlier
 *     run cannot be silently connected to instead.
 *   - unref(). The server does not hold the event loop open, so a suite that
 *     ends with process.exit(1) on failure, or that throws, still exits
 *     immediately. There is no teardown call to forget and no hang to debug.
 *   - No dependency. node:http and node:fs only — nothing to install, and
 *     nothing that can be missing on a fresh clone.
 *
 * An explicit URL argument still wins, so `node test/ios-ui.mjs http://host:1234`
 * keeps working for pointing a suite at a deployed build or a Vite dev server.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Content types for what this repo actually serves. The suites load unbundled
 * ES modules straight from src/, so `.js` MUST be served as a JavaScript type
 * or the browser refuses the module and every suite fails at once with an
 * error that looks nothing like a MIME problem.
 */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
};

/**
 * Map a request URL to a file inside the repo, or null if it escapes.
 *
 * The traversal guard is not defensive theatre: the suites drive URLs built
 * from city ids and level numbers, and a bug that produced `../` would
 * otherwise read outside the repo and give a confusing pass rather than a
 * clear failure. Query strings are stripped here because every debug entry
 * point in this game is a query parameter (?ui=, ?view=, ?city=), so nearly
 * every request the suites make carries one.
 */
function resolvePath(url, root) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const rel = normalize(pathname).replace(/^[/\\]+/, '');
  if (rel === '..' || rel.startsWith(`..${sep}`)) return null;
  return join(root, rel || 'index.html');
}

/**
 * Start a static server for the repo root.
 *
 * Returns the origin to hand to page.goto, plus close() for the rare caller
 * that wants to shut down early. Most callers never need close(): unref()
 * means the process exits on its own.
 *
 * `root` exists for exactly one caller. Every gameplay suite runs against the
 * unbundled repo, which is the point of this file — but test/release-build.mjs
 * has to check what a PLAYER receives, and that only exists in dist/ after a
 * Vite build. Pointing this at dist/ is the only way to assert on the real
 * shipped bundle rather than on source that resembles it. Do not reach for it
 * anywhere else: a suite that silently tested dist/ would go green against a
 * stale build long after the source it claims to cover had changed.
 */
export async function startStaticServer(root = REPO_ROOT) {
  const server = createServer(async (req, res) => {
    const send = (code, body, type) => {
      res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8' });
      res.end(body);
    };
    try {
      let file = resolvePath(req.url, root);
      if (!file) return send(403, 'forbidden');
      let info = await stat(file).catch(() => null);
      // A directory request means index.html, which is how `/` and any future
      // sub-app directory both resolve without a special case for each.
      if (info?.isDirectory()) {
        file = join(file, 'index.html');
        info = await stat(file).catch(() => null);
      }
      if (!info?.isFile()) return send(404, 'not found');
      send(200, await readFile(file), TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
    } catch (err) {
      // Answer rather than crash. A 500 fails the assertion that needed the
      // file, which is a readable failure; an unhandled throw here would take
      // the whole run down with a stack trace pointing at the server.
      send(500, String(err && err.message ? err.message : err));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  server.unref();

  const { port } = server.address();
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

/**
 * The one call every suite makes.
 *
 * `explicit` is whatever the suite parsed out of argv. If the caller named a
 * server, respect it — they are pointing at a deployed build or a dev server
 * on purpose. Otherwise serve the repo ourselves.
 */
export async function resolveBase(explicit, root = REPO_ROOT) {
  if (explicit) return { base: explicit, close: async () => {} };
  const { base, close } = await startStaticServer(root);
  return { base, close };
}
