'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1], ctx = vm.createContext({ console });
vm.runInContext(main.slice(0, main.indexOf('/* Two Lanterns :: saved characters.')), ctx);
const { Engine: E, Data: D, Story: T, Art: A } = ctx, copy = x => JSON.parse(JSON.stringify(x));
const story = require('../story/descent.cjs'), fights = D.pool.filter(id => D.byId[id].combat);
assert.equal(fights.length, 3);
let seed = 15485863;
const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
E.setRng(rng);
const counts = {}, slots = new Set(), seen = new Set();
for (let n = 0; n < 4000; n++) {
  const order = E.drawRooms();
  assert.equal(order.length, 8); assert.equal(new Set(order).size, 8);
  assert.equal(order[0], D.opening); assert.equal(order[7], D.finaleId);
  const positions = order.map((id, i) => D.byId[id].combat ? i : -1).filter(i => i >= 0);
  assert(positions.length === 1 || positions.length === 2);
  if (positions.length === 2) assert(positions[1] - positions[0] > 1, 'Fights must have breathing room');
  counts[positions.length] = (counts[positions.length] || 0) + 1;
  positions.forEach(i => { slots.add(i); seen.add(order[i]); });
}
assert.equal(seen.size, 3); assert.equal(slots.size, 6);
assert(counts[2] > 1100 && counts[2] < 1700, 'Two-fight frequency should be near 35%');
seed = 7; const same = JSON.stringify(E.drawRooms()); seed = 7; assert.equal(JSON.stringify(E.drawRooms()), same);
const base = E.fresh(); base.names = ['Ember', 'Mint'];
base.picks = [0, 1].map(i => Object.fromEntries(D.create.map((q, j) => [q.id, q.opts[(i + j) % q.opts.length].id])));
E.begin(base);
let exchanges = 0;
for (const id of fights) {
  const room = D.byId[id];
  assert(A.names.includes(id));
  assert.equal(room.opts.length, 4); assert.equal(room.opts2.length, 4);
  for (const hand of [room.opts, room.opts2]) {
    assert.equal(new Set(hand.map(o => o.k)).size, 4);
    assert(hand.some(o => o.a === 'team') && hand.some(o => o.relic));
    for (const o of hand) { assert(A.icons.includes(o.ic), 'Missing move icon ' + o.ic); assert(o.out.good && o.out.meh && o.out.bad); }
  }
  for (const slot of [1, 6]) for (const set of [0, 1]) for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let d0 = 1; d0 <= 6; d0++) for (let d1 = 1; d1 <= 6; d1++) {
    const S = copy(base); S.order[slot] = id; S.room = slot; S.sets[slot] = set; S.pick = [a, b]; S.rl = { d: [d0, d1], rr: [false, false] };
    const before = JSON.stringify(S), pv = E.preview(S), narration = T.encounter(S, pv.ev.tier), banter = T.banter(S, pv.ev.tier, S.trust + pv.meta.trust);
    assert.equal(JSON.stringify(S), before, 'Story and preview must not mutate the shared save');
    assert.equal(T.encounter(copy(S), pv.ev.tier), narration, 'Peers must tell the same story');
    assert(narration && banter.lines.length === 2);
    const expected = pv.ev.tier.every(t => t >= 2) ? 'good' : pv.ev.tier.every(t => t < 2) ? 'bad' : 'mixed';
    assert.equal(narration, story.encounters[id][expected]);
    const result = E.commit(S);
    assert.equal(S.room, slot + 1); assert.equal(S.log.at(-1).rid, id);
    for (let who = 0; who < 2; who++) {
      assert.equal(S.p[who].hp, pv.after[who].hp);
      assert(S.p[who].hp > 0 && S.p[who].hp <= S.p[who].maxHp);
      assert(Number.isFinite(S.p[who].gold) && S.p[who].gold >= 0);
    }
    assert.equal(result.ev.tier.join(','), pv.ev.tier.join(','));
    exchanges++;
  }
}
const S = copy(base); S.room = 2; S.p[0].hp = 1;
assert(T.journey(S).includes(story.bridges.hurt)); S.p[0].hp = 6; S.trust = -3;
assert(T.journey(S).includes(story.bridges.cold)); S.trust = 5;
assert(T.journey(S).includes(story.bridges.warm)); S.trust = 0; S.log = [{ rid: fights[0] }];
assert(T.journey(S).includes(story.bridges.fight));
for (let i = 0; i < 8; i++) { S.room = i; assert.equal(T.journey(S)[0], story.chapters[i]); }
/* A legacy save keeps its original route; only a fresh descent draws new enemies. */
const legacy = copy(base); legacy.order = D.legacyOrder.slice();
const route = legacy.order.join(','); T.journey(legacy); assert.equal(legacy.order.join(','), route);
E.setRng(null);
console.log(JSON.stringify({ ok: true, draws: 4000, fightCounts: counts, fightTypes: [...seen], exchanges, legacyRouteUnchanged: true }));
