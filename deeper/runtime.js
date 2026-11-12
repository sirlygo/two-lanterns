/* Two Lanterns :: the deeper rules, for fresh descents only (S.deep). A descent begun before them keeps the rules it began with.
   - The fork: after the first, third and fifth rooms the stair divides. The lit stair is the room that was dealt; the dark door
     is another room, where every roll is 1 harder and every success pays 1 more gold. If the lanterns disagree, whoever
     chooses first in the rooms decides.
   - The landings: leaving each chandler's landing, each lantern takes one of three things it has learned.
   - Wounds: a scar taken in a room is a named wound, -1 to the stat that was being used, for the next two rooms.
   - Relics answer once: each relic can be called on one time, to reroll a partner's die or to stand firm against the Bell.
   - The Bell: before the last room, two exchanges. A lantern that holds both times has +1 on its last roll; one that gives
     ground both times has -1.
   The fork, the landings and the Bell are interludes of the Adventure layer, so they keep its nonces, privacy and saves. */
(function (g) {
  'use strict';
  const C = __DEEPER_CONTENT__, E = g.Engine, D = g.Data, A = g.Adventure, U = A.util, KS = U.KS;
  const X = { content: C, base: {} };
  const deep = S => (S && S.deep && S.deep.v === 1 && U.state(S) ? S.deep : null);
  const fill = (t, o) => t.replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));
  const least = c => KS.reduce((k, n) => (c.stats[n] < c.stats[k] ? n : k), 'M'), most = c => KS.reduce((k, n) => (c.stats[n] > c.stats[k] ? n : k), 'M');
  X.start = function (S) { S.deep = { v: 1, wounds: [[], []], called: [[], []], dark: [], footing: [0, 0] }; };
  X.wounds = (S, who) => { const d = deep(S); return d ? d.wounds[who].filter(w => w.until > S.room).map(w => w.k) : []; };
  X.charges = (S, who) => { const d = deep(S); return d ? S.p[who].relics.filter(id => d.called[who].indexOf(id) < 0) : []; };
  X.isDark = S => { const d = deep(S); return !!d && d.dark.indexOf(S.room) >= 0; };
  X.footing = (S, who) => { const d = deep(S); return d ? d.footing[who] : 0; };
  function spend(S, who) { const id = X.charges(S, who)[0]; if (!id) return null; deep(S).called[who].push(id); return id; }
  const relicName = id => (D.relics[id] ? D.relics[id].name : 'relic');

  /* ---------- the fork ---------- */
  function describe(S, rid) {
    const r = D.byId[rid], rel = r && D.relics[r.relic], out = [];
    if (rel) out.push('Its relic: ' + rel.name + ' (+' + (rel.amt || 1) + ' ' + D.stats[rel.k] + ').');
    const edged = [0, 1].filter(i => (r.perks || []).some(pk => S.p[i].tags.indexOf(pk.tag) >= 0)).map(i => S.p[i].name);
    out.push(edged.length === 2 ? 'You both have an edge there.' : edged.length ? edged[0] + ' has an edge there.' : 'Neither of you has an edge there.');
    return out.join(' ');
  }
  A.kinds.fork = {
    options: (S, who, p) => [
      { i: 0, title: 'The lit stair: ' + D.byId[p.lit].title, note: describe(S, p.lit), disabled: false },
      { i: 1, title: 'The dark door: ' + D.byId[p.dark].title, note: describe(S, p.dark) + ' Riskier and richer: every roll there is 1 harder, and every success pays 1 more gold.', disabled: false }],
    scene: (S, p) => p.from, title: () => 'The stair divides', lines: () => [C.text.fork],
    resolve(S, p, v) {
      const d = deep(S), lead = E.first(S), pick = v[0] === v[1] ? v[0] : v[lead];
      if (v[0] !== v[1]) p.lines.push(fill(C.text.forkSplit, { n: S.p[lead].name }));
      if (pick === 1 && d && p.slot === S.room && !E.room(S).finale) {
        S.order = E.order(S).slice(); S.order[p.slot] = p.dark; d.dark.push(p.slot);
        U.record(S, 'fork', 'You took the dark door to ' + D.byId[p.dark].title + '.');
      }
      p.lines.push(C.text[pick === 1 ? 'forkDark' : 'forkLit']);
      p.details.push('Next: ' + D.byId[pick === 1 ? p.dark : p.lit].title + (pick === 1 ? '. Rolls −1; each success +1 gold.' : '.'));
    }
  };
  function fork(S, from) {
    const a = U.state(S), order = E.order(S), slot = S.room, pool = D.pool.filter(id => order.indexOf(id) < 0 && D.byId[id]);
    if (!a || !pool.length || !D.byId[order[slot]] || D.byId[order[slot]].finale) return;
    A.enqueue(S, 'fork', { slot, lit: order[slot], dark: pool[E.hash(a.seed + '|fork|' + slot) % pool.length], from });
  }

  /* ---------- the landings ---------- */
  A.kinds.upgrade = {
    options: (S, who, p) => C.upgrades[p.landing ? 1 : 0].map((u, i) => ({ i, title: u.title, note: fill(u.note, { low: D.stats[least(S.p[who])], high: D.stats[most(S.p[who])] }), disabled: false })),
    scene: (S, p) => (p.landing ? 'stall2' : 'stall'), title: () => 'What the stair has taught you', lines: (S, who, p) => [C.text[p.landing ? 'upgrade1' : 'upgrade0']],
    resolve(S, p, v) {
      const d = deep(S);
      v.forEach((n, i) => {
        const u = C.upgrades[p.landing ? 1 : 0][n], c = S.p[i]; if (!u) return;
        let got = u.title;
        if (u.id === 'low') { const k = least(c); c.stats[k]++; got += ': +1 ' + D.stats[k]; }
        else if (u.id === 'high') { const k = most(c); c.stats[k]++; got += ': +1 ' + D.stats[k]; }
        else if (u.id === 'breath') { U.hp(S, i, Math.max(0, c.maxHp - c.hp)); got += ': healed to full'; }
        else if (u.id === 'coin') { c.gold += 2; got += ': +2 gold'; }
        else if (u.id === 'bone') { U.reroll(S, i); got += ': +1 reroll'; }
        else if (u.id === 'bind') { if (d) d.wounds[i] = []; U.hp(S, i, 2); got += ': wounds cleared, healed 2'; }
        p.details.push(c.name + ' · ' + got + '.');
      });
      p.lines = [C.text.upgradeDone];
    }
  };

  /* ---------- the Bell ---------- */
  A.kinds.bell = {
    prepare(S, p) { if (!p.used) p.used = [[], []]; },
    options(S, who, p) {
      const target = p.round ? 6 : 5, c = S.p[who], hurt = X.wounds(S, who);
      const out = C.approaches.map((ap, i) => { const mod = c.stats[ap.k] - (hurt.indexOf(ap.k) >= 0 ? 1 : 0);
        return { i, title: ap.title, note: 'D6 + ' + mod + ' ' + D.stats[ap.k] + ' against ' + target + '.' + ((p.used[who] || []).indexOf(i) >= 0 ? ' The Bell has learned this.' : ''), disabled: (p.used[who] || []).indexOf(i) >= 0 }; });
      const ch = X.charges(S, who);
      if (ch.length) out.push({ i: 4, title: 'Call on the ' + relicName(ch[0]), note: 'Stand firm without a roll. A relic answers once.', disabled: false });
      return out;
    },
    scene: () => 'bellheart', title: (S, p) => (p.round ? 'The Bell turns' : 'The Bell stirs'), lines: (S, who, p) => [C.text[p.round ? 'bellAgain' : 'bell']],
    resolve(S, p, v) {
      const d = deep(S), target = p.round ? 6 : 5; p.won = p.won || [0, 0];
      v.forEach((n, i) => {
        const c = S.p[i]; let good = false;
        if (n === 4) { const id = spend(S, i); good = !!id; p.details.push(c.name + ' called on the ' + relicName(id) + ': held.'); }
        else {
          const k = KS[n], roll = U.roll(S, p, i, 'bell'), mod = c.stats[k] - (X.wounds(S, i).indexOf(k) >= 0 ? 1 : 0);
          good = roll + mod >= target; p.used[i].push(n);
          p.details.push(c.name + ': ' + roll + ' + ' + mod + ' ' + D.stats[k] + ' against ' + target + (good ? '; held.' : p.round ? '; gave ground, Undertoll +1.' : '; gave ground, −1 health.'));
          if (!good) { if (p.round) U.toll(S, 1); else U.hp(S, i, -1); }
        }
        if (good) p.won[i]++;
      });
      if (!p.round) { p.lines = [C.text.bellRound]; p.next = 'bellAgain'; return; }
      p.lines = [C.text.bellDone];
      if (d) p.won.forEach((n, i) => { d.footing[i] = n - 1; p.details.push(S.p[i].name + (n >= 2 ? ' held both times: +1 on the last roll.' : n === 1 ? ' held once: no change to the last roll.' : ' gave ground both times: −1 on the last roll.')); });
      if (p.won.every(n => n >= 2)) { S.trust++; p.details.push('Neither of you gave ground: trust +1.'); }
      U.record(S, 'bell', 'Before the last choice, the Bell was faced twice: ' + S.p.map((c, i) => c.name + ' held ' + p.won[i] + ' of 2').join(', ') + '.');
    }
  };

  /* ---------- relics answer once: reroll your partner's die ---------- */
  X.canLend = (S, who) => !!deep(S) && !!S.rl && !(S.rl.lit && S.rl.lit[1 - who]) && X.charges(S, who).length > 0;
  X.lend = function (S, who) {
    if (!X.canLend(S, who)) return false;
    const id = spend(S, who); S.rl.lit = S.rl.lit || [null, null]; S.rl.lit[1 - who] = id;
    S.rl.d[1 - who] = 1 + Math.floor(Math.random() * 6);
    return true;
  };

  /* ---------- into the engine ---------- */
  for (const k of ['begin', 'parts', 'effects', 'commit', 'leave']) X.base[k] = E[k];
  E.begin = function (S) { X.base.begin(S); X.start(S); };
  E.parts = function (S, who, room, oi) {
    const parts = X.base.parts(S, who, room, oi), d = deep(S); if (!d) return parts;
    const op = E.optsFor(S, who, room)[oi];
    if (op && X.wounds(S, who).indexOf(op.k) >= 0) parts.push({ l: C.wounds[op.k].name, v: -1, kind: 'adventure' });
    if (!room.finale && X.isDark(S)) parts.push({ l: 'The dark door', v: -1, kind: 'adventure' });
    if (room.finale && d.footing[who]) parts.push({ l: d.footing[who] > 0 ? 'Footing at the Bell' : 'Wrong-footed by the Bell', v: d.footing[who], kind: 'adventure' });
    return parts;
  };
  E.effects = function (S, ev) {
    const r = X.base.effects(S, ev);
    if (deep(S) && !ev.room.finale && X.isDark(S)) ev.tier.forEach((t, i) => { if (t >= 2) r.fx[i].gold++; });
    return r;
  };
  E.commit = function (S) {
    const d0 = deep(S), before = d0 ? S.p.map(c => c.scars) : null, slot = S.room;
    const r = X.base.commit(S), d = deep(S); if (!d || !before) return r;
    S.p.forEach((c, i) => {
      const k = r.ev && r.ev.o && r.ev.o[i] && r.ev.o[i].k;
      if (c.scars > before[i] && k && !r.finale) {
        d.wounds[i] = d.wounds[i].filter(w => w.k !== k && w.until > S.room); d.wounds[i].push({ k, until: S.room + 2 });
        U.record(S, 'wound', fill(C.wounds[k].line, { n: c.name }) + ' from ' + r.ev.room.title + '.');
      }
    });
    if (!r.finale && (slot === 0 || slot === 2 || slot === 4)) fork(S, r.ev.room.id);
    return r;
  };
  E.leave = function (S) {
    const d = deep(S), due = E.stopDue(S), last = S.room >= E.slots(S) - 1;
    const result = X.base.leave(S);
    if (!d || due < 0) return result;
    A.enqueue(S, 'upgrade', { landing: due });
    if (last) A.enqueue(S, 'bell');
    return result;
  };
  g.Deeper = X;
})(typeof window !== 'undefined' ? window : globalThis);
