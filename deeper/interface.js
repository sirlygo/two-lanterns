const DEEP = window.Deeper;
/* what is weighing on the lanterns in this room: wounds, the dark door, footing won at the Bell */
function deepStatus() {
  if (!S.deep || !S.p) return '';
  const bits = [];
  S.p.forEach((c, i) => DEEP.wounds(S, i).forEach(k => bits.push(`<span><b>${esc(c.name)}</b> · ${esc(DEEP.content.wounds[k].name)}: −1 ${esc(D.stats[k])}</span>`)));
  const room = E.room(S);
  if (room && !room.finale && DEEP.isDark(S)) bits.unshift('<span><b>The dark door</b> · every roll −1; each success +1 gold</span>');
  if (room && room.finale) S.p.forEach((c, i) => { const f = DEEP.footing(S, i); if (f) bits.push(`<span><b>${esc(c.name)}</b> · ${f > 0 ? 'footing at the Bell: +1' : 'wrong-footed by the Bell: −1'} on the last roll</span>`); });
  return bits.length ? `<aside class="adv-status deep-status">${bits.join('')}</aside>` : '';
}
/* on a result card: call on a relic to reroll your partner's die, and the note left once somebody has */
function deepLend(i) {
  if (!S.deep || !S.rl) return '';
  const lit = S.rl.lit && S.rl.lit[i], id = DEEP.charges(S, i)[0];
  const note = lit ? `<span class="fine">${esc(S.p[1 - i].name)} called on the ${esc((D.relics[lit] || {}).name || 'relic')}: this die was rerolled</span>` : '';
  const can = DEEP.canLend(S, i) && (!on() || i === O.me(S));
  return note + (can ? `<button type="button" class="btn ghost small deep-lend" data-act="lend" data-i="${i}" title="Each relic answers once in a descent. The new roll replaces ${esc(S.p[1 - i].name)}’s, even if it is worse.">${ico('lantern')}Call on the ${esc((D.relics[id] || {}).name || 'relic')}: reroll ${esc(S.p[1 - i].name)}’s die</button>` : '');
}
