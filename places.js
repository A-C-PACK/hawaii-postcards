// One entry per week: where it is, how it looks and sounds, and what Scene animates there.
// Layout positions are in 320x180 units (x3.2 on screen). The Scene engine (scene.js) is shared;
// anything only one place does lives in that place's `draw` hook.
//
// Plates: the painting recoloured for the start and middle of the week, then the end state
// (`plates` = [start, middle, end], `nosun` = the end state without its painted sun). See art/.
"use strict";

const PLACES = {
  1: {
    id: "laie_point",
    name: "Lāʻie Point",
    when: "before sunrise",
    clock: "5:00 a.m.",
    music: "music/sunset_breeze.mp3",
    plates: ["predawn", "dawn", "sunrise"].map(n => `plates/laie_point_${n}.png`),
    nosun: "plates/laie_point_nosun.png",
    granola: 11,
    kevinAfter: "random",           // after his activity Kevin pops up now and then
    // Activity names and icons (HUD, postcard stats, goals).
    act: {
      sign: ["🪧", "Trail sign"], card: ["✉️", "Postcard"], pool: ["🦀", "Tide pools"],
      kevin: ["🐢", "Kevin"], shells: ["🐚", "Shells"], sun: ["🌅", "Sunrise"],
    },
    signLabel: "trail-sign",
    shellsTitle: "Shells on the ledge",
    reflectTitle: "Sunrise reflection",
    reflectIcon: "🌅",
    photoAlt: "Sunrise at Lāʻie Point",
    scene: {
      horizon: 47,
      isWater: (r, g, b) => b > r + 45 && g > r + 15,
      isGlint: (r, g, b) => (r + g + b) / 3 > 165,
      shimmer: [0.06, 0.12, 0.8],
      sunFade: [0.93, 1],           // T range over which the painted sun replaces the code-drawn one
      risingSun: { x: 150, y: 43, rx: 16, ry: 11 },
      stars: true,
      starMask: (x, y) => y < 47 && !(x >= 174 && x <= 250 && y > 18),   // not over the islet
      sparkle: [150, 46],
      spray: [[62, 113], [122, 124], [88, 147], [212, 80], [262, 82], [290, 108], [205, 152]],
      whale: [300, 50],
      kevin: [118, 72],             // open water in the sun path, above the panels
      ledge: 140,                   // top of the flat rock, bottom left
      player: 4, tavita: 18,        // x positions (far left, clear of the panels)
      shade: [[40, 44, 80], [150, 110, 130], [255, 255, 255]],
      birds: [[10, 12, 28], [40, 30, 55], [45, 50, 70]],
    },
  },

  2: {
    id: "hukilau",
    name: "Hukilau Beach",
    when: "early morning",
    clock: "6:30 a.m.",
    music: "music/breezy_hawaiian_groove.mp3",
    plates: ["grey", "soft", "morning"].map(n => `plates/hukilau_${n}.png`),
    nosun: "plates/hukilau_nosun.png",
    granola: 12,
    kevinAfter: "ashore",           // after his activity Kevin crawls up the sand and basks
    act: {
      sign: ["🪧", "Beach sign"], card: ["✉️", "Postcard"], pool: ["🦀", "Ghost crabs"],
      kevin: ["🐢", "Kevin"], shells: ["🐚", "Shells"], sun: ["☀️", "Morning"],
    },
    signLabel: "beach-sign",
    shellsTitle: "Shells on the sand",
    reflectTitle: "Morning reflection",
    reflectIcon: "☀️",
    photoAlt: "Morning at Hukilau Beach",
    scene: {
      horizon: 21,
      isWater: (r, g, b) => b > r + 45 && g > r + 15,
      isGlint: (r, g, b) => (r + g + b) / 3 > 205 && b >= r - 4,   // foam and glitter, not the bright sand
      shimmer: [0.02, 0.05, 0.9],   // wave-line brightening (start, + at end) and glint dimming: gentle on a soft painting
      glintWithSun: true,           // the glitter only twinkles once the sun is through
      sunFade: [0.55, 1],           // the sun slowly comes through as the clouds clear
      risingSun: null,
      stars: false,
      sparkle: [164, 14],
      spray: [],
      whale: null,
      kevin: [276, 62],             // in the shallows on the right, where the beach curves away
      kevinBeach: [[276, 62], [284, 64], [291, 66], [298, 68]],   // his crawl up the wet sand to bask
      ledge: 168,                   // the sprites sit on the sand, bottom left
      player: 4, tavita: 18,
      shade: [[150, 150, 165], [215, 205, 205], [255, 255, 255]],
      birds: [[60, 64, 78], [70, 70, 86], [60, 66, 80]],
      // Signature animation: low clouds drifting over the sun, thinning as the morning clears.
      draw(S, T, time, h) {
        const cover = Math.max(0, 1 - T * 1.15);
        if (cover <= 0) return;
        for (let n = 0; n < 9; n++) {
          const w = 34 + hash2(n, 9) * 40, cy = 3 + hash2(n, 3) * 15;
          const cx = ((hash2(n, 5) * 420 + time * (1.2 + hash2(n, 7))) % 420) - 50;
          h.cloud(cx, cy, w, 5 + hash2(n, 8) * 4, cover * (0.55 + 0.35 * hash2(n, 6)));
        }
      },
    },
  },

  3: {
    id: "mokolii",
    name: "Kualoa",
    when: "before sunrise",
    clock: "5:45 a.m.",
    music: "music/ocean_breeze.mp3",
    plates: ["firstlight", "dawn", "sunrise"].map(n => `plates/mokolii_${n}.png`),
    nosun: "plates/mokolii_nosun.png",
    granola: 13,
    kevinAfter: "random",                   // pops up now and then in the bay, left of the sun path
    act: {
      sign: ["🪧", "Park sign"], card: ["✉️", "Postcard"], pool: ["🛶", "Kayaks"],
      kevin: ["🐢", "Kevin"], shells: ["🐚", "Shells"], sun: ["🌅", "Sunrise"],
    },
    signLabel: "park-sign",
    shellsTitle: "Shells on the sand",
    reflectTitle: "Sunrise reflection",
    reflectIcon: "🌅",
    photoAlt: "Sunrise beside Mokoliʻi, seen from Kualoa",
    scene: {
      horizon: 26,
      isWater: (r, g, b) => b > r + 45 && g > r + 15,
      isGlint: (r, g, b) => (r + g + b) / 3 > 215 && b >= r,   // white shore foam only; the warm sun glitter
                                                                // looks like the sand, so it twinkles in draw()
      shimmer: [0.04, 0.08, 0.85],
      sunFade: [0.9, 1],                    // the code sun rises to meet the painted one, then dissolves into it
      risingSun: { x: 88, y: 20, rx: 8, ry: 6 },
      stars: true,
      starMask: (x, y) => x < 136 && y < 24,  // open sky left of Mokoliʻi (not the islet, cliffs or palms)
      sparkle: [88, 30],                    // on the glitter path just below the sun
      spray: [],                            // a calm, reef-sheltered bay
      whale: null,
      kevin: [58, 64],                      // open water left of the sun path, above the panels
      ledge: 168,                           // the sprites sit on the flat lawn, bottom left
      player: 4, tavita: 18,
      shade: [[70, 74, 110], [175, 135, 150], [255, 238, 215]],   // first light → rosy dawn → warm sunrise
      birds: [[22, 24, 44], [52, 42, 62], [52, 50, 64]],
      // Signature animation: kayakers launch from the beach and paddle out toward Mokoliʻi (more of them
      // as the morning goes on), two ʻiwa soar in slow circles without a wingbeat, and the glitter path
      // twinkles once the painted sun is up.
      draw(S, T, time, h) {
        const base = S.base, W = 1024, K = 3.2, light = 0.3 + 0.7 * T;
        const mix = (x, y, c, a) => {       // blend screen pixel (x, y) of the plate toward colour c
          x |= 0; y |= 0; if (x < 0 || x >= W || y < 0 || y >= 576) return;
          const o = (y * W + x) * 4;
          h.px(x, y, [base[o] + (c[0] - base[o]) * a, base[o + 1] + (c[1] - base[o + 1]) * a, base[o + 2] + (c[2] - base[o + 2]) * a]);
        };
        // 1. Glitter on the sun path: warm bright flecks dim and flash, only once the painted sun shows.
        const fSun = S.sunAt(T);
        if (fSun > 0) for (let ly = 34; ly < 76; ly++) for (let lx = 62; lx < 122; lx++) {   // not the hazy rows at the horizon
          if (((hash2(lx, ly) + time * 0.9) % 1) >= 0.25) continue;
          for (let y = Math.round(ly * K); y < Math.round((ly + 1) * K); y++) for (let x = Math.round(lx * K); x < Math.round((lx + 1) * K); x++) {
            const o = (y * W + x) * 4, r = base[o], g = base[o + 1], b = base[o + 2];
            if (r + g + b > 540 && r > b + 15) mix(x, y, [r * 0.8, g * 0.8, b * 0.86], fSun);
          }
        }
        // 2. Kayaks: [start, end] in layout units, seconds per trip, time offset, hull colour, paddlers,
        //    and the progress T from which that kayak is out. They launch from the sand (under the panels;
        //    visible with ▾ Hide) and fade out as they reach the far side of the bay.
        const KAYAKS = [
          [[-12, 58], [112, 38], 150, 0, [214, 72, 52], 1, 0],
          [[62, 116], [116, 41], 130, 40, [240, 196, 60], 2, 0.25],
          [[228, 114], [196, 42], 120, 75, [236, 128, 48], 1, 0.5],
          [[20, 116], [60, 34], 170, 110, [60, 150, 190], 2, 0.7],
        ];
        for (const [[x0, y0], [x1, y1], dur, off, hull, crew, from] of KAYAKS) {
          if (T < from) continue;
          const f = ((time + off) % dur) / dur, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
          const a = Math.min(1, f * 12, (1 - f) * 8) * Math.min(1, (T - from) * 8 + 0.001);
          if (a <= 0.02) continue;
          const s = y > 80 ? 3 : 2, len = crew === 2 ? 7 : 5;                   // pixel size: nearer kayaks are bigger
          const sx = Math.round(x * K), sy = Math.round(y * K), dir = x1 > x0 ? 1 : -1;
          const hc = [hull[0] * light, hull[1] * light, hull[2] * light], body = [24 * light + 12, 28 * light + 12, 40 * light + 14];
          const dot = (i, j, c, al) => { for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) mix(sx + i * s + dx, sy + j * s + dy, c, al); };
          for (let i = -len; i <= len; i++) dot(i, 0, hc, a);                                      // hull
          for (let i = -len + 1; i < len; i++) dot(i, 1, [hc[0] * 0.6, hc[1] * 0.6, hc[2] * 0.6], a);  // its shaded side
          for (let j = 1; j <= 5; j++) dot(-dir * (len + j), 1, [235, 245, 250], a * 0.5 * (1 - j / 6));   // wake
          for (let p = 0; p < crew; p++) {
            const px = crew === 2 ? (p ? 3 : -3) : 0, ph = Math.floor(time * 1.4 + p * 0.5 + off) % 2 ? 1 : -1;
            dot(px, -1, body, a); dot(px, -2, body, a); dot(px, -3, body, a);                      // paddler + head
            for (let k = -3; k <= 3; k++) dot(px + k, -2 + Math.round(k * ph * 0.5), [60 * light, 50 * light, 40 * light], a * 0.9);   // paddle, rocking side to side
          }
        }
        // 3. Two ʻiwa (great frigatebirds): long crooked wings and a forked tail, circling slowly high
        //    over the bay without flapping; the wings tilt a little as they bank.
        const IWA = ["x.............x", ".xx.........xx.", "...xxx...xxx...", "......xxx......", ".......x.......", "......x.x......", ".....x...x....."];
        const bc = keyC(S.P.birds, T);
        for (let n = 0; n < 2; n++) {
          const ang = time * (0.11 + n * 0.03) + n * 2.4, cx = n ? 60 : 208, cy = n ? 11 : 7;
          const bx = (cx + Math.cos(ang) * (n ? 34 : 26)) * K, by = (cy + Math.sin(ang) * 4) * K, tilt = Math.sin(ang);
          IWA.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch === ".") return;
            const lift = j <= 2 ? Math.round(tilt * (i - 7) / 7 * 2) : 0;
            h.blk(bx + (i - 7) * 2, by + (j + lift) * 2, 2, rgba(bc));
          }));
        }
      },
    },
  },

  4: {
    id: "kaaawa",
    name: "Kaʻaʻawa Valley",
    when: "late afternoon",
    clock: "5:00 p.m.",
    music: "music/sunset_breeze.mp3",
    plates: ["afternoon", "warm", "golden"].map(n => `plates/kaaawa_${n}.png`),
    nosun: "plates/kaaawa_nosun.png",       // no painted sun (it is behind the viewer): same as golden
    granola: 14,
    kevinAfter: "random",                   // pops up now and then in the ocean at the valley mouth
    act: {
      sign: ["🪧", "Lookout sign"], card: ["✉️", "Postcard"], pool: ["🐎", "Horses"],
      kevin: ["🐢", "Kevin"], shells: ["🍃", "Leaves"], sun: ["🌄", "Golden hour"],
    },
    signLabel: "lookout-sign",
    shellsTitle: "Leaves in the wind",
    reflectTitle: "Golden-hour reflection",
    reflectIcon: "🌄",
    photoAlt: "Golden hour in Kaʻaʻawa Valley",
    scene: {
      horizon: 19,
      isWater: (r, g, b) => b > r + 65 && g > r + 15,   // 65 (not 45): keeps the bluish shadows on the right cliffs still
      isGlint: () => false,                 // the only bright bluish pixels are the horizon haze (twinkling it made grey blocks); wave lines animate the sea
      shimmer: [0.02, 0.04, 0.9],           // small, far-away strip of sea: keep it gentle
      sunFade: [0, 1],                      // required by sunAt(); harmless because nosun == golden
      risingSun: null,
      stars: false,
      sparkle: [150, 24],                   // over the ocean strip
      spray: [],
      whale: null,
      kevin: [160, 27],                     // in the ocean strip between the cliffs, well above the panels
      ledge: 168,                           // the sprites sit on the flat lawn, bottom left
      player: 4, tavita: 18,
      shade: [[215, 215, 222], [240, 222, 205], [255, 222, 175]],   // plain afternoon → golden light
      birds: [[60, 64, 78], [70, 62, 70], [78, 58, 50]],
      // Signature animation: mist drifting along the upper ridges, wind moving through the grass,
      // and three horses grazing in the pasture above the panels.
      draw(S, T, time, h) {
        const base = S.base, W = 1024, K = 3.2;
        // Blend screen pixel (x, y) of the current plate toward colour c by a.
        const tint = (x, y, c, a) => {
          const o = (y * W + x) * 4;
          h.px(x, y, [base[o] + (c[0] - base[o]) * a, base[o + 1] + (c[1] - base[o + 1]) * a, base[o + 2] + (c[2] - base[o + 2]) * a]);
        };
        // 1. Mist: soft wisps sliding slowly along each ridge line, fading in and out at the ends of
        //    their run (no popping). White in the afternoon, gold at the end.
        const mistC = [236 + 19 * T, 238 - 6 * T, 242 - 60 * T];
        const WISPS = [   // [x0, x1 (layout, the run), y at x0, y at x1, width, height, speed, phase]
          [-20, 100, 6, 26, 46, 5, 1.1, 0.0], [-20, 100, 16, 34, 36, 4, 0.8, 0.5],
          [196, 330, 30, 8, 50, 5, 0.9, 0.2], [210, 330, 44, 20, 40, 4, 1.3, 0.7], [230, 330, 12, 4, 44, 4, 0.7, 0.4],
        ];
        for (const [x0, x1, y0, y1, w, hh, sp, ph] of WISPS) {
          const f = ((time * sp) / (x1 - x0) + ph) % 1, cx = x0 + (x1 - x0) * f, cy = y0 + (y1 - y0) * f;
          const a = (0.22 + 0.1 * T) * Math.sin(Math.PI * f);
          const sx0 = Math.max(0, Math.floor((cx - w / 2) * K)), sx1 = Math.min(W, Math.ceil((cx + w / 2) * K));
          const sy0 = Math.max(0, Math.floor((cy - hh) * K)), sy1 = Math.ceil((cy + hh) * K);
          for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
            const dx = (x / K - cx) / (w / 2), top = 0.75 + 0.25 * Math.sin(x / K * 0.3 + ph * 20);
            const dy = (y / K - cy) / (hh * top), m = (1 - dx * dx - dy * dy) * 1.8;
            if (m > 0) tint(x, y, mistC, a * Math.min(1, m));
          }
        }
        // 2. Wind in the grass: bright bands rolling across the tall grass (bottom right, where the
        //    panels are, visible with ▾ Hide) and, more gently, over the pasture above the panels.
        // Evaluated once per layout cell; only the cells inside a band are touched.
        const gust = (lx, ly, s) => {
          const p = (lx * 0.55 + ly * 1.2) / 47 - time * 0.35 + 0.3 * Math.sin(time * 0.23 + ly / 28);
          const v = Math.sin(p * Math.PI * 2);
          return v > 0.6 ? s * ((v - 0.6) / 0.4) ** 2 : 0;
        };
        const light = [255, 244, 200];
        const band = (lx0, lx1, ly0, ly1, s, fade, grassOnly) => {
          for (let ly = ly0; ly < ly1; ly++) for (let lx = lx0; lx < lx1; lx++) {
            const a = gust(lx, ly, s) * fade(lx, ly);
            if (a <= 0.01) continue;
            for (let y = Math.round(ly * K); y < Math.round((ly + 1) * K); y++) for (let x = Math.round(lx * K); x < Math.round((lx + 1) * K); x++) {
              if (grassOnly) {                 // not trees or the dirt track
                const o = (y * W + x) * 4, r = base[o], g = base[o + 1], b = base[o + 2];
                if ((r + g + b) / 3 <= 105 || g <= b + 25) continue;
              }
              tint(x, y, light, a);
            }
          }
        };
        band(103, 320, 115, 180, 0.13, (lx, ly) => Math.min(1, (lx - 103) / 56 + (ly - 147) / 62), false);   // tall grass, not the lawn where you sit
        band(94, 238, 44, 103, 0.07, () => 1, true);                                                          // the pasture
        // 3. Horses grazing in the pasture: mostly head down, now and then a look up, and every ~20 s
        //    a short walk (back and forth, so they stay put overall). Drawn in 2x2-pixel blocks.
        const UP = ["........mh.", ".......mhhh", "tbbbbbbbh..", "tbbbbbbbb..", ".bbbbbbb...", ".l.l..l.l..", ".l.l..l.l.."];
        const DOWN = ["...........", "...........", "tbbbbbbbm..", "tbbbbbbbbh.", ".bbbbbbb.hh", ".l.l..l.l.h", ".l.l..l.l.."];
        const STEP = [".l..l..l.l.", "..l..l.l..l"];
        const HORSES = [   // [x, y (layout, feet), body colour, mane colour, time offset]
          [138, 77, [120, 72, 44], [50, 32, 24], 0], [152, 75, [92, 58, 40], [30, 22, 18], 7], [186, 71, [205, 200, 192], [120, 116, 112], 13],
        ];
        const sunC = [1.0 + 0.05 * T, 0.97, 0.93 - 0.12 * T];
        for (const [hx, hy, bc, mc, off] of HORSES) {
          const t = time + off, c = Math.floor(t / 20), f = (t % 20) / 3, walking = f < 1;
          const dir = c % 2 ? -1 : 1, walked = Math.min(1, f) * 5;
          const x = hx + (c % 2 ? 5 - walked : walked) - 2.5;
          const up = walking || hash2(Math.floor(t / 4), off) > 0.7;
          const rows = (up ? UP : DOWN).slice();
          if (walking) rows[6] = STEP[Math.floor(t * 4) % 2];
          const col = { b: bc, h: bc, m: mc, t: mc, l: mc };
          rows.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch === ".") return;
            const cc = col[ch], ii = dir > 0 ? i : 10 - i;
            h.blk(Math.round(x * K) + ii * 2, Math.round(hy * K) - 14 + j * 2, 2,
              rgba([Math.min(255, cc[0] * sunC[0]), Math.min(255, cc[1] * sunC[1]), Math.min(255, cc[2] * sunC[2])]));
          }));
        }
      },
    },
  },

  5: {
    id: "lanikai",
    name: "Lanikai Beach",
    when: "before sunrise",
    clock: "5:45 a.m.",
    music: "music/breezy_hawaiian_groove.mp3",
    plates: ["predawn", "dawn", "sunrise"].map(n => `plates/lanikai_${n}.png`),
    nosun: "plates/lanikai_nosun.png",
    granola: 15,
    kevinAfter: "random",                   // pops up now and then in the deep water left of the sun path
    act: {
      sign: ["🪧", "Beach sign"], card: ["✉️", "Postcard"], pool: ["🐦", "Seabirds"],
      kevin: ["🐢", "Kevin"], shells: ["🐚", "Shells"], sun: ["🌅", "Sunrise"],
    },
    signLabel: "beach-sign",
    shellsTitle: "Shells on the sand",
    reflectTitle: "Sunrise reflection",
    reflectIcon: "🌅",
    photoAlt: "Sunrise over the Mokulua islands from Lanikai Beach",
    scene: {
      horizon: 23,
      isWater: (r, g, b) => b > r + 45 && g > r + 15,
      isGlint: (r, g, b) => (r + g + b) / 3 > 228 && b >= r - 4 && g <= b + 12,   // white foam only, not the sand, leaves or pale shallows
      shimmer: [0.02, 0.05, 0.92],          // soft painting → gentle, like Week 2
      glintWithSun: true,                   // the foam only twinkles once the sun is up
      sunFade: [0.9, 1],                    // the code sun rises into the gap, then dissolves into the painted glow
      risingSun: { x: 153, y: 19, rx: 5, ry: 4 },   // small and low: the sky is only 23 units tall
      stars: true,
      starMask: (x, y) => !(x < 148 && y > 4) && !(x > 157 && x < 207 && y > 9),   // not over the islands
      sparkle: [153, 28],                   // on the glitter path just below the gap
      spray: [],                            // a calm lagoon inside the reef
      whale: null,
      kevin: [72, 62],                      // deep open water left of the sun path, above the panels
      ledge: 168,                           // the sprites sit on the sand, bottom left
      player: 4, tavita: 18,
      shade: [[70, 74, 110], [190, 150, 165], [255, 245, 230]],   // before dawn → rosy dawn → sunrise
      birds: [[22, 24, 44], [60, 50, 72], [58, 70, 92]],
      // Signature animation: wedge-tailed shearwaters gliding low in long loops around the two islands on
      // stiff wings, banking as they turn (more of them as the morning goes on), and the glitter path
      // twinkling once the painted sun is up. (The turquoise brightening of the sea is in the plates.)
      draw(S, T, time, h) {
        const base = S.base, W = 1024, K = 3.2;
        // 1. Glitter on the sun path: single bright flecks (per screen pixel, not per cell) dim and flash,
        //    only once the painted sun shows. Starts below the glare right at the horizon.
        const fSun = S.sunAt(T);
        if (fSun > 0) for (let y = 96; y < 256; y++) for (let x = 420; x < 564; x++) {
          const o = (y * W + x) * 4, r = base[o], g = base[o + 1], b = base[o + 2];
          if (r + g + b < 640 || r < b) continue;                      // only the warm, bright flecks
          if (((hash2(x, y) + time * 1.1) % 1) >= 0.3) continue;
          const f = fSun * 0.18;
          h.px(x, y, [r - r * f, g - g * f, b - b * f * 0.7]);
        }
        // 2. Shearwaters: [centre x, centre y, loop radius x, radius y, speed, phase, from T].
        //    Low over the water around Moku Nui and Moku Iki; the far ones are smaller.
        const LOOPS = [
          [80, 19, 70, 5, 0.09, 0, 0], [182, 17, 32, 4, 0.13, 1.7, 0],
          [110, 24, 60, 4, 0.07, 3.1, 0.3], [200, 21, 45, 5, 0.1, 4.4, 0.55],
          [60, 26, 50, 5, 0.11, 2.2, 0.8],
        ];
        const bc = keyC(S.P.birds, T);
        for (const [cx, cy, rx, ry, sp, ph, from] of LOOPS) {
          if (T < from) continue;
          const ang = time * sp + ph, x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
          const bank = Math.sin(ang) * 1.5, s = y > 22 ? 2 : 1, span = y > 22 ? 5 : 4;   // wings tilt as they turn
          for (let i = -span; i <= span; i++) {
            const dy = Math.round(i * bank / span) + (Math.abs(i) === span ? 1 : 0);    // stiff, slightly drooped tips
            h.blk((x + i * s / K) * K, (y + dy * s / K) * K, s + 1, rgba(bc));
          }
        }
      },
    },
  },

  6: {
    id: "makapuu",
    name: "Makapuʻu Point",
    when: "morning",
    clock: "7:00 a.m.",
    music: "music/ocean_breeze.mp3",
    plates: ["hazy", "soft", "morning"].map(n => `plates/makapuu_${n}.png`),
    nosun: "plates/makapuu_nosun.png",
    granola: 16,
    kevinAfter: "random",                   // pops up now and then in the open sea near the foot of the cliffs
    act: {
      sign: ["🪧", "Trail sign"], card: ["✉️", "Postcard"], pool: ["🐋", "Whale watch"],
      kevin: ["🐢", "Kevin"], shells: ["🍃", "Leaves"], sun: ["☀️", "Morning"],
    },
    signLabel: "trail-sign",
    shellsTitle: "Leaves on the trail",
    reflectTitle: "Lookout reflection",
    reflectIcon: "☀️",
    photoAlt: "Morning at Makapuʻu Point: the lighthouse on the cliffs and Mānana Island offshore",
    scene: {
      horizon: 11,
      isWater: (r, g, b) => b > r + 45 && g > r + 15,
      isGlint: (r, g, b) => (r + g + b) / 3 > 215 && b >= r + 6,   // surf foam only (not the cream sun glitter or the lighthouse)
      shimmer: [0.02, 0.05, 0.9],           // bright, soft painting: gentle
      glintWithSun: false,                  // the surf twinkles all morning
      sunFade: [0.55, 1],                   // the sun's glow comes through as the haze lifts
      risingSun: null,
      stars: false,
      sparkle: [169, 16],                   // on the sheen just below the sun
      spray: [[196, 70], [214, 100], [236, 112], [200, 150]],   // surf at the foot of the cliffs (mostly under the panels)
      whale: null,                          // whales are drawn in draw()
      kevin: [168, 76],                     // open water left of the surf, above the panels
      ledge: 168,                           // the sprites sit on the flat dirt path, bottom left
      player: 4, tavita: 18,
      shade: [[200, 202, 208], [232, 230, 228], [255, 255, 255]],   // hazy → soft → clear morning
      birds: [[96, 98, 106], [84, 82, 86], [72, 66, 64]],           // dark shearwaters over the pale sea
      // Signature animation: humpback whales far below. Each whale surfaces on its own cycle (back + a
      // spout that drifts downwind); more whales join as the week goes on, so spouts get more frequent.
      // From mid-week some dive with a tail fluke; near the end one breaches.
      draw(S, T, time, h) {
        const base = S.base, W = 1024, K = 3.2;
        const mix = (x, y, c, a) => {       // blend screen pixel (x, y) of the plate toward colour c
          x |= 0; y |= 0; if (x < 0 || x >= W || y < 0 || y >= 576 || a <= 0) return;
          const o = (y * W + x) * 4, f = Math.min(1, a);
          h.px(x, y, [base[o] + (c[0] - base[o]) * f, base[o + 1] + (c[1] - base[o + 1]) * f, base[o + 2] + (c[2] - base[o + 2]) * f]);
        };
        const dot = (sx, sy, s, i, j, c, a) => { for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) mix(sx + i * s + dx, sy + j * s + dy, c, a); };
        const vis = 1 - 0.35 * (1 - T);     // the haze softens the whales early in the week
        const BODY = [34, 44, 58], BELLY = [210, 220, 226], FOAM = [240, 246, 250];

        // 1. Whales: [x, y] home (layout), progress T from which it is out, cycle length (s), time offset.
        const WHALES = [[60, 38, 0, 26, 3], [120, 28, 0.15, 31, 11], [32, 62, 0.35, 23, 7], [142, 52, 0.55, 28, 19], [92, 70, 0.75, 21, 2]];
        const FLUKE = ["x.....x", "xx...xx", ".xxxxx.", "...x...", "...x..."];
        WHALES.forEach(([hx, hy, from, per, off], n) => {
          if (T < from) return;
          const cyc = Math.floor((time + off) / per), t = (time + off) % per;
          const x = clamp(hx + (hash2(n, cyc) - 0.5) * 30, 6, 180), y = clamp(hy + (hash2(n + 7, cyc) - 0.5) * 8, 16, 78);
          const s = y < 45 ? 2 : 3, sx = Math.round(x * K), sy = Math.round(y * K);
          const a = vis * Math.min(1, (T - from) * 10 + 0.001);
          // back and dorsal hump
          if (t < 3.5) {
            const up = Math.min(1, t * 2, (3.5 - t) * 2) * a;
            for (let i = -4; i <= 4; i++) dot(sx, sy, s, i, 0, BODY, up);
            for (let i = -2; i <= 2; i++) dot(sx, sy, s, i, -1, BODY, up);
            dot(sx, sy, s, 1, -2, BODY, up);
            for (let i = -6; i <= 6; i += 2) if (hash2(i + n, Math.floor(time * 4)) > 0.5) dot(sx, sy, s, i, 1, FOAM, up * 0.7);
          }
          // spout: a bushy column that rises, spreads and drifts downwind (trade winds from the right)
          if (t > 0.2 && t < 2.8) {
            const st = t - 0.2, hgt = Math.min(1, st * 2.5) * 10, fade = Math.min(1, (2.6 - st) * 1.2);
            for (let j = 0; j < hgt; j++) {
              const w = Math.floor(j / 3) + (j > 5 ? 1 : 0), drift = -Math.round(st * (hgt - j) / 5);
              for (let i = -w; i <= w; i++)
                if (hash2(i + j * 5 + n, Math.floor(st * 8)) > 0.3 + st * 0.2) dot(sx - s, sy - (hgt - j + 2) * s, s, i + drift, 0, FOAM, a * fade * (0.6 + 0.4 * j / 10));
            }
          }
          // from mid-week, some dives show the tail fluke rising out of the water and sliding back in
          if (T >= 0.45 && hash2(n, cyc + 50) < 0.6 && t > 4 && t < 7.5) {
            const rows = Math.max(0, Math.min(5, Math.floor((t - 4) * 5), Math.floor((7.5 - t) * 5)));
            for (let j = 5 - rows; j < 5; j++) [...FLUKE[j]].forEach((ch, i) => {
              if (ch === "x") dot(sx + 3 * s, sy - (5 - j) * s + (5 - rows) * s, s, i - 3, j - 5, j === 0 ? BELLY : BODY, a);
            });
            for (let i = -4; i <= 4; i++) if (hash2(i, Math.floor(time * 5) + n) > 0.4) dot(sx + 3 * s, sy, s, i, 0, FOAM, a * 0.8);
          }
        });

        // 2. Near the end of the week, one whale breaches every 40 s: it leaps out in an arc (dark back, long
        //    white flippers), falls on its side, and leaves a splash ring.
        if (T >= 0.9) {
          const a = Math.min(1, (T - 0.9) * 12), t = (time + 1.2) % 40, s = 3, bx = 104 * K, by = 56 * K;
          if (t < 2.6) {
            const f = t / 2.6, lift = Math.sin(f * Math.PI) * 10 * s, ang = -1.4 + f * 1.25;   // nose up, then over onto its side
            const ca = Math.cos(ang), sa = Math.sin(ang), len = 7, cx = bx + f * 5 * s, cy = by - lift - len * s * 0.2;
            for (let k = -len; k <= len; k += 0.5) {             // half steps: no gaps in the rotated body
              const px = cx + ca * k * s, py = cy + sa * k * s, thick = k > len - 2 || k < -len + 3 ? 1 : 2;
              for (let w = -thick; w <= thick; w += 0.5) {
                const qx = px - sa * w * s, qy = py + ca * w * s;
                if (qy < by) dot(qx, qy, s, 0, 0, w > 0 ? [150, 156, 166] : BODY, a);   // pale grooved throat on one side
              }
              if (k === 3) for (let w = 3; w <= 7; w++) { const qx = px - sa * w * s - ca * (w - 3) * s * 0.6, qy = py + ca * w * s - sa * (w - 3) * s * 0.6; if (qy < by) dot(qx, qy, s, 0, 0, BELLY, a); }   // long white flipper
            }
            for (let i = -6; i <= 6; i++) for (let j = 0; j < 4; j++)                                   // water streaming off
              if (hash2(i * 7 + j, Math.floor(time * 6)) > 0.45 + j * 0.12) dot(bx + 2 * s, by, s, i, -j, FOAM, a * (1 - j * 0.2));
          } else if (t < 4.6) {
            const f = (t - 2.6) / 2, r = 3 + f * 9, fade = a * (1 - f);
            for (let k = 0; k < 40; k++) {
              const ang = k / 40 * Math.PI * 2, h2 = hash2(k, 3);
              const qx = bx + 4 * s + Math.cos(ang) * r * s * 1.4, qy = by - Math.max(0, -Math.sin(ang)) * r * s * (1.2 - f) * h2;
              dot(qx, qy, s, 0, 0, FOAM, fade);
            }
            for (let i = -8; i <= 8; i++) dot(bx + 4 * s, by, s, i, 0, FOAM, fade * 0.7);
          }
        }
      },
    },
  },
  7: {
    id: "pali",
    name: "Nuʻuanu Pali Lookout",
    when: "afternoon",
    clock: "3:30 p.m.",
    music: "music/sunset_breeze.mp3",
    plates: ["showers", "drizzle", "clearing"].map(n => `plates/pali_${n}.png`),
    nosun: "plates/pali_nosun.png",
    granola: 17,
    kevinAfter: "random",                   // a tiny turtle far below in Kāneʻohe Bay, now and then
    act: {
      sign: ["🪧", "Lookout sign"], card: ["✉️", "Postcard"], pool: ["🌬️", "Wind gusts"],
      kevin: ["🐢", "Kevin"], shells: ["🌧️", "Raindrops"], sun: ["🌈", "Rainbow"],
    },
    signLabel: "lookout-sign",
    shellsTitle: "Raindrops on the wall",
    reflectTitle: "Rainbow reflection",
    reflectIcon: "🌈",
    photoAlt: "A rainbow over the windward side from the Nuʻuanu Pali Lookout",
    scene: {
      horizon: 20,
      isWater: (r, g, b) => b > r + 45 && g > r + 15,
      isGlint: (r, g, b) => (r + g + b) / 3 > 215 && b >= r + 6,   // reef foam and sparkles in the bay
      shimmer: [0.02, 0.05, 0.9],           // bright, soft painting: gentle
      glintWithSun: true,                   // the bay only sparkles once the showers pass
      sunFade: [0.6, 1],                    // (no painted sun: it is behind the lookout)
      risingSun: null,
      stars: false,
      sparkle: [170, 70],                   // over the valley, under the rainbow
      spray: [],
      whale: null,
      kevin: [150, 48],                     // far below in the bay
      ledge: 168,                           // the sprites sit on the wet terrace, bottom left
      player: 4, tavita: 18,
      shade: [[150, 155, 165], [205, 208, 214], [255, 255, 255]],   // rain → drizzle → clear
      birds: [[52, 56, 62], [46, 50, 56], [40, 42, 48]],            // dark ʻiwa-like shapes over the green
      // Signature animation: low clouds race across the cliff tops on the trade wind, slanting rain that
      // thins as the week goes on, and a rainbow (with a faint second bow) over the valley at the end.
      draw(S, T, time, h) {
        const base = S.base, W = 1024, K = 3.2;
        const mix = (x, y, c, a) => {       // blend screen pixel (x, y) of the plate toward colour c
          x |= 0; y |= 0; if (x < 0 || x >= W || y < 0 || y >= 576 || a <= 0) return;
          const o = (y * W + x) * 4, f = Math.min(1, a);
          h.px(x, y, [base[o] + (c[0] - base[o]) * f, base[o + 1] + (c[1] - base[o + 1]) * f, base[o + 2] + (c[2] - base[o + 2]) * f]);
        };

        // 1. Rainbow: centred on the point opposite the sun (below the frame), so only the top of the arc
        //    shows; it stands over the valley and fades out toward the forest in front of the lookout.
        const rb = Math.max(0, Math.min(1, (T - 0.72) / 0.28));
        if (rb > 0) {
          const cx = 540, cy = 600, R = 470, band = 5;
          const BOW = [[236, 70, 64], [246, 150, 56], [250, 226, 88], [104, 206, 104], [76, 140, 240], [140, 96, 220]];
          const arc = (r0, cols, a0) => {
            const r1 = r0 + cols.length * band;
            for (let y = Math.max(0, cy - r1); y < 420; y++) {
              const dy = cy - y, fade = a0 * rb * Math.min(1, (420 - y) / 150) * (0.85 + 0.15 * Math.sin(time * 0.8 + y * 0.02));
              const xo = Math.sqrt(Math.max(0, r1 * r1 - dy * dy)), xi = dy < r0 ? Math.sqrt(r0 * r0 - dy * dy) : 0;
              for (const s of [-1, 1]) for (let x = Math.floor(cx + s * xi); s > 0 ? x <= cx + xo : x >= cx - xo; x += s) {
                const d = Math.hypot((x & ~1) - cx, (y & ~1) - cy);   // 2-px steps keep the bands chunky
                const k = Math.floor((r1 - d) / band);
                if (k >= 0 && k < cols.length) mix(x, y, cols[k], fade);
              }
            }
          };
          arc(R, BOW, 0.5);
          arc(R + 70, [...BOW].reverse(), 0.16);   // the fainter second bow, colours reversed
        }

        // 2. Low clouds racing across the cliff tops (right to left, with the trade wind). Thick grey
        //    at the start; a few white wisps still stream over the ridges at the end.
        const cover = Math.max(0.12, 1 - T * 1.1), grey = 150 + 100 * T;
        for (let n = 0; n < 14; n++) {
          const w = 50 + hash2(n, 9) * 70, ch = 7 + hash2(n, 3) * 8;
          const cy = 2 + hash2(n, 4) * (n < 9 ? 26 : 50), speed = 9 + hash2(n, 7) * 8;
          const cx = 380 - ((hash2(n, 5) * 480 + time * speed) % 480);
          const a = cover * (0.45 + 0.35 * hash2(n, 6)) * (n < 9 ? 1 : 1 - T);
          if (a < 0.02) continue;
          const x0 = Math.floor((cx - w / 2) * K), x1 = Math.ceil((cx + w / 2) * K), y0 = Math.floor((cy - ch) * K), y1 = Math.ceil((cy + ch) * K);
          for (let y = Math.max(0, y0); y < Math.min(360, y1); y += 2) for (let x = Math.max(0, x0); x < Math.min(W, x1); x += 2) {
            const dx = (x / K - cx) / (w / 2), dy = (y / K - cy) / ch, top = 0.75 + 0.25 * Math.sin(x / K * 0.3 + n);
            const d = dx * dx + (dy < 0 ? (dy / top) ** 2 : dy * dy);
            if (d < 1 && hash2(x >> 2, (y >> 2) + n) > d * 0.9) {
              const c = [grey, grey + 3, grey + 8], f = a * (1 - d * d);
              mix(x, y, c, f); mix(x + 1, y, c, f); mix(x, y + 1, c, f); mix(x + 1, y + 1, c, f);
            }
          }
        }

        // 3. Rain: slanting streaks blown in from the sea, heavy at first, gone once the showers pass.
        const rain = Math.max(0, 1 - T / 0.7);
        if (rain > 0) {
          const drops = Math.round(380 * rain), c = [196, 204, 214];
          for (let n = 0; n < drops; n++) {
            const sp = 520 + hash2(n, 1) * 220, len = 10 + hash2(n, 2) * 8;
            const y = (hash2(n, 3) * 700 + time * sp) % 700 - 60, x = (hash2(n, 4) * 1200 - y * 0.35 - time * 60) % 1200;
            const xx = x < 0 ? x + 1200 : x;
            for (let j = 0; j < len; j++) mix(xx - j * 0.35, y + j, c, 0.36 * (1 - j / len) + 0.12);
          }
        }
      },
    },
  },
};
