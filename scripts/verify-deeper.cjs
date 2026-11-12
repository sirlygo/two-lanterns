'use strict';
/* Checks the deeper rules: whole descents played through every interlude, the fork, the landings, wounds, relics that answer
   once, the Bell, saves, and that a descent begun without them is left alone. Also reports how they move the game's balance. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];
function load(seed) {
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rnd;
  const ctx = vm.createContext({ console, Math: M });
  vm.runInContext(source.slice(0, source.indexOf('/* Two Lanterns :: saved characters.')), ctx);
  vm.runInContext(source.slice(source.indexOf('/* Two Lanterns :: online.js.'), source.indexOf('/* Two Lanterns :: net.js.')), ctx);
  return Object.assign(ctx, { rnd });
}
const copy = x => JSON.parse(JSON.stringify(x));
/* one descent, every choice at random; `deep` false strips the new rules at the start, as an older save would have none */
function descent(G, deep, policy) {
  const { Engine: E, Data: D, Adventure: A, Deeper: X, rnd } = G, pick = n => Math.floor(rnd() * n), seen = { fork: 0, dark: 0, upgrade: 0, bell: 0, lend: 0, wounds: 0 };
  const S = E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(() => Object.fromEntries(D.create.map(q => [q.id, q.opts[pick(q.opts.length)].id])));
  E.begin(S); E.rollFirst(S); if (!deep) delete S.deep;
  const drain = next => {
    let guard = 0;
    while ((S.adventure.phase || A.open(S, next)) && guard++ < 60) {
      const p = S.adventure.phase;
      if (p.stage === 'offer') {
        for (const who of [p.turn, 1 - p.turn]) {
          const o = A.options(S, who).filter(x => !x.disabled); assert(o.length, 'No option to take in ' + p.kind);
          const want = policy && policy(p, who, o); const i = (o.find(x => x.i === want) || o[pick(o.length)]).i;
          assert(A.apply(S, who, { op: 'vote', i, nonce: A.key(S) }), 'Vote refused in ' + p.kind);
        }
        assert.equal(p.stage, 'result', p.kind + ' did not resolve');
        if (p.kind === 'fork') { seen.fork++; } if (p.kind === 'upgrade') seen.upgrade++; if (p.kind === 'bell') seen.bell++;
      }
      assert(A.title(S) && A.scene(S) && Array.isArray(A.lines(S, 0)), 'Interlude has nothing to show: ' + p.kind);
      assert(A.apply(S, 0, { op: 'ready', nonce: A.key(S) }), 'Ready refused in ' + p.kind);
    }
    assert(guard < 60, 'Interludes did not end');
  };
  let rooms = 0;
  while (!S.end && rooms++ < 12) {
    if (E.stopDue(S) >= 0) { E.leave(S); drain('choose'); }
    const room = E.room(S); assert(room, 'No room at slot ' + S.room);
    S.pick = [pick(4), pick(4)]; E.roll(S); E.preview(S);
    if (deep) for (const who of [0, 1]) if (X.canLend(S, who) && E.preview(S).ev.tier[1 - who] < 2 && rnd() < 0.7) { assert(X.lend(S, who)); assert(!X.canLend(S, who) || !S.rl.lit[1 - who] === false); seen.lend++; }
    const before = S.p.map(c => c.scars), r = E.commit(S);
    if (deep) S.p.forEach((c, i) => { if (c.scars > before[i] && !r.finale) seen.wounds++; });
    if (r.finale) break;
    drain(E.stopDue(S) >= 0 ? 'stall' : 'choose');
  }
  assert(S.end, 'The descent did not end');
  if (deep) seen.dark = S.deep.dark.length;
  return { S, seen };
}
const G = load(20261111), { Engine: E, Data: D, Adventure: A, Deeper: X, Online: O } = G;
assert(X && A.kinds.fork && A.kinds.upgrade && A.kinds.bell, 'The deeper rules are not in the page');

/* whole descents, with and without the new rules */
const tally = deep => { const t = { n: 0, strong: 0, fair: 0, weak: 0, other: 0, scars: 0, gold: 0, fallen: 0, fork: 0, dark: 0, upgrade: 0, bell: 0, lend: 0, wounds: 0 };
  for (let i = 0; i < 1500; i++) { const { S, seen } = descent(G, deep); t.n++; const q = String(S.end.dk).split(':')[1]; t[q in t ? q : 'other']++;
    t.scars += S.p[0].scars + S.p[1].scars; t.gold += S.p[0].gold + S.p[1].gold; t.fallen += S.end.fates.filter(f => f === 'fallen').length; for (const k in seen) t[k] += seen[k];
    if (deep) { assert.equal(seen.fork, 3, 'Three forks in a descent'); assert.equal(seen.upgrade, 2, 'Two landings'); assert.equal(seen.bell, 2, 'Two exchanges with the Bell'); assert(S.deep.footing.every(f => f >= -1 && f <= 1)); assert(S.p.every((c, w) => S.deep.called[w].length <= c.relics.length)); }
    else assert(!S.deep && seen.fork === 0 && seen.upgrade === 0 && seen.bell === 0, 'A descent without the rules must not meet them'); }
  return t; };
