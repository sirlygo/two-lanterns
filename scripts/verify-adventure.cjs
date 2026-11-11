'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1], ctx = vm.createContext({ console });
vm.runInContext(source.slice(0, source.indexOf('/* Two Lanterns :: saved characters.')), ctx);
vm.runInContext(source.slice(source.indexOf('/* Two Lanterns :: online.js.'), source.indexOf('/* Two Lanterns :: net.js.')), ctx);
const { Engine: E, Data: D, Story: ST, Adventure: A, Online: O } = ctx, copy = x => JSON.parse(JSON.stringify(x));
function fresh() {
  const S = E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(i => Object.fromEntries(D.create.map((q, j) => [q.id, q.opts[(i + j) % q.opts.length].id])));
  E.begin(S); S.lead = 0; S.room = 3; S.p.forEach(c => { c.gold = 12; }); return S;
}
function phase(kind, extra) { const S = fresh(); S.adventure.queue = []; A.enqueue(S, kind, extra); A.open(S, 'intro'); return S; }
const vote = (S, who, i, key = A.key(S)) => A.apply(S, who, { op: 'vote', i, nonce: key });
const ready = (S, who = 0) => A.apply(S, who, { op: 'ready', nonce: A.key(S) });
let cases = 0;
/* A veto always leaves health and coin untouched; first votes and their duplicates reveal nothing. */
for (const votes of [[0, 0], [0, 1], [1, 0]]) {
  const S = phase('risk', { rid: 'nave', room: 2 }), before = copy(S.p), key = A.key(S);
  assert(vote(S, 0, votes[0])); assert(!vote(S, 0, votes[0])); assert.equal(S.adventure.phase.stage, 'offer');
  assert(vote(S, 1, votes[1])); assert.deepEqual(copy(S.p), before); assert.equal(S.adventure.risks.length, 0);
  assert(!vote(S, 1, votes[1], key)); assert(ready(S)); assert.equal(S.screen, 'intro'); cases++;
}
/* Saved/reloaded searches resolve to the same roll and reward; deeper steps cannot be repeated. */
let foundWin = false, foundLoss = false;
for (let seed = 0; seed < 80; seed++) {
  const S = phase('risk', { rid: 'nave', room: 3 }); S.adventure.seed = seed;
  const twin = copy(S); for (const x of [S, twin]) { assert(vote(x, 0, 1)); assert(vote(x, 1, 1)); }
  assert.equal(JSON.stringify(S), JSON.stringify(twin));
  const r = S.adventure.risks[0]; foundWin ||= r.success; foundLoss ||= !r.success;
  if (r.success) { const firstGold = S.p[0].gold; assert(ready(S)); assert.equal(S.adventure.phase.depth, 1); assert(vote(S, 0, 0)); assert(vote(S, 1, 1)); assert.equal(S.p[0].gold, firstGold); assert(ready(S)); assert(!S.adventure.phase); }
  cases++;
}
assert(foundWin && foundLoss);
/* Every option pair is exercised for each rare encounter, guide visit and contract response. */
for (const kind of ['guide', 'guideReturn', 'merchant', 'festival', 'falseexit', 'huntsman', 'bargain']) {
  const n = A.options(phase(kind), 0).length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const S = phase(kind), clone = copy(S); const before = JSON.stringify(S);
    A.options(S, 0); A.lines(S, 0); A.scene(S); A.title(S); assert.equal(JSON.stringify(S), before, 'Rendering changed state');
    for (const x of [S, clone]) { assert(vote(x, 0, i)); assert(vote(x, 1, j)); }
    assert.equal(JSON.stringify(S), JSON.stringify(clone));
    assert.equal(S.adventure.phase.stage, 'result');
    S.p.forEach(c => { assert(c.gold >= 0); assert(c.hp > 0 && c.hp <= c.maxHp); });
    if (S.adventure.phase.next === 'huntAgain') {
      assert(ready(S)); assert.equal(S.adventure.phase.round, 1); assert(vote(S, 0, 4)); assert(vote(S, 1, 4)); assert(!S.adventure.phase.next);
    }
    cases++;
  }
}
const poor = phase('merchant'); poor.p[0].gold = 0; const unchanged = JSON.stringify(poor);
assert(!vote(poor, 0, 0)); assert.equal(JSON.stringify(poor), unchanged);
/* Both stages of the hunter can be won or lost, with no second payout on replay. */
let hunterWins = 0, hunterLosses = 0;
for (let seed = 0; seed < 100; seed++) {
  const S = phase('huntsman'); S.adventure.seed = seed;
  vote(S, 0, 0); vote(S, 1, 1);
  if (S.adventure.phase.next) { ready(S); vote(S, 0, 2); vote(S, 1, 3); }
  if (S.adventure.phase.enemyHp === 0) hunterWins++; else hunterLosses++;
  const serialized = JSON.stringify(S); assert(!vote(S, 0, 0)); assert.equal(JSON.stringify(S), serialized); cases++;
}
assert(hunterWins && hunterLosses);
/* Kindness has an actual, visible price consequence at the second meeting. */
for (const affinity of [0, 1, 2]) {
  const S = phase('guideReturn'); S.adventure.guide.affinity = affinity; const gold = S.p[0].gold, rerolls = S.p[0].rerolls;
  vote(S, 0, 0); vote(S, 1, 2); assert.equal(S.p[0].gold, gold - (affinity === 2 ? 0 : affinity === 1 ? 1 : 2)); assert.equal(S.p[0].rerolls, rerolls + 1);
}
/* Private notes and pending votes are absent from the other seat, including saved guest snapshots. */
const secret = phase('bargain'); secret.net = O.fresh('TEST', 0, 1); const hostId = secret.adventure.contracts[0].id;
assert(O.apply(secret, 0, { a: 'adventure', op: 'vote', i: 0, nonce: A.key(secret), at: O.key(secret) }));
const projected = O.snap(secret, 1);
assert.equal(projected.adventure.contracts[0].id, undefined); assert.equal(projected.adventure.phase.votes[0], -2);
assert.equal(projected.adventure.seed, undefined); assert.equal(projected.adventure.queue, undefined); assert(projected.adventure.contracts[1].id);
assert.equal(secret.adventure.contracts[0].id, hostId, 'Projection mutated host');
assert(O.apply(secret, 1, { a: 'adventure', op: 'vote', i: 2, nonce: A.key(secret), at: O.key(secret) }));
assert.equal(O.snap(secret, 1).adventure.contracts[0].id, undefined);
assert(O.apply(secret, 0, { a: 'adventure', op: 'ready', nonce: A.key(secret), at: O.key(secret) }));
assert.equal(secret.screen, 'adventure');
assert(O.apply(secret, 1, { a: 'adventure', op: 'ready', nonce: A.key(secret), at: O.key(secret) }));
assert.equal(secret.screen, 'intro'); secret.screen = 'choose';
const trust = secret.trust; assert(A.apply(secret, 0, { op: 'confess' })); assert.equal(secret.trust, trust + 1);
assert(!A.apply(secret, 0, { op: 'confess' })); assert.equal(O.snap(secret, 1).adventure.contracts[0].id, hostId);
/* Each contract is fulfilled by its stated objective and paid only once at settlement. */
for (const id of Object.keys(A.content.deals)) {
  const S = fresh(), d = S.adventure.contracts[0]; d.id = id; d.response = 0; d.startLog = 0; d.startRoom = 3;
  S.log = [0, 1].map(room => ({ rid: 'nave', room, a: [id === 'hunger' ? 'self' : 'team', 'team'], tier: [2, 2], k: ['M', 'S'], oi: [0, 0] }));
  if (id === 'quiet') { S.order = ['nave', 'nave']; S.sets = null; }
  if (id === 'curiosity') S.adventure.risks.push({ room: 3, searched: true, success: true });
  assert(A.progress(S, 0).met, 'Objective cannot be fulfilled: ' + id);
  A.enqueue(S, 'settlement'); A.open(S, 'intro'); assert(d.fulfilled); assert(S.p[0].relics.includes(A.content.deals[id].relic));
  assert(d.sealedBonus, 'Keeping a fulfilled bargain sealed should pay its advertised bonus');
  const gold = S.p[0].gold; ready(S); A.enqueue(S, 'settlement'); A.open(S, 'intro'); assert.equal(S.p[0].gold, gold); cases++;
}
/* Twists last two rooms, are restored by JSON saves, and do not affect old games. */
for (const type of ['light', 'footstep', 'backward']) {
  const S = fresh(); S.adventure.schedule.twist = type; A.enqueue(S, 'twist'); A.open(S, 'intro');
  assert(A.active(S)); const saved = copy(S); assert.deepEqual(copy(A.active(saved)), copy(A.active(S)));
  if (type === 'backward') assert.equal(E.first(S), 1);
  S.room += 2; assert.equal(A.active(S), null); assert.equal(E.first(S), 0);
}
const legacy = fresh(); delete legacy.adventure; assert.equal(E.first(legacy), A.base.first(legacy));
assert.equal(A.route(legacy, 'intro'), 'intro'); assert(!A.apply(legacy, 0, { op: 'confess' }));
/* Every combination changes the displayed roll by exactly its stated modifier. */
let combos = new Set();
for (const r of D.rooms.concat(D.extra).filter(r => !r.finale)) for (let set = 0; set < 2; set++) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
  const S = fresh(); S.order[3] = r.id; S.sets[3] = set; S.pick = [i, j]; S.rl = { d: [6, 6], rr: [false, false] };
  const before = JSON.stringify(S), pv = E.preview(S); assert.equal(JSON.stringify(S), before);
  pv.ev.mod.forEach((mod, who) => assert.equal(pv.ev.total[who], mod + 6));
  if (pv.ev.combo) combos.add(pv.ev.combo.id);
}
assert.equal(combos.size, 4);
/* The best coordinated pair remains a viable way to win the optional hunter encounter. */
let plannedWins = 0;
for (let seed = 0; seed < 600; seed++) {
  const S = phase('huntsman'); S.adventure.seed = seed;
  for (let round = 0; round < 2; round++) {
    const target = round ? 6 : 5; let best = null;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const pair = [i, j].sort().join(','), bonus = pair === '0,1' || pair === '2,3' ? 1 : 0;
      const chance = [i, j].map((n, who) => Math.max(0, Math.min(6, 7 - target + S.p[who].stats[['M','G','L','S'][n]] + bonus)) / 6);
      const score = chance[0] + chance[1] + chance[0] * chance[1];
      if (!best || score > best.score) best = { i, j, score };
    }
    vote(S, 0, best.i); vote(S, 1, best.j);
    if (S.adventure.phase.enemyHp === 0) { plannedWins++; break; }
    if (!S.adventure.phase.next) break;
    ready(S);
  }
}
assert(plannedWins > 120 && plannedWins < 590, 'Coordinated hunter fights should be winnable without being automatic');
/* A rare purchase and a later contract reward both deliver their advertised stat gain. */
const duplicate = phase('merchant'); const originalLore = duplicate.p[0].stats.L;
vote(duplicate, 0, 0); vote(duplicate, 1, 2); ready(duplicate);
const contract = duplicate.adventure.contracts[0]; contract.id = 'curiosity'; contract.response = 0; contract.startRoom = 0;
duplicate.adventure.risks.push({ room: 3, searched: true, success: true });
A.enqueue(duplicate, 'settlement'); A.open(duplicate, 'intro'); assert.equal(duplicate.p[0].stats.L, originalLore + 2);
console.log(JSON.stringify({ ok: true, actionCases: cases, hunterWins, hunterLosses, plannedHunterWins: plannedWins, plannedHunterTrials: 600, privateSnapshots: true, contracts: 4, comboTypes: [...combos], twists: 3 }));
