// Hawaiʻi Postcards — one place per week (places.js), the same seven activities each time.
// The whole week is one linear script of awaits: say() a line, open a panel, wait for an answer.
// Every answer nudges the scene forward (Scene.setTarget); progress saves after each step, per week.
// Script lines can be overridden per week: "wk2.sign.intro" replaces "sign.intro" in Week 2.
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/’/g, "'");

const STAGES = ["intro", "sign", "card", "pool", "kevin", "shells", "sun", "end"];
const WEEK_PREF = "hawaii-postcards-week", PROFILE_KEY = "hawaii-postcards-profile";
const saveKey = n => `hawaii-postcards-week${n}`;
const okinaHTML = t => esc(t).replace(/ʻ/g, '<span class="okina">ʻ</span>');
const PRACTICE_KEYS = ["sign", "pick", "type", "pool", "kevin"];     // a miss in any of these → a shell
const STEP = 0.95 / 50;                                              // sunrise progress per item
const SPEAKERS = {
  TAVITA: { name: "Tavita", img: "portrait_tavita", emoji: "🧑🏽" },
  KEVIN: { name: "Kevin", img: "portrait_kevin", emoji: "🐢" },
  NARRATOR: { name: "", img: null, emoji: "" },
};
const GOALS = [
  { id: "sign8", text: () => `Get at least 8 of 10 ${PLACE.signLabel} words right on the first try`, check: () => week().filter(w => res(w).sign).length >= 8 },
  { id: "shells3", text: () => `Finish with 3 ${PLACE.act.shells[1].toLowerCase()} or fewer to collect`, check: () => missedWords().length <= 3 },
  { id: "use3", text: () => "Use 3 of my new words in class or in my writing this week", check: null },
];

// ---------------------------------------------------------------- the week being played
let WEEK, PLACE, WORDS;
function setWeek(n) {
  WEEK = n; PLACE = PLACES[n]; WORDS = WEEK_WORDS[n];
  try { localStorage.setItem(WEEK_PREF, n); } catch { /* per-browser convenience only */ }
  S = loadSave() || fresh();
  if (S.major && !WEEKS[S.major]) S = fresh();
}
const weekDone = n => { try { const s = JSON.parse(localStorage.getItem(saveKey(n))); return !!(s && s.stage === STAGES.length - 1); } catch { return false; } };
function firstWeek() {
  let n = 0;
  try { n = parseInt(localStorage.getItem(WEEK_PREF), 10); } catch { /* none saved */ }
  return BUILT.includes(n) ? n : BUILT.find(k => !weekDone(k)) || BUILT[0];
}
// Line ids: a week-specific version wins ("wk2.x" over "x"). Per-word lines: w.<word>.x in Week 1, w2.<word>.x in Week 2.
const L = id => (LINES[`wk${WEEK}.${id}`] ? `wk${WEEK}.${id}` : id);
function wl(w, kind) {
  const own = `${WEEK === 1 ? "w" : "w" + WEEK}.${w}.${kind}`;
  return LINES[own] ? own : `w.${w}.${kind}`;
}
// A numbered run of lines (intro.01, intro.02 …), the week's own run if it has one.
function run(prefix) {
  const mine = Object.keys(LINES).filter(k => k.startsWith(`wk${WEEK}.${prefix}.`) && /\.\d+$/.test(k));
  return (mine.length ? mine : Object.keys(LINES).filter(k => k.startsWith(prefix + ".") && /\.\d+$/.test(k))).sort();
}

// ---------------------------------------------------------------- save
// Name and major carry over from week to week (the profile); everything else is per week.
function profile() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; } }
function fresh(keep = profile()) {
  return { name: keep.name || "", major: keep.major || null, goal: keep.goal || null, stage: 0, T: 0.02, granola: PLACE.granola, res: {}, conf: {} };
}
function loadSave() { try { const s = JSON.parse(localStorage.getItem(saveKey(WEEK))); return s && s.res ? s : null; } catch { return null; } }
function save() {
  try {
    localStorage.setItem(saveKey(WEEK), JSON.stringify(S));
    if (S.major) localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: S.name, major: S.major }));
  } catch { /* no storage: still playable */ }
}
let S = null;

const week = () => WEEKS[S.major][WEEK - 1];
const res = w => (S.res[w] = S.res[w] || {});
function record(w, key, ok) { if (res(w)[key] === undefined) res(w)[key] = ok; save(); }
const missedWords = () => week().filter(w => PRACTICE_KEYS.some(k => res(w)[k] === false));
const def = w => WORDS[w].def;

// ---------------------------------------------------------------- scene loop
const canvas = $("#scene"), cctx = canvas.getContext("2d");
const frame = cctx.createImageData(1024, 576), fbuf = new Uint32Array(frame.data.buffer);
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!Scene.frozen) { Scene.step(dt); Scene.render(fbuf); cctx.putImageData(frame, 0, 0); }   // frozen while a GIF records
  requestAnimationFrame(loop);
}

function advance(ok) {
  S.T = Math.min(0.97, S.T + (ok ? STEP : STEP * 0.5));
  Scene.setTarget(S.T);
  if (ok) Scene.celebrate();
  Sound.chime(ok);
  save();
}

// ---------------------------------------------------------------- input plumbing
let keyHook = null;
const isField = el => el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA");
document.addEventListener("keydown", e => {
  if (!isField(e.target)) {
    if (e.key === "m" || e.key === "M") { cycleSound(); return; }
    if ((e.key === "j" || e.key === "J") && S.major && $("#title").hidden) { toggleJournal(); return; }
    if (e.key === "Escape" && !$("#journal").hidden) { toggleJournal(false); return; }
  }
  if (!$("#journal").hidden) return;
  if (!isField(e.target) && (e.key === "h" || e.key === "H") && !$("#panel").hidden) { minimizePanel(!panelMin()); return; }
  if (panelMin()) return;
  if (keyHook) keyHook(e);
});
// Sound menu: music+ambient+voices / no music / voices only / off. M cycles; the choice is remembered.
const SOUND_ICONS = { all: "🔊", nomusic: "🌊", voice: "🗣️", off: "🔇" };
function setSound(mode) {
  Sound.setMode(mode);
  try { localStorage.setItem("hawaii-postcards-sound", mode); } catch { /* per-browser convenience only */ }
  const b = $("#btnSound");
  b.textContent = SOUND_ICONS[mode];
  b.title = `Sound: ${SOUND_LABELS[mode]} (M)`;
  $("#soundMenu").innerHTML = SOUND_MODES.map(m =>
    `<button type="button" role="menuitemradio" aria-checked="${m === mode}" data-m="${m}">${SOUND_ICONS[m]} ${SOUND_LABELS[m]}</button>`).join("");
  $("#soundMenu").querySelectorAll("button").forEach(x => (x.onclick = e => { e.stopPropagation(); setSound(x.dataset.m); toggleSoundMenu(false); }));
}
function cycleSound() { setSound(SOUND_MODES[(SOUND_MODES.indexOf(Sound.mode) + 1) % SOUND_MODES.length]); }
function toggleSoundMenu(open) {
  const m = $("#soundMenu"), show = open !== undefined ? open : m.hidden;
  m.hidden = !show; $("#btnSound").setAttribute("aria-expanded", show);
}
$("#btnSound").onclick = e => { e.stopPropagation(); toggleSoundMenu(); };
document.addEventListener("click", () => toggleSoundMenu(false));
try { const saved = localStorage.getItem("hawaii-postcards-sound"); if (SOUND_MODES.includes(saved)) Sound.mode = saved; } catch { /* default: all */ }
setSound(Sound.mode);
$("#btnJournal").onclick = () => toggleJournal();

