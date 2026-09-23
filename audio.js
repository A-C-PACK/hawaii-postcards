// Sound: each week's music track (places.js), ambient surf + seabirds (generated in the browser),
// answer chimes, and voiced lines (Qwen-TTS clips in voice/, browser speech only if a clip is missing).
//
// Modes (the player picks one):
//   all      music + ambient + voices
//   nomusic  ambient + voices
//   voice    voices only
//   off      silence
"use strict";

const SOUND_MODES = ["all", "nomusic", "voice", "off"];
const SOUND_LABELS = {
  all: "Music, ambient sounds and voices",
  nomusic: "No music (ambient sounds and voices)",
  voice: "Voices only",
  off: "Everything muted",
};

const Sound = {
  ctx: null, mode: "all", current: null, speaking: false, musicSrc: "music/sunset_breeze.mp3",

  // Pick the week's song; switches right away if music is already playing.
  setMusic(src) {
    if (src === this.musicSrc) return;
    this.musicSrc = src;
    if (this.musicEl) { this.musicEl.src = src; this.apply(); }
  },

  // Must be called from a user gesture (browsers block audio before one).
  start() {
    if (this.ctx) { this.ctx.resume(); this.apply(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.ambient = ctx.createGain(); this.ambient.connect(this.master);    // surf + birds
    this.fx = ctx.createGain(); this.fx.connect(this.master);              // answer chimes
    this.music = ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.master);

    // Surf: looped noise through a low-pass filter that swells slowly like waves.
    const len = ctx.sampleRate * 4, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const surf = ctx.createBufferSource(); surf.buffer = nb; surf.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
    const sg = ctx.createGain(); sg.gain.value = 0.11;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.08; lfo.connect(lfoAmt).connect(sg.gain);
    const lfo2Amt = ctx.createGain(); lfo2Amt.gain.value = 350; lfo.connect(lfo2Amt).connect(lp.frequency);
    surf.connect(lp).connect(sg).connect(this.ambient);
    surf.start(); lfo.start();
    setInterval(() => { if (ctx.state === "running" && Math.random() < 0.02) this.bird(); }, 200);

    // Music: the song, looped, routed through a gain node so it can be muted and ducked under voices.
    const el = this.musicEl = new Audio(this.musicSrc);
    el.loop = true; el.preload = "auto";
    try { ctx.createMediaElementSource(el).connect(this.music); } catch { /* plays unrouted; still mutable via el.muted */ }
    this.apply();
  },

  // Volumes for the current mode; the music dips while someone is speaking.
  apply() {
    if (!this.ctx) return;
    const m = this.mode, t = this.ctx.currentTime;
    const music = m === "all" ? (this.speaking ? 0.22 : 0.55) : 0;
    this.music.gain.setTargetAtTime(music, t, 0.4);
    this.ambient.gain.setTargetAtTime(m === "all" || m === "nomusic" ? (this.speaking ? 0.6 : 1) : 0, t, 0.3);
    this.fx.gain.setTargetAtTime(m === "all" || m === "nomusic" ? 1 : 0, t, 0.05);
    if (this.musicEl) {
      this.musicEl.muted = music === 0;
      if (m === "all" && this.musicEl.paused) this.musicEl.play().catch(() => {});
      if (m !== "all" && !this.musicEl.paused) this.musicEl.pause();
    }
  },

  setMode(mode) {
    this.mode = mode;
    if (mode === "off") this.stopVoice();
    this.apply();
    return mode;
  },
  cycle() { return this.setMode(SOUND_MODES[(SOUND_MODES.indexOf(this.mode) + 1) % SOUND_MODES.length]); },

  bird() {
    const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    const f = 2200 + Math.random() * 1200;
    o.frequency.setValueAtTime(f, t);
    for (let i = 0; i < 3; i++) { o.frequency.linearRampToValueAtTime(f * 1.3, t + 0.05 + i * 0.12); o.frequency.linearRampToValueAtTime(f, t + 0.1 + i * 0.12); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.4);
    o.connect(g).connect(this.ambient); o.start(t); o.stop(t + 0.45);
  },

  // A soft chime for correct answers, a low blip for misses.
  chime(good) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    (good ? [880, 1318.5] : [220]).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = good ? "sine" : "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(good ? 0.08 : 0.05, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + (good ? 0.9 : 0.35));
      o.connect(g).connect(this.fx); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1);
    });
  },

  // Play one voiced line. Resolves when it finishes, is stopped, or immediately if muted.
  say(id) {
    this.stopVoice();
    const line = LINES[id];
    if (!line || this.mode === "off") return Promise.resolve();
    this.speaking = true; this.apply();
    return new Promise(resolve => {
      let over = false;
      const finish = () => { if (over) return; over = true; this.speaking = false; this.apply(); resolve(); };
      if (VOICE[id]) {
        const a = new Audio(VOICE[id]);
        // Voice cloning can't follow "speak slowly", so Kevin is slowed here (pitch is preserved).
        if (line.sp === "KEVIN") { a.preservesPitch = true; a.playbackRate = 0.8; }
        // Only a clip that genuinely fails to load falls back to browser speech. A clip that was
        // stopped (the player moved on) must NOT — that was the "robot voice repeats Tavita" bug.
        let stopped = false;
        const fallback = () => { if (!stopped && !over) this.speak(line, finish); };
        this.current = { stop: () => { stopped = true; a.pause(); a.removeAttribute("src"); finish(); } };
        a.onended = finish;
        a.onerror = fallback;
        a.play().catch(e => { if (e && e.name === "NotSupportedError") fallback(); else finish(); });
      } else this.speak(line, finish);
    });
  },

  speak(line, finish) {
    const ss = window.speechSynthesis;
    if (!ss) return finish();
    const u = new SpeechSynthesisUtterance(line.t);
    const voices = ss.getVoices().filter(v => v.lang.startsWith("en"));
    const pick = re => voices.find(v => re.test(v.name)) || voices[0];
    if (line.sp === "NARRATOR") { u.voice = pick(/female|zira|samantha|aria|jenny/i); u.rate = 0.92; }
    else if (line.sp === "KEVIN") { u.voice = pick(/male|david|guy|daniel/i); u.rate = 0.72; u.pitch = 0.6; }
    else { u.voice = pick(/male|david|guy|mark/i); u.rate = 0.98; u.pitch = 0.85; }
    u.onend = u.onerror = finish;
    this.current = { stop: () => { ss.cancel(); finish(); } };
    ss.speak(u);
  },

  stopVoice() {
    const c = this.current; this.current = null;
    if (c) c.stop();
  },
};
