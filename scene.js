// The scene: one full-resolution Ideogram painting per place (1024x576), recoloured into
// time-of-day plates offline (art/), with everything that moves drawn in code on top.
// T is the week's progress: 0 = start (e.g. before dawn), 0.5 = middle, 1 = the end state.
// Plates blend smoothly; the painted sun fades in over the place's `sunFade` range (at Lāʻie Point,
// only once the code-drawn sun has risen to meet it). Everything place-specific is in places.js.
// Positions are in 320x180 layout units (x K on screen).
"use strict";

const SW = 1024, SH = 576, K = SW / 320;
function hash2(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const mixC = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const keyC = (keys, t) => (t < 0.5 ? mixC(keys[0], keys[1], t * 2) : mixC(keys[1], keys[2], (t - 0.5) * 2));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgba = c => (255 << 24) | ((c[2] & 255) << 16) | ((c[1] & 255) << 8) | (c[0] & 255);
const hexC = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Back-view sprites (they face the sunrise). Each row is the left half; it is mirrored.
function mirror(half) { return half.map(r => r + [...r].reverse().join("")); }
const PLAYER = mirror([
  "....ooo", "...ohhh", "..ohhHh", "..ohhhh", "..ohhhh", "...ohhh", "....oSS", "..oottt", ".ottttt",
  "otTtttt", "osTtttt", "osTtttt", "oSTtttt", ".oTTTTT", "oppPPPP", "opppppp", "oPPPPPP", ".oooooo",
]);
const TAVITA = mirror([
  ".....ooo", "...ooccc", "..occCcc", ".occcccC", ".occcccc", ".occcccc", "..occccc", "...ookkk",
  ".oonnnnn", "onnNnnnn", "onNnnnnn", "onNnnnnn", "okNnnnnn", "okNnnnnn", "oNNNNNNN", "ogggGGGG",
  "oggggggg", "oGGGGGGG", ".ooooooo",
]);
const SPRITE_COL = Object.fromEntries(Object.entries({
  o: "#1d1622", h: "#2b1d18", H: "#4a3226", s: "#c98f6a", S: "#9c6a4c", t: "#d9534f", T: "#a33a3a",
  p: "#35507a", P: "#25385a", c: "#1a1412", C: "#3a2a22", k: "#8c5a3c", n: "#2b3f66", N: "#1c2a47",
  g: "#6b6f78", G: "#50535b",
}).map(([k, v]) => [k, hexC(v)]));
const MYNAH = ["..kk.", ".kkky", "bbbb.", ".bb..", ".y.y."];     // side view, facing left
const MYNAH_COL = { k: [20, 20, 20], y: [242, 194, 48], b: [110, 78, 58] };
const SUN_C = [[255, 230, 180], [255, 238, 200], [255, 246, 222]];

const Scene = {
  T: 0.02, target: 0.02, time: 0, plates: null, P: null,
  spray: [], nextWave: 1, nextSpout: 5, spout: null,
  kevinMode: "hidden", kevin: { t: -1, next: 6 },
  mynah: null, sparkles: [], tavitaAsleep: false,

  // Load a place's plates (see places.js) and reset everything that moves.
  async load(place) {
    const P = this.P = place.scene, names = [...place.plates, place.nosun];
    this.HZ = Math.round(P.horizon * K);
    Object.assign(this, { spray: [], sparkles: [], spout: null, mynah: null, tavitaAsleep: false, kevinMode: "hidden", kevin: { t: -1, next: 6, a: 0 } });
    const imgs = await Promise.all(names.map(src => new Promise((ok, bad) => {
      const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(src); im.src = src;
    })));
    const c = document.createElement("canvas"); c.width = SW; c.height = SH;
    const g = c.getContext("2d", { willReadFrequently: true });
    const data = imgs.map(im => { g.drawImage(im, 0, 0, SW, SH); return g.getImageData(0, 0, SW, SH).data.slice(); });
    this.nosun = data.pop();
    this.plates = data;
    this.base = new Uint8ClampedArray(SW * SH * 4);
    this.base32 = new Uint32Array(this.base.buffer);
    this.baseT = -1;
    // Classify pixels once, from the sunrise plate: open water gets wave lines, glints/foam twinkle.
    const S = data[data.length - 1], water = [], glint = [];
    for (let i = this.HZ * SW; i < SW * SH; i++) {
      const r = S[i * 4], gg = S[i * 4 + 1], b = S[i * 4 + 2];
      if (P.isGlint(r, gg, b)) glint.push(i); else if (P.isWater(r, gg, b)) water.push(i);
    }
    this.water = Uint32Array.from(water);
    this.glint = Uint32Array.from(glint);
    this.cellOf = new Uint32Array(SW * SH);
    for (let i = 0; i < SW * SH; i++) this.cellOf[i] = ((((i / SW) | 0) / K) | 0) * 320 + (((i % SW) / K) | 0);
    this.cellOn = new Uint8Array(320 * 180);
  },

  // Ease the time of day toward `target` (set by the game as answers come in).
  setTarget(t) { this.target = clamp(Math.max(this.target, t), 0, 1); },
  celebrate() {
    for (let i = 0; i < 18; i++) this.sparkles.push({
      x: this.P.sparkle[0] + (Math.random() - 0.5) * 60, y: this.P.sparkle[1] - Math.random() * 20, life: 0.6 + Math.random() * 0.8,
    });
  },
  stealSnack() { this.mynah = { t: 0 }; },

  blend() {
    const T = this.T, P = this.plates, N = this.nosun, S = P[P.length - 1], out = this.base;
    const s = T * (P.length - 1), i0 = Math.min(P.length - 2, Math.floor(s)), f = s - i0;
    const A = P[i0], last = i0 === P.length - 2, fSun = this.sunAt(T), Bp = P[i0 + 1];
    for (let o = 0; o < out.length; o += 4) {
      for (let ch = 0; ch < 3; ch++) {
        const b = last ? N[o + ch] + (S[o + ch] - N[o + ch]) * fSun : Bp[o + ch];
        out[o + ch] = A[o + ch] + (b - A[o + ch]) * f;
      }
      out[o + 3] = 255;
    }
    this.baseT = T;
  },

  sunAt(T) { const [a, b] = this.P.sunFade; return clamp((T - a) / (b - a), 0, 1); },

  step(dt) {
    this.time += dt;
    if (this.T < this.target) this.T = Math.min(this.target, this.T + dt * Math.max(0.01, (this.target - this.T) * 1.2));
    const L = this.P;
    if (L.spray.length && (this.nextWave -= dt) <= 0) {
      this.nextWave = 1.2 + Math.random() * 2;
      const [sx, sy] = L.spray[Math.floor(Math.random() * L.spray.length)];
      const big = sy > 100, n = big ? 45 : 22;
      for (let i = 0; i < n; i++) this.spray.push({
        x: sx + (Math.random() * 12 - 6), y: sy, vx: (Math.random() - 0.5) * (big ? 34 : 18),
        vy: -(18 + Math.random() * (big ? 55 : 26)), life: 0.7 + Math.random() * 0.7,
      });
    }
    for (const p of this.spray) { p.vy += 85 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.spray = this.spray.filter(p => p.life > 0);
    for (const p of this.sparkles) { p.y -= dt * 6; p.life -= dt; }
    this.sparkles = this.sparkles.filter(p => p.life > 0);
    if (L.whale && this.T > 0.8 && (this.nextSpout -= dt) <= 0) { this.nextSpout = 9 + Math.random() * 8; this.spout = { t: 0 }; }
    if (this.spout && (this.spout.t += dt) > 2.4) this.spout = null;
    const k = this.kevin;
    // Kevin's surfacing clock: 0→1 rises, 1→6 stays up, 6→7 sinks.
    // "ashore": he surfaces, then crawls up the sand (place.kevinBeach) over about a minute and basks there.
    if (this.kevinMode === "visible") k.t = Math.min(1.2, Math.max(0, k.t) + dt);
    else if (this.kevinMode === "ashore") { k.t = Math.min(1.2, Math.max(0, k.t) + dt); k.a = Math.min(1, k.a + dt / 60); }
    else if (this.kevinMode === "hidden") { if (k.t >= 0) { k.t = Math.max(k.t, 5.8) + dt; if (k.t > 7) k.t = -1; } }
    else {
      if (k.t < 0 && (k.next -= dt) <= 0) k.t = 0;
      if (k.t >= 0 && (k.t += dt) > 7) { k.t = -1; k.next = 10 + Math.random() * 10; }
    }
    if (this.mynah && (this.mynah.t += dt) > 5) this.mynah = null;
  },

  render(buf) {
    const T = this.T, time = this.time, L = this.P, base = this.base, HZ = L.horizon;
    if (Math.abs(T - this.baseT) > 0.003 || ((T === 0 || T === 1) && T !== this.baseT)) this.blend();
    buf.set(this.base32);

    // Water: drifting wave lines (1) and twinkling glints/foam (2), decided per layout cell.
    const on = this.cellOn, cellOf = this.cellOf;
    for (let ly = HZ; ly < 180; ly++) {
      const d = (ly - HZ) / (180 - HZ), speed = time * (3 + d * 9) * (ly & 1 ? 1 : -1), width = 4 + d * 6;
      for (let lx = 0; lx < 320; lx++) {
        const wave = ((hash2(Math.floor((lx + speed) / width), ly) + time * 0.22) % 1) < 0.06;
        const twinkle = ((hash2(lx, ly) + time * 0.8) % 1) < 0.22;
        on[ly * 320 + lx] = (wave ? 1 : 0) | (twinkle ? 2 : 0);
      }
    }
    const [sh0, sh1, dim] = L.shimmer || [0.06, 0.12, 0.8], shimmer = sh0 + sh1 * T;
    const glintOn = L.glintWithSun ? this.sunAt(T) : 1, gd = 1 - (1 - dim) * glintOn;
    for (const i of this.water) if (on[cellOf[i]] & 1) {
      const o = i * 4;
      buf[i] = rgba([base[o] + (255 - base[o]) * shimmer, base[o + 1] + (255 - base[o + 1]) * shimmer, base[o + 2] + (255 - base[o + 2]) * shimmer]);
    }
    if (gd < 0.999) for (const i of this.glint) if (on[cellOf[i]] & 2) {
      const o = i * 4;
      buf[i] = rgba([base[o] * gd, base[o + 1] * (gd + 0.02), base[o + 2] * (gd + 0.06)]);
    }

    // Drawing helpers: px = one screen pixel, put = one layout pixel (a KxK block), blk = an s x s block.
    const px = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < SW && y >= 0 && y < SH) buf[y * SW + x] = rgba(c); };
    const blk = (x, y, s, v) => {
      for (let yy = Math.max(0, y | 0); yy < Math.min(SH, (y | 0) + s); yy++)
        for (let xx = Math.max(0, x | 0); xx < Math.min(SW, (x | 0) + s); xx++) buf[yy * SW + xx] = v;
    };
    const put = (x, y, c) => {
      const x0 = Math.round(x * K), x1 = Math.round((x + 1) * K), y0 = Math.round(y * K), y1 = Math.round((y + 1) * K), v = rgba(c);
      for (let yy = Math.max(0, y0); yy < Math.min(SH, y1); yy++) for (let xx = Math.max(0, x0); xx < Math.min(SW, x1); xx++) buf[yy * SW + xx] = v;
    };
    // A soft cloud (layout units), blended over the sky only.
    const cloud = (cx, cy, w, h, a) => {
      const x0 = Math.max(0, Math.floor((cx - w / 2) * K)), x1 = Math.min(SW, Math.ceil((cx + w / 2) * K));
      const y0 = Math.max(0, Math.floor((cy - h) * K)), y1 = Math.min(this.HZ, Math.ceil((cy + h / 2) * K));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const dx = (x / K - cx) / (w / 2), top = 0.7 + 0.3 * Math.sin(x / K * 0.35 + cx), dy = (y / K - cy) / (y / K < cy ? h * top : h / 2);
        const f = a * clamp((1 - dx * dx - dy * dy) * 2.5, 0, 1);
        if (f <= 0.02) continue;
        const i = y * SW + x, v = buf[i], r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
        buf[i] = rgba([r + (206 - r) * f, g + (210 - g) * f, b + (220 - b) * f]);
      }
    };

    // Stars before dawn.
    if (L.stars) {
      const starA = clamp(1 - T * 2.6, 0, 1);
      for (let n = 0; n < 70; n++) {
        const x = hash2(n, 1) * 320, y = hash2(n, 2) * (HZ - 6);
        const tw = 0.5 + 0.5 * Math.sin(time * 2 + n);
        if (L.starMask(x, y) && hash2(n, 4) * tw * starA > 0.2) blk(x * K, y * K, 2, rgba(mixC([150, 160, 200], [255, 250, 235], starA)));
      }
    }
    if (L.draw) L.draw(this, T, time, { px, put, blk, cloud });
    // The sun rises from below the horizon to where the painting has it.
    const fSun = this.sunAt(T), sun = L.risingSun;
    if (sun && T > 0.5 && fSun < 1) {
      const k = Math.min(1, (T - 0.5) / (L.sunFade[0] - 0.5)), cx = sun.x * K, cy = (sun.y + (1 - k) * 16) * K;
      const rx = sun.rx * K, ry = sun.ry * K, sc = keyC(SUN_C, T), rim = mixC(sc, [255, 170, 90], 0.5);
      for (let y = Math.floor(cy - ry); y < this.HZ; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
        if (d <= 1 && hash2(x >> 2, y >> 2) >= fSun) px(x, y, d > 0.86 ? rim : sc);
      }
    }
    // Sparkles on a correct answer.
    for (const p of this.sparkles) {
      const c = rgba(mixC([255, 200, 120], [255, 255, 240], p.life)), x = p.x * K, y = p.y * K, s = p.life > 0.5 ? 3 : 2;
      blk(x, y, s, c); if (p.life > 0.7) { blk(x - s, y, s, c); blk(x + s, y, s, c); blk(x, y - s, s, c); blk(x, y + s, s, c); }
    }
    // Seabirds.
    const bc = keyC(L.birds, T);
    for (let n = 0; n < 3; n++) {
      const bx = ((time * (5 + n * 1.3) + n * 90) % 360) - 20, by = 14 + n * 8 + Math.sin(time * 0.7 + n) * 3;
      const up = Math.floor(time * 3 + n) % 2 === 0;
      const pts = up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1]];
      for (const [dx, dy] of pts) put(Math.round(bx) + dx, Math.round(by) + dy, bc);
    }
    // Whale spout, far out, once the sun is up.
    if (this.spout) {
      const t = this.spout.t, [wx, wy] = L.whale;
      if (t < 1.6) for (let n = -3; n <= 3; n++) put(wx + n, wy, [30, 40, 55]);
      const hgt = Math.min(1, t * 2) * 8;
      for (let j = 0; j < hgt; j++) for (let n = -Math.floor(j / 3); n <= Math.floor(j / 3); n++)
        if (hash2(n + j * 5, Math.floor(t * 8)) > 0.35 + t * 0.25) put(wx + n, Math.round(wy - 2 - hgt + j), [235, 245, 250]);
    }
    // Kevin the honu: in the shallows, or (where the place has a beach) crawling up the sand to bask.
    if (this.kevin.t >= 0) {
      const k = this.kevin.t, up = clamp(Math.min(k, 7 - k), 0, 1);
      const path = this.kevinMode === "ashore" && L.kevinBeach, a = path ? this.kevin.a : 0;
      let kx = L.kevin[0], ky0 = L.kevin[1];
      if (path) {                                              // along the path, in small shuffles
        const s = Math.min(path.length - 1.001, a * (path.length - 1)), j = Math.floor(s), f = s - j;
        const step = Math.floor(f * 6) / 6 + Math.min(1, (f * 6 % 1) * 3) / 6;
        kx = Math.round(path[j][0] + (path[j + 1][0] - path[j][0]) * step);
        ky0 = Math.round(path[j][1] + (path[j + 1][1] - path[j][1]) * step);
      }
      const onSand = path && a > 0.25, ky = ky0 - (onSand ? 1 : Math.round(up * 2));
      const shell = mixC([30, 55, 45], [70, 100, 60], T), head = mixC([45, 60, 50], [130, 140, 90], T);
      if (up > 0.3) {
        if (onSand) for (let n = -5; n <= 5; n++) put(kx + n, ky + 1, mixC([150, 120, 90], [196, 160, 112], T));   // shadow
        for (let n = -4; n <= 4; n++) put(kx + n, ky, shell);
        for (let n = -2; n <= 2; n++) put(kx + n, ky - 1, shell);
        put(kx + 6, ky - 1, head); put(kx + 7, ky - 1, head); put(kx + 6, ky - 2, head);
        if (onSand) { put(kx - 4, ky + 1, head); put(kx + 4, ky + 1, head); }                 // flippers
        else for (let n = -6; n <= 9; n += 3) if (hash2(n, Math.floor(time * 4)) > 0.5) put(kx + n, ky + 1, [200, 225, 225]);
      }
    }
    // You and Tavita on the ledge, lit more as the sun comes up.
    const shade = keyC(L.shade, T);
    const sprite = (rows, lx, bob) => {
      const x0 = lx * K, y0 = L.ledge * K - rows.length * 3 + bob;
      rows.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch === ".") return;
        const c = SPRITE_COL[ch];
        blk(x0 + i * 3, y0 + j * 3, 3, rgba([c[0] * shade[0] / 255, c[1] * shade[1] / 255, c[2] * shade[2] / 255]));
      }));
    };
    sprite(PLAYER, L.player, 0);
    const breathe = this.tavitaAsleep ? Math.round(Math.sin(time * 1.5)) : 0;
    sprite(TAVITA, L.tavita, breathe);
    if (this.tavitaAsleep) {                                                   // z z z
      for (let n = 0; n < 3; n++) {
        const t = (time * 0.5 + n / 3) % 1, zx = (L.tavita + 9 + t * 8) * K, zy = (L.ledge - 22 - t * 14) * K, zc = rgba([235, 240, 255]);
        const s = 2 + Math.round(t * 2);
        for (let i = 0; i < 3; i++) { blk(zx + i * s, zy, s, zc); blk(zx + i * s, zy + 2 * s, s, zc); }
        blk(zx + s, zy + s, s, zc);
      }
    }
    // The mynah: flies in, hops next to Tavita, flies off with a granola bar.
    if (this.mynah) {
      const t = this.mynah.t, perch = [L.tavita + 17, L.ledge - 5];   // lands just right of Tavita
      let x, y, hasBar = t > 2.4, flap = true;
      if (t < 1.6) { const f = t / 1.6; x = 330 + (perch[0] - 330) * f; y = perch[1] - Math.sin(f * Math.PI) * 30 - (1 - f) * 20; }
      else if (t < 3) { x = perch[0] - (t > 2 && t < 2.4 ? 3 : 0); y = perch[1] - (Math.floor(t * 4) % 2 ? 1 : 0); flap = false; }
      else { const f = (t - 3) / 2; x = perch[0] + f * 200; y = perch[1] - f * 60; }
      const c = MYNAH_COL, s = 3, mx = x * K, my = y * K, wing = flap && Math.floor(time * 10) % 2;
      MYNAH.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== "." && !(wing && j === 2 && i > 0)) blk(mx + i * s, my + j * s, s, rgba(c[ch]));
      }));
      if (wing) blk(mx + s, my - s, s * 2, rgba(c.b));
      if (hasBar) { blk(mx - 2 * s, my + s, s, rgba([244, 162, 97])); blk(mx - 3 * s, my + s, s, rgba([244, 162, 97])); }
    }
    // Spray: small, so it sits with the painted foam.
    const foam = mixC([120, 130, 170], [250, 252, 255], clamp(T * 1.3, 0, 1));
    for (const p of this.spray) {
      const c = rgba(mixC([90, 110, 140], foam, clamp(p.life, 0.3, 1)));
      blk(p.x * K, p.y * K, p.life > 0.6 ? 3 : 2, c);
    }
  },
};