// ---------------------------------------------------------------- speech: dialogue, bubbles, voice chains
let chainGen = 0;
function faceHTML(speaker) {
  const sp = SPEAKERS[speaker] || SPEAKERS.NARRATOR;
  const src = sp.img && IMAGES[sp.img];
  return src ? `<img src="${src}" alt="${sp.name}">` : `<span style="font-size:3em">${sp.emoji}</span>`;
}

function say(id) {
  id = L(id);
  const line = LINES[id];
  if (!line) return Promise.resolve();
  chainGen++;
  $("#panel").hidden = true; $("#bubble").hidden = true; $("#panelTab").hidden = true;
  const box = $("#dialog"), sp = SPEAKERS[line.sp] || SPEAKERS.NARRATOR, face = $(".face", box);
  face.classList.toggle("none", !sp.emoji && !sp.img);
  face.innerHTML = faceHTML(line.sp);
  $(".who", box).textContent = sp.name;
  const textEl = $(".text", box);
  textEl.textContent = "";
  box.hidden = false;
  Sound.say(id);
  return new Promise(resolve => {
    let i = 0, full = false;
    const tick = setInterval(() => { i += 2; textEl.textContent = line.t.slice(0, i); if (i >= line.t.length) { clearInterval(tick); full = true; } }, 24);
    const adv = () => {
      if (!full) { clearInterval(tick); textEl.textContent = line.t; full = true; return; }
      box.onclick = null; keyHook = null; Sound.stopVoice(); resolve();
    };
    box.onclick = adv;
    keyHook = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); adv(); } };
  });
}
async function sayAll(...ids) { for (const id of ids) await say(id); $("#dialog").hidden = true; }

// A quick reaction in a speech bubble, then (optionally) the narrator reading the sentence.
async function react(prefix, then) {
  const ids = run(prefix);
  const id = ids.length ? pick(ids) : null;
  const gen = ++chainGen;
  if (id) {
    const b = $("#bubble"), line = LINES[id];
    const sp = SPEAKERS[line.sp] || SPEAKERS.NARRATOR, src = sp.img && IMAGES[sp.img];
    b.innerHTML = (src ? `<img src="${src}" alt="">` : `<span class="emo">${sp.emoji}</span>`) + `<span>${esc(line.t)}</span>`;
    b.hidden = false;
    const hide = setTimeout(() => { if (gen === chainGen) b.hidden = true; }, 3500);
    await Sound.say(id);
    if (gen !== chainGen) { clearTimeout(hide); return; }
  }
  if (then && gen === chainGen) await Sound.say(then);
}
function quiet() { chainGen++; Sound.stopVoice(); $("#bubble").hidden = true; }

// ---------------------------------------------------------------- panels and widgets
function panel(html) {
  $("#dialog").hidden = true;
  const p = $("#panel");
  for (const k of Object.keys(p.dataset)) delete p.dataset[k];     // the element is reused
  p.className = "";
  p.innerHTML = html; p.hidden = false; p.scrollTop = 0;
  $("#panelTab").hidden = true;
  const h2 = $("h2", p);
  if (h2) {
    h2.insertAdjacentHTML("beforeend", `<button type="button" class="mini" title="Hide the task to enjoy the view (H)">▾ Hide</button>`);
    $(".mini", h2).onclick = () => minimizePanel(true);
  }
  return p;
}

// Tuck the task away to enjoy the scenery; a small tab (or H) brings it back.
const panelMin = () => $("#panel").classList.contains("min") && !$("#panel").hidden;
function minimizePanel(min) {
  const p = $("#panel");
  if (min) {
    p.dataset.focus = document.activeElement && p.contains(document.activeElement) && document.activeElement.tagName === "INPUT" ? "1" : "";
    if (document.activeElement) document.activeElement.blur();
  }
  p.classList.toggle("min", min);
  $("#panelTab").hidden = !min;
  $("#bubble").hidden = true;
  if (!min) {
    const inp = p.dataset.focus && p.querySelector("input:not([readonly])");
    setTimeout(() => (inp || p.querySelector(".mini")).focus(), 320);
  }
}
$("#panelTab").onclick = () => minimizePanel(false);
const header = (icon, title, i, n) => `<h2><span>${icon}</span><span>${esc(title)}</span>${n ? `<span class="count">${i + 1} / ${n}</span>` : ""}</h2>`;

function choose(el, opts, label = o => o) {
  return new Promise(resolve => {
    el.innerHTML = opts.map((o, i) => `<button type="button" data-v="${esc(o)}"><kbd>${i + 1}</kbd>${esc(label(o))}</button>`).join("");
    const btns = [...el.children];
    const done = i => { keyHook = null; btns.forEach(b => (b.disabled = true)); resolve({ value: opts[i], btns, i }); };
    btns.forEach((b, i) => (b.onclick = () => done(i)));
    keyHook = e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= opts.length) done(n - 1); };
  });
}
function markChoice(r, correct) {
  if (r.value !== correct) r.btns[r.i].classList.add("wrong");
  const right = r.btns.find(b => b.dataset.v === correct);
  if (right) right.classList.add("right");
  r.btns.forEach(b => { if (!b.classList.contains("right") && !b.classList.contains("wrong")) b.classList.add("dim"); });
  const ask = r.btns[0].closest("#panel")?.querySelector(".ask");
  if (ask) ask.hidden = true;
}
function nextButton(el, label = "Next ▶") {
  return new Promise(resolve => {
    const row = document.createElement("div"); row.className = "row";
    row.innerHTML = `<span class="grow"></span><button type="button" class="primary">${label}</button>`;
    el.appendChild(row);
    const b = $("button", row);
    const go = () => { keyHook = null; quiet(); resolve(); };
    b.onclick = go;
    keyHook = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    setTimeout(() => b.focus({ preventScroll: false }), 50);
  });
}

