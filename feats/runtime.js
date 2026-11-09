/* Two Lanterns :: feats.
   Thirty-two things worth doing on the way down, kept on this device beside the Book of Endings. A feat is earned when a descent ends,
   from what that descent actually did, and is shown on the ending and in the Book. Nothing here changes a roll, a rule or a word of
   the story: with this file left out, the game plays exactly as before. Erasing the Book erases the feats with it.
   scripts/build-extras.cjs injects it into <head>. */
(function (g) {
  'use strict';
  var STORE = 'twolanterns.feats';
  var rooms = function (S) { return (S.log || []).filter(function (l) { return l.pair !== 'fin'; }); };
  var count = function (a, f) { var n = 0; for (var i = 0; i < a.length; i++) if (f(a[i])) n++; return n; };
  var both = function (f) { return f(0) && f(1); }, either = function (f) { return f(0) || f(1); };
  var buys = function (S) { return (S.shop && S.shop.buys) || []; };
  var jar = function (S) { var b = buys(S).filter(function (x) { return x.kind === 'gamble'; })[0]; return b ? b.slip : ''; };
  /* id, name, what it asks, and the test. S is the finished descent; C is what this device remembers across descents. */
  var FEATS = [
    ['first', 'First Light', 'Reach the Bell and see how it ends.', function (S) { return true; }],
    ['ring', 'A True Toll', 'Ring the Bell, and ring it well.', function (S) { return S.end.dk === 'ring:strong'; }],
    ['break', 'Bellbreaker', 'Break the Bell cleanly.', function (S) { return S.end.dk === 'break:strong'; }],
    ['steal', 'Light Fingers', 'Carry the Bell’s heart out with barely a sound.', function (S) { return S.end.dk === 'steal:strong'; }],
    ['keep', 'The Long Watch', 'Take up the keeping of the Bell, and do it properly.', function (S) { return S.end.dk === 'keep:strong'; }],
    ['ruin', 'It Could Have Gone Worse', 'End a descent in collapse or deadlock.', function (S) { return S.end.kind === 'collapse' || S.end.kind === 'deadlock'; }],
    ['whole', 'Not a Scratch', 'Both lanterns finish without a single scar.', function (S) { return both(function (i) { return S.p[i].scars === 0; }); }],
    ['scars', 'Scarred but Standing', 'Finish on your feet with three scars or more.', function (S) { return either(function (i) { return S.p[i].scars >= 3 && S.end.fates[i] !== 'fallen'; }); }],
    ['stay', 'Someone Has to Stay', 'A lantern stays below as keeper, bound or martyr.', function (S) { return either(function (i) { return ['keeper', 'bound', 'martyr'].indexOf(S.end.fates[i]) >= 0; }); }],
    ['carried', 'Carried Home', 'One lantern brings the other back up the stair.', function (S) { return S.end.fates.indexOf('carried') >= 0; }],
    ['unbreakable', 'Thick as Thieves', 'End a descent with an unbreakable bond.', function (S) { return S.end.bond.id === 'unbreakable'; }],
    ['enemies', 'Daggers Drawn', 'End a descent as enemies, or betrayed.', function (S) { return S.end.bond.id === 'enemies' || S.end.bond.id === 'betray'; }],
    ['together', 'Shoulder to Shoulder', 'Both help each other in the same room, four times in one descent.', function (S) { return count(rooms(S), function (l) { return l.pair === 'tt'; }) >= 4; }],
    ['alone', 'Every Lantern for Itself', 'Finish a descent in which nobody ever helped.', function (S) { var r = rooms(S); return r.length >= 6 && count(r, function (l) { return l.a[0] === 'team' || l.a[1] === 'team'; }) === 0; }],
    ['glad', 'What We Came For', 'Both lanterns get what they went down for.', function (S) { return both(function (i) { return S.end.motiveLines[i].glad; }); }],
    ['snake', 'Snake Eyes', 'Both dice come up 1 in the same room.', function (S) { return count(S.log, function (l) { return l.d[0] === 1 && l.d[1] === 1; }) > 0; }],
    ['boxcars', 'Boxcars', 'Both dice come up 6 in the same room.', function (S) { return count(S.log, function (l) { return l.d[0] === 6 && l.d[1] === 6; }) > 0; }],
    ['instep', 'In Step', 'Both lanterns triumph in the same room.', function (S) { return count(S.log, function (l) { return l.tier[0] === 3 && l.tier[1] === 3; }) > 0; }],
    ['streak', 'On a Roll', 'One lantern triumphs four times in one descent.', function (S) { return either(function (i) { return count(S.log, function (l) { return l.tier[i] === 3; }) >= 4; }); }],
    ['clean', 'Sure-Footed', 'One lantern gets through a whole descent without a Disaster or a Scrape.', function (S) { return S.log.length >= 8 && either(function (i) { return count(S.log, function (l) { return l.tier[i] < 2; }) === 0; }); }],
    ['magpie', 'Magpie', 'One lantern comes up carrying three relics.', function (S) { return either(function (i) { return S.p[i].relics.length >= 3; }); }],
    ['purse', 'Heavy Purse', 'Come up with ten gold between you.', function (S) { return S.p[0].gold + S.p[1].gold >= 10; }],
    ['customer', 'Good Customer', 'Spend ten coin at the chandler’s in one descent.', function (S) { var t = 0; buys(S).forEach(function (b) { t += b.price; }); return t >= 10; }],
    ['window', 'Just Looking', 'Pass both landings without buying a thing.', function (S) { return !!S.shop && buys(S).length === 0; }],
    ['treat', 'My Treat', 'Pay for your partner at the chandler’s counter.', function (S) { return count(buys(S), function (b) { return b.payer !== b.to; }) > 0; }],
    ['dip', 'Lucky Dip', 'Draw a relic out of the sealed jar.', function (S) { return jar(S) === 'relic'; }],
    ['bitten', 'The Jar Bites Back', 'Draw the sting out of the sealed jar.', function (S) { return jar(S) === 'sting'; }],
    ['quiet', 'Let It Sleep', 'Reach the end with the Undertoll at nothing.', function (S) { return S.toll === 0; }],
    ['page', 'The Sexton’s Hand', 'Work out why the bells stopped.', function (S, C) { return C.solved; }],
    ['truth', 'Every Reason Why', 'Work out every reason the bells could have stopped.', function (S, C) { return C.causeTotal > 0 && C.causes >= C.causeTotal; }],
    ['ten', 'Regulars', 'Finish ten descents.', function (S, C) { return C.games >= 10; }],
    ['callings', 'All Four Callings', 'Finish a descent with each of the four callings.', function (S, C) { return C.callings >= 4; }]
  ];
  function evaluate(S, C) {
    var out = [];
    if (!S || !S.end || !S.p || !S.log) return out;
    FEATS.forEach(function (f) { try { if (f[3](S, C || {})) out.push(f[0]); } catch (e) { /* a descent this feat cannot read earns nothing */ } });
    return out;
  }

  var api = { FEATS: FEATS.map(function (f) { return { id: f[0], name: f[1], ask: f[2] }; }), evaluate: evaluate };
  g.__feats = api;
  if (typeof document === 'undefined') return;

  var mem = { v: 1, got: {}, calls: {}, last: '' }, fresh = [], freshFor = '', host = null, queued = false;
  function load() { try { var d = JSON.parse(localStorage.getItem(STORE) || 'null'); if (d && d.v === 1 && d.got) mem = { v: 1, got: d.got, calls: d.calls || {}, last: d.last || '' }; } catch (e) {} }
  function keep() { try { localStorage.setItem(STORE, JSON.stringify(mem)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function sig(S) { var s = S.end.index + '|' + S.log.map(function (l) { return l.rid + l.d.join('') + l.oi.join(''); }).join('.') + '|' + S.p.map(function (c) { return c.name; }).join('+'), h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return String(h >>> 0); }
  api.got = function () { return Object.keys(mem.got); };
  api.total = FEATS.length;

  function settle(t) {
    var S = t.S, k = sig(S);
    if (k === freshFor) return;
    if (k === mem.last) { freshFor = k; fresh = []; return; }      /* this ending was counted already: a reload, or the Book opened and closed */
    S.p.forEach(function (c) { if (c.picks && c.picks.calling) mem.calls[c.picks.calling] = 1; });
    var C = { games: 0, causes: 0, causeTotal: 0, solved: false, callings: Object.keys(mem.calls).length };
    try { C.games = t.B.games(); C.causes = Object.keys(t.B.causes()).length; C.causeTotal = t.D.story.causes.length; C.solved = t.ST.uncovered(S) >= 0; } catch (e) {}
    fresh = evaluate(S, C).filter(function (id) { return !mem.got[id]; });
    fresh.forEach(function (id) { mem.got[id] = Date.now(); });
    mem.last = k; freshFor = k; keep();
  }
  function name(id) { for (var i = 0; i < FEATS.length; i++) if (FEATS[i][0] === id) return FEATS[i]; return null; }
  function mountEnding(scr) {
    var old = scr.querySelector('.ft-note'), want = fresh.join(',');
    if (old && old.getAttribute('data-k') === want) return;
    if (old) old.parentNode.removeChild(old);
    if (!fresh.length) return;
    var n = document.createElement('aside'); n.className = 'ft-note'; n.setAttribute('data-k', want); n.setAttribute('role', 'status');
    n.innerHTML = '<p class="ft-h">' + (fresh.length === 1 ? 'Feat earned' : fresh.length + ' feats earned') + ' <span class="ft-c">' + api.got().length + ' of ' + FEATS.length + '</span></p><ul class="ft-new">' +
      fresh.map(function (id) { var f = name(id); return '<li><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span></li>'; }).join('') + '</ul>';
    var at = scr.querySelector('.bk-note'), bars = scr.querySelectorAll('.bar'), bar = bars[bars.length - 1];
    if (at && at.parentNode) at.parentNode.insertBefore(n, at.nextSibling); else if (bar) bar.parentNode.insertBefore(n, bar); else scr.appendChild(n);
  }
  function mountBook(scr) {
    var have = api.got().length, old = scr.querySelector('.ft-chapter');
    if (old && old.getAttribute('data-k') === String(have)) return;
    if (old) old.parentNode.removeChild(old);
    var n = document.createElement('div'); n.className = 'chapter ft-chapter'; n.setAttribute('data-k', String(have));
    n.innerHTML = '<h3>Feats</h3><p class="fine">Things worth doing on the way down. ' + have + ' of ' + FEATS.length + ' done.</p><ul class="ft-list">' +
      FEATS.map(function (f) { var on = !!mem.got[f[0]]; return '<li class="' + (on ? 'on' : 'off') + '"><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span><span class="sr">' + (on ? 'Done' : 'Not yet done') + '</span></li>'; }).join('') + '</ul>';
    var ch = scr.querySelectorAll('.chapter:not(.ft-chapter)'), lastCh = ch[ch.length - 1];
    if (lastCh) lastCh.parentNode.insertBefore(n, lastCh.nextSibling); else scr.appendChild(n);
  }
  function scan() {
    queued = false;
    var t = g.__tl; if (!t || !t.S) return;
    var scr = host.querySelector('.screen'); if (!scr) return;
    if (scr.classList.contains('book')) { mountBook(scr); return; }
    if (scr.classList.contains('ending') && t.S.end && t.S.p && t.S.log) { try { settle(t); } catch (e) { fresh = []; } mountEnding(scr); }
  }
  function queue() { if (queued) return; queued = true; (g.requestAnimationFrame || g.setTimeout)(scan, 16); }
  function init() {
    host = document.getElementById('app'); if (!host) return;
    load();
    new MutationObserver(queue).observe(host, { childList: true, subtree: true });
    document.addEventListener('click', function (e) { var b = e.target && e.target.closest && e.target.closest('[data-act="erase-yes"]'); if (b) { mem = { v: 1, got: {}, calls: {}, last: mem.last }; fresh = []; keep(); queue(); } });
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