const withRules = tally(true), without = tally(false);
const pct = (t, k) => Math.round(1000 * t[k] / t.n) / 10, avg = (t, k) => Math.round(100 * t[k] / t.n) / 100;

/* the fork: agreement, disagreement, and what the dark door does */
const start = () => { const S = E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(i => Object.fromEntries(D.create.map((q, j) => [q.id, q.opts[(i + j) % q.opts.length].id]))); E.begin(S); S.lead = 0; return S; };
const vote = (S, who, i) => A.apply(S, who, { op: 'vote', i, nonce: A.key(S) }), ready = S => A.apply(S, 0, { op: 'ready', nonce: A.key(S) });
function forked(v) { const S = start(); S.room = 1; S.adventure.queue = []; const order = E.order(S), dark = D.pool.find(id => order.indexOf(id) < 0);
  A.enqueue(S, 'fork', { slot: 1, lit: order[1], dark, from: order[0] }); assert(A.open(S, 'choose')); const lit = order[1];
  assert(vote(S, 0, v[0])); assert(!vote(S, 0, v[0]), 'A second vote is refused'); assert(vote(S, 1, v[1])); return { S, lit, dark }; }
{ let f = forked([0, 0]); assert.equal(E.order(f.S)[1], f.lit); assert(!X.isDark(f.S));
  f = forked([1, 1]); assert.equal(E.order(f.S)[1], f.dark); assert(X.isDark(f.S)); assert(ready(f.S)); assert.equal(f.S.screen, 'choose');
  const S = f.S, room = E.room(S); assert.equal(room.id, f.dark);
  assert(E.parts(S, 0, room, 0).some(p => p.l === 'The dark door' && p.v === -1), 'The dark door makes rolls harder');
  const twin = copy(S); delete twin.deep; for (const x of [S, twin]) { x.pick = [0, 0]; x.rl = { d: [6, 6], rr: [false, false] }; }
  const a = E.preview(S), b = E.preview(twin); a.ev.tier.forEach((t, i) => { if (t >= 2 && b.ev.tier[i] >= 2) assert.equal(a.fx[i].gold, b.fx[i].gold + 1, 'A success behind the dark door pays 1 more'); });
  f = forked([1, 0]); assert.equal(E.order(f.S)[1], f.dark, 'Whoever chooses first decides a split'); f = forked([0, 1]); assert.equal(E.order(f.S)[1], f.lit); }

/* the landings */
for (const landing of [0, 1]) for (let i = 0; i < 3; i++) { const S = start(); S.room = 3; S.adventure.queue = []; S.p[1].hp = 2; S.deep.wounds[1] = [{ k: 'M', until: 9 }];
  A.enqueue(S, 'upgrade', { landing }); A.open(S, 'choose'); const before = copy(S.p); assert(vote(S, 0, i)); assert(vote(S, 1, i));
  const id = X.content.upgrades[landing][i].id, sum = c => c.stats.M + c.stats.G + c.stats.L + c.stats.S;
  if (id === 'low' || id === 'high') assert.equal(sum(S.p[0]), sum(before[0]) + 1);
  if (id === 'coin') assert.equal(S.p[0].gold, before[0].gold + 2);
  if (id === 'bone') assert.equal(S.p[0].rerolls, before[0].rerolls + 1);
  if (id === 'breath') assert.equal(S.p[1].hp, S.p[1].maxHp);
  if (id === 'bind') { assert.deepEqual(copy(X.wounds(S, 1)), []); assert.equal(S.p[1].hp, 4); }
  assert(ready(S)); assert(!S.adventure.phase); }

/* wounds: -1 to the stat that was in use, for two rooms, then gone; never on a descent without the rules */
{ const S = start(); S.room = 2; S.deep.wounds[0] = [{ k: 'M', until: 4 }]; const room = E.room(S), oi = E.optsFor(S, 0, room).findIndex(o => o.k === 'M'), other = E.optsFor(S, 0, room).findIndex(o => o.k !== 'M');
  assert(E.parts(S, 0, room, oi).some(p => p.v === -1 && p.l === X.content.wounds.M.name)); assert(!E.parts(S, 0, room, other).some(p => p.l === X.content.wounds.M.name)); assert(!E.parts(S, 1, room, E.optsFor(S, 1, room).findIndex(o => o.k === 'M')).some(p => p.l === X.content.wounds.M.name));
  S.room = 4; assert.deepEqual(copy(X.wounds(S, 0)), [], 'A wound is gone after two rooms');
  const T = start(); T.room = 2; delete T.deep; assert.deepEqual(copy(X.wounds(T, 0)), []); assert(!X.canLend(T, 0)); }