// Word options: the answer plus distractors from the same week, same part of speech first.
function options(w, n = 4) {
  const others = week().filter(x => x !== w);
  const same = shuffle(others.filter(x => WORDS[x].pos === WORDS[w].pos));
  const rest = shuffle(others.filter(x => WORDS[x].pos !== WORDS[w].pos));
  return shuffle([w, ...same.concat(rest).slice(0, n - 1)]);
}
const blankOut = (text, w) => esc(text).replace(new RegExp(`\\b${w}\\b`, "i"), '<span class="blank">&nbsp;?&nbsp;</span>');
const highlight = (text, w) => esc(text).replace(new RegExp(`\\b${w}\\b`, "i"), m => `<span class="hl">${m}</span>`);
const explain = (chosen, w) =>
  `<b>${esc(chosen)}</b> means “${esc(def(chosen))}.”<br>The answer is <b>${esc(w)}</b>: ${esc(def(w))}.`;

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function checkTyped(value, target) {
  const v = norm(value), t = norm(target);
  if (v === t) return "ok";
  if (t.length >= 6 && lev(v, t) === 1) return "close";
  return "no";
}
const hintPattern = (t, shown) => [...t].map((c, i) => (i < shown ? c : "_")).join(" ");

// Typing loop: resolves {firstTry} once the target is typed correctly. After `reveal` misses,
// the whole word is shown, but the player still types it.
function typeLoop({ input, button, hintEl, feedbackEl, target, shown = 1, reveal = 3, noPrefix = "shell.no" }) {
  return new Promise(resolve => {
    let tries = 0;
    const show = () => { if (hintEl) hintEl.textContent = shown > 0 ? hintPattern(target, Math.min(shown, target.length)) : ""; };
    show();
    const check = () => {
      if (!input.value.trim()) return;
      const r = checkTyped(input.value, target);
      if (r !== "no") {
        input.classList.remove("no"); input.classList.add("ok"); input.readOnly = true; button.disabled = true;
        input.value = target; keyHook = null;
        if (feedbackEl && r === "close") { feedbackEl.hidden = false; feedbackEl.className = "feedback good"; feedbackEl.innerHTML = `Almost perfect! Watch the spelling: <b>${esc(target)}</b>`; }
        resolve({ firstTry: tries === 0 });
        return;
      }
      tries++;
      input.classList.add("no");
      shown = tries >= reveal ? target.length : shown + 1;
      show();
      if (feedbackEl) {
        feedbackEl.hidden = false; feedbackEl.className = "feedback bad";
        feedbackEl.innerHTML = tries >= reveal ? `The word is <b>${esc(target)}</b>. Type it in to keep it.` : "Not quite. Here's another letter.";
      }
      react(noPrefix);
      input.select();
    };
    button.onclick = check;
    input.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); check(); } };
    input.oninput = () => input.classList.remove("no");
    setTimeout(() => input.focus(), 60);
  });
}

async function mynah(lineId, n) {
  Scene.stealSnack();
  S.granola = Math.max(0, S.granola - n); save();
  $("#panel").hidden = true; $("#dialog").hidden = true;
  await sleep(1700);
  const b = $("#bubble");
  b.innerHTML = (IMAGES.portrait_mynah ? `<img src="${IMAGES.portrait_mynah}" alt="">` : `<span class="emo">🐦</span>`) + `<span>SQUAWK! 🍫</span>`;
  b.hidden = false;
  Sound.chime(false);
  await sleep(1400);
  b.hidden = true;
  $("#granola b").textContent = S.granola;
  await say(lineId);
}

