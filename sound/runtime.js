/* Two Lanterns :: sound and touch.
   The effects are recordings made by scripts/sfx.cjs and carried inside the page: a toll at each new room, dice, a short phrase
   for each outcome, coin at the stall, and a small buzz on phones that can. An effect that has not been made is built in the
   browser instead, as all of them once were. Under them plays the score in audio/music (made by scripts/music.cjs): a title
   theme, three moods for the descent that follow the Bell, the chandler's landing and the ending, cross-faded and looped. Where a
   track has not been made the next nearest is used, and with no tracks at all a low drone made in the browser stands in. One button in the header steps through All sound, Effects only and Off, and the choice is saved on this device.
   It watches the page and never touches the game: with this file left out, the game plays exactly as before.
   scripts/build-extras.cjs injects it into <head>. */
(function () {
  'use strict';
  var STORE = 'twolanterns.sound', MODES = ['all', 'fx', 'off'];
  var MUSIC = __MUSIC_MANIFEST__;      /* { base, tracks: { id: { f } } } or null, written in by the build */
  var hasMusic = !!(MUSIC && MUSIC.tracks && Object.keys(MUSIC.tracks).length);
  var SFX = __SFX_MANIFEST__;      /* { id: { d: the recording in base64, gain } } or null, written in by the build */
  var shots = {};      /* id -> { buf, at, gain }: decoded, with the silence before the sound measured and the loudness evened out */
  var LABEL = { all: 'Sound: all', fx: 'Sound: effects only', off: 'Sound: off' };
  var ICON = {
    all: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    fx: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15 9a4.2 4.2 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    off: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  var mode = 'all', host = null, queued = false, touched = false;
  var ctx = null, master = null, fx = null, amb = null, bed = null, noiseBuf = null, dripT = null, duckT = null;
  var last = { room: -1, intro: '', rolling: false, res: '', buys: -1, screen: '', linked: false, end: '', stall: -1 };
  var log = [];
  try { var s = localStorage.getItem(STORE); if (MODES.indexOf(s) >= 0) mode = s; } catch (e) {}
  var still = false;
  try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function note(n) { log.push(n); if (log.length > 240) log.shift(); }
  function T() { return window.__tl || null; }
  function buzz(p) { try { if (mode !== 'off' && touched && !still && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ---------- the instrument ---------- */
  function boot() {
    if (ctx || mode === 'off') return !!ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
      fx = ctx.createGain(); fx.gain.value = 1; fx.connect(master);
      /* a stone room: one echo, darkened, fed back a little */
      var d = ctx.createDelay(1); d.delayTime.value = 0.29;
      var fb = ctx.createGain(); fb.gain.value = 0.33;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
      var wet = ctx.createGain(); wet.gain.value = 0.3;
      fx.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master);
      amb = ctx.createGain(); amb.gain.value = 0; amb.connect(master);
      var n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
      for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      noiseBuf = b;
    } catch (e) { ctx = null; return false; }
    unpack();
    return true;
  }
  function wake() {
    if (mode === 'off') return;
    if (!boot()) return;
    if (ctx.state === 'suspended' && !document.hidden) { try { ctx.resume(); } catch (e) {} }
    if (mode === 'all') { if (hasMusic) musicOn(); else bedOn(); }
  }
  function env(g, t, peak, a, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function tone(type, f0, f1, dur, peak, when, dest) {
    if (!ctx) return; var t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, 0.006, dur); o.connect(g); g.connect(dest || fx); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(kind, freq, q, dur, peak, when, dest) {
    if (!ctx) return; var t = ctx.currentTime + (when || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = kind; f.frequency.value = freq; f.Q.value = q;
    env(g, t, peak, 0.004, dur); s.connect(f); f.connect(g); g.connect(dest || fx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  var BELL = [[0.5, 0.5, 1], [1, 1, 0.85], [1.19, 0.45, 0.7], [1.5, 0.3, 0.55], [2, 0.28, 0.45], [2.51, 0.16, 0.3], [3.01, 0.1, 0.22]];
  function bell(f, dur, peak, when) { for (var i = 0; i < BELL.length; i++) tone('sine', f * BELL[i][0], 0, dur * BELL[i][2], peak * BELL[i][1], when); hiss('bandpass', f * 4, 2, 0.05, peak * 0.5, when); }

  var CUE = {
    tick: function () { hiss('highpass', 2600, 0.7, 0.03, 0.05); },
    rattle: function () { for (var i = 0; i < 9; i++) hiss('bandpass', 1100 + Math.random() * 1500, 5, 0.035, 0.16, i * 0.09 + Math.random() * 0.02); },
    land: function () { hiss('bandpass', 900, 3, 0.06, 0.3); tone('sine', 150, 70, 0.14, 0.3); },
    toll: function (k) { bell(196 * Math.pow(2, -Math.min(7, k) / 9), 4.2, 0.2); },
    t0: function (w, hi) { tone('sine', 82, 38, 0.7, 0.5, w); hiss('lowpass', 240, 0.8, 0.5, 0.35, w); tone('sawtooth', 110 * hi, 104 * hi, 0.5, 0.05, w); },
    t1: function (w, hi) { tone('triangle', 196 * hi, 185 * hi, 0.35, 0.16, w); hiss('lowpass', 500, 1, 0.12, 0.14, w); },
    t2: function (w, hi) { bell(392 * hi, 0.9, 0.09, w); bell(523.25 * hi, 1.1, 0.09, w + 0.13); },
    t3: function (w, hi) { bell(392 * hi, 0.9, 0.09, w); bell(493.88 * hi, 0.9, 0.09, w + 0.11); bell(587.33 * hi, 1.0, 0.09, w + 0.22); bell(783.99 * hi, 1.8, 0.1, w + 0.34); },
    coin: function () { tone('sine', 2350, 0, 0.22, 0.09); tone('sine', 3520, 0, 0.3, 0.06, 0.05); tone('sine', 2960, 0, 0.25, 0.05, 0.11); },
    shop: function () { bell(880, 1.1, 0.06); bell(1174.7, 1.3, 0.05, 0.16); },
    joined: function () { bell(523.25, 0.9, 0.07); bell(783.99, 1.3, 0.07, 0.15); },
    end: function (kind) {
      bell(98, 7, 0.32); bell(196, 5, 0.1, 0.02);
      if (kind === 'break') { hiss('highpass', 1800, 0.6, 0.35, 0.3, 0.5); tone('sawtooth', 300, 60, 0.9, 0.12, 0.5); }
      else if (kind === 'collapse' || kind === 'deadlock') { hiss('lowpass', 160, 0.7, 3, 0.5, 0.4); }
      else if (kind === 'ring') { bell(98, 7, 0.26, 1.6); }
    }
  };
  function play(name, a, b) {
    note(name + (a === undefined || a === null ? '' : ':' + a));
    if (mode === 'off' || !touched) return;
    if (TOUCH[name]) buzz(TOUCH[name]);
    wake(); if (!ctx || ctx.state !== 'running') return;
    try { if (REC[name] && REC[name](a, b)) note('rec:' + name); else CUE[name](a, b); } catch (e) {}
  }

  /* ---------- the recordings ---------- */
  var TOUCH = { land: 14, coin: 8, joined: [10, 40, 10], end: [30, 60, 30] };
  function unpack() {
    if (!SFX || !ctx) return;
    Object.keys(SFX).forEach(function (id) {
      var e = SFX[id]; if (!e || !e.d || shots[id] !== undefined) return;
      shots[id] = null;
      try {
        var bin = atob(e.d), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        var done = function (buf) {
          var ch = buf.getChannelData(0), n = ch.length, peak = 0, at = 0, i;
          for (i = 0; i < n; i++) { var v = ch[i] < 0 ? -ch[i] : ch[i]; if (v > peak) peak = v; }
          if (peak < 0.002) return;      /* a silent take is no use: the browser-made sound stays */
          for (i = 0; i < n; i++) { if ((ch[i] < 0 ? -ch[i] : ch[i]) > peak * 0.06) { at = i; break; } }
          shots[id] = { buf: buf, at: Math.max(0, at / buf.sampleRate - 0.004), gain: Math.min(30, 0.8 / peak) * (+e.gain > 0 ? +e.gain : 1) };      /* some takes come back very quiet */
          note('sfx-ready:' + id);
        };
        var pr = ctx.decodeAudioData(u.buffer, done, function () {});
        if (pr && pr.catch) pr.catch(function () {});
      } catch (err) { /* this one keeps its browser-made sound */ }
    });
  }
  function shot(id, when, rate, level) {
    var s = shots[id]; if (!s || !ctx) return false;
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = s.buf; src.playbackRate.value = rate || 1; g.gain.value = s.gain * (level === undefined ? 1 : level);
    src.connect(g); g.connect(master);
    src.start(ctx.currentTime + (when || 0), s.at);
    return true;
  }
  /* each returns true when a recording played; false leaves the cue to the browser-made sound */
  var TIER = ['disaster', 'scrape', 'success', 'triumph'];
  function tier(n) { return function (w, hi) { return shot(TIER[n], w, hi > 1 ? 1.12 : 1, 0.8); }; }
  var REC = {
    tick: function () { return shot('tick', 0, 1, 0.35); },
    rattle: function () { return shot('rattle', 0, 1, 0.7); },
    land: function () { return shot('land', 0, 1, 0.8); },
    toll: function (k) { return shot('toll', 0, Math.pow(2, -Math.min(7, k) / 14), 0.8); },
    t0: tier(0), t1: tier(1), t2: tier(2), t3: tier(3),
    coin: function () { return shot('coin', 0, 1, 0.7); },
    shop: function () { return shot('shop', 0, 1, 0.6); },
    joined: function () { return shot('joined', 0, 1, 0.7); },
    end: function (kind) {
      if (!shot('end', 0, 1, 1)) return false;
      if (kind === 'break') shot('crack', 0.6, 1, 0.9);
      else if (kind === 'collapse' || kind === 'deadlock') shot('rumble', 0.4, 1, 0.9);
      else if (kind === 'ring') shot('end', 2.2, 1, 0.75);
      return true;
    }
  };

  /* ---------- the bed: what the Undertoll sounds like when nothing is happening ---------- */
  function bedOn() {
    if (!ctx || bed) return;
    var t = ctx.currentTime, lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.Q.value = 0.9;
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.045; lg.gain.value = 55; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    var os = [['sawtooth', 55, 0.5], ['sawtooth', 82.2, 0.28], ['sine', 27.5, 0.7]].map(function (d) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = d[0]; o.frequency.value = d[1]; g.gain.value = d[2]; o.connect(g); g.connect(lp); o.start(t); return o; });
    var uo = ctx.createOscillator(), ug = ctx.createGain(); uo.type = 'sine'; uo.frequency.value = 58.27; ug.gain.value = 0; uo.connect(ug); ug.connect(lp); uo.start(t);      /* the Bell stirring: a note that does not belong */
    var air = ctx.createBufferSource(), af = ctx.createBiquadFilter(), ag = ctx.createGain(); air.buffer = noiseBuf; air.loop = true; af.type = 'bandpass'; af.frequency.value = 420; af.Q.value = 0.5; ag.gain.value = 0.05; air.connect(af); af.connect(ag); ag.connect(amb); air.start(t);
    lp.connect(amb);
    bed = { nodes: os.concat([uo, lfo, air]), unease: ug };
    level();
    drip();
    if (!duckT) duckT = setInterval(level, 400);
  }
  function bedOff() {
    if (!bed) return;
    var b = bed; bed = null; clearTimeout(dripT); dripT = null;
    try { amb.gain.cancelScheduledValues(ctx.currentTime); amb.gain.setTargetAtTime(0, ctx.currentTime, 0.25); } catch (e) {}
    setTimeout(function () { b.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 1500);
  }
  function mood() { try { var t = T(); return t && t.S && t.S.p ? t.E.mood(t.S) : 0; } catch (e) { return 0; } }
  function level() {
    if (!ctx || !bed) return;
    var talk = false; try { talk = !!(window.__narrator && window.__narrator.state().playing); } catch (e) {}
    var m = mood();
    try { amb.gain.setTargetAtTime(talk ? 0.035 : 0.11, ctx.currentTime, 0.6); bed.unease.gain.setTargetAtTime(m * 0.22, ctx.currentTime, 1.5); } catch (e) {}
  }
  function drip() {
    clearTimeout(dripT);
    dripT = setTimeout(function () {
      if (bed && ctx && ctx.state === 'running' && !document.hidden) { var f = 900 + Math.random() * 900; tone('sine', f, f * 0.55, 0.07, 0.035); }
      if (bed) drip();
    }, 5000 + Math.random() * 9000);
  }

  /* ---------- the score ----------
     Two players that take turns: one fades out as the other fades in, both for a change of track and for a track coming round again.
     Both are started once inside the first tap, which is what lets a phone start them later without one. */
  var NEAR = { title: ['title', 'calm'], calm: ['calm', 'title'], restless: ['restless', 'calm', 'awake'], awake: ['awake', 'restless', 'calm'], stall: ['stall', 'calm', 'title'], end: ['end', 'title', 'calm'] };
  var mus = { on: false, decks: null, cur: -1, id: '', want: 'title', t: null, hush: null };
  var LOUD = 0.5, UNDER = 0.14, FADE = 2600, TAIL = 3.2;
  function pick(id) { var c = NEAR[id] || [id]; for (var i = 0; i < c.length; i++) if (MUSIC.tracks[c[i]]) return c[i]; return Object.keys(MUSIC.tracks)[0]; }
  function wanted() {
    var t = T(); if (!t || !t.S) return 'title';
    var S = t.S, s = S.screen;
    if (t.ui && t.ui.book) return s === 'ending' && S.end ? 'end' : 'title';
    if (s === 'ending' && S.end) return 'end';
    if (s === 'stall') return 'stall';
    if (S.p && (s === 'intro' || s === 'choose' || s === 'roll')) return ['calm', 'restless', 'awake'][mood()] || 'calm';
    if (S.p && S.order && s === 'handoff' && mus.want !== 'title' && mus.want !== 'end') return mus.want;      /* passing the device mid-descent changes nothing */
    return 'title';
  }
  function silence() {
    var n = 400, b = new Uint8Array(44 + n), v = new DataView(b.buffer), i;
    function put(o, t) { for (var k = 0; k < t.length; k++) b[o + k] = t.charCodeAt(k); }
    put(0, 'RIFF'); v.setUint32(4, 36 + n, true); put(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); put(36, 'data'); v.setUint32(40, n, true);
    for (i = 44; i < b.length; i++) b[i] = 128;
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function deck() {
    var a = new Audio(), d = { a: a, g: null, v: 0, to: 0, id: '', live: false, from: 0, end: 0 };
    a.preload = 'auto';
    try { if (ctx && /^https?:$/.test(location.protocol)) { var src = ctx.createMediaElementSource(a); d.g = ctx.createGain(); d.g.gain.value = 0; src.connect(d.g); d.g.connect(master); } } catch (e) { d.g = null; }      /* a phone ignores an element's own volume, so the level is set after it */
    if (!d.g) a.volume = 0;
    a.addEventListener('timeupdate', function () { if (!(mus.on && mus.decks && mus.decks[mus.cur] === d && d.live && a.duration && isFinite(a.duration))) return; var end = d.end > 0 && d.end < a.duration ? d.end : a.duration; if (end - a.currentTime < TAIL) turn(d.id, true); });
    a.addEventListener('loadedmetadata', function () { if (d.live && d.from > 0 && a.currentTime < d.from) { try { a.currentTime = d.from; } catch (e) {} } });      /* a track may be told to skip a slow opening, and to come round before its fade */
    a.addEventListener('ended', function () { if (mus.on && mus.decks && mus.decks[mus.cur] === d && d.live) turn(d.id, true); });
    a.addEventListener('error', function () { if (d.live) { d.live = false; note('music-error:' + d.id); } });
    try { if (!mus.hush) mus.hush = silence(); a.src = mus.hush; var p = a.play(); if (p && p.then) p.then(function () { if (!d.live) a.pause(); }, function () {}); } catch (e) {}
    return d;
  }
  function setv(d) { try { if (d.g) d.g.gain.value = d.v; else d.a.volume = Math.max(0, Math.min(1, d.v)); } catch (e) {} }
  function turn(id, again) {
    if (!mus.on || !mus.decks) return;
    if (!again && id === mus.id) return;
    var old = mus.cur >= 0 ? mus.decks[mus.cur] : null, nx = (mus.cur + 1) % 2, d = mus.decks[nx];
    if (old) { old.to = 0; old.live = false; }
    mus.cur = nx; mus.id = id; d.id = id; d.live = true; d.v = 0; setv(d); d.to = 1;
    note('music:' + id + (again ? ':again' : ''));
    var tr = MUSIC.tracks[id]; d.from = +tr.from || 0; d.end = +tr.to || 0; d.gain = +tr.gain > 0 ? +tr.gain : 1;
    try { d.a.src = MUSIC.base + tr.f; d.a.currentTime = d.from; } catch (e) {}
    try { var p = d.a.play(); if (p && p.catch) p.catch(function () { note('music-blocked:' + id); }); } catch (e) {}
  }
  function musicTick() {
    if (!mus.on || !mus.decks) return;
    mus.want = wanted();
    var id = pick(mus.want); if (id !== mus.id) turn(id, false);
    var talk = false; try { talk = !!(window.__narrator && window.__narrator.state().playing); } catch (e) {}
    var top = talk ? UNDER : LOUD, step = 120 / FADE;
    for (var i = 0; i < 2; i++) {
      var d = mus.decks[i], goal = d.to * top * (d.gain || 1);
      if (d.v !== goal) { d.v = d.v < goal ? Math.min(goal, d.v + step * LOUD) : Math.max(goal, d.v - step * LOUD); setv(d); }
      else if (!d.live && d.v === 0 && !d.a.paused) { try { d.a.pause(); } catch (e) {} }
    }
  }
  function musicOn() {
    if (!hasMusic || mus.on || !ctx) return;
    mus.on = true;
    if (!mus.decks) mus.decks = [deck(), deck()];
    mus.id = ''; musicTick();
    if (!mus.t) mus.t = setInterval(musicTick, 120);
  }
  function musicOff() {
    if (!mus.on) return;
    mus.on = false; clearInterval(mus.t); mus.t = null; mus.id = '';
    if (mus.decks) mus.decks.forEach(function (d) { d.live = false; d.to = 0; d.v = 0; setv(d); try { d.a.pause(); } catch (e) {} });
  }
  function musicHide(hidden) { if (!mus.on || !mus.decks) return; var d = mus.decks[mus.cur]; if (!d || !d.live) return; try { if (hidden) d.a.pause(); else { var p = d.a.play(); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }

  /* ---------- reading the page ---------- */
  function scan() {
    queued = false;
    mount();
    var t = T(); if (!t || !t.S) return;
    var S = t.S, scr = host.querySelector('.screen'), cls = scr ? scr.className : '';
    var has = function (c) { return (' ' + cls + ' ').indexOf(' ' + c + ' ') >= 0; };
    var rolling = !!(t.ui && t.ui.rolling);
    if (rolling && !last.rolling) play('rattle');
    if (!rolling && last.rolling) play('land');
    last.rolling = rolling;
    if (has('intro')) { var ik = S.room + '|' + (S.order ? S.order[S.room] : ''); if (ik !== last.intro) { last.intro = ik; play('toll', S.room); } }
    if (has('results') && S.rl && S.rl.d) {
      var rk = S.room + '|' + S.rl.d.join(',');
      if (rk !== last.res) {
        var prev = last.res.split('|'), same = prev[0] === String(S.room), old = same ? prev[1].split(',') : null, tiers = null;
        try { tiers = t.E.preview(S).ev.tier; } catch (e) {}
        last.res = rk;
        if (tiers) {
          var w = same ? 0.05 : 0.75, worst = 3;
          for (var i = 0; i < 2; i++) { if (old && old[i] === String(S.rl.d[i])) continue; play('t' + tiers[i], w, i ? 1.335 : 1); w += 0.55; if (tiers[i] < worst) worst = tiers[i]; }
          if (same) buzz(12); else buzz(worst === 0 ? [40, 50, 40] : worst === 3 ? [12, 40, 12, 40, 18] : 16);
        }
      }
    }
    if (has('stall')) { var due = -1; try { due = t.E.stopDue(S); } catch (e) {} if (due >= 0 && due !== last.stall) { last.stall = due; play('shop'); } }
    var buys = S.shop && S.shop.buys ? S.shop.buys.length : 0;
    if (last.buys >= 0 && buys > last.buys) play('coin');
    last.buys = buys;
    if (has('ending') && S.end) { var ek = String(S.end.index); if (ek !== last.end) { last.end = ek; play('end', S.end.kind); } }
    if (!S.end) last.end = '';
    if (!S.p) { last.intro = ''; last.res = ''; last.stall = -1; }
    var linked = false; try { linked = !!(S.net && t.NT.info().linked); } catch (e) {}
    if (linked && !last.linked) play('joined');
    last.linked = linked;
  }
  function queue() { if (queued) return; queued = true; (window.requestAnimationFrame || window.setTimeout)(scan, 16); }

  /* ---------- the button ---------- */
  function paint(b) { b.innerHTML = ICON[mode] + '<span class="sr">' + LABEL[mode] + '</span>'; b.setAttribute('title', LABEL[mode] + '. Tap to change.'); b.setAttribute('aria-label', LABEL[mode] + '. Change sound.'); b.setAttribute('data-mode', mode); }
  function mount() {
    var top = host.querySelector('header.top'); if (!top) return;
    var b = top.querySelector('.snd');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'snd'; paint(b); top.appendChild(b); }
    else if (b.getAttribute('data-mode') !== mode) paint(b);
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var b = t.closest('.snd');
    if (b) {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      try { localStorage.setItem(STORE, mode); } catch (err) {}
      paint(b);
      if (mode === 'off') { bedOff(); musicOff(); if (ctx) { try { ctx.suspend(); } catch (err) {} } }
      else { wake(); if (mode === 'fx') { bedOff(); musicOff(); } play('tick'); }
      return;
    }
    if (t.closest('button, .opt, .rcard, summary, [data-act]')) play('tick');
  }
  function first() { if (!touched) { touched = true; } wake(); }

  window.__sound = { state: function () { return { mode: mode, ctx: ctx ? ctx.state : 'none', bed: !!bed, touched: touched, music: hasMusic ? (mus.on ? mus.id : '') : null, sfx: Object.keys(shots).filter(function (k) { return !!shots[k]; }), lead: Object.keys(shots).filter(function (k) { return !!shots[k]; }).map(function (k) { return Math.round(shots[k].at * 100) / 100 + '/' + Math.round(shots[k].gain * 10) / 10; }), tracks: hasMusic ? Object.keys(MUSIC.tracks) : [], decks: mus.decks ? mus.decks.map(function (d) { return { id: d.id, v: Math.round(d.v * 100) / 100, playing: !d.a.paused, at: Math.round(d.a.currentTime * 10) / 10, routed: !!d.g }; }) : [] }; }, log: log, cues: Object.keys(CUE) };

  function init() {
    host = document.getElementById('app'); if (!host) return;
    new MutationObserver(queue).observe(host, { childList: true, subtree: true });
    scan();
  }
  document.addEventListener('click', onClick);
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { document.addEventListener(t, first, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () { if (!ctx) return; musicHide(document.hidden); try { if (document.hidden) ctx.suspend(); else if (mode !== 'off') ctx.resume(); } catch (e) {} });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
