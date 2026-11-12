/* Two Lanterns :: agreements, bargains, recurring company and rare turns of the stair.
   Only authoritative actions mutate this state. Preview, options and projection are pure. */
(function (g) {
  'use strict';
  const C = __ADVENTURE_CONTENT__, E = g.Engine, D = g.Data, ST = g.Story;
  const A = { content: C, base: {} }, KS = ['M', 'G', 'L', 'S'];
  const copy = x => JSON.parse(JSON.stringify(x));
  const state = S => S.adventure && S.adventure.v === 1 ? S.adventure : null;
  const record = (S, kind, text) => { const a = state(S); if (a) a.memory.push({ kind, text }); };
  const hp = (S, who, n) => { const c = S.p[who], h = E.hpApply(c, n); c.hp = h.hp; c.maxHp = h.maxHp; c.scars = h.scars; };
  const reroll = (S, who) => { S.p[who].rerolls++; S.p[who].bones = (S.p[who].bones || 0) + 1; };
  const relic = (S, who, id) => { const c = S.p[who], r = C.relics[id]; if (!r) return; c.relics.push(id); c.stats[r.k] += r.amt; };
  const toll = (S, n) => { S.toll = Math.max(0, S.toll + n); };
  const roll = (S, p, who, salt) => 1 + E.hash(state(S).seed + '|' + p.id + '|' + p.depth + '|' + p.round + '|' + who + '|' + salt) % 6;
  const accepted = d => d && (d.response === 0 || d.response === 1);
  /* further kinds of interlude register themselves here (deeper/runtime.js): { prepare, options, scene, title, lines, resolve } */
  A.kinds = {}; A.util = { state, record, hp, reroll, relic, toll, roll, KS };
  A.active = S => { const a = state(S), t = a && a.twist; return t && S.room >= t.from && S.room < t.until ? t : null; };
  A.key = S => { const p = state(S) && state(S).phase; return p ? [p.id, p.stage, p.depth, p.round].join(':') : ''; };
  A.start = function (S) {
    const seed = E.hash(E.order(S).join('|') + '|' + S.names.join('|') + '|' + JSON.stringify(S.picks));
    const dealIds = Object.keys(C.deals), first = seed % dealIds.length;
    S.adventure = { v: 1, seed, serial: 0, queue: [], phase: null, resume: null, memory: [], risks: [], combos: [],
      contracts: [0, 1].map(i => ({ id: dealIds[(first + i + 1) % dealIds.length], response: -1, revealed: false, startLog: 0, startRoom: 0, settled: false })),
      guide: { affinity: 0, met: false, returned: false }, twist: null, dealt: false, settled: false,
      schedule: { rare: E.hash(seed + '|rare') % 100 < 40 ? ['merchant', 'festival', 'falseexit', 'huntsman'][E.hash(seed + '|which') % 4] : null,
        rareRoom: E.hash(seed + '|when') % 2 ? 3 : 5, twist: E.hash(seed + '|twist') % 100 < 65 ? ['light', 'footstep', 'backward'][E.hash(seed + '|kind') % 3] : null } };
  };
  A.enqueue = function (S, kind, extra) {
    const a = state(S); if (!a) return;
    a.queue.push(Object.assign({ id: ++a.serial, kind, stage: 'offer', votes: [-1, -1], ready: [false, false], turn: E.first(S), depth: 0, round: 0, lines: [], details: [] }, extra || {}));
  };
  A.progress = function (S, who) {
    const a = state(S), d = a && a.contracts[who]; if (!d || !d.id) return { have: 0, need: 1, met: false };
    const logs = S.log.slice(d.startLog), id = d.id;
    let have = 0, need = 2;
    if (id === 'hunger') have = logs.filter(l => l.a[who] === 'self' && l.tier[who] >= 2).length;
    if (id === 'mercy') have = logs.filter(l => l.a[who] === 'team' && l.tier[who] >= 2).length;
    if (id === 'quiet') have = logs.slice(0, 2).filter(l => { const o = ST.moveOf(S, l, who); return o && !o.loot; }).length;
    if (id === 'curiosity') { need = 1; have = a.risks.filter(r => r.room >= d.startRoom && r.searched && r.success).length; }
    return { have: Math.min(have, need), need, met: have >= need };
  };
  function settle(S, p) {
    const a = state(S); p.lines = [C.text.settlement];
    if (a.settled) { p.details.push('These accounts have already been settled.'); return; }
    a.contracts.forEach((d, who) => {
      const met = accepted(d) && A.progress(S, who).met, sealed = !d.revealed;
      d.settled = true; d.revealed = true; d.fulfilled = met;
      if (!accepted(d)) { p.details.push(S.p[who].name + ': no bargain accepted.'); return; }
      if (met) {
        relic(S, who, C.deals[d.id].relic);
        if (d.id === 'mercy') { hp(S, 0, 2); hp(S, 1, 2); }
        else S.p[who].gold += d.id === 'curiosity' ? 1 : 2;
        if (d.id === 'curiosity') reroll(S, who);
        if (sealed) { S.p[who].gold++; d.sealedBonus = true; }
      }
      p.details.push(S.p[who].name + ': ' + C.deals[d.id].title + ' — ' + (met ? C.deals[d.id].reward + (sealed ? '; kept sealed: +1 gold.' : '.') : 'not fulfilled; no penalty.'));
    });
    a.settled = true; record(S, 'bargains', 'The chandler settled the private bargains before the Bellheart.');
  }
  function prepare(S, p) {
    if (A.kinds[p.kind] && A.kinds[p.kind].prepare) A.kinds[p.kind].prepare(S, p);
    if (p.kind === 'bargain') state(S).dealt = true;
    if (p.kind === 'twist') {
      const type = state(S).schedule.twist;
      state(S).twist = { type, from: S.room, until: S.room + 2,
        keys: [0, 1].map(i => KS.reduce((k, n) => S.p[1 - i].stats[n] > S.p[1 - i].stats[k] ? n : k, 'M')) };
      p.lines = [C.text[type === 'light' ? 'twistLight' : type === 'footstep' ? 'twistFootstep' : 'twistBackward']];
      p.stage = 'result'; record(S, 'twist', { light: 'The lanterns shared their strongest skills.', footstep: 'A third footstep rewarded cooperation and noticed selfish successes.', backward: 'The backward hour reversed who chose first.' }[type]);
    }
    if (p.kind === 'settlement') { settle(S, p); p.stage = 'result'; }
    p.turn = E.first(S);
  }
  A.open = function (S, next) {
    const a = state(S); if (!a || !a.queue.length || a.phase) return false;
    a.resume = next; a.phase = a.queue.shift(); prepare(S, a.phase); S.screen = 'adventure'; return true;
  };
  A.route = (S, next) => A.open(S, next) ? 'adventure' : next;
  A.advance = function (S) {
    const a = state(S), p = a.phase;
    if (p.next) {
      if (p.next === 'deeper') p.depth = 1; else p.round = 1;
      p.next = null; p.stage = 'offer'; p.votes = [-1, -1]; p.ready = [false, false]; p.lines = []; p.details = []; p.turn = E.first(S);
      return;
    }
    a.phase = null;
    if (!A.open(S, a.resume)) { S.screen = a.resume; a.resume = null; }
  };
  A.options = function (S, who) {
    const a = state(S), p = a && a.phase; if (!p || p.stage !== 'offer') return [];
    const opt = (i, title, note, cost = 0) => ({ i, title, note, disabled: S.p[who].gold < cost });
    if (A.kinds[p.kind]) return A.kinds[p.kind].options(S, who, p, opt);
    switch (p.kind) {
      case 'risk': return p.depth ? [opt(0, 'Bank the find', 'Keep the first reward; no further risk.'), opt(1, 'One more step', 'Both must agree. D6: 4–6 gives 2 gold each; 1–3 costs 2 health each and +1 Undertoll.')]
        : [opt(0, 'Leave safely', 'Either lantern can end the search; no cost.'), opt(1, 'Search once more', 'Both must agree. D6: 3–6 gives 1 gold each; 1–2 costs 1 health each.')];
      case 'bargain': return [opt(0, 'Accept in secret', 'Fulfil it while keeping it sealed for +1 extra gold. Your answer stays private until settlement.'), opt(1, 'Accept and tell your partner', 'Reveal your bargain now; trust +1 instead of the secrecy bonus.'), opt(2, 'Decline', 'No reward, no penalty, no obligation.')];
      case 'guide': return [opt(0, 'Free Nim', 'Taking the time raises the Undertoll by 1 for the pair. He will remember your kindness.'), opt(1, 'Hire the local expert', 'Pay 1 gold for his help; he will remember the transaction.', 1), opt(2, 'Leave him to it', 'No cost. Future assistance will be more expensive.')];
      case 'guideReturn': { const price = a.guide.affinity >= 2 ? 0 : a.guide.affinity === 1 ? 1 : 2;
        return [opt(0, 'Ask for a lucky turning', (price ? 'Pay ' + price + ' gold; ' : 'A friend’s gift; ') + 'gain 1 knucklebone reroll.', price), opt(1, 'Exchange a kind word', 'Quiet the Undertoll by 1. No cost.'), opt(2, 'Walk on', 'Keep your own counsel.')]; }
      case 'merchant': return [opt(0, 'Buy the Crooked Star', '3 gold. A relic granting +1 Lore.', 3), opt(1, 'Accept the tea', 'Heal 1 health. On the house.'), opt(2, 'Pass the counter', 'No cost.')];
      case 'festival': return [opt(0, 'Join the dance', 'Heal 1. If you both join, trust +2.'), opt(1, 'Lift a coin-ribbon', 'D6: 4–6 gives 3 gold and +1 Undertoll; 1–3 costs 1 health.'), opt(2, 'Watch without intruding', 'Quiet the Undertoll by 1.')];
      case 'falseexit': return [opt(0, 'Test the threshold', 'D6: 4–6 gives 2 gold; 1–3 costs 1 health.'), opt(1, 'Follow the small chalk mark', a.guide.affinity ? 'Nim’s mark: gain 1 reroll safely.' : 'A cautious detour: quiet the Undertoll by 1.'), opt(2, 'Keep walking', 'Leave the tempting doorway alone.')];
      case 'huntsman': return KS.map((k, i) => opt(i, ['Hold the line', 'Slip behind the staff', 'Read the writ', 'Light a ward'][i], D.stats[k] + ' ' + S.p[who].stats[k] + ' + d6 vs ' + (p.round ? 6 : 5) + '. Might/Guile or Lore/Spirit pairs gain +1 each.')).concat([opt(4, 'Retreat', 'You take no damage and make no attack this exchange. Both retreating ends the fight safely.')]);
    }
    return [];
  };
  A.scene = function (S) { const p = state(S).phase; if (A.kinds[p.kind]) return A.kinds[p.kind].scene(S, p); return { risk: p.rid, bargain: 'stall', guide: 'nim', guideReturn: 'nim-return', merchant: 'stall', festival: 'festival', falseexit: 'falseexit', huntsman: 'huntsman', twist: 'q-lantern', settlement: 'stall2' }[p.kind]; };
  A.title = function (S) { const p = state(S).phase; if (A.kinds[p.kind]) return A.kinds[p.kind].title(S, p); return { risk: p.depth ? 'One more step?' : 'Leave it alone?', bargain: 'A folded note', guide: 'Nim’s temporary difficulty', guideReturn: 'A familiar pair of boots', merchant: 'The Ragpicker’s Counter', festival: 'The Lanterns’ Wake', falseexit: 'Almost home', huntsman: 'The Bellmarked Huntsman', twist: 'The stair changes its mind', settlement: 'Accounts before the Bell' }[p.kind]; };
  A.lines = function (S, who) {
    const a = state(S), p = a.phase;
    if (p.stage === 'result') return p.lines;
    if (A.kinds[p.kind]) return A.kinds[p.kind].lines(S, who, p);
    if (p.kind === 'bargain') return [C.text.bargain, C.deals[a.contracts[who].id].text];
    const key = { risk: p.depth ? 'riskDeep' : 'risk', guide: 'nim', guideReturn: a.guide.affinity >= 2 ? 'nimFriend' : 'nimBusiness', merchant: 'merchant', festival: 'festival', falseexit: 'falseexit', huntsman: p.round ? 'huntAgain' : 'huntsman' }[p.kind];
    return key ? [C.text[key]] : [];
  };
  function resolvePhase(S, p) {
    const a = state(S), v = p.votes;
    p.stage = 'result'; p.lines = []; p.details = []; p.ready = [false, false];
    if (A.kinds[p.kind]) { A.kinds[p.kind].resolve(S, p, v); return; }
    if (p.kind === 'risk') {
      if (!v.every(n => n === 1)) { p.lines = [C.text[p.depth ? 'riskBank' : 'riskSafe']]; return; }
      const d = roll(S, p, 0, 'search'), success = d >= (p.depth ? 4 : 3);
      a.risks.push({ room: p.room, rid: p.rid, depth: p.depth, searched: true, success, die: d });
      if (success) S.p.forEach(c => { c.gold += p.depth ? 2 : 1; }); else { hp(S, 0, p.depth ? -2 : -1); hp(S, 1, p.depth ? -2 : -1); if (p.depth) toll(S, 1); }
      p.lines = [C.text[p.depth ? (success ? 'riskDeepWin' : 'riskDeepLose') : (success ? 'riskWin' : 'riskLose')]];
      p.details.push('Search die: ' + d + '. ' + (success ? '+' + (p.depth ? 2 : 1) + ' gold each.' : (p.depth ? '−2 health each; Undertoll +1.' : '−1 health each.')));
      if (success && !p.depth) p.next = 'deeper';
      record(S, 'risk', D.byId[p.rid].title + ': ' + (success ? 'an extra search paid off' : 'an extra search cost health') + (p.depth ? ' on the deeper step.' : '.'));
    } else if (p.kind === 'bargain') {
      a.contracts.forEach((d, i) => { d.response = v[i]; d.revealed = v[i] === 1; d.startLog = S.log.length; d.startRoom = S.room; if (d.revealed) S.trust++; });
      if (v.includes(1)) a.confessedAt = S.room;
      p.lines = [C.text.bargainDone];
    } else if (p.kind === 'guide') {
      const free = v.filter(n => n === 0).length, hire = v.filter(n => n === 1).length;
      v.forEach((n, i) => { if (n === 1) { S.p[i].gold--; p.details.push(S.p[i].name + ': paid 1 gold.'); } });
      a.guide.met = true; a.guide.affinity = free === 2 ? 2 : free || hire ? 1 : 0;
      if (free) { toll(S, 1); p.details.push('The delay stirred the Undertoll: +1.'); }
      p.lines = [C.text[free ? 'nimFreed' : hire ? 'nimHired' : 'nimLeft']];
      record(S, 'guide', free ? 'You helped Nim out of his bell-cord.' : hire ? 'You hired Nim and learned something about assumptions.' : 'You left Nim to free himself.');
    } else if (p.kind === 'guideReturn') {
      const price = a.guide.affinity >= 2 ? 0 : a.guide.affinity === 1 ? 1 : 2;
      v.forEach((n, i) => { if (n === 0) { S.p[i].gold -= price; reroll(S, i); p.details.push(S.p[i].name + ': +1 knucklebone' + (price ? '; −' + price + ' gold.' : '.')); } if (n === 1) { toll(S, -1); p.details.push(S.p[i].name + ': Undertoll −1.'); } });
      a.guide.returned = true; p.lines = [C.text[v.some(n => n !== 2) ? 'nimGift' : 'nimFarewell']];
      record(S, 'guide', 'Nim returned; earlier kindness set the price of his help.');
    } else if (p.kind === 'merchant') {
      v.forEach((n, i) => { if (n === 0) { S.p[i].gold -= 3; relic(S, i, 'advstar'); p.details.push(S.p[i].name + ': Crooked Star, +1 Lore; −3 gold.'); } if (n === 1) { hp(S, i, 1); p.details.push(S.p[i].name + ': healed 1.'); } });
      p.lines = [C.text.merchantDone]; record(S, 'rare', 'You found the ragpicker’s vanishing counter.');
    } else if (p.kind === 'festival') {
      v.forEach((n, i) => { if (n === 0) { hp(S, i, 1); p.details.push(S.p[i].name + ': healed 1.'); } if (n === 1) { const d = roll(S, p, i, 'ribbon'); if (d >= 4) { S.p[i].gold += 3; toll(S, 1); } else hp(S, i, -1); p.details.push(S.p[i].name + ': ribbon die ' + d + (d >= 4 ? ', +3 gold; Undertoll +1.' : ', −1 health.')); } if (n === 2) toll(S, -1); });
      if (v.every(n => n === 0)) { S.trust += 2; p.details.push('You danced together: trust +2.'); }
      p.lines = [C.text.festivalDone]; record(S, 'rare', 'You found a lantern festival beneath the town.');
    } else if (p.kind === 'falseexit') {
      v.forEach((n, i) => { if (n === 0) { const d = roll(S, p, i, 'door'); if (d >= 4) S.p[i].gold += 2; else hp(S, i, -1); p.details.push(S.p[i].name + ': threshold die ' + d + (d >= 4 ? ', +2 gold.' : ', −1 health.')); } if (n === 1) { if (a.guide.affinity) { reroll(S, i); p.details.push(S.p[i].name + ': Nim’s chalk mark grants 1 reroll.'); } else toll(S, -1); } });
      p.lines = [C.text.falseexitDone]; record(S, 'rare', 'You discovered that the warm doorway was a false way home.');
    } else if (p.kind === 'huntsman') {
      p.enemyHp = p.enemyHp == null ? 3 : p.enemyHp;
      if (v.every(n => n === 4)) { p.lines = [C.text.huntRetreat]; record(S, 'rare', 'You retreated together from the Bellmarked Huntsman.'); return; }
      const pair = v.slice().sort().join(''), combo = pair === '0,1' || pair === '2,3', target = p.round ? 6 : 5;
      v.forEach((n, i) => { if (n === 4) { p.details.push(S.p[i].name + ' retreated from this exchange.'); return; }
        const d = roll(S, p, i, 'hunter'), k = KS[n], bonus = A.boost(S, i, k).reduce((sum, b) => sum + b.v, 0), mod = S.p[i].stats[k] + bonus + (combo ? 1 : 0), good = d + mod >= target;
        if (good) p.enemyHp--; else hp(S, i, p.round ? -2 : -1);
        p.details.push(S.p[i].name + ': ' + d + ' + ' + mod + ' ' + D.stats[k] + ' vs ' + target + (good ? '; hunter −1 resolve.' : '; −' + (p.round ? 2 : 1) + ' health.'));
      });
      if (p.enemyHp <= 0) { p.enemyHp = 0; S.p.forEach(c => { c.gold += 2; }); const who = S.p[1].stats.M > S.p[0].stats.M ? 1 : 0; relic(S, who, 'advclapper'); p.lines = [C.text.huntWon]; p.details.push('+2 gold each. ' + S.p[who].name + ' gains Huntsman’s Clapper (+1 Might).'); record(S, 'rare', 'You defeated the Bellmarked Huntsman.'); }
      else if (!p.round) { p.lines = [C.text.huntRound]; p.next = 'huntAgain'; }
      else { toll(S, 1); p.lines = [C.text.huntLost]; p.details.push('Undertoll +1.'); record(S, 'rare', 'You survived two exchanges with the Bellmarked Huntsman.'); }
    }
  }
  A.apply = function (S, who, m) {
    const a = state(S); if (!a || ![0, 1].includes(who) || !m) return false;
    if (m.op === 'confess') {
      const d = a.contracts[who];
      if (S.screen !== 'choose' || !accepted(d) || d.revealed || d.settled) return false;
      d.revealed = true; a.confessedAt = S.room; S.trust++; record(S, 'confession', S.p[who].name + ' spoke a private bargain aloud.'); return true;
    }
    const p = a.phase;
    if (S.screen !== 'adventure' || !p || m.nonce !== A.key(S)) return false;
    if (m.op === 'ready') {
      if (p.stage !== 'result' || p.ready[who]) return false;
      p.ready[who] = true;
      if (!S.net || p.ready.every(Boolean)) A.advance(S);
      return true;
    }
    if (m.op !== 'vote' || p.stage !== 'offer' || p.votes[who] !== -1 || !Number.isInteger(m.i)) return false;
    if (!S.net && p.turn !== who) return false;
    const option = A.options(S, who).find(o => o.i === m.i); if (!option || option.disabled) return false;
    p.votes[who] = m.i;
    if (p.votes.every(n => n >= 0)) resolvePhase(S, p); else p.turn = 1 - who;
    return true;
  };
  A.project = function (S, who) {
    const a = state(S); if (!a) return S;
    delete a.seed; delete a.schedule; delete a.queue;
    const other = 1 - who, d = a.contracts[other];
    if (d && !d.revealed && !d.settled) a.contracts[other] = { concealed: true, answered: d.response >= 0 };
    const p = a.phase;
    if (p && (p.stage === 'offer' || p.kind === 'bargain')) p.votes[other] = p.votes[other] === -1 ? -1 : -2;
    return S;
  };
  A.boost = function (S, who, k) {
    const t = A.active(S); if (!t) return [];
    if (t.type === 'light' && t.keys[who] === k) return [{ l: 'Borrowed light', v: 1, kind: 'adventure' }];
    if (t.type === 'backward' && k === 'L') return [{ l: 'The backward hour', v: 1, kind: 'adventure' }];
    return [];
  };
  A.combo = function (ev) {
    if (ev.room.finale) return null;
    const o = ev.o, k = o.map(x => x.k), team = i => o[i].a === 'team';
    for (let i = 0; i < 2; i++) {
      const j = 1 - i;
      if (k[i] === 'M' && team(i) && k[j] === 'G' && ev.pre[i] >= 2) return { id: 'cover', targets: [j], actor: j };
      if (k[i] === 'L' && team(i) && k[j] === 'S' && ev.pre[i] >= 2) return { id: 'name', targets: [j], actor: j };
    }
    if (k.every(x => x === 'M') && team(0) && team(1) && ev.pre.some(t => t >= 2)) return { id: 'shoulders', targets: [0, 1] };
    if (k.every(x => x === 'G') && o.some(x => x.a === 'team') && ev.pre.some(t => t >= 2)) return { id: 'bluff', targets: [0, 1] };
    return null;
  };
  Object.assign(D.relics, C.relics);
  for (const k of ['begin', 'parts', 'first', 'resolve', 'effects', 'commit', 'leave']) A.base[k] = E[k];
  E.begin = function (S) { A.base.begin(S); A.start(S); };
  E.first = function (S) { const n = A.base.first(S), t = A.active(S); return t && t.type === 'backward' ? 1 - n : n; };
  E.parts = function (S, who, room, oi) {
    const parts = A.base.parts(S, who, room, oi); if (!state(S)) return parts;
    const op = E.optsFor(S, who, room)[oi], t = A.active(S);
    parts.push.apply(parts, A.boost(S, who, op.k));
    if (t && t.type === 'footstep' && op.a === 'team') parts.push({ l: 'Together against the third footstep', v: 1, kind: 'adventure' });
    return parts;
  };
  E.resolve = function (S) {
    const ev = A.base.resolve(S); if (!state(S)) return ev;
    const c = A.combo(ev); if (!c) return ev;
    ev.combo = c;
    c.targets.forEach(i => { ev.parts[i].push({ l: C.combos[c.id].title, v: 1, kind: 'combo' }); ev.base[i]++; ev.mod[i]++; ev.pre[i] = E.tierOf(ev.d[i], ev.base[i], ev.T); ev.total[i]++; ev.tier[i] = E.tierOf(ev.d[i], ev.mod[i], ev.T); });
    return ev;
  };
  E.effects = function (S, ev) {
    const r = A.base.effects(S, ev); if (!state(S)) return r;
    const t = A.active(S), c = ev.combo;
    if (t && t.type === 'footstep' && !ev.room.finale) r.meta.toll += ev.o.filter((o, i) => o.a === 'self' && ev.tier[i] >= 2).length;
    if (c && ev.tier.every(n => n >= 2)) {
      r.meta.trust++;
      if (c.id === 'cover') r.fx[c.actor].gold++;
      if (c.id === 'name') r.meta.toll--;
      if (c.id === 'shoulders') r.fx.forEach(f => { f.hp++; f.heal++; });
      if (c.id === 'bluff') r.fx.forEach(f => { f.gold++; });
    }
    r.after = [0, 1].map(i => E.hpApply(S.p[i], r.fx[i].hp));
    return r;
  };
  E.commit = function (S) {
    const slot = S.room, r = A.base.commit(S), a = state(S); if (!a) return r;
    if (r.ev.combo) { a.combos.push({ room: slot, id: r.ev.combo.id }); record(S, 'combo', r.ev.room.title + ': ' + C.combos[r.ev.combo.id].title + '.'); }
    if (r.finale) return r;
    if (slot >= 1) A.enqueue(S, 'risk', { rid: r.ev.room.id, room: slot });
    if (slot === 1) A.enqueue(S, 'guide');
    if (slot === 3 && a.schedule.twist) A.enqueue(S, 'twist');
    if (slot === 4) A.enqueue(S, 'guideReturn');
    if (slot === a.schedule.rareRoom && a.schedule.rare) A.enqueue(S, a.schedule.rare);
    return r;
  };
  E.leave = function (S) {
    const a = state(S), last = S.room >= E.slots(S) - 1, due = E.stopDue(S);
    const result = A.base.leave(S);
    if (!a || due < 0) return result;
    if (last && !a.settled) A.enqueue(S, 'settlement');
    else if (!last && !a.dealt) { a.dealt = true; A.enqueue(S, 'bargain'); }
    return result;
  };
  const plain = ST.plainParts;
  ST.plainParts = function (S) {
    const out = plain(S), a = state(S); if (!a) return out;
    out.rumors.push.apply(out.rumors, a.memory.map(m => m.text));
    if (a.settled) a.contracts.forEach((d, i) => out.rumors.push(S.p[i].name + ': ' + C.deals[d.id].title + ' — ' + (!accepted(d) ? 'declined.' : d.fulfilled ? 'fulfilled; ' + C.deals[d.id].reward + '.' : 'unfulfilled.')));
    if (a.guide.met) out.rumors.push(C.text[a.guide.affinity >= 2 ? 'endingFriend' : 'endingBusiness']);
    return out;
  };
  g.Adventure = A;
})(typeof window !== 'undefined' ? window : globalThis);
