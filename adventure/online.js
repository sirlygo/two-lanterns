/* Host-authoritative Adventure actions; guests receive only their own sealed bargain. */
(function (g) {
  'use strict';
  const O = g.Online, A = g.Adventure;
  const snap = O.snap;
  O.snap = function (S, seat) { return A.project(snap(S, seat), seat); };
  const apply = O.apply;
  O.apply = function (S, seat, m) {
    if (!m || m.a !== 'adventure') return apply(S, seat, m);
    if (!S.net || ![0, 1].includes(seat) || m.at !== O.key(S)) return false;
    const before = S.screen;
    if (!A.apply(S, seat, m)) return false;
    if (before === 'adventure' && S.screen === 'choose') O.open(S);
    return true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