// ---------------------------------------------------------------- stations
const STATIONS = {
  async intro() {
    const f = $("#fade");
    f.innerHTML = `<div class="caption">${esc(PLACE.clock)}</div>`; f.classList.add("on");
    await sleep(1800);
    f.classList.remove("on");
    await sleep(600);
    await sayAll(...run("intro"));
  },

  async sign() {
    await sayAll("sign.intro");
    const ws = shuffle(week());
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i], e = WORDS[w];
      if (i === 5) await mynah("sign.mynah", 1);
      const guide = e.where === "guide";
      const p = panel(header(guide ? "📘" : PLACE.act.sign[0], guide ? "Field guide note" : PLACE.act.sign[1], i, ws.length) +
        `<div class="card ${e.where}">${blankOut(e.sign, w)}</div><p class="ask">Which word fills the gap?</p>
         <div class="opts"></div><div class="feedback" hidden></div>`);
      p.dataset.word = w;
      const r = await choose($(".opts", p), options(w));
      const ok = r.value === w;
      markChoice(r, w); record(w, "sign", ok); advance(ok);
      $(".card", p).innerHTML = highlight(e.sign, w);
      const fb = $(".feedback", p);
      fb.hidden = false; fb.className = "feedback " + (ok ? "good" : "bad");
      fb.innerHTML = ok ? `<b>${esc(w)}</b>: ${esc(def(w))}.` : explain(r.value, w);
      react(ok ? "sign.ok" : "sign.no", wl(w, "sign"));
      await nextButton(p);
    }
    await sayAll("sign.done");
  },

  async card() {
    await sayAll("card.intro", "card.how");
    const ws = shuffle(week());
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i], e = WORDS[w];
      if (i === 4) await mynah("card.mynah", 1);
      const [before, casual, after] = e.postcard.split(/\[|\]/);
      const toks = e.form.split(" "), at = Math.max(0, toks.findIndex(t => t.toLowerCase().startsWith(w.slice(0, 4))));
      const prefix = toks.slice(0, at).join(" "), target = toks[at], suffix = toks.slice(at + 1).join(" ");
      const p = panel(header("✉️", "Postcard → field report", i, ws.length) +
        `<div class="card postcard">${esc(before)}<span class="casual">${esc(casual)}</span>${esc(after)}</div>
         <p class="ask">Which academic word should replace “${esc(casual)}”?</p><div class="opts"></div>
         <div class="feedback" hidden></div>`);
      p.dataset.word = w;
      const r = await choose($(".opts", p), options(w));
      const picked = r.value === w;
      markChoice(r, w); record(w, "pick", picked);
      if (!picked) {
        const fb = $(".feedback", p); fb.hidden = false; fb.className = "feedback bad"; fb.innerHTML = explain(r.value, w);
        react("card.no");
        await nextButton(p, "Type it ▶");
      } else Sound.chime(true);
      // Step 2: type the exact form into the sentence, with a first-letter hint.
      const p2 = panel(header("✉️", "Postcard → field report", i, ws.length) +
        `<div class="card postcard">${esc(before)}${prefix ? esc(prefix) + " " : ""}<input type="text" class="inline-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="academic word">${suffix ? " " + esc(suffix) : ""}${esc(after)}</div>
         <div class="row"><span class="hintline"></span><span class="grow"></span><button type="button">Check</button></div>
         <div class="feedback" hidden></div>`);
      p2.dataset.word = w; p2.dataset.target = target;
      const t = await typeLoop({ input: $("input", p2), button: $(".row button", p2), hintEl: $(".hintline", p2), feedbackEl: $(".feedback", p2), target, noPrefix: "card.no" });
      record(w, "type", t.firstTry); advance(picked && t.firstTry);
      $(".card", p2).innerHTML = highlight(e.postcard.replace(/\[[^\]]+\]/, e.form), w.slice(0, 4) + "\\w*");
      react(picked && t.firstTry ? "card.ok" : "card.no", wl(w, "report"));
      await nextButton(p2);
    }
    await sayAll("card.done");
  },

  async pool() {
    await sayAll("pool.intro", "pool.how");
    const ws = shuffle(week());
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i], sets = WORDS[w].coll, answer = sets[0][0];
      if (i === 6) await mynah("pool.mynah", 2);
      const p = panel(header(PLACE.act.pool[0], PLACE.act.pool[1], i, ws.length) +
        `<div class="card pool">Which pair do writers really use with <span class="hl">${esc(w)}</span>?</div>
         <div class="opts"></div><div class="feedback" hidden></div>`);
      p.dataset.word = w; p.dataset.answer = answer;
      const r = await choose($(".opts", p), shuffle(sets.map(s => s[0])));
      const ok = r.value === answer;
      markChoice(r, answer); record(w, "pool", ok); advance(ok);
      const max = Math.max(...sets.map(s => s[1]));
      const fb = $(".feedback", p); fb.hidden = false; fb.className = "feedback " + (ok ? "good" : "bad");
      fb.innerHTML = `<div class="bars">${sets.map(([ph, f], k) => `<div class="bar${k === 0 ? " top" : ""}"><span>${esc(ph)}</span>
          <span class="track"><span class="fill" style="width:0%" data-w="${Math.max(0.6, (f / max) * 100)}"></span></span>
          <span class="num">${f >= 10 ? Math.round(f).toLocaleString() : f}</span></div>`).join("")}</div>
        <p class="note">Times per billion words in Google Books (2015–2019).</p>`;
      requestAnimationFrame(() => fb.querySelectorAll(".fill").forEach(el => (el.style.width = el.dataset.w + "%")));
      react(ok ? "pool.ok" : "pool.no");
      await nextButton(p);
    }
    await sayAll("pool.done");
  },

  async kevin() {
    Scene.kevinMode = "visible";
    await sleep(900);
    await sayAll("kevin.hello", "kevin.tavita", "kevin.how");
    const ws = shuffle(week()), CONF = ["I'm sure", "I think so", "Just guessing"];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      const p = panel(header("🐢", "Kevin's question", i, ws.length) +
        `<div class="card kevin">“${esc(def(w)[0].toUpperCase() + def(w).slice(1))}.”</div>
         <p class="ask">How sure are you that you know this word?</p><div class="opts conf"></div>`);
      p.dataset.word = w;
      Sound.say(wl(w, "def"));
      const c = await choose($(".opts", p), CONF);
      S.conf[w] = c.i; save();
      $(".ask", p).textContent = "Which word is it?";
      c.btns.forEach(b => b.remove());
      $(".opts", p).classList.remove("conf");
      const r = await choose($(".opts", p), options(w));
      const ok = r.value === w;
      markChoice(r, w); record(w, "kevin", ok); advance(ok);
      p.insertAdjacentHTML("beforeend", `<div class="feedback ${ok ? "good" : "bad"}">${ok ? `<b>${esc(w)}</b>: ${esc(def(w))}.` : explain(r.value, w)}</div>`);
      react(ok ? "kevin.ok" : "kevin.no");
      await nextButton(p);
    }
    // Calibration: were they sure about the right words?
    const kv = w => res(w).kevin;
    const buckets = [
      ["Sure, and right", week().filter(w => S.conf[w] === 0 && kv(w))],
      ["Sure, but missed", week().filter(w => S.conf[w] === 0 && !kv(w))],
      ["Not sure, but right", week().filter(w => S.conf[w] > 0 && kv(w))],
      ["Not sure, and missed", week().filter(w => S.conf[w] > 0 && !kv(w))],
    ];
    const line = L(buckets[1][1].length >= 2 ? "kevin.calib.over" : buckets[2][1].length >= 3 ? "kevin.calib.under" : "kevin.calib.good");
    const p = panel(header("🐢", "How well do you know what you know?") +
      `<table class="calib">${buckets.map(([k, ws]) => `<tr><th>${k}</th><td>${ws.map(esc).join(", ") || "—"}</td></tr>`).join("")}</table>`);
    Sound.say(line);
    p.insertAdjacentHTML("beforeend", `<div class="feedback">${esc(LINES[line].t)}</div>`);
    await nextButton(p);
    await sayAll("kevin.bye");
    Scene.kevinMode = PLACE.kevinAfter;
  },

  async shells() {
    const ws = missedWords();
    if (!ws.length) { await sayAll("shell.none"); return; }
    await sayAll("shell.intro", "shell.how");
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      const p = panel(header(PLACE.act.shells[0], PLACE.shellsTitle, i, ws.length) +
        `<div class="card shell">${PLACE.act.shells[0]} “${esc(def(w)[0].toUpperCase() + def(w).slice(1))}.”</div>
         <div class="row"><input type="text" class="typein" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="word">
         <span class="hintline"></span><span class="grow"></span><button type="button">Check</button></div>
         <div class="feedback" hidden></div>`);
      p.dataset.word = w;
      const t = await typeLoop({ input: $("input", p), button: $(".row button", p), hintEl: $(".hintline", p), feedbackEl: $(".feedback", p), target: w, shown: 0, noPrefix: "shell.no" });
      record(w, "shell", t.firstTry); advance(t.firstTry);
      react("shell.ok");
      await nextButton(p);
    }
    await sayAll("shell.done");
  },

  async sun() {
    await sayAll("sun.intro", "sun.how");
    const ws = shuffle(week());
    const p = panel(header(PLACE.reflectIcon, PLACE.reflectTitle) +
      `<p class="ask">Type one of this week's words in each blank. 🐢 asks Kevin for a hint.</p>
       <div class="para">${ws.map(w => esc(WORDS[w].reflect).replace(new RegExp(`\\b${w}\\b`, "i"),
         `<input type="text" class="inline-in" data-w="${w}" style="width:${(w.length * 0.62 + 1).toFixed(1)}em" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="blank"><button type="button" class="hintbtn" data-w="${w}" title="Ask Kevin">🐢</button>`)).join(" ")}</div>
       <div class="row"><span class="note grow"></span><button type="button" class="primary check">Check</button></div>`);
    p.dataset.words = ws.join(",");
    p.classList.add("tall");
    const inputs = [...p.querySelectorAll("input")], hinted = new Set();
    p.querySelectorAll(".hintbtn").forEach(b => (b.onclick = async () => {
      const w = b.dataset.w; b.disabled = true; hinted.add(w);
      await Sound.say(L("sun.hint.1")); await sleep(1500);                  // Kevin is slow.
      const inp = inputs.find(x => x.dataset.w === w);
      if (!inp.readOnly) { inp.placeholder = w[0] + "…"; Sound.say(L("sun.hint.2")); inp.focus(); }
    }));
    let checks = 0, gag = false;
    await new Promise(resolve => {
      const check = async () => {
        checks++;
        for (const inp of inputs) {
          if (inp.readOnly || !inp.value.trim()) { if (!inp.readOnly) inp.classList.add("no"); continue; }
          const w = inp.dataset.w, r = checkTyped(inp.value, w);
          if (r !== "no") {
            inp.value = w; inp.readOnly = true; inp.classList.remove("no"); inp.classList.add("ok");
            const first = checks === 1 && !hinted.has(w);
            record(w, "sun", first); advance(true);
          } else inp.classList.add("no");
        }
        const left = inputs.filter(x => !x.readOnly);
        if (!left.length) { resolve(); return; }
        if (checks >= 3) {
          left.forEach(inp => { inp.value = inp.dataset.w; inp.readOnly = true; inp.classList.add("no"); record(inp.dataset.w, "sun", false); });
          $(".note", p).textContent = "Here are the last words. Read the paragraph once more.";
          $(".check", p).textContent = "Continue ▶";
          $(".check", p).onclick = resolve;
          return;
        }
        $(".note", p).textContent = `${left.length} blank${left.length > 1 ? "s" : ""} to go. Try again, or ask Kevin.`;
        react("sun.no");
        if (!gag) { gag = true; Scene.stealSnack(); S.granola = Math.max(0, S.granola - 1); setTimeout(() => ($("#granola b").textContent = S.granola), 2600); }
        left[0].focus();
      };
      $(".check", p).onclick = check;
      inputs.forEach((inp, k) => (inp.onkeydown = e => {
        if (e.key === "Enter") { e.preventDefault(); const nxt = inputs.slice(k + 1).find(x => !x.readOnly); nxt ? nxt.focus() : check(); }
      }));
      setTimeout(() => inputs[0].focus(), 60);
    });
    quiet();
    await sayAll("sun.done");
    Scene.setTarget(1); S.T = 1; save();
    $("#hud").hidden = true;
    await sleep(6500);                                                         // just watch it
    $("#hud").hidden = false;
  },

  async end() {
    Scene.setTarget(1); Scene.tavitaAsleep = true;
    const goal = GOALS.find(g => g.id === S.goal);
    await sayAll("end.01", "end.02", goal && goal.check ? (goal.check() ? "end.goal.yes" : "end.goal.check") : "end.goal.check");
    await sleep(300);
    showPostcard();
  },
};

