/* Two Lanterns :: sound and touch.
   Every sound is made in the browser as it is needed: there are no audio files. A low bed for the Undertoll that tightens as the Bell
   grows restless, a toll at each new room, dice, a short phrase for each outcome, coin at the stall, and a small buzz on phones that
   can. One button in the header steps through All sound, Effects only and Off, and the choice is saved on this device.
   It watches the page and never touches the game: with this file left out, the game plays exactly as before.
   scripts/build-extras.cjs injects it into <head>. */
(function () {
  'use strict';
  var STORE = 'twolanterns.sound', MODES = ['all', 'fx', 'off'];
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

  function note(n) { log.push(n); if (log.length > 60) log.shift(); }
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
    return true;
  }
  function wake() {
    if (mode === 'off') return;
    if (!boot()) return;
    if (ctx.state === 'suspended' && !document.hidden) { try { ctx.resume(); } catch (e) {} }
    if (mode === 'all') bedOn();
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
    land: function () { hiss('bandpass', 900, 3, 0.06, 0.3); tone('sine', 150, 70, 0.14, 0.3); buzz(14); },
    toll: function (k) { bell(196 * Math.pow(2, -Math.min(7, k) / 9), 4.2, 0.2); },
    t0: function (w, hi) { tone('sine', 82, 38, 0.7, 0.5, w); hiss('lowpass', 240, 0.8, 0.5, 0.35, w); tone('sawtooth', 110 * hi, 104 * hi, 0.5, 0.05, w); },
    t1: function (w, hi) { tone('triangle', 196 * hi, 185 * hi, 0.35, 0.16, w); hiss('lowpass', 500, 1, 0.12, 0.14, w); },
    t2: function (w, hi) { bell(392 * hi, 0.9, 0.09, w); bell(523.25 * hi, 1.1, 0.09, w + 0.13); },
    t3: function (w, hi) { bell(392 * hi, 0.9, 0.09, w); bell(493.88 * hi, 0.9, 0.09, w + 0.11); bell(587.33 * hi, 1.0, 0.09, w + 0.22); bell(783.99 * hi, 1.8, 0.1, w + 0.34); },
    coin: function () { tone('sine', 2350, 0, 0.22, 0.09); tone('sine', 3520, 0, 0.3, 0.06, 0.05); tone('sine', 2960, 0, 0.25, 0.05, 0.11); buzz(8); },
    shop: function () { bell(880, 1.1, 0.06); bell(1174.7, 1.3, 0.05, 0.16); },
    joined: function () { bell(523.25, 0.9, 0.07); bell(783.99, 1.3, 0.07, 0.15); buzz([10, 40, 10]); },
    end: function (kind) {
      bell(98, 7, 0.32); bell(196, 5, 0.1, 0.02);
      if (kind === 'break') { hiss('highpass', 1800, 0.6, 0.35, 0.3, 0.5); tone('sawtooth', 300, 60, 0.9, 0.12, 0.5); }
      else if (kind === 'collapse' || kind === 'deadlock') { hiss('lowpass', 160, 0.7, 3, 0.5, 0.4); }
      else if (kind === 'ring') { bell(98, 7, 0.26, 1.6); }
      buzz([30, 60, 30]);
    }
  };
  function play(name, a, b) {
    note(name + (a === undefined || a === null ? '' : ':' + a));
    if (mode === 'off' || !touched) return;
    wake(); if (!ctx || ctx.state !== 'running') return;
    try { CUE[name](a, b); } catch (e) {}
  }

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
      if (mode === 'off') { bedOff(); if (ctx) { try { ctx.suspend(); } catch (err) {} } }
      else { wake(); if (mode === 'fx') bedOff(); play('tick'); }
      return;
    }
    if (t.closest('button, .opt, .rcard, summary, [data-act]')) play('tick');
  }
  function first() { if (!touched) { touched = true; } wake(); }

  window.__sound = { state: function () { return { mode: mode, ctx: ctx ? ctx.state : 'none', bed: !!bed, touched: touched }; }, log: log, cues: Object.keys(CUE) };

  function init() {
    host = document.getElementById('app'); if (!host) return;
    new MutationObserver(queue).observe(host, { childList: true, subtree: true });
    scan();
  }
  document.addEventListener('click', onClick);
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { document.addEventListener(t, first, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () { if (!ctx) return; try { if (document.hidden) ctx.suspend(); else if (mode !== 'off') ctx.resume(); } catch (e) {} });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
