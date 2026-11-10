/* Two Lanterns :: connective story and wandering-encounter aftermath. No mutations, clocks or random draws. */
(function (g) {
  'use strict';
  const C = __DESCENT_STORY__, E = g.Engine, T = g.Story;
  const outcome = tier => tier.every(t => t >= 2) ? 'good' : tier.every(t => t < 2) ? 'bad' : 'mixed';
  T.journey = function (S) {
    const final = E.room(S).finale, slot = final ? 7 : Math.min(6, S.room);
    const out = [C.chapters[slot]];
    /* Space out reactive passages so a wound or a warm bond is not repeated at every doorway. */
    if (S.room > 0 && !final && S.room % 2 === 0) {
      const last = (S.log || []).slice(-1)[0];
      const bridge = S.p.some(c => c.hp <= 2) ? 'hurt' : S.trust <= -2 ? 'cold' :
        last && g.Data.byId[last.rid] && g.Data.byId[last.rid].combat ? 'fight' : S.trust >= 4 ? 'warm' : null;
      if (bridge) out.push(C.bridges[bridge]);
    }
    return out;
  };
  T.encounter = function (S, tier) {
    const r = E.room(S), c = C.encounters[r.id];
    return r.combat && c ? c[outcome(tier)] : null;
  };
  const originalBanter = T.banter;
  T.banter = function (S, tier, trust) {
    const room = E.room(S), result = outcome(tier), used = S.bn || [];
    const encounter = room.combat && C.encounters[room.id];
    if (encounter) return { id: 'encounter:' + room.id + ':' + result,
      lines: encounter.banter[result].map((tpl, n) => ({ tpl, n })) };
    /* Keep the existing personal exchanges too. Dry humour arrives every other room. */
    if (!room.finale && S.room % 2 === 1) {
      const set = C.banter[result], n = set.findIndex((_, i) => !used.includes('dry:' + result + ':' + i));
      if (n >= 0) return { id: 'dry:' + result + ':' + n, lines: set[n].map((tpl, n) => ({ tpl, n })) };
    }
    return originalBanter(S, tier, trust);
  };
})(typeof window !== 'undefined' ? window : globalThis);
