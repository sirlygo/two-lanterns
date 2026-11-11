const ADV = window.Adventure;
function advText(lines, privateLast) { return lines.map((t, i) => `<p class="long-story" data-narrate${privateLast && i === lines.length - 1 ? ' data-private-narration' : ''}>${esc(t)}</p>`).join(''); }
function advPlayer() { return on() ? O.me(S) : S.adventure.phase.turn; }
function advPublicDeals() {
  const a = S.adventure; if (!a) return '';
  return (a.confessedAt === S.room ? advText([ADV.content.text.confession]) : '') + a.contracts.map((d, who) => d.revealed && d.id && d.response < 2
    ? `<p class="adv-disclosed"><b>${esc(S.p[who].name)}’s spoken bargain:</b> ${esc(ADV.content.deals[d.id].title)} · ${esc(ADV.content.deals[d.id].goal)}</p>` : '').join('');
}
function advTwist() {
  const t = ADV.active(S); if (!t) return '';
  const remaining = t.until - S.room, label = t.type === 'light' ? S.p.map((c, i) => c.name + ': +1 ' + D.stats[t.keys[i]]).join(' · ')
    : t.type === 'footstep' ? 'Helping moves +1; successful For yourself moves add +1 Undertoll'
    : 'Chooser order reversed; Lore +1 for both';
  return `<aside class="adv-status"><b>${{ light: 'Borrowed Light', footstep: 'The Third Footstep', backward: 'The Backward Hour' }[t.type]}</b><span>${esc(label)}</span><small>${remaining} ${remaining === 1 ? 'room' : 'rooms'} remaining</small></aside>`;
}
function advDeal() {
  const a = S.adventure; if (!a || !a.dealt || a.settled || !S.p) return '';
  const who = on() ? O.me(S) : S.turn, d = a.contracts[who];
  if (!d || !d.id || d.response >= 2 || d.response < 0) return advPublicDeals();
  const c = ADV.content.deals[d.id], p = ADV.progress(S, who);
  return `<details class="adv-deal"><summary>${d.revealed ? 'Your spoken bargain' : 'Your sealed bargain'} · ${esc(c.title)}</summary>
    ${advText([c.text], !d.revealed)}<p>${esc(c.goal)} <b>${p.have}/${p.need}</b></p><p class="fine">Reward: ${esc(c.reward)}. Keep it sealed for +1 extra gold on fulfilment, or reveal it for trust +1. Settled before the Bellheart; no penalty for missing it.</p>
    ${d.revealed ? '' : '<button class="btn ghost small" data-act="adventure-confess">Tell your partner · trust +1</button>'}</details>${advPublicDeals()}`;
}
function advCombo(ev) {
  if (!ev.combo) return '';
  const c = ADV.content.combos[ev.combo.id];
  return `<aside class="adv-combo"><h3>${ico('chain')}${esc(c.title)}</h3>${advText([c.text])}<p class="fine">${esc(c.hint)} Two successes also grant trust +1.</p></aside>`;
}
function adventureScreen() {
  const a = S.adventure, p = a && a.phase;
  if (!p) return intro();
  const who = advPlayer(), key = ADV.key(S), chosen = p.votes[who] !== -1, ready = p.ready[who];
  const opts = ADV.options(S, who).map(o => `<button class="opt" data-act="adventure-vote" data-i="${o.i}" data-nonce="${esc(key)}" ${o.disabled || chosen ? 'disabled' : ''}>
    <span class="oic">${ico(p.kind === 'risk' ? 'eye' : p.kind === 'huntsman' ? 'shield' : 'lantern')}</span>
    <span class="obody"><span class="ot">${esc(o.title)}</span><span class="od">${esc(o.note)}</span></span></button>`).join('');
  const deal = p.kind === 'bargain' && p.stage === 'offer' ? a.contracts[who] : null;
  const contract = deal ? ADV.content.deals[deal.id] : null;
  const details = p.details.length ? `<ul class="adv-details">${p.details.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const resultLabel = p.next === 'deeper' ? 'Consider the deeper opening' : p.next === 'huntAgain' ? 'Face the second exchange' : 'Continue together';
  const bar = p.stage === 'result' ? `<div class="bar"><button class="btn ${ready && on() ? 'ghost' : 'primary'}" data-act="adventure-ready" data-nonce="${esc(key)}" ${ready && on() ? 'disabled' : ''}>${ready && on() ? 'Waiting for your partner' : resultLabel}</button></div>` : '';
  const privateNote = p.stage === 'offer' ? `<p class="lead">${pn(who)}, choose privately. ${p.kind === 'risk' ? 'Both lanterns must agree to take an extra risk.' : p.kind === 'bargain' ? 'Your note stays sealed unless you choose to reveal it. Use headphones to listen privately.' : 'Both choices are revealed when you have answered.'}</p>` : '';
  const enemy = p.kind === 'huntsman' ? `<p class="adv-enemy">Exchange ${p.round + 1} of 2 · Hunter resolve: ${p.enemyHp == null ? 3 : p.enemyHp}/3</p>` : '';
  return chrome(`<section class="screen adventure p${who}">
    ${plate(ADV.scene(S), { label: ADV.content.scenes[ADV.scene(S)] || ADV.title(S) })}
    <p class="eyebrow">${p.kind === 'risk' ? 'An optional temptation' : p.kind === 'bargain' ? 'Private business' : 'Between the rooms'}</p>
    <h2 data-focus tabindex="-1">${esc(ADV.title(S))}</h2>${enemy}${privateNote}${advText(ADV.lines(S, who), p.kind === 'bargain' && p.stage === 'offer')}
    ${contract ? `<div class="adv-terms"><b>${esc(contract.title)}</b><p>${esc(contract.goal)}</p><p>Reward: ${esc(contract.reward)}</p><small>A fulfilled sealed bargain adds 1 extra gold. Revealing it grants trust +1 instead. No penalty for declining or missing the objective. You may confess an accepted bargain later.</small></div>` : ''}
    ${details}${p.kind === 'bargain' && p.stage === 'result' ? advPublicDeals() : ''}
    ${p.stage === 'offer' ? (chosen ? '<p class="adv-wait" role="status">Your answer is sealed. Waiting for your partner…</p>' : `<div class="opts">${opts}</div>`) : ''}
    <div class="minis">${mini(0)}${mini(1)}</div><p class="fine center">Trust ${S.trust} · Undertoll ${S.toll}</p>${bar}
  </section>`, progress());
}
function adventureAct(op, t) {
  const message = { a: 'adventure', op, nonce: t && t.dataset.nonce || ADV.key(S) };
  if (op === 'vote') message.i = +t.dataset.i;
  if (on()) { act(message); return; }
  const p = S.adventure && S.adventure.phase, who = op === 'confess' ? S.turn : p && p.turn;
  if (!ADV.apply(S, who, message)) return;
  const now = S.adventure.phase;
  if (op === 'vote' && now && now.stage === 'offer') {
    S.ho = { to: now.turn, scene: ADV.scene(S), sub: 'One answer is sealed. Pass the device without revealing it.', then: { screen: 'adventure' } };
    go({ screen: 'handoff' });
  } else go({ screen: S.screen });
}
function adventureSummary() {
  const a = S.adventure; if (!a || !S.end) return '';
  return `<div class="chapter adv-memory"><h3>What happened between the rooms</h3>
    ${advText(a.guide.met ? [ADV.content.text[a.guide.affinity >= 2 ? 'endingFriend' : 'endingBusiness']] : [])}
    <ul>${a.memory.map(m => `<li>${esc(m.text)}</li>`).join('')}</ul>
    ${a.contracts.map((d, i) => `<p><b>${esc(S.p[i].name)}</b> · ${esc(ADV.content.deals[d.id].title)}: ${d.response >= 2 || d.response < 0 ? 'declined' : d.fulfilled ? 'fulfilled' : 'unfulfilled'}${d.response < 2 && d.fulfilled ? ' · ' + esc(ADV.content.deals[d.id].reward) + (d.sealedBonus ? ' · sealed bonus: 1 gold' : '') : ''}</p>`).join('')}</div>`;
}
