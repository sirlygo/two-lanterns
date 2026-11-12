/* Two Lanterns :: options.
   One panel for everything a player may want to set: sound on or off, how loud the music, the effects and the narrator are,
   whether the narrator reads every screen, the size of the text, less motion, full screen, and the buzz on phones.
   It opens from the cog in the header, and every choice is kept on this device. It only watches the page and asks the sound
   and narrator parts to change: with this file left out, the game plays exactly as before.
   scripts/build-extras.cjs injects it into <head>, before the sound part, which reads the same saved choices as it starts. */
(function (g) {
  'use strict';
  var STORE = 'twolanterns.options', OLD = 'twolanterns.sound';
  var BASE = { v: 1, mute: false, music: 80, fx: 80, voice: 100, buzz: true, text: 0, calm: false };
  /* whatever was saved, made safe: unknown keys dropped, numbers kept in range, anything odd put back to its default */
  function normalize(o) {
    var out = {}, k;
    for (k in BASE) out[k] = BASE[k];
    if (!o || typeof o !== 'object') return out;
    ['mute', 'buzz', 'calm'].forEach(function (b) { if (typeof o[b] === 'boolean') out[b] = o[b]; });
    ['music', 'fx', 'voice'].forEach(function (n) { var v = Number(o[n]); if (o[n] !== null && o[n] !== undefined && o[n] !== '' && v >= 0 && v <= 100) out[n] = Math.round(v); });
    if (o.text === 1 || o.text === 2) out.text = o.text;
    return out;
  }
  /* the old sound button had three positions; carry the last one over */
  function fromOld(mode) { var o = normalize(null); if (mode === 'fx') o.music = 0; else if (mode === 'off') o.mute = true; return o; }
  g.__options = { normalize: normalize, fromOld: fromOld };
  if (typeof document === 'undefined') return;

  var opt = normalize(null), host = null, dlg = null, queued = false;
  try {
    var raw = localStorage.getItem(STORE);
    if (raw) opt = normalize(JSON.parse(raw));
    else { opt = fromOld(localStorage.getItem(OLD)); localStorage.setItem(STORE, JSON.stringify(opt)); }
  } catch (e) {}
  function keep() { try { localStorage.setItem(STORE, JSON.stringify(opt)); } catch (e) {} }
  function show() {      /* what only this file can do: the look of the page */
    var c = document.documentElement.classList;
    c.toggle('tl-t1', opt.text === 1); c.toggle('tl-t2', opt.text === 2); c.toggle('tl-calm', !!opt.calm);
  }
  function voice() { try { if (g.__narrator && g.__narrator.volume) g.__narrator.volume(opt.voice / 100); } catch (e) {} }
  function tell() { try { if (g.__sound && g.__sound.set) g.__sound.set({ mute: opt.mute, music: opt.music, fx: opt.fx, buzz: opt.buzz }); } catch (e) {} voice(); }
  show();
  g.__options.get = function () { return normalize(opt); };
  g.__options.set = function (o) { var m = normalize(opt), k; for (k in o) m[k] = o[k]; opt = normalize(m); keep(); show(); tell(); paint(); return normalize(opt); };
  g.__options.open = function () { open(); };

  var COG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zM19 12a7 7 0 0 0-.1-1.2l2-1.5-1.9-3.3-2.3.9a7 7 0 0 0-2.1-1.2L14.2 3h-3.8l-.4 2.7a7 7 0 0 0-2.1 1.2l-2.3-.9-1.9 3.3 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 1.9 3.3 2.3-.9a7 7 0 0 0 2.1 1.2l.4 2.7h3.8l.4-2.7a7 7 0 0 0 2.1-1.2l2.3.9 1.9-3.3-2-1.5c.07-.4.1-.8.1-1.2z"/></svg>';
  var canBuzz = !!navigator.vibrate && (function () { try { return g.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })(),      /* a desk has nothing to buzz */
      canFull = !!(document.documentElement.requestFullscreen && document.fullscreenEnabled !== false);
  var canVoice = (function () { try { var a = new Audio(); a.volume = 0.5; return a.volume === 0.5; } catch (e) { return false; } })();      /* a phone that fixes an element's volume cannot have this slider */
  function hasNarrator() { return !!(g.__narrator && g.__narrator.state); }
  function narrOn() { try { return !!g.__narrator.state().on; } catch (e) { return false; } }

  function sw(key, on, label) { return '<button type="button" class="opts-sw" role="switch" data-k="' + key + '" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + label + '"><span class="opts-knob" aria-hidden="true"></span></button>'; }
  function row(label, control, hint) { return '<div class="opts-row"><div class="opts-l"><span>' + label + '</span>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>' + control + '</div>'; }
  function slide(key, label, v) { return '<label class="opts-row opts-slide"><span class="opts-l"><span>' + label + '</span></span><input type="range" min="0" max="100" step="5" value="' + v + '" data-k="' + key + '" aria-label="' + label + ' volume"><output data-o="' + key + '">' + v + '</output></label>'; }
  function body() {
    var h = '<div class="opts-head"><h2 id="opts-h">Options</h2><button type="button" class="opts-x" data-k="close" aria-label="Close options">&times;</button></div>';
    h += '<section><h3>Sound</h3>' + row('Sound', sw('sound', !opt.mute, 'Sound')) + slide('music', 'Music', opt.music) + slide('fx', 'Effects', opt.fx) + '</section>';
    if (hasNarrator()) h += '<section><h3>Narrator</h3>' + row('Read every screen aloud', sw('narr', narrOn(), 'Read every screen aloud')) + (canVoice ? slide('voice', 'Voice', opt.voice) : '') + '</section>';
    h += '<section><h3>Display</h3>' + row('Text size', '<div class="opts-seg" role="group" aria-label="Text size">' + ['Normal', 'Large', 'Larger'].map(function (n, i) { return '<button type="button" data-k="text" data-v="' + i + '" aria-pressed="' + (opt.text === i ? 'true' : 'false') + '">' + n + '</button>'; }).join('') + '</div>') +
      row('Less motion', sw('calm', opt.calm, 'Less motion'), 'Stills the fades and the drifting light.') +
      (canFull ? row('Full screen', '<button type="button" class="btn ghost small opts-full" data-k="full">' + (document.fullscreenElement ? 'Leave' : 'Enter') + '</button>') : '') + '</section>';
    if (canBuzz) h += '<section><h3>Touch</h3>' + row('Vibration', sw('buzz', opt.buzz, 'Vibration'), 'A short buzz on dice and outcomes.') + '</section>';
    h += '<div class="opts-foot"><p class="fine">Saved on this device.</p><button type="button" class="btn primary small" data-k="close">Done</button></div>';
    return h;
  }
  function paint() {
    if (!dlg) return;
    var q = function (s) { return dlg.querySelector(s); }, set = function (s, on) { var n = q(s); if (n) n.setAttribute('aria-checked', on ? 'true' : 'false'); };
    set('[data-k=sound]', !opt.mute); set('[data-k=calm]', opt.calm); set('[data-k=buzz]', opt.buzz); set('[data-k=narr]', narrOn());
    ['music', 'fx', 'voice'].forEach(function (k) { var i = q('input[data-k=' + k + ']'), o = q('output[data-o=' + k + ']'); if (i && +i.value !== opt[k]) i.value = opt[k]; if (o) o.textContent = opt[k]; if (i && k !== 'voice') i.disabled = opt.mute; });
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-k=text]'), function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-v') === opt.text ? 'true' : 'false'); });
    var f = q('[data-k=full]'); if (f) f.textContent = document.fullscreenElement ? 'Leave' : 'Enter';
  }
  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'tlo'; dlg.setAttribute('aria-labelledby', 'opts-h');
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { shut(); return; }      /* a click on the dimmed page behind */
      var b = e.target.closest ? e.target.closest('[data-k]') : null; if (!b || b.tagName === 'INPUT') return;
      var k = b.getAttribute('data-k');
      if (k === 'close') shut();
      else if (k === 'sound') g.__options.set({ mute: !opt.mute });
      else if (k === 'calm') g.__options.set({ calm: !opt.calm });
      else if (k === 'buzz') { g.__options.set({ buzz: !opt.buzz }); try { if (opt.buzz) navigator.vibrate(14); } catch (err) {} }
      else if (k === 'text') g.__options.set({ text: +b.getAttribute('data-v') });
      else if (k === 'narr') { try { g.__narrator.set(!narrOn()); } catch (err) {} voice(); paint(); }
      else if (k === 'full') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {}); } catch (err) {} }
    });
    dlg.addEventListener('input', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k === 'music' || k === 'fx' || k === 'voice') { var p = {}; p[k] = +e.target.value; g.__options.set(p); } });
    dlg.addEventListener('change', function (e) { if (e.target.getAttribute && e.target.getAttribute('data-k') === 'fx') { try { g.__sound.test('coin'); } catch (err) {} } });      /* let go of the slider and hear where it landed */
    dlg.addEventListener('cancel', function () { document.documentElement.classList.remove('tl-opts'); });
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('tl-opts'); });
    document.addEventListener('fullscreenchange', paint);
  }
  function open() {
    if (!dlg) build();
    dlg.innerHTML = body(); paint();
    document.documentElement.classList.add('tl-opts');
    try { if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); } catch (e) { dlg.setAttribute('open', ''); }
  }
  function shut() { try { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } catch (e) { dlg.removeAttribute('open'); } document.documentElement.classList.remove('tl-opts'); }

  function mount() {
    queued = false;
    var top = host.querySelector('header.top'); if (!top || top.querySelector('.optbtn')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'optbtn'; b.setAttribute('aria-label', 'Options'); b.setAttribute('title', 'Options: sound, text size and more'); b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = COG; top.appendChild(b);
  }
  function queue() { if (queued) return; queued = true; (g.requestAnimationFrame || g.setTimeout)(mount, 16); }
  function init() {
    host = document.getElementById('app'); if (!host) return;
    new MutationObserver(queue).observe(host, { childList: true, subtree: true });
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.optbtn')) open(); });
    mount(); voice();
    setTimeout(voice, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