// ---------------------------------------------------------------- journal & postcard
function wordStatus(w) {
  const r = res(w), vals = PRACTICE_KEYS.map(k => r[k]).filter(v => v !== undefined);
  if (!vals.length) return "";
  return vals.every(Boolean) ? "ok" : "miss";
}
function toggleJournal(force) {
  const j = $("#journal"), open = force !== undefined ? force : j.hidden;
  if (!open) { j.hidden = true; return; }
  j.innerHTML = `<h2>📔 Week ${WEEK} words · ${esc(S.major)}<button type="button">Close ✕</button></h2>
    <dl>${week().map(w => {
      const st = wordStatus(w);
      return `<dt>${esc(w)} <small>${esc(WORDS[w].pos)}</small>${st === "ok" ? " ✅" : st === "miss" ? " " + PLACE.act.shells[0] : ""}</dt><dd>${esc(def(w))}</dd>`;
    }).join("")}</dl><p class="note" style="color:#7a6e66">✅ right every time so far · ${PLACE.act.shells[0]} missed at least once — worth reviewing</p>`;
  j.hidden = false;
  $("button", j).onclick = () => (j.hidden = true);
}

function showPostcard() {
  const photo = canvas.toDataURL("image/jpeg", 0.88);
  if (!S.doneAt) { S.doneAt = new Date().toISOString(); save(); }
  const ok = k => week().filter(w => res(w)[k]).length;
  const goal = GOALS.find(g => g.id === S.goal);
  const goalMet = goal && goal.check ? goal.check() : null;
  const lines = shuffle(week()).slice(0, 3).map(w => esc(WORDS[w].postcard.replace(/\[[^\]]+\]/, WORDS[w].form)));
  const A = PLACE.act, next = BUILT.includes(WEEK + 1) ? WEEK + 1 : null;
  const j = $("#journal");
  j.innerHTML = `<h2>${PLACE.reflectIcon} Week ${WEEK} complete!<button type="button" class="keep">Keep watching ✕</button></h2>
    <div class="postcard-end">
      <div><div class="photo"><img src="${photo}" alt="${esc(PLACE.photoAlt)}"><span>${okinaHTML(PLACE.name)} · Week ${WEEK}</span></div>
        <h3>Field report</h3>${lines.map(l => `<p>${l}</p>`).join("")}
        <p style="text-align:right">— ${esc(S.name || "EIL student")}</p></div>
      <div>
        <h3>This week's words</h3>
        <div class="chips">${week().map(w => `<span class="chip ${wordStatus(w)}" style="color:#fff">${esc(w)}</span>`).join("")}</div>
        <h3>How it went</h3>
        <div class="stats">
          <span>${A.sign.join(" ")}</span><b>${ok("sign")} / 10</b>
          <span>${A.card.join(" ")}</span><b>${ok("type")} / 10</b>
          <span>${A.pool.join(" ")}</span><b>${ok("pool")} / 10</b>
          <span>${A.kevin.join(" ")}</span><b>${ok("kevin")} / 10</b>
          <span>${PLACE.reflectIcon} Reflection</span><b>${ok("sun")} / 10</b>
          <span>${A.shells.join(" ")}</span><b>${missedWords().length}</b>
          <span>🍫 Granola left</span><b>${S.granola} / ${PLACE.granola}</b>
        </div>
        <h3>Your goal</h3>
        <p>${goal ? esc(goal.text()) : "—"}<br><b>${goalMet === null ? "This one is up to you this week. Good luck!" : goalMet ? "✅ You did it!" : "Not this time — try again next week."}</b></p>
        <h3>Save for Canvas</h3>
        <div class="row downloads"><button type="button" class="dl-report">⬇ Field report</button><button type="button" class="dl-art" title="${esc(PLACE.photoAlt)}">⬇ Picture</button><button type="button" class="dl-gif">⬇ Time-lapse GIF</button></div>
        <div class="row">${next ? `<button type="button" class="primary next">Week ${next}: ${okinaHTML(PLACES[next].name)} ▶</button>` : ""}<button type="button" class="again">Play Week ${WEEK} again</button></div>
      </div>
    </div>`;
  j.hidden = false;
  $(".keep", j).onclick = () => { j.hidden = true; showReopen(); };
  $(".again", j).onclick = () => { S = fresh(S); save(); location.reload(); };
  if (next) $(".next", j).onclick = () => { try { localStorage.setItem(WEEK_PREF, next); } catch { /* ignore */ } location.reload(); };
  $(".dl-report", j).onclick = async e => {
    const b = e.currentTarget; b.disabled = true;
    try { download(await reportImage(photo), fileName("field-report")); } finally { b.disabled = false; }
  };
  $(".dl-art", j).onclick = () => download(PLACE.plates[PLACE.plates.length - 1], fileName("picture"));
  $(".dl-gif", j).onclick = async e => {
    const b = e.currentTarget, label = b.textContent; b.disabled = true;
    try {
      const gif = await timelapseGIF({ onProgress: f => (b.textContent = `Making GIF… ${Math.round(f * 100)}%`) });
      download(URL.createObjectURL(gif), fileName("time-lapse", "gif"));
    } finally { b.textContent = label; b.disabled = false; }
  };
}

