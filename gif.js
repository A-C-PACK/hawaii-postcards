// Time-lapse GIF of the week's scene: the time of day runs from the start to the end state while the
// water, birds and the place's own animation keep moving. No dependencies: a small median-cut
// quantizer (one palette per frame, since night and day share few colours) and a GIF89a/LZW writer.
// Used by the postcard's download button and by make_gifs.py (which saves one GIF per week).
"use strict";

// Record frames from Scene (already loaded with a place). Kevin, the mynah and the sparkles are
// left out; the sprites stay. Scene's state is restored afterwards, so the live game carries on.
async function timelapseGIF({ w = 512, h = 288, sweep = 44, hold = 16, delay = 10, onProgress } = {}) {
  const keep = ["T", "target", "time", "kevinMode", "kevin", "mynah", "sparkles", "spray", "spout", "tavitaAsleep"];
  const saved = Object.fromEntries(keep.map(k => [k, Scene[k]]));
  const full = document.createElement("canvas"); full.width = SW; full.height = SH;
  const fctx = full.getContext("2d"), img = fctx.createImageData(SW, SH), buf = new Uint32Array(img.data.buffer);
  const small = document.createElement("canvas"); small.width = w; small.height = h;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingQuality = "high";
  const gif = new GifWriter(w, h), n = sweep + hold;
  Scene.frozen = true;                          // the live loop stops drawing while we borrow the scene
  try {
    Object.assign(Scene, { kevinMode: "hidden", kevin: { t: -1, next: 1e9, a: 0 }, mynah: null, sparkles: [], spray: [], spout: null, tavitaAsleep: false });
    for (let i = 0; i < n; i++) {
      const f = Math.min(1, i / (sweep - 1)), T = 0.02 + 0.98 * (f * f * (3 - 2 * f));   // ease in and out
      Scene.T = Scene.target = T;
      Scene.step(delay / 100);
      Scene.sparkles = [];
      Scene.render(buf);
      fctx.putImageData(img, 0, 0);
      sctx.drawImage(full, 0, 0, w, h);
      gif.addFrame(sctx.getImageData(0, 0, w, h).data, i === n - 1 ? delay * 20 : delay);  // pause on the last frame
      if (onProgress) onProgress((i + 1) / n);
      await new Promise(r => setTimeout(r, 0));  // let the page breathe (button text, etc.)
    }
  } finally {
    Object.assign(Scene, saved);
    Scene.frozen = false;
  }
  return new Blob([gif.finish()], { type: "image/gif" });
}

// Median cut: split the colour box with the widest channel at its median until there are 256 boxes.
function quantize(rgba, samples = 24000) {
  const px = rgba.length / 4, step = Math.max(1, Math.floor(px / samples)), idx = [];
  for (let i = 0; i < px; i += step) idx.push(i * 4);
  const box = px => {                             // a box knows its widest channel, measured once
    let range = 0, ch = 0;
    for (let c = 0; c < 3; c++) {
      let lo = 255, hi = 0;
      for (const o of px) { const v = rgba[o + c]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > range) { range = hi - lo; ch = c; }
    }
    return { px, range: px.length > 1 ? range : 0, ch };
  };
  const boxes = [box(idx)];
  while (boxes.length < 256) {
    let best = 0;
    for (let i = 1; i < boxes.length; i++) if (boxes[i].range > boxes[best].range) best = i;
    const { px: b, ch } = boxes[best];
    if (boxes[best].range === 0) break;
    b.sort((x, y) => rgba[x + ch] - rgba[y + ch]);
    const mid = b.length >> 1;
    boxes.splice(best, 1, box(b.slice(0, mid)), box(b.slice(mid)));
  }
  const pal = new Uint8Array(256 * 3);
  boxes.forEach(({ px: b }, bi) => {
    let r = 0, g = 0, bl = 0;
    for (const o of b) { r += rgba[o]; g += rgba[o + 1]; bl += rgba[o + 2]; }
    pal[bi * 3] = r / b.length; pal[bi * 3 + 1] = g / b.length; pal[bi * 3 + 2] = bl / b.length;
  });
  // Map every pixel to its nearest palette colour, caching by 6-bit-per-channel colour.
  const cache = new Int16Array(1 << 18).fill(-1), out = new Uint8Array(px), used = boxes.length;
  for (let i = 0, o = 0; i < px; i++, o += 4) {
    const key = ((rgba[o] >> 2) << 12) | ((rgba[o + 1] >> 2) << 6) | (rgba[o + 2] >> 2);
    let c = cache[key];
    if (c < 0) {
      let bd = 1e9;
      for (let j = 0; j < used; j++) {
        const dr = rgba[o] - pal[j * 3], dg = rgba[o + 1] - pal[j * 3 + 1], db = rgba[o + 2] - pal[j * 3 + 2];
        const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
        if (d < bd) { bd = d; c = j; }
      }
      cache[key] = c;
    }
    out[i] = c;
  }
  return { pal, out };
}

// GIF89a writer: looping, one local 256-colour table per frame, LZW-compressed pixels.
class GifWriter {
  constructor(w, h) {
    this.w = w; this.h = h; this.parts = [];
    const head = [..."GIF89a"].map(c => c.charCodeAt(0));
    head.push(w & 255, w >> 8, h & 255, h >> 8, 0x00, 0, 0);                        // no global colour table
    head.push(0x21, 0xff, 0x0b, ..."NETSCAPE2.0".split("").map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0);   // loop forever
    this.parts.push(new Uint8Array(head));
  }
  addFrame(rgba, delay) {
    const { pal, out } = quantize(rgba), w = this.w, h = this.h;
    const head = [0x21, 0xf9, 4, 0x04, delay & 255, delay >> 8, 0, 0,               // graphic control: keep frame, delay (1/100 s)
      0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0x87];                     // image descriptor + 256-colour local table
    this.parts.push(new Uint8Array(head), pal, lzw(out, 8));
  }
  finish() { this.parts.push(new Uint8Array([0x3b])); return new Blob(this.parts); }
}

// LZW as the GIF spec wants it (variable code size, clear at 4096 codes), packed into 255-byte sub-blocks.
const LZW_TABLE = new Int16Array(1 << 20);
function lzw(pixels, minSize) {
  const clear = 1 << minSize, eoi = clear + 1, bytes = [];
  let size = minSize + 1, next = eoi + 1, cur = 0, shift = 0;
  const emit = code => { cur |= code << shift; shift += size; while (shift >= 8) { bytes.push(cur & 255); cur >>>= 8; shift -= 8; } };
  LZW_TABLE.fill(-1);
  emit(clear);
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i], key = (prefix << 8) | k, code = LZW_TABLE[key];
    if (code >= 0) { prefix = code; continue; }
    emit(prefix);
    if (next === 4096) { emit(clear); size = minSize + 1; next = eoi + 1; LZW_TABLE.fill(-1); }
    else { if (next >= 1 << size) size++; LZW_TABLE[key] = next++; }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (shift > 0) bytes.push(cur & 255);
  const out = [minSize];
  for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); }
  out.push(0);
  return new Uint8Array(out);
}