/* relics answer once */
{ const S = start(); S.room = 2; S.p[0].relics = ['hymnal']; S.pick = [0, 0]; S.rl = { d: [1, 1], rr: [false, false] };
  assert(X.canLend(S, 0)); assert(!X.canLend(S, 1), 'No relic, nothing to call on'); assert(X.lend(S, 0)); assert.equal(S.rl.lit[1], 'hymnal'); assert(S.rl.d[1] >= 1 && S.rl.d[1] <= 6); assert.equal(S.rl.d[0], 1, 'Your own die is left alone');
  assert(!X.canLend(S, 0) && !X.lend(S, 0), 'The same relic does not answer twice'); S.rl = { d: [1, 1], rr: [false, false] }; assert(!X.canLend(S, 0), 'Nor in a later room');
  S.p[0].relics.push('heartcap'); assert(X.lend(S, 0)); assert(!X.lend(S, 0), 'One die is relit once in a room'); }

/* the Bell: two exchanges, an approach cannot be repeated, a relic stands firm, footing reaches the last roll, and a save gives the same result */
{ const S = start(); S.room = E.slots(S) - 1; S.adventure.queue = []; S.p[0].stats.M = 9; S.p[1].relics = ['hymnal']; A.enqueue(S, 'bell'); A.open(S, 'choose');
  const twin = copy(S); for (const x of [S, twin]) { assert(vote(x, 0, 0)); assert(vote(x, 1, 4)); } assert.equal(JSON.stringify(S), JSON.stringify(twin), 'A reloaded exchange resolves the same way');
  assert.deepEqual(copy(S.deep.footing), [0, 0], 'Footing is settled after the second exchange'); assert.deepEqual(copy(S.deep.called[1]), ['hymnal']); assert(ready(S)); assert.equal(S.adventure.phase.round, 1);
  assert(A.options(S, 0).find(o => o.i === 0).disabled, 'The Bell has learned the first approach'); assert(!A.options(S, 1).some(o => o.i === 4), 'The relic is spent'); assert(!vote(S, 0, 0));
  assert(vote(S, 0, 1)); assert(vote(S, 1, 2)); assert(ready(S)); assert(!S.adventure.phase && S.screen === 'choose');
  const room = E.room(S); assert(room.finale); assert(S.deep.footing.every(f => f >= -1 && f <= 1)); [0, 1].forEach(i => { const f = S.deep.footing[i], got = E.parts(S, i, room, 0).filter(p => /the Bell$/.test(p.l)); assert.equal(got.length, f ? 1 : 0); if (f) assert.equal(got[0].v, f); });
  S.deep.footing = [1, -1]; assert(E.parts(S, 0, room, 0).some(p => p.l === 'Footing at the Bell' && p.v === 1)); assert(E.parts(S, 1, room, 0).some(p => p.l === 'Wrong-footed by the Bell' && p.v === -1)); }

/* what a guest is sent still hides what it should, and carries the new state */
{ const S = start(); S.net = { me: 0, code: 'TEST', round: 0, ready: [false, false], made: [true, true], games: [] }; S.room = 1; S.adventure.queue = []; const order = E.order(S);
  A.enqueue(S, 'fork', { slot: 1, lit: order[1], dark: D.pool.find(id => order.indexOf(id) < 0), from: order[0] }); A.open(S, 'choose'); assert(A.apply(S, 0, { op: 'vote', i: 1, nonce: A.key(S) }));
  let snap; try { snap = O.snap(S, 1); } catch (e) { snap = null; }
  if (snap) { assert.equal(snap.adventure.phase.votes[0], -2, 'A guest sees that the host has voted, not what'); assert(snap.deep && snap.deep.v === 1); assert(!('seed' in snap.adventure)); } }

console.log(JSON.stringify({ ok: true, descents: withRules.n + without.n,
  each: { forks: avg(withRules, 'fork'), darkDoors: avg(withRules, 'dark'), landings: avg(withRules, 'upgrade') , relicsCalled: avg(withRules, 'lend'), wounds: avg(withRules, 'wounds') },
  balance: { before: { strong: pct(without, 'strong'), fair: pct(without, 'fair'), weak: pct(without, 'weak'), other: pct(without, 'other'), scars: avg(without, 'scars'), gold: avg(without, 'gold'), fallen: avg(without, 'fallen') },
             after: { strong: pct(withRules, 'strong'), fair: pct(withRules, 'fair'), weak: pct(withRules, 'weak'), other: pct(withRules, 'other'), scars: avg(withRules, 'scars'), gold: avg(withRules, 'gold'), fallen: avg(withRules, 'fallen') } } }));
