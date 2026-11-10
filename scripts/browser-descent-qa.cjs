'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { pathToFileURL } = require('node:url');
const dependency = name => require(process.env.TWO_LANTERNS_NODE_MODULES ? path.join(process.env.TWO_LANTERNS_NODE_MODULES, name) : name);
const { chromium } = dependency('playwright'), root = path.resolve(__dirname, '..'), out = path.join(root, 'art/qa');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const checks = [], errors = []; let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.TWO_LANTERNS_CHROME || undefined });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__speechPlayers = [];
    window.Audio = class extends EventTarget {
      constructor() { super(); this.paused = true; this.ended = false; this.error = null; this.currentTime = 0; this.duration = 15; window.__speechPlayers.push(this); }
      set src(v) { this._src = v; this.ended = false; this.currentTime = 0; this.error = null; }
      get src() { return this._src; } get currentSrc() { return this._src; }
      play() { this.paused = false; this.ended = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
      pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
      finish() { this.ended = true; this.paused = true; this.currentTime = this.duration; this.dispatchEvent(new Event('ended')); }
    };
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  async function seed(id, slot = 1, set = 0) {
    await page.evaluate(({ id, slot, set }) => {
      const { E, D } = __tl, S = E.fresh(); S.names = ['Ember', 'Mint'];
      S.picks = [0, 1].map(i => Object.fromEntries(D.create.map((q, j) => [q.id, q.opts[(i + j) % q.opts.length].id])));
      E.begin(S); S.order = ['stair', 'collectors', 'lamps', 'hounds', 'maps', 'wickthief', 'nave', 'bellheart'];
      S.order[slot] = id; S.room = slot; S.sets = S.order.map(() => set); S.lead = 0; S.screen = 'intro';
      __tl.ui.saved = S; __tl.ACT.resume();
    }, { id, slot, set });
    await page.waitForFunction(() => !!document.querySelector('.screen.intro .nv'));
  }
  async function check(label) {
    const r = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, journey: document.querySelectorAll('.journey').length,
      narrator: __narrator.state(), scene: document.querySelector('.plate svg')?.dataset.scene }));
    assert(!r.overflow, label + ' overflows'); checks.push({ label, journey: r.journey, scene: r.scene }); return r;
  }
  for (const id of ['collectors', 'hounds', 'wickthief']) for (const set of [0, 1]) {
    await seed(id, 1, set); const intro = await check(id + '-intro-' + set);
    assert.equal(intro.narrator.queue.length, 2); assert.equal(intro.scene, id);
    if (set === 0) {
      await page.screenshot({ path: path.join(out, 'encounter-' + id + '-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 }); await check(id + '-mobile');
      await page.screenshot({ path: path.join(out, 'encounter-' + id + '-mobile.png'), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 1000 });
    }
    /* A tap starts the journey, then the original room clip; Stop cancels the whole queue. */
    await page.locator('.nv-play').click();
    assert(await page.evaluate(() => __narrator.state().playing));
    await page.evaluate(() => window.__speechPlayers.at(-1).finish());
    assert.equal(await page.evaluate(() => __narrator.state().position), 1);
    assert(await page.evaluate(() => __narrator.state().playing));
    await page.locator('.nv-play').click();
    assert(!await page.evaluate(() => __narrator.state().playing));
    await page.locator('.nv-play').click();
    assert.equal(await page.evaluate(() => __narrator.state().position), 0);
    await page.locator('[data-act="begin"]').click();
    await page.waitForFunction(() => !__narrator.state().playing);
    for (let i = 0; i < 2; i++) {
      if (await page.locator('[data-act="ho"]').count()) await page.locator('[data-act="ho"]').click();
      assert.equal(await page.locator('.opt').count(), 4);
      await page.locator('[data-act="sel"][data-i="' + i + '"]').click();
      await page.locator('[data-act="lock"]').click();
    }
    if (await page.locator('[data-act="ho"]').count()) await page.locator('[data-act="ho"]').click();
    await page.locator('[data-act="roll"]').click(); await page.waitForFunction(() => !__tl.ui.rolling);
    await page.waitForFunction(() => !!document.querySelector('.encounter-story + .nv'));
    assert.equal(await page.locator('.encounter-story').count(), 1);
    assert.equal(await page.evaluate(() => __narrator.state().queue.length), 1);
    await check(id + '-results-' + set);
    await page.locator('[data-act="onward"]').click();
    assert.equal(await page.evaluate(() => __tl.S.log.at(-1).rid), id);
    assert.equal(await page.evaluate(() => __tl.S.room), 2);
  }
  /* Three clips (chapter, contextual bridge, room) play in DOM order, once per screen. */
  await seed('lamps', 2);
  await page.evaluate(() => { __tl.S.p[0].hp = 1; __tl.ui.saved = __tl.S; __tl.ACT.resume(); });
  await page.waitForFunction(() => __narrator.state().queue.length === 3);
  await page.locator('.nv-switch').click();
  assert(await page.evaluate(() => __narrator.state().on && __narrator.state().playing));
  const queued = await page.evaluate(() => __narrator.state().queue);
  for (let i = 0; i < 3; i++) {
    assert.equal(await page.evaluate(() => __narrator.state().loaded), queued[i]);
    await page.evaluate(() => window.__speechPlayers.at(-1).finish());
  }
  assert(!await page.evaluate(() => __narrator.state().playing));
  await page.evaluate(() => { __tl.ui.saved = __tl.S; __tl.ACT.resume(); });
  await page.waitForTimeout(100);
  assert(!await page.evaluate(() => __narrator.state().playing), 'An online-style redraw must not replay narration');
  /* Reloading a saved route leaves the route intact and does not begin speaking without a gesture. */
  const route = await page.evaluate(() => { localStorage.setItem('twolanterns.v1', JSON.stringify(__tl.S)); return __tl.S.order.join(','); });
  await page.reload(); await page.locator('[data-act="resume"]').click();
  assert.equal(await page.evaluate(() => __tl.S.order.join(',')), route);
  await page.waitForFunction(() => !!document.querySelector('.nv'));
  checks.push({ label: 'three-clip-sequence-stop-replay-redraw-save', clips: queued.length });
  await context.close();
  /* Exercise actual MP3 decoding and transition with the browser's native Audio, too. */
  const real = await browser.newContext({ reducedMotion: 'reduce' });
  await real.addInitScript(() => { const NativeAudio = window.Audio; window.__nativeAudio = []; window.Audio = function (...args) { const a = new NativeAudio(...args); window.__nativeAudio.push(a); return a; }; });
  const p = await real.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(url);
  await p.evaluate(() => {
    const S = __tl.E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(() => Object.fromEntries(__tl.D.create.map(q => [q.id, q.opts[0].id])));
    __tl.E.begin(S); S.order[1] = 'collectors'; S.room = 1; S.screen = 'intro'; S.lead = 0; __tl.ui.saved = S; __tl.ACT.resume();
  });
  await p.locator('.nv-play').click();
  await p.waitForFunction(() => __narrator.state().time > .1 && __narrator.state().length > 1);
  await p.evaluate(() => { const a = __nativeAudio.at(-1); a.currentTime = a.duration - .15; });
  await p.waitForFunction(() => __narrator.state().position === 1 && __narrator.state().time > .1);
  checks.push({ label: 'native-mp3-decode-and-playlist-transition', ok: true });
  await real.close();
  assert.deepEqual(errors, []);
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'descent-browser-report.json'), JSON.stringify({ ok: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ ok: true, checks: checks.length, nativeAudio: true, errors }));
  await browser.close();
})().catch(async e => { console.error(e); if (browser) await browser.close(); process.exitCode = 1; });
