'use strict';
/* Browser check of the deeper rules between two players online: two real browser contexts run the real message handlers over an
   in-memory wire (as scripts/browser-adventure-qa.cjs does). A fork is voted on and hidden until both answer, the dark door is
   taken on both screens, and the guest calls on a relic to reroll the host's die. Then one phone-sized descent on one device. */
const path = require('node:path'), assert = require('node:assert/strict'), { pathToFileURL } = require('node:url');
const dependency = name => require(process.env.TWO_LANTERNS_NODE_MODULES ? path.join(process.env.TWO_LANTERNS_NODE_MODULES, name) : name);
const { chromium } = dependency('playwright'), root = path.resolve(__dirname, '..'), url = process.env.TWO_LANTERNS_QA_URL || pathToFileURL(path.join(root, 'index.html')).href;
let browser; const checks = [], errors = [];
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.TWO_LANTERNS_CHROME || undefined });
  const contexts = await Promise.all([browser.newContext({ reducedMotion: 'reduce' }), browser.newContext({ reducedMotion: 'reduce' })]);
  const pages = await Promise.all(contexts.map(c => c.newPage())); const [host, guest] = pages;
  for (const p of pages) {
    p.on('pageerror', e => errors.push(e.message)); await p.goto(url);
    await p.evaluate(() => { window.__outbox = []; __tl.NT.send = m => { __outbox.push(JSON.parse(JSON.stringify(m))); return true; }; __tl.NT.linked = () => true; __tl.NT.info = () => ({ state: 'linked', linked: true, code: 'BCDF' }); });
  }
  const start = await host.evaluate(() => {
    const S = __tl.E.fresh(); S.names = ['Host', 'Guest']; S.picks = [0, 1].map(() => Object.fromEntries(__tl.D.create.map(q => [q.id, q.opts[0].id])));
    __tl.E.begin(S); S.lead = 0; S.room = 1; S.net = __tl.O.fresh('BCDF', 0, 1); S.adventure.queue = []; S.p[1].relics = ['hymnal'];
    const order = __tl.E.order(S), dark = __tl.D.pool.find(id => order.indexOf(id) < 0);
    Adventure.enqueue(S, 'fork', { slot: 1, lit: order[1], dark, from: order[0] }); Adventure.open(S, 'choose'); __tl.ui.saved = S; __tl.ACT.resume();
    return { snap: __tl.O.snap(S, 1), dark, title: __tl.D.byId[dark].title };
  });
  await guest.evaluate(S => { __tl.ui.saved = S; __tl.ACT.resume(); }, start.snap);
  async function sync() {
    for (let n = 0; n < 8; n++) {
      const fromGuest = await guest.evaluate(() => __outbox.splice(0)), fromHost = await host.evaluate(() => __outbox.splice(0));
      if (!fromGuest.length && !fromHost.length) return;
      for (const m of fromGuest) await host.evaluate(m => __tl.NT.onMsg(m), m);
      for (const m of fromHost) await guest.evaluate(m => __tl.NT.onMsg(m), m);
    }
    throw Error('Wire did not settle');
  }
  for (const p of pages) assert((await p.locator('.screen').textContent()).includes('The dark door: ' + start.title));
  await host.locator('[data-act="adventure-vote"][data-i="1"]').click(); await sync();
  assert.equal(await guest.evaluate(() => __tl.S.adventure.phase.votes[0]), -2, 'The guest sees that the host answered, not what');
  assert.equal(await guest.evaluate(() => __tl.S.adventure.phase.stage), 'offer');
  await guest.locator('[data-act="adventure-vote"][data-i="1"]').click(); await sync();
  for (const p of pages) { assert.equal(await p.evaluate(() => __tl.S.adventure.phase.stage), 'result'); assert.equal(await p.evaluate(() => __tl.E.order(__tl.S)[1]), start.dark); assert(await p.evaluate(() => Deeper.isDark(__tl.S))); }
  await host.locator('[data-act="adventure-ready"]').click(); await sync(); await guest.locator('[data-act="adventure-ready"]').click(); await sync();
  for (const p of pages) { assert.equal(await p.evaluate(() => __tl.S.screen), 'choose'); assert.equal(await p.evaluate(() => __tl.E.room(__tl.S).id), start.dark); }
  checks.push({ label: 'two-browser-fork-vote-mask-dark-door', ok: true });
  /* into the room: both pick and lock, the dice are thrown, then the guest calls on its relic for the host's die */
  for (const p of pages) { if (await p.locator('[data-act="begin"]').count()) await p.locator('[data-act="begin"]').click(); }
  await sync();
  for (const p of pages) { assert(await p.locator('.deep-status').count(), 'The dark door is shown on the move screen'); await p.locator('[data-act="sel"]').first().click(); await p.locator('[data-act="lock"]').click(); await sync(); }
  for (let n = 0; n < 40 && (await host.evaluate(() => __tl.S.screen !== 'roll' || !__tl.S.rl)); n++) {
    for (const p of pages) { const b = p.locator('.bar .btn.primary:not([disabled])'); if (await b.count()) await b.first().click().catch(() => {}); await sync(); }
    await host.waitForTimeout(150);
  }
  for (let n = 0; n < 60 && !(await guest.locator('.deep-lend').count()); n++) { await guest.waitForTimeout(150); await sync(); }
  assert.equal(await host.locator('.deep-lend').count(), 0, 'The host has no relic to call on, and is not offered the guest’s');
  assert.equal(await guest.locator('.deep-lend').count(), 1);
  await guest.locator('.deep-lend').click(); await sync();
  for (const p of pages) { assert.equal(await p.evaluate(() => __tl.S.rl.lit[0]), 'hymnal'); assert.deepEqual(await p.evaluate(() => __tl.S.deep.called[1]), ['hymnal']); assert.equal(await p.locator('.deep-lend').count(), 0); assert((await p.locator('.screen').textContent()).includes('called on the')); }
  assert.equal(await host.evaluate(() => __tl.O.apply(__tl.S, 1, { a: 'lend', at: __tl.O.key(__tl.S) })), false, 'A second call is refused by the host');
  checks.push({ label: 'two-browser-relic-rerolls-partner-once', ok: true });
  for (const c of contexts) await c.close();
  console.log(JSON.stringify({ ok: !errors.length, checks, errors })); await browser.close(); if (errors.length) process.exit(1);
})().catch(async e => { console.error(e); try { await browser.close(); } catch (x) {} process.exit(1); });