// ---------------------------------------------------------------- downloads (for uploading to Canvas)
const fileName = (kind, ext = "png") => ["Hawaii-Postcards", `Week${WEEK}`, PLACE.name.normalize("NFD").replace(/[^\w ]/g, "").replace(/ +/g, "-"),
  (S.name || "student").normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "student", kind].join("_") + "." + ext;
function download(url, name) {
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------- progress file
// The browser save stays on one computer; a progress file carries every week (and name/major) to another.
// Loading merges: for each week, whichever copy is further along wins, so an old file can't erase newer work.
const SAVE_PREFIX = "hawaii-postcards-";
function saveProgressFile() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(SAVE_PREFIX)) data[k] = localStorage.getItem(k); }
  } catch { /* no storage: the week in memory still goes in */ }
  if (S) {
    data[saveKey(WEEK)] = JSON.stringify(S);
    if (S.major) data[PROFILE_KEY] = JSON.stringify({ name: S.name, major: S.major });
  }
  const who = (S && S.name || "student").normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "student";
  const blob = new Blob([JSON.stringify({ game: "hawaii-postcards", version: 1, savedAt: new Date().toISOString(), data }, null, 1)], { type: "application/json" });
  download(URL.createObjectURL(blob), `Hawaii-Postcards_progress_${who}_${new Date().toISOString().slice(0, 10)}.json`);
}
const howFar = s => !s || !s.res ? -1 : s.stage * 1000 + Object.values(s.res).reduce((n, r) => n + Object.keys(r).length, 0);
function loadProgressFile(text) {
  let file;
  try { file = JSON.parse(text); } catch { throw new Error("That file isn't a Hawaiʻi Postcards progress file."); }
  if (!file || file.game !== "hawaii-postcards" || typeof file.data !== "object") throw new Error("That file isn't a Hawaiʻi Postcards progress file.");
  const weeks = [];
  try {
    for (const [k, v] of Object.entries(file.data)) {
      if (!k.startsWith(SAVE_PREFIX) || typeof v !== "string") continue;
      const n = /^hawaii-postcards-week(\d+)$/.exec(k);
      if (n) {
        let mine = null, theirs = null;
        try { mine = JSON.parse(localStorage.getItem(k)); } catch { /* none here */ }
        try { theirs = JSON.parse(v); } catch { continue; }
        if (howFar(theirs) >= howFar(mine)) { localStorage.setItem(k, v); weeks.push(+n[1]); }
      } else localStorage.setItem(k, v);          // profile, current week, sound
    }
  } catch { throw new Error("This browser won't let the game save (private window?). Try a normal window."); }
  return weeks.sort((a, b) => a - b);
}
$("#btnSave").onclick = e => {
  saveProgressFile();
  const b = e.currentTarget; b.textContent = "✓"; setTimeout(() => (b.textContent = "💾"), 1500);
};

