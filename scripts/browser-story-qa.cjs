'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { pathToFileURL } = require('node:url');
const dependency = name => require(process.env.TWO_LANTERNS_NODE_MODULES ? path.join(process.env.TWO_LANTERNS_NODE_MODULES, name) : name);
const { chromium } = dependency('playwright'), root = path.resolve(__dirname, '..'), rooms = require('../story/room-pages.cjs'), scenes = require('../story/page-scenes.cjs');
const textOnly = !!process.env.TWO_LANTERNS_TEXT_ONLY, checks = [], errors = []; let browser;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.TWO_LANTERNS_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.TWO_LANTERNS_QA_URL || pathToFileURL(path.join(root, 'index.html')).href);
  async function show(kind, extra = {}) {
    await page.evaluate(({ kind, extra }) => {
      const { E, D } = __tl, S = E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(() => Object.fromEntries(D.create.map(q => [q.id, q.opts[0].id])));
      E.begin(S); S.lead = 0; S.screen = kind; S.cq = 0; S.cp = 0;
      if (extra.room) { S.room = extra.room === 'bellheart' ? 7 : 1; S.order[S.room] = extra.room; }
      if (extra.cq !== undefined) S.cq = extra.cq;
      if (kind === 'handoff') S.ho = { to: 1, scene: 'threshold', sub: 'Pass the device without sharing your choice.', then: { screen: 'choose' } };
      if (kind === 'roll') { S.pick = [0, 1]; if (extra.results) S.rl = { d: [3, 4], rr: [false, false] }; }
      if (kind === 'stall') S.room = S.shop.at[extra.stop || 0];
      if (extra.online) {
        S.net = __tl.O.fresh('TEST', 0, 1);
        window.__originalInfo = window.__originalInfo || __tl.NT.info;
        __tl.NT.info = () => ({ state: 'linked', linked: true, code: 'TEST' });
        __tl.ui.seen = S.room;
        if (extra.waiting) S.net.made[0] = true;
        if (extra.locked) S.pick = [0, -2];
      } else if (window.__originalInfo) __tl.NT.info = window.__originalInfo;
      if (kind === 'ending') {
        S.room = 7; const [k, level] = extra.dk.split(':');
        const act = ['ring', 'break', 'steal', 'keep'].includes(k) ? k : 'ring';
        S.fin = { kind: k, level: level || 'weak', contested: false, winner: -1, acts: [act, act], tier: [2, 2], total: [8, 8] };
        S.end = E.buildEnding(S);
      }
      __tl.ui.book = false; __tl.ui.rolling = false; __tl.ui.saved = S; __tl.ACT.resume();
      if (kind === 'book') __tl.ACT.book();
    }, { kind, extra });
  }
  async function check(label, expected) {
    if (!textOnly) await page.waitForFunction(() => {
      const expected = [...document.querySelectorAll('.screen [data-narrate], .screen.stall p.story, .screen.title p.tag')].map(p => __narrator.key(p.textContent));
      return JSON.stringify(__narrator.state().queue) === JSON.stringify(expected);
    });
    const result = await page.evaluate(() => ({
      text: document.querySelector('.screen').textContent,
      long: [...document.querySelectorAll('.long-story')].map(p => p.textContent),
      marked: [...document.querySelectorAll('[data-narrate]')].map(p => p.textContent),
      missing: [...document.querySelectorAll('[data-narrate]')].filter(p => !__narrator.clips[__narrator.key(p.textContent)]).map(p => p.textContent.slice(0, 60)),
      overflow: document.documentElement.scrollWidth > innerWidth
    }));
    assert(!result.overflow, label + ' overflows on mobile'); assert(result.long.includes(expected), 'Missing scene: ' + label);
    if (!textOnly) assert.deepEqual(result.missing, [], 'Unvoiced prose: ' + label);
    if (!textOnly) {
      const sequence = await page.evaluate(() => ({
        expected: [...document.querySelectorAll('.screen [data-narrate], .screen.stall p.story, .screen.title p.tag')].map(p => __narrator.key(p.textContent)),
        actual: __narrator.state().queue
      }));
      assert.deepEqual(sequence.actual, sequence.expected, 'Narrator order differs from the visible story: ' + label);
    }
    assert(!/undefined|\[object Object\]|__PAGE_SCENES__|__ROOM_PAGES__/.test(result.text), 'Unrendered content: ' + label);
    checks.push({ label, words: result.marked.join(' ').split(/\s+/).length, narration: !result.missing.length });
  }
  for (const [kind, id, extra] of [
    ['title', 'title', {}], ['names', 'names', {}], ['create', 'roster', { cq: -1 }],
    ...['origin', 'calling', 'lantern', 'keepsake', 'motive'].map((id, cq) => ['create', id, { cq }]),
    ['meet', 'meet', {}], ['handoff', 'handoff', {}], ['lobby', 'lobby', {}], ['book', 'book', {}],
    ['create', 'waiting', { online: true, waiting: true }], ['choose', 'locked', { online: true, locked: true, room: 'nave' }],
    ['lobby', 'lobby', { online: true }],
    ['stall', 'stall', { stop: 0 }], ['stall', 'stall2', { stop: 1 }], ['roll', 'reveal', { room: 'nave' }]
  ]) { await show(kind, extra); await check(id, scenes.pages[id]); }
  /* Both players' private pages receive the same room context without reading a partner's move. */
  for (const [id, prose] of Object.entries(rooms)) {
    for (const [kind, part, extra] of [['intro', 'arrival', {}], ['choose', 'choice', {}], ['roll', 'aftermath', { results: true }]]) {
      await show(kind, { room: id, ...extra }); await check(id + ':' + part, prose[part]);
    }
  }
  for (const [dk, text] of Object.entries(scenes.endings)) {
    await show('ending', { dk }); await check('ending:' + dk, text);
    const copied = await page.evaluate(() => __tl.E.plain(__tl.S, __tl.S.end).join('\n'));
    assert(copied.includes(text), 'Copied ending omits its new epilogue: ' + dk);
  }
  await show('intro', { room: 'nave' });
  fs.mkdirSync(path.join(root, 'art/qa'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'art/qa/long-story-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 }); await check('nave:desktop-arrival', rooms.nave.arrival);
  await page.screenshot({ path: path.join(root, 'art/qa/long-story-desktop.png'), fullPage: true });
  assert.deepEqual(errors, []);
  const report = { ok: true, textOnly, checks, errors }; fs.writeFileSync(path.join(root, 'art/qa/story-browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, screens: checks.length, expandedRooms: Object.keys(rooms).length, endingTypes: Object.keys(scenes.endings).length, textOnly, errors }));
  await browser.close();
})().catch(async e => { console.error(e); if (browser) await browser.close(); process.exitCode = 1; });
