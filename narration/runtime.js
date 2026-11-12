/* Two Lanterns :: narrator.
   Optional recorded narration for the room, landing and title passages. Off by default and saved per device.
   It never blocks play, the text always stays on screen, and moving on stops the voice.
   scripts/build-narrator.cjs injects this into <head> only when narration/manifest.json lists clips. */
(function () {
  'use strict';
  var M = __NARRATION_MANIFEST__;
  if (!M || !M.clips) return;
/*__NARRATION_KEY__*/
  var STORE = 'twolanterns.narrator';
  var SPOTS = '.screen [data-narrate], .screen.stall p.story, .screen.title p.tag';
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"></path></svg>';
  var STOP = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"></rect></svg>';
  var on = false, activated = false, audio = null, loaded = null, shown = null, auto = null, hush = null, loud = 1;
  var queued = false, host = null;
  var passages = [], position = 0, running = false;
  var publicPassages = [], fullPassages = [];
  try { on = localStorage.getItem(STORE) === 'on'; } catch (e) {}

  function node(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  function current() { return !!(shown && loaded === passages[position]); }
  function live() { return !!(audio && current() && !audio.paused && !audio.ended); }
  function broken() { return !!(audio && current() && audio.error); }

  function player() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    try { audio.volume = loud; } catch (e) {}
    ['play', 'pause', 'ended', 'error', 'loadedmetadata', 'timeupdate'].forEach(function (t) { audio.addEventListener(t, sync); });
    audio.addEventListener('ended', function () {
      if (!running || !current()) return;
      if (position + 1 < passages.length) { position++; play(passages[position]); }
      else { running = false; sync(); }
    });
    return audio;
  }

  /* 50 ms of silence, played once inside the tap that switches the narrator on, so iOS lets later passages start by themselves. */
  function primer() {
    var n = 400, b = new Uint8Array(44 + n), v = new DataView(b.buffer), i;
    function put(o, t) { for (var k = 0; k < t.length; k++) b[o + k] = t.charCodeAt(k); }
    put(0, 'RIFF'); v.setUint32(4, 36 + n, true); put(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); put(36, 'data'); v.setUint32(40, n, true);
    for (i = 44; i < b.length; i++) b[i] = 128;
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }

  function prime() {
    var a = player();
    if (!hush) hush = primer();
    loaded = null;
    a.src = hush;
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }

  function play(key) {
    var clip = M.clips[key];
    if (!clip) return;
    var a = player();
    if (loaded !== key || a.error) { loaded = key; a.src = M.base + clip.f; }
    else { try { a.currentTime = 0; } catch (e) {} }
    var p = a.play();
    var token = shown;
    if (p && p.catch) p.catch(function () { if (shown === token && loaded === key) { running = false; sync(); } });
    sync();
  }

  function start(includePrivate) {
    passages = (includePrivate ? fullPassages : publicPassages).slice();
    if (!passages.length) return;
    position = 0;
    running = true;
    play(passages[0]);
  }

  function halt() {
    running = false;
    if (!audio) return;
    audio.pause();
    try { audio.currentTime = 0; } catch (e) {}
    sync();
  }

  function sync() {
    var row = host && host.querySelector('.nv');
    if (!row) return;
    var state = broken() ? 'bad' : live() ? 'live' : 'idle';
    var btn = row.querySelector('.nv-play');
    if (btn && btn.getAttribute('data-s') !== state) {
      btn.setAttribute('data-s', state);
      btn.innerHTML = (state === 'live' ? STOP : PLAY) + '<span>' + (state === 'bad' ? 'Unavailable' : state === 'live' ? 'Stop' : fullPassages.length > publicPassages.length ? 'Listen privately' : 'Listen') + '</span>';
      btn.disabled = state === 'bad';
    }
    var fill = row.querySelector('.nv-fill');
    if (fill) {
      var d = audio ? audio.duration : 0;
      fill.style.transform = 'scaleX(' + (state === 'live' && d && isFinite(d) ? Math.min(1, audio.currentTime / d) : 0) + ')';
    }
    var sw = row.querySelector('.nv-switch');
    if (sw) sw.setAttribute('aria-checked', on ? 'true' : 'false');
    row.setAttribute('data-live', state === 'live' ? '1' : '0');
  }

  function build(key) {
    var row = node('div', 'nv');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Narration');
    row.setAttribute('data-key', key);
    if (key) {
      var b = node('button', 'btn ghost small nv-play');
      b.type = 'button';
      row.appendChild(b);
      var bar = node('span', 'nv-bar', '<i class="nv-fill"></i>');
      bar.setAttribute('aria-hidden', 'true');
      row.appendChild(bar);
    }
    var s = node('button', 'nv-switch', '<span class="nv-knob" aria-hidden="true"></span><span>Narrator</span>');
    s.type = 'button';
    s.setAttribute('role', 'switch');
    s.setAttribute('title', 'Read the story on every screen aloud. Saved on this device only.');
    row.appendChild(s);
    return row;
  }

  function mount(spot, key) {
    var next = spot.nextElementSibling;
    if (next && next.classList.contains('nv') && next.getAttribute('data-key') === key) return;
    var old = host.querySelectorAll('.nv');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    spot.parentNode.insertBefore(build(key), spot.nextSibling);
  }

  function leave() {
    running = false;
    shown = null;
    passages = [];
    publicPassages = []; fullPassages = [];
    auto = null;
    if (audio && !audio.paused) audio.pause();
  }

  function scan() {
    queued = false;
    var spots = host.querySelectorAll(SPOTS);
    var list = [].slice.call(spots);
    var keysOf = function (nodes) { return nodes.map(function (spot) { return narrationKey(spot.textContent); }).filter(function (key) { return !!M.clips[key]; }); };
    var allKeys = keysOf(list), keys = keysOf(list.filter(function (spot) { return !spot.hasAttribute('data-private-narration'); }));
    if (!spots.length || (!keys.length && !host.querySelector('.screen.title'))) { leave(); return; }
    var want = allKeys.join('|');
    var visible = list.filter(function (spot) { return !spot.closest('details:not([open])'); });
    mount(visible.length ? visible[visible.length - 1] : spots[0], want);
    if (want !== shown) {
      running = false;
      if (audio && !audio.paused) audio.pause();
      passages = keys;
      publicPassages = keys; fullPassages = allKeys;
      position = 0;
      shown = want;
      if (want && on && activated && want !== auto) { auto = want; start(); }
    }
    sync();
  }

  function queue() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || window.setTimeout)(scan, 16);
  }

  function mine(n) { return !!(n && n.nodeType === 1 && (n.classList.contains('nv') || (n.closest && n.closest('.nv')))); }

  function onChange(list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (mine(r.target)) continue;
      var nodes = [].slice.call(r.addedNodes).concat([].slice.call(r.removedNodes));
      if (nodes.length && nodes.every(mine)) continue;
      queue();
      return;
    }
  }

  function onClick(e) {
    var t = e.target && e.target.closest && e.target.closest('.nv-play, .nv-switch');
    if (!t) return;
    activated = true;
    var key = shown || '';
    if (t.classList.contains('nv-play')) {
      if (live()) halt();
      else if (key) { auto = key; start(true); }
    } else {
      on = !on;
      try { localStorage.setItem(STORE, on ? 'on' : 'off'); } catch (err) {}
      if (!on) halt();
      else if (key) { auto = key; start(); }
      else prime();
      sync();
    }
  }

  function init() {
    host = document.getElementById('app');
    if (!host) return;
    new MutationObserver(onChange).observe(host, { childList: true, subtree: true });
    scan();
  }

  window.__narrator = {
    /* for the Options panel: how loud the voice is (0 to 1), and the same switch the Narrator control on the page works */
    volume: function (v) { if (v !== undefined && +v >= 0 && +v <= 1) { loud = +v; if (audio) { try { audio.volume = loud; } catch (e) {} } } return loud; },
    set: function (want) {
      want = !!want; if (want === on) return on;
      on = want; activated = true;
      try { localStorage.setItem(STORE, on ? 'on' : 'off'); } catch (err) {}
      if (!on) halt(); else if (shown) { auto = shown; start(); } else prime();
      sync();
      return on;
    },
    key: narrationKey,
    clips: M.clips,
    state: function () {
      return { on: on, shown: shown, loaded: loaded, queue: passages.slice(), position: position, activated: activated, playing: live(), time: audio ? audio.currentTime : 0, length: audio ? audio.duration : 0, src: audio ? (audio.currentSrc || audio.src) : '' };
    }
  };

  document.addEventListener('click', onClick);
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { activated = true; }, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && audio && !audio.paused) audio.pause(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
