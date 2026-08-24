/**
 * Strip the alpha channel from a screenshot PNG, in place.
 *
 * WHY THIS EXISTS. App Store Connect requires screenshots to be flattened
 * — "without transparency" — and rejects an upload that carries an alpha
 * channel. Playwright always writes 8-bit RGBA (PNG colour type 6), so every
 * frame test/store-shots.mjs produced would have been refused at the upload
 * step, after the slow part of the job was already done. Catching it at the
 * end of a submission run is the worst possible time, so the generator now
 * emits colour type 2 and verifies it.
 *
 * The pixels do not change. A screenshot of a page with an opaque background
 * is already alpha=255 everywhere, so dropping the channel is lossless. The
 * loop still composites over black on the way out rather than assuming that,
 * because a partly transparent frame silently losing its blend would be a
 * worse bug than the one being fixed, and the cost is one multiply per pixel.
 *
 * No image library: this repo has none, and pulling one in for a re-encode
 * would be a dependency in the shipping tree for the sake of a build-time
 * probe. Node's zlib does the compression; the rest is the PNG spec, and only
 * the part of it Playwright actually emits — 8-bit, non-interlaced. Anything
 * else throws rather than guessing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** a = left, b = above, c = above-left. Straight from the PNG spec. */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Rewrite `file` as an opaque RGB PNG. Returns { width, height, changed }.
 * A file that is already colour type 2 is left untouched.
 */
export function flattenPng(file) {
  const buf = readFileSync(file);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error(`not a PNG: ${file}`);

  let width = 0, height = 0, colourType = -1, bitDepth = 0, interlace = 0;
  const idat = [];
  for (let p = 8; p + 8 <= buf.length;) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colourType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += len + 12;
  }

  if (colourType === 2) return { width, height, changed: false };
  if (colourType !== 6 || bitDepth !== 8 || interlace !== 0) {
    throw new Error(`unsupported PNG in ${file}: colourType=${colourType} bitDepth=${bitDepth} interlace=${interlace}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const inStride = width * 4;          // RGBA
  const outStride = width * 3;         // RGB
  const out = Buffer.alloc(height * (outStride + 1));
  const prev = Buffer.alloc(inStride); // previous UNFILTERED scanline
  const cur = Buffer.alloc(inStride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (inStride + 1)];
    const src = raw.subarray(y * (inStride + 1) + 1, (y + 1) * (inStride + 1));
    for (let i = 0; i < inStride; i++) {
      const a = i >= 4 ? cur[i - 4] : 0;
      const b = prev[i];
      const c = i >= 4 ? prev[i - 4] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      else if (filter !== 0) throw new Error(`bad filter ${filter} on row ${y} of ${file}`);
      cur[i] = v & 0xff;
    }
    // Filter type 0 on the way out: these are one-shot review artefacts, and
    // an unfiltered row costs a little size for a lot less code to be wrong.
    const base = y * (outStride + 1);
    out[base] = 0;
    for (let x = 0; x < width; x++) {
      const alpha = cur[x * 4 + 3] / 255;   // composite over black; normally 1
      out[base + 1 + x * 3] = Math.round(cur[x * 4] * alpha);
      out[base + 2 + x * 3] = Math.round(cur[x * 4 + 1] * alpha);
      out[base + 3 + x * 3] = Math.round(cur[x * 4 + 2] * alpha);
    }
    cur.copy(prev);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour, no alpha
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;  // deflate / adaptive filtering / no interlace

  writeFileSync(file, Buffer.concat([
    SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(out, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]));
  return { width, height, changed: true };
}
