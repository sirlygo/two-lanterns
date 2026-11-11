'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { pathToFileURL } = require('node:url');
const dependency = name => require(process.env.TWO_LANTERNS_NODE_MODULES ? path.join(process.env.TWO_LANTERNS_NODE_MODULES, name) : name);
const { chromium } = dependency('playwright'), root = path.resolve(__dirname, '..'), url = process.env.TWO_LANTERNS_QA_URL || pathToFileURL(path.join(root, 'index.html')).href;
let browser; const checks = [], errors = [];
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.TWO_LANTERNS_CHROME || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__speech = [];
    window.Audio = class extends EventTarget {
      constructor() { super(); this.paused = true; this.ended = false; this.error = null; this.currentTime = 0; this.duration = 12; window.__speech.push(this); }
      set src(v) { this._src = v; this.ended = false; this.currentTime = 0; } get src() { return this._src; } get currentSrc() { return this._src; }
      play() { this.paused = false; this.ended = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
      pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
      finish() { this.paused = true; this.ended = true; this.dispatchEvent(new Event('ended')); }
    };
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.goto(url);
  async function show(kind, extra = {}) {
    await page.evaluate(({ kind, extra }) => {
      const { E, D } = __tl, A = Adventure, S = E.fresh(); S.names = ['Ember', 'Mint'];
      S.picks = [0, 1].map(i => Object.fromEntries(D.create.map((q, j) => [q.id, q.opts[(i + j) % q.opts.length].id])));
      E.begin(S); S.lead = 0; S.room = 3; S.p.forEach(c => { c.gold = 12; });
      S.adventure.queue = []; S.adventure.seed = extra.seed || 4; S.adventure.schedule.twist = extra.twist || 'light';
      if (kind === 'guideReturn') S.adventure.guide.affinity = extra.affinity == null ? 2 : extra.affinity;
      A.enqueue(S, kind, { rid: 'nave', room: 2 }); A.open(S, 'intro'); __tl.ui.saved = S; __tl.ACT.resume();
    }, { kind, extra });
    await page.locator('.screen.adventure').waitFor();
  }
  async function check(label) {
    const r = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, text: document.querySelector('.screen').textContent,
      art: document.querySelector('.screen .plate svg')?.dataset.scene, screen: __tl.S.screen, stage: __tl.S.adventure?.phase?.stage }));
    assert(!r.overflow, 'Mobile overflow: ' + label); assert(!/undefined|\[object Object\]/.test(r.text));
    checks.push({ label, art: r.art, screen: r.screen, stage: r.stage });
  }
  async function vote(i) { await page.locator('[data-act="adventure-vote"][data-i="' + i + '"]').click(); if (await page.locator('[data-act="ho"]').count()) await page.locator('[data-act="ho"]').click(); }
  for (const kind of ['risk', 'guide', 'guideReturn', 'merchant', 'festival', 'falseexit', 'huntsman', 'bargain', 'twist']) {
    await show(kind); await check(kind + ':offer');
    await page.screenshot({ path: path.join(root, 'art/qa/adventure-' + kind + '-mobile.png'), fullPage: true });
    if (kind !== 'twist') {
      const pick = { risk: 0, guide: 0, guideReturn: 0, merchant: 0, festival: 0, falseexit: 1, huntsman: 4, bargain: 2 }[kind];
      await vote(pick); await vote(pick); await check(kind + ':result');
    }
    await page.locator('[data-act="adventure-ready"]').click(); assert.equal(await page.evaluate(() => __tl.S.screen), 'intro');
  }
  /* A successful first search offers a second step and banking is a genuine veto. */
  let winSeed;
  for (let n = 0; n < 20; n++) {
    await show('risk', { seed: n + 1 }); await vote(1); await vote(1);
    if (await page.evaluate(() => __tl.S.adventure.phase.next === 'deeper')) { winSeed = n + 1; break; }
  }
  assert(winSeed); const gold = await page.evaluate(() => __tl.S.p[0].gold);
  await page.locator('[data-act="adventure-ready"]').click(); assert.equal(await page.evaluate(() => __tl.S.adventure.phase.depth), 1);
  await vote(0); await vote(1); assert.equal(await page.evaluate(() => __tl.S.p[0].gold), gold); await check('risk:banked');
  /* A two-stage fight, with the second exchange and the saved phase surviving a reload. */
  await show('huntsman'); await vote(0); await vote(1); await page.locator('[data-act="adventure-ready"]').click();
  assert.equal(await page.evaluate(() => __tl.S.adventure.phase.round), 1);
  await page.reload(); await page.locator('[data-act="resume"]').click();
  assert.equal(await page.evaluate(() => __tl.S.adventure.phase.round), 1); await vote(2); await vote(3); await check('huntsman:second-exchange');
  /* The Audio class is mocked for deterministic sequence checks, but every private key must
     reference an actual recording in the built page. No test-only clip aliases are needed. */
  await show('bargain');
  const privateKey = await page.evaluate(() => {
    const p = document.querySelector('[data-private-narration]'), key = __narrator.key(p.textContent);
    if (!__narrator.clips[key]) throw Error('Private bargain recording is missing'); return key;
  });
  await page.waitForFunction(() => document.querySelector('.nv-play')?.textContent.includes('privately'));
  await page.locator('.nv-switch').click();
  assert(!(await page.evaluate(() => __narrator.state().queue)).includes(privateKey), 'Automatic narrator exposed a sealed note');
  await page.locator('.nv-play').click(); // stop public playback
  await page.locator('.nv-play').click(); // explicit private listening
  assert((await page.evaluate(() => __narrator.state().queue)).includes(privateKey));
  await check('private-audio:manual-only');
  await context.close();
  /* Two real browser contexts run the real UI message handlers. A deterministic in-memory wire
     replaces only PeerJS transport, so masking, synchronization, validation and rendering all run. */
  const contexts = await Promise.all([browser.newContext({ reducedMotion: 'reduce' }), browser.newContext({ reducedMotion: 'reduce' })]);
  const pages = await Promise.all(contexts.map(c => c.newPage())); const [host, guest] = pages;
  for (const p of pages) {
    p.on('pageerror', e => errors.push(e.message)); await p.goto(url);
    await p.evaluate(() => { window.__outbox = []; __tl.NT.send = m => { __outbox.push(JSON.parse(JSON.stringify(m))); return true; }; __tl.NT.linked = () => true; __tl.NT.info = () => ({ state: 'linked', linked: true, code: 'BCDF' }); });
  }
  const initial = await host.evaluate(() => {
    const S = __tl.E.fresh(); S.names = ['Host', 'Guest']; S.picks = [0, 1].map(() => Object.fromEntries(__tl.D.create.map(q => [q.id, q.opts[0].id])));
    __tl.E.begin(S); S.lead = 0; S.room = 3; S.p.forEach(c => { c.gold = 12; }); S.net = __tl.O.fresh('BCDF', 0, 1);
    Adventure.enqueue(S, 'bargain'); Adventure.open(S, 'choose'); __tl.ui.saved = S; __tl.ACT.resume(); return __tl.O.snap(S, 1);
  });
  await guest.evaluate(S => { __tl.ui.saved = S; __tl.ACT.resume(); }, initial);
  async function sync() {
    for (let n = 0; n < 6; n++) {
      const fromGuest = await guest.evaluate(() => __outbox.splice(0)), fromHost = await host.evaluate(() => __outbox.splice(0));
      if (!fromGuest.length && !fromHost.length) return;
      for (const m of fromGuest) await host.evaluate(m => __tl.NT.onMsg(m), m);
      for (const m of fromHost) await guest.evaluate(m => __tl.NT.onMsg(m), m);
    }
    throw Error('Wire did not settle');
  }
  const hostDeal = await host.evaluate(() => Adventure.content.deals[__tl.S.adventure.contracts[0].id].text);
  assert(!(await guest.locator('.screen').textContent()).includes(hostDeal));
  await host.locator('[data-act="adventure-vote"][data-i="0"]').click(); await sync();
  assert.equal(await guest.evaluate(() => __tl.S.adventure.contracts[0].id), undefined);
  assert.equal(await guest.evaluate(() => __tl.S.adventure.phase.votes[0]), -2);
  await guest.locator('[data-act="adventure-vote"][data-i="2"]').click(); await sync();
  assert.equal(await guest.evaluate(() => __tl.S.adventure.contracts[0].id), undefined);
  await host.locator('[data-act="adventure-ready"]').click(); await sync(); assert.equal(await host.evaluate(() => __tl.S.screen), 'adventure');
  await guest.locator('[data-act="adventure-ready"]').click(); await sync();
  assert.equal(await host.evaluate(() => __tl.S.screen), 'choose'); assert.equal(await guest.evaluate(() => __tl.S.screen), 'choose');
  for (const p of pages) await p.locator('[data-act="begin"]').click();
  await host.locator('.adv-deal summary').click();
  await host.locator('[data-act="adventure-confess"]').click(); await sync();
  assert(await guest.evaluate(() => !!__tl.S.adventure.contracts[0].revealed));
  assert((await guest.locator('.screen').textContent()).includes('spoken bargain'));
  checks.push({ label: 'two-browser-bargain-vote-mask-ready-confession', ok: true });
  /* A guest resumes the exact interlude after reload, then receives the next authoritative snapshot. */
  await host.evaluate(() => { Adventure.enqueue(__tl.S, 'festival'); Adventure.open(__tl.S, 'choose'); __tl.ui.saved = __tl.S; __tl.ACT.resume(); });
  const festival = await host.evaluate(() => __tl.O.snap(__tl.S, 1)); await guest.evaluate(s => __tl.NT.onMsg({ t: 'snap', s }), festival);
  await guest.reload(); await guest.locator('[data-act="rejoin"]').waitFor(); await guest.evaluate(() => {
    __tl.NT.available = () => true; __tl.NT.linked = () => true;
    const saved = JSON.parse(localStorage.getItem('twolanterns.online.v1')); __tl.ui.saved = saved.S; __tl.ACT.resume();
  });
  assert.equal(await guest.evaluate(() => __tl.S.adventure.phase.kind), 'festival');
  checks.push({ label: 'guest-save-resumes-interlude', ok: true });
  for (const c of contexts) await c.close();
  /* Decode the real private MP3 with native Audio, and confirm automatic narration stops before it. */
  const native = await browser.newContext({ reducedMotion: 'reduce' });
  await native.addInitScript(() => {
    const NativeAudio = window.Audio; window.__nativeSpeech = [];
    window.Audio = function (...args) { const a = new NativeAudio(...args); window.__nativeSpeech.push(a); return a; };
  });
  const spoken = await native.newPage(); spoken.on('pageerror', e => errors.push(e.message)); await spoken.goto(url);
  await spoken.evaluate(() => {
    const S = __tl.E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(() => Object.fromEntries(__tl.D.create.map(q => [q.id, q.opts[0].id])));
    __tl.E.begin(S); S.lead = 0; S.room = 3; Adventure.enqueue(S, 'bargain'); Adventure.open(S, 'intro'); __tl.ui.saved = S; __tl.ACT.resume();
  });
  const sealedKey = await spoken.locator('[data-private-narration]').evaluate(n => __narrator.key(n.textContent));
  await spoken.locator('.nv-switch').click();
  await spoken.waitForFunction(() => __narrator.state().playing && __narrator.state().time > .1);
  assert(!(await spoken.evaluate(() => __narrator.state().queue)).includes(sealedKey));
  const finishPublic = () => spoken.evaluate(() => { const a = __nativeSpeech.find(a => a.src.includes('audio/narration/')); a.currentTime = a.duration - .1; });
  await finishPublic();
  await spoken.waitForFunction(() => !__narrator.state().playing && __narrator.state().time > 1);
  assert.notEqual(await spoken.evaluate(() => __narrator.state().loaded), sealedKey, 'Automatic reading started the sealed note');
  await spoken.locator('.nv-play').click();
  await spoken.waitForFunction(() => __narrator.state().playing && __narrator.state().time > .1);
  await finishPublic();
  await spoken.waitForFunction(key => __narrator.state().position === 1 && __narrator.state().loaded === key && __narrator.state().time > .1, sealedKey);
  assert((await spoken.evaluate(() => __narrator.state().src)).includes('adventure-deal-'));
  checks.push({ label: 'native-private-mp3-plays-only-after-explicit-listen', ok: true });
  await native.close();
  assert.deepEqual(errors, []);
  const report = { ok: true, checks, errors, privateAudioSimulated: true, nativePrivateAudio: true, onlineWire: 'real UI handlers; simulated transport' };
  fs.writeFileSync(path.join(root, 'art/qa/adventure-browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, checks: checks.length, online: true, privateAudio: true, errors })); await browser.close();
})().catch(async e => { console.error(e); if (browser) await browser.close(); process.exitCode = 1; });