// The finished field report as one PNG: who, which week, the scene, scores, goal, and all ten
// field-report sentences with the academic word highlighted. Drawn on a canvas (no emoji: they
// don't render reliably in canvas text).
async function reportImage(photoURL) {
  await document.fonts.ready;
  const W = 1400, M = 56, INK = "#2a2230", RED = "#8a3d2a", GREEN = "#1e7d45", DIM = "#7a6e66";
  const body = (px, weight = 400) => `${weight} ${px}px Nunito, system-ui, sans-serif`;
  const pixel = px => `500 ${px}px "Pixelify Sans", Nunito, sans-serif`;
  const img = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = photoURL; });
  const c = document.createElement("canvas"), g = c.getContext("2d");

  // Word-wrap a sentence whose academic word (by its first 4 letters) is bold and green.
  const stem = w => w.slice(0, 4).toLowerCase();
  const layout = (text, w, width, size) => {
    const toks = text.split(/(\s+|[,.;:!?]+(?=\s|$))/).filter(Boolean), lines = [[]];   // punctuation is never bold
    let x = 0;
    const hot = new Set(), form = w ? WORDS[w].form.split(" ") : [];
    const at = w ? toks.findIndex(t => t.toLowerCase().startsWith(stem(w))) : -1;
    if (at >= 0) for (let k = 0; k < form.length; k++) hot.add(at + 2 * k);
    toks.forEach((t, i) => {
      const bold = hot.has(i) && !/^\s+$/.test(t);
      g.font = body(size, bold ? 800 : 400);
      const tw = g.measureText(t).width;
      if (/^\s+$/.test(t)) { if (x > 0) { lines.at(-1).push({ t: " ", x, bold }); x += tw; } return; }
      if (x + tw > width && x > 0 && !/^[,.;:!?]+$/.test(t)) { lines.push([]); x = 0; }
      lines.at(-1).push({ t, x, bold }); x += tw;
    });
    return lines;
  };
  const sentences = week().map(w => ({ w, text: WORDS[w].postcard.replace(/\[[^\]]+\]/, WORDS[w].form) }));
  const textW = W - 2 * M - 48;
  const blocks = sentences.map(s => layout(s.text, s.w, textW, 25));
  const reportH = blocks.reduce((h, b) => h + b.length * 36 + 14, 0);

  const photoW = 800, photoH = Math.round(photoW * 576 / 1024), topY = 150;
  const H = topY + photoH + 400 + reportH + 90;                            // generous; cropped at the end
  c.width = W; c.height = H;
  g.fillStyle = "#f7f0de"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#b8563c"; g.fillRect(0, 0, W, 12);

  // Header
  g.textBaseline = "alphabetic"; g.fillStyle = RED; g.font = pixel(46);
  // Pixelify's ʻokina is a wide glyph, so the ʻokina alone is drawn in Nunito (as in the game's CSS).
  let hx = M;
  for (const [t, f] of [["Hawai", pixel(46)], ["ʻ", body(46, 800)], ["i Postcards", pixel(46)]]) {
    g.font = f; g.fillText(t, hx, 76); hx += g.measureText(t).width - (t === "ʻ" ? 10 : t === "Hawai" ? 6 : 0);
  }
  g.font = body(28, 800); g.textAlign = "right";
  g.fillText(`Week ${WEEK} · ${PLACE.name}`, W - M, 72); g.textAlign = "left";
  const when = new Date(S.doneAt || Date.now());
  g.font = body(24); g.fillStyle = INK;
  g.fillText(`${S.name || "EIL student"}  ·  ${S.major}  ·  completed ${when.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}, ${when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`, M, 118);

  // Photo, in a white frame
  g.save(); g.shadowColor = "#0003"; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.fillStyle = "#fff"; g.fillRect(M - 12, topY - 12, photoW + 24, photoH + 60); g.restore();
  g.drawImage(img, M, topY, photoW, photoH);
  g.fillStyle = RED; g.font = body(22, 800); g.textAlign = "center";
  g.fillText(`${PLACE.name} · Week ${WEEK}`, M + photoW / 2, topY + photoH + 36); g.textAlign = "left";

  // Right column: scores, words, goal
  const x0 = M + photoW + 60, colW = W - M - x0;
  let y = topY + 20;
  const h3 = t => { g.fillStyle = RED; g.font = pixel(26); g.fillText(t, x0, y); y += 36; };
  const ok = k => week().filter(w => res(w)[k]).length, A = PLACE.act;
  h3("How it went");
  [[A.sign[1], `${ok("sign")} / 10`], [A.card[1], `${ok("type")} / 10`], [A.pool[1], `${ok("pool")} / 10`],
   [A.kevin[1], `${ok("kevin")} / 10`], ["Reflection", `${ok("sun")} / 10`], [`${A.shells[1]} (words missed)`, `${missedWords().length}`]]
    .forEach(([k, v]) => {
      g.font = body(22); g.fillStyle = INK; g.fillText(k, x0, y);
      g.font = body(22, 800); g.textAlign = "right"; g.fillText(v, x0 + colW, y); g.textAlign = "left"; y += 32;
    });
  y += 16; h3("This week's words");
  let cx = x0;
  g.font = body(20, 800);
  for (const w of week()) {
    const tw = g.measureText(w).width + 24;
    if (cx + tw > x0 + colW) { cx = x0; y += 38; }
    const st = wordStatus(w);
    g.fillStyle = st === "ok" ? "#1f5b37" : st === "miss" ? "#6b3a2a" : "#8b8078";
    g.beginPath(); g.roundRect(cx, y - 24, tw, 32, 16); g.fill();
    g.fillStyle = "#fff"; g.fillText(w, cx + 12, y - 1); cx += tw + 8;
  }
  y += 22; g.font = body(17); g.fillStyle = DIM; g.fillText("green = right every time · brown = missed at least once", x0, y); y += 40;
  const goal = GOALS.find(gg => gg.id === S.goal);
  if (goal) {
    h3("Goal");
    const met = goal.check ? (goal.check() ? "Done!" : "Not this time") : "To do this week";
    g.font = body(20); g.fillStyle = INK;
    for (const line of layout(goal.text(), "", colW, 20)) { g.fillText(line.map(t => t.t).join(""), x0, y); y += 27; }
    g.font = body(20, 800); g.fillStyle = goal.check && goal.check() ? GREEN : INK; g.fillText(met, x0, y);
  }
  const rightEnd = y;

  // Field report: all ten sentences
  y = Math.max(topY + photoH + 70, rightEnd + 30) + 44;
  g.fillStyle = RED; g.font = pixel(32); g.fillText("Field report", M, y); y += 46;
  blocks.forEach((lines, i) => {
    g.font = body(25, 800); g.fillStyle = DIM; g.fillText(`${i + 1}.`, M, y);
    for (const line of lines) {
      for (const t of line) { g.font = body(25, t.bold ? 800 : 400); g.fillStyle = t.bold ? GREEN : INK; g.fillText(t.t, M + 48 + t.x, y); }
      y += 36;
    }
    y += 14;
  });
  g.font = body(18); g.fillStyle = DIM;
  const end = y + 40;
  g.fillText(`Hawaii Postcards · EAP 1 academic vocabulary · Week ${WEEK} field report`, M, end);
  const out = document.createElement("canvas"); out.width = W; out.height = end + 36;
  out.getContext("2d").drawImage(c, 0, 0);
  return URL.createObjectURL(await new Promise(r => out.toBlob(r, "image/png")));
}
function showReopen() {
  const p = panel(`<div class="row" style="margin:0"><span class="grow">🌅 Enjoy the view.</span><button type="button" class="primary">Open postcard</button></div>`);
  p.style.width = "auto";
  $("button", p).onclick = () => { p.hidden = true; p.style.width = ""; showPostcard(); };
}

