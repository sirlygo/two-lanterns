E.drawRooms = function () {
  const enemies = D.pool.filter(id => D.byId[id].combat);
  const pool = D.pool.filter(id => !D.byId[id].combat), got = [];
  const take = list => list.splice(Math.floor(rnd() * list.length), 1)[0];
  const count = enemies.length ? Math.min(enemies.length, D.picksPerDescent, rnd() < .35 ? 2 : 1) : 0;
  const slots = [];
  if (count) slots.push(Math.floor(rnd() * D.picksPerDescent));
  if (count > 1) {
    const spaced = Array.from({ length: D.picksPerDescent }, (_, i) => i).filter(i => Math.abs(i - slots[0]) > 1);
    slots.push(take(spaced));
  }
  for (let i = 0; i < D.picksPerDescent; i++) got.push(take(slots.includes(i) ? enemies : pool));
  return [D.opening].concat(got, [D.finaleId]);
};
