/**
 * Weekly numbers for CityRunner, pulled from the App Store Connect API and
 * GitHub, written as a short Markdown report. Read-only: it changes nothing.
 *
 *   node marketing/weekly-report.mjs            last 7 full days vs the 7 before
 *   node marketing/weekly-report.mjs --out DIR  also save DIR/YYYY-MM-DD.md
 *
 * Needs the API key described in marketing/asc.mjs, and ASC_VENDOR_NUMBER (or
 * "vendorNumber" in marketing/config.json) for the sales figures. Apple
 * publishes a day's sales report the following day, so "last 7 days" ends
 * yesterday, and a report missing for a day with no sales counts as zero.
 */
import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asc } from './asc.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
const APP = config.appStoreId;
const VENDOR = process.env.ASC_VENDOR_NUMBER || config.vendorNumber || '';
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;

const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};
const thisWeek = Array.from({ length: 7 }, (_, i) => day(i + 1));
const lastWeek = Array.from({ length: 7 }, (_, i) => day(i + 8));

// Product type identifiers from Apple's sales report reference.
const FIRST_DOWNLOAD = new Set(['1', '1F', '1T', 'F1', '1E', '1EP', '1EU']);
const REDOWNLOAD = new Set(['3', '3F', '3T', 'F3']);
const isIap = (t) => t.startsWith('IA') || t === 'FI1';

async function salesFor(date) {
  const q = new URLSearchParams({
    'filter[frequency]': 'DAILY', 'filter[reportType]': 'SALES', 'filter[reportSubType]': 'SUMMARY',
    'filter[vendorNumber]': VENDOR, 'filter[reportDate]': date, 'filter[version]': '1_1',
  });
  let rows;
  try {
    const tsv = gunzipSync(await asc(`/v1/salesReports?${q}`, { raw: true })).toString('utf8').trim().split('\n');
    const cols = tsv[0].split('\t');
    rows = tsv.slice(1).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])));
  } catch (err) {
    if (err.status === 404) rows = [];              // no sales that day
    else throw err;
  }
  const out = { downloads: 0, redownloads: 0, iap: 0, proceeds: {}, countries: {} };
  // The report covers every app on the account. That is only this one today;
  // a second app would need filtering here (in-app purchase rows carry the
  // app's SKU in "Parent Identifier", not its Apple ID).
  for (const r of rows) {
    const t = r['Product Type Identifier'];
    const units = +r.Units || 0;
    if (FIRST_DOWNLOAD.has(t)) {
      out.downloads += units;
      out.countries[r['Country Code']] = (out.countries[r['Country Code']] || 0) + units;
    } else if (REDOWNLOAD.has(t)) out.redownloads += units;
    else if (isIap(t)) out.iap += units;
    const cur = r['Currency of Proceeds'];
    const p = units * (+r['Developer Proceeds'] || 0);
    if (p) out.proceeds[cur] = (out.proceeds[cur] || 0) + p;
  }
  return out;
}

async function week(dates) {
  const sum = { downloads: 0, redownloads: 0, iap: 0, proceeds: {}, countries: {} };
  for (const d of dates) {
    const s = await salesFor(d);
    sum.downloads += s.downloads; sum.redownloads += s.redownloads; sum.iap += s.iap;
    for (const [k, v] of Object.entries(s.proceeds)) sum.proceeds[k] = (sum.proceeds[k] || 0) + v;
    for (const [k, v] of Object.entries(s.countries)) sum.countries[k] = (sum.countries[k] || 0) + v;
  }
  return sum;
}

const money = (p) => Object.entries(p).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(', ') || '0';
const change = (a, b) => (a === b ? 'same' : a > b ? `+${a - b}` : `${a - b}`);
const lines = [`# CityRunner week to ${thisWeek[0]}`, '', `Covers ${thisWeek[6]} to ${thisWeek[0]} (UTC), compared with the 7 days before.`, ''];

// Sales
if (!VENDOR) {
  lines.push('Sales: no vendor number configured, so downloads and purchases are missing.', '');
} else {
  try {
    const [a, b] = [await week(thisWeek), await week(lastWeek)];
    lines.push('| | This week | Last week | Change |', '|---|---|---|---|',
      `| First-time downloads | ${a.downloads} | ${b.downloads} | ${change(a.downloads, b.downloads)} |`,
      `| Re-downloads | ${a.redownloads} | ${b.redownloads} | ${change(a.redownloads, b.redownloads)} |`,
      `| Founder purchases | ${a.iap} | ${b.iap} | ${change(a.iap, b.iap)} |`,
      `| Proceeds | ${money(a.proceeds)} | ${money(b.proceeds)} | |`, '');
    const top = Object.entries(a.countries).sort((x, y) => y[1] - x[1]).slice(0, 5);
    if (top.length) lines.push(`Downloads by country this week: ${top.map(([c, n]) => `${c} ${n}`).join(', ')}.`, '');
  } catch (err) {
    lines.push(`Sales: could not be read (${err.message.slice(0, 160)}).`, '');
  }
}

// Reviews
try {
  const since = thisWeek[6];
  const rev = await asc(`/v1/apps/${APP}/customerReviews?sort=-createdDate&limit=50`);
  const fresh = rev.data.filter((r) => r.attributes.createdDate.slice(0, 10) >= since);
  lines.push(`## Reviews`, '', fresh.length ? '' : `No new written reviews (total so far: ${rev.data.length}).`);
  for (const r of fresh) {
    const a = r.attributes;
    lines.push(`- ${'★'.repeat(a.rating)}${'☆'.repeat(5 - a.rating)} ${a.territory}, ${a.createdDate.slice(0, 10)}: "${a.title}" ${a.body}`);
  }
  lines.push('');
} catch (err) {
  lines.push(`Reviews: could not be read (${err.message.slice(0, 160)}).`, '');
}

// Daily clip bot
try {
  const res = await fetch('https://api.github.com/repos/danzinkin-rgb/CityRunner2/actions/workflows/daily-clip.yml/runs?per_page=30',
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'cityrunner-report' } });
  const runs = (await res.json()).workflow_runs || [];
  const recent = runs.filter((r) => r.created_at.slice(0, 10) >= thisWeek[6]);
  const ok = recent.filter((r) => r.conclusion === 'success').length;
  const bad = recent.filter((r) => r.conclusion && r.conclusion !== 'success');
  lines.push('## Daily clip bot', '', `${recent.length} runs this week: ${ok} succeeded, ${bad.length} failed.`);
  for (const r of bad) lines.push(`- Failed ${r.created_at.slice(0, 10)}: ${r.html_url}`);
  lines.push('');
} catch (err) {
  lines.push(`Daily clip bot: could not be read (${err.message.slice(0, 160)}).`, '');
}

const report = lines.join('\n');
console.log(report);
if (OUT) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${day(0)}.md`), report);
}
