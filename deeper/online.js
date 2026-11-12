/* Host-authoritative: a lantern calls on a relic to reroll its partner's die. */
(function (g) {
  'use strict';
  const O = g.Online, apply = O.apply;
  O.apply = function (S, seat, m) {
    if (!m || m.a !== 'lend') return apply(S, seat, m);
    if (!S.net || ![0, 1].includes(seat) || S.screen !== 'roll' || !g.Deeper.lend(S, seat)) return false;
    S.net.ready = [false, false];      /* the results changed, so everyone reads them again */
    return true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
