/* Longer scenes are selected from shared state. No random draws, secret opponent moves or mutations. */
(function (g) {
  'use strict';
  const C = __PAGE_SCENES__, R = __ROOM_PAGES__, T = g.Story, E = g.Engine;
  T.roomPage = function (S, part) {
    const r = E.room(S), page = R[r.id];
    return page && page[part] ? [page[part]] : [];
  };
  T.pageScene = function (S, kind) {
    if (kind === 'create') kind = S.cq < 0 ? 'roster' : g.Data.create[S.cq].id;
    if (kind === 'ending') return [C.endings[S.end.dk]];
    return C.pages[kind] ? [C.pages[kind]] : [];
  };
  T.resultScene = function (S, tier) {
    const out = T.roomPage(S, 'aftermath');
    if (!E.room(S).combat) out.unshift(C.results[tier.every(t => t >= 2) ? 'good' : tier.every(t => t < 2) ? 'bad' : 'mixed']);
    return out;
  };
  const originalPlain = T.plainParts;
  T.plainParts = function (S) {
    const parts = originalPlain(S);
    if (S.end && C.endings[S.end.dk]) parts.rumors.push(C.endings[S.end.dk]);
    return parts;
  };
})(typeof window !== 'undefined' ? window : globalThis);