// ---------------------------------------------------------------- title & setup
// Title: pick a week (each one shows its place behind the title), then start or continue it.
function titleScreen() {
  return new Promise(resolve => {
    const t = $("#title"), btns = $(".buttons", t), picker = $(".weeks", t);
    let busy = false;
    const draw = () => {
      $(".sub", t).innerHTML = `Week ${WEEK} · ${okinaHTML(PLACE.name)} · ${esc(PLACE.when)}`;
      picker.innerHTML = BUILT.map(n => `<button type="button" data-n="${n}" aria-pressed="${n === WEEK}"${n === WEEK ? ' class="on"' : ""}>
        <small>Week ${n}${weekDone(n) ? " ✓" : ""}</small><span>${okinaHTML(PLACES[n].name)}</span></button>`).join("");
      picker.querySelectorAll("button").forEach(b => (b.onclick = () => pickWeek(+b.dataset.n)));
      const resumable = S.major && S.goal && S.stage > 0;
      btns.innerHTML = resumable
        ? `<button type="button" class="primary go">Continue</button><button type="button" class="new">Start over</button>`
        : `<button type="button" class="primary go">Start</button>`;
      $(".go", btns).onclick = () => go(false);
      if (resumable) $(".new", btns).onclick = () => go(true);
      Sound.setMusic(PLACE.music);
    };
    const pickWeek = async n => {
      if (busy || n === WEEK) return;
      busy = true; setWeek(n);
      await Scene.load(PLACE); showWeekState();
      draw(); busy = false;
    };
    const go = fresh => { if (busy) return; Sound.start(); t.hidden = true; keyHook = null; resolve(fresh); };
    const msg = $(".progress .msg", t), fileIn = $(".progress input", t);
    $(".save-prog", t).onclick = () => { saveProgressFile(); msg.className = "msg"; msg.textContent = "Saved! Keep the file somewhere safe (email it to yourself, or put it in OneDrive)."; };
    $(".load-prog", t).onclick = () => fileIn.click();
    fileIn.onchange = async () => {
      const f = fileIn.files[0]; fileIn.value = "";
      if (!f) return;
      try {
        const weeks = loadProgressFile(await f.text());
        msg.className = "msg";
        msg.textContent = weeks.length ? `Loaded Week ${weeks.join(", ")}. Opening your game…` : "This computer already has newer progress, so nothing changed.";
        if (weeks.length) setTimeout(() => location.reload(), 1200);
      } catch (err) { msg.className = "msg bad"; msg.textContent = err.message; }
    };
    keyHook = e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(false); }
      const i = BUILT.indexOf(WEEK);
      if (e.key === "ArrowRight" && i < BUILT.length - 1) pickWeek(BUILT[i + 1]);
      if (e.key === "ArrowLeft" && i > 0) pickWeek(BUILT[i - 1]);
    };
    draw();
  });
}
// Put the scene where the saved week left off (time of day, Kevin, Tavita asleep).
function showWeekState() {
  Scene.T = Scene.target = S.T;
  const at = STAGES[S.stage];
  if (S.stage > STAGES.indexOf("kevin")) { Scene.kevinMode = PLACE.kevinAfter; if (PLACE.kevinAfter === "ashore") Object.assign(Scene.kevin, { t: 1.2, a: 1 }); }
  if (at === "end") Scene.tavitaAsleep = true;
}

function setup() {
  return new Promise(resolve => {
    const p = panel(header("📔", "Your field journal") +
      `<div class="form">
        <label for="fName">Your name</label><input id="fName" type="text" maxlength="30" value="${esc(S.name)}" placeholder="First and last name" required autocomplete="name">
        <label for="fMajor">Your major</label><select id="fMajor"><option value="">Choose your major…</option>
          ${MAJORS.map(m => `<option${m === S.major ? " selected" : ""}>${esc(m)}</option>`).join("")}</select>
        <span>Week ${WEEK}</span><div class="chips" id="fWords"><span class="note">Your 10 words appear here.</span></div>
        <span>Your goal</span><div class="goals">${GOALS.map(g => `<label><input type="radio" name="goal" value="${g.id}"${g.id === S.goal ? " checked" : ""}> ${esc(g.text())}</label>`).join("")}</div>
      </div>
      <div class="row"><span class="grow note">You can change these later by starting a new game.</span><button type="button" class="primary" disabled>Let's go ▶</button></div>`);
    const sel = $("#fMajor", p), name = $("#fName", p), go = $(".row button", p);
    const refresh = () => {
      $("#fWords", p).innerHTML = sel.value ? WEEKS[sel.value][WEEK - 1].map(w => `<span class="chip">${esc(w)}</span>`).join("") : `<span class="note">Your 10 words appear here.</span>`;
      go.disabled = !(name.value.trim() && sel.value && p.querySelector("input[name=goal]:checked"));
    };
    name.oninput = refresh; sel.onchange = refresh; p.querySelectorAll("input[name=goal]").forEach(r => (r.onchange = refresh));
    refresh();
    go.onclick = () => {
      S.name = name.value.trim(); S.major = sel.value; S.goal = p.querySelector("input[name=goal]:checked").value;
      save(); p.hidden = true; resolve();
    };
    setTimeout(() => $("#fName", p).focus(), 60);
  });
}

function updateHud(stage) {
  const A = PLACE.act, keys = Object.keys(A), at = keys.indexOf(stage);
  const done = stage === "end" ? keys.length : at < 0 ? 0 : at;
  $("#steps").innerHTML = keys.map((k, i) => `<li class="${i < done ? "done" : i === at ? "now" : ""}" title="${A[k][1]}"></li>`).join("");
  $("#where").innerHTML = `Week ${WEEK} · ${okinaHTML(PLACE.name)}${A[stage] ? " · " + esc(A[stage][1]) : ""}`;
  $("#granola b").textContent = S.granola;
}

// ---------------------------------------------------------------- main
async function main() {
  setWeek(firstWeek());
  await Scene.load(PLACE);
  showWeekState();
  requestAnimationFrame(loop);
  const startFresh = await titleScreen();
  if (startFresh) { S = fresh(); save(); await Scene.load(PLACE); Scene.T = Scene.target = S.T; }
  if (!S.name || !S.major || !S.goal) await setup();        // a save from before the name was required asks for it once
  $("#hud").hidden = false;
  for (let i = S.stage; i < STAGES.length; i++) {
    S.stage = i; save(); updateHud(STAGES[i]);
    await STATIONS[STAGES[i]]();
  }
}
window.GAME = { get S() { return S; }, get WEEK() { return WEEK; }, week, get WORDS() { return WORDS; } };      // for the playtest bot
main();
