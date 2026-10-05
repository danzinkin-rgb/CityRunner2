/**
 * Run every gate, several at a time — what `npm test` runs.
 *
 * Each suite is a standalone script with its own server on port 0
 * (test/serve.mjs), so they can safely run side by side. Run one after
 * another they had grown past 15 minutes; in parallel the whole set takes a
 * fraction of that. A few suites measure timing or GPU memory and could be
 * thrown by a busy machine, so they run on their own once the parallel
 * batch is done.
 *
 * Prints one line per suite as it finishes, then the full output of any
 * that failed. Exits non-zero if any did.
 *
 * Usage: node test/run-all.mjs [--jobs N]        (npm test)
 *        npm run test:serial                     the old one-at-a-time chain
 */
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

// The gates, in the old chain's order. `solo` ones run alone, afterwards.
const SUITES = [
  { file: 'marketing/build-pages.mjs', args: ['--check'] },
  { file: 'test/coin-arc.mjs' },
  { file: 'test/road-clearance.mjs' },
  { file: 'test/ios-ui.mjs' },
  { file: 'test/menu-fit.mjs' },
  { file: 'test/determinism.mjs' },
  { file: 'test/rome-weave.mjs' },
  { file: 'test/entitlements.mjs' },
  { file: 'test/save-and-scores.mjs' },
  { file: 'test/storage-keys.mjs' },
  { file: 'test/puzzle-solvable.mjs' },
  { file: 'test/puzzle-drag.mjs' },
  { file: 'test/run-pieces.mjs' },
  { file: 'test/boot.mjs' },
  { file: 'test/audio-unlock.mjs' },
  { file: 'test/daily-rules.mjs' },
  { file: 'test/tester.mjs' },
  { file: 'test/releases.mjs' },
  { file: 'test/sign-text.mjs' },
  { file: 'test/release-build.mjs' },
  { file: 'test/memory.mjs', solo: true },   // counts GPU resources
  { file: 'test/ghost.mjs', solo: true },    // timed waits on a live run
  { file: 'test/roll.mjs', solo: true },     // samples animation frames
];

const argJobs = process.argv.indexOf('--jobs');
const JOBS = argJobs > 0 ? Math.max(1, +process.argv[argJobs + 1])
  : Math.max(2, Math.min(4, Math.floor(cpus().length / 3)));

const run = (s) => new Promise((resolve) => {
  const t0 = Date.now();
  const child = spawn(process.execPath, [join(ROOT, s.file), ...(s.args || [])], { cwd: ROOT });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => {
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`${code === 0 ? 'ok ' : 'x  '} ${s.file.padEnd(28)} ${secs.padStart(4)}s`);
    resolve({ ...s, code, out, secs });
  });
});

async function pool(list, n) {
  const results = [];
  let next = 0;
  const worker = async () => { while (next < list.length) results.push(await run(list[next++])); };
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, worker));
  return results;
}

const t0 = Date.now();
console.log(`running ${SUITES.length} gates, ${JOBS} at a time (solo ones last)\n`);
const results = [
  ...await pool(SUITES.filter((s) => !s.solo), JOBS),
  ...await pool(SUITES.filter((s) => s.solo), 1),
];
const failed = results.filter((r) => r.code !== 0);
for (const f of failed) {
  console.log(`\n==== ${f.file} (exit ${f.code}) ====\n${f.out.trim()}`);
}
const mins = ((Date.now() - t0) / 60000).toFixed(1);
console.log(`\n${failed.length ? `x ${failed.length} of ${results.length} gates failed` : `ok all ${results.length} gates passed`} in ${mins} min`);
process.exit(failed.length ? 1 : 0);
