'use strict';
/* Checks the narration without a browser or an API key: every passage has a unique key, every clip in the manifest exists
   and is an MP3, and the narrator baked into index.html computes the same keys as the generator. Passes when no clips exist yet. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lib = require('./narration-lib.cjs');
const { paths } = lib;
const read = f => fs.readFileSync(path.join(paths.root, f), 'utf8');

const cfg = lib.loadConfig();
const items = lib.buildItems(lib.readGame(), cfg);
assert(items.length >= 40, 'Expected 38 rooms and 2 landings to narrate, found ' + items.length + ' passages');
const runtime = read('narration/runtime.js');
assert(runtime.includes('__NARRATION_MANIFEST__') && runtime.includes('/*__NARRATION_KEY__*/'), 'narration/runtime.js lost its build placeholders');

const man = lib.readManifest();
const report = { ok: true, passages: items.length, clips: 0, missing: items.length, stale: 0, narratorInPage: false };

if (Object.keys(man.clips).length) {
  const byKey = new Map(items.map(it => [it.key, it]));
  let have = 0, stale = 0;
  for (const [key, clip] of Object.entries(man.clips)) {
    const file = path.join(paths.audio, clip.f);
    assert(fs.existsSync(file), 'Clip file missing: audio/narration/' + clip.f + ' (listed in narration/manifest.json)');
    const buf = fs.readFileSync(file);
    assert(buf.length > 1024, 'Clip is too small to be speech: ' + clip.f);
    assert(buf.subarray(0, 3).toString('latin1') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0), 'Clip is not an MP3: ' + clip.f);
    const it = byKey.get(key);
    if (it && it.id === clip.id) have++; else stale++;
  }
  report.clips = have;
  report.missing = items.length - have;
  report.stale = stale;

  const page = /<script id="narrator-runtime">([\s\S]*?)<\/script>/.exec(read('index.html'));
  assert(page, 'index.html has no narrator although narration/manifest.json lists clips. Run: npm run build');
  assert(page[1].includes(read('narration/hash.js')), 'The narrator in index.html uses an older text key than narration/hash.js. Run: npm run build');
  const win = {};
  const ctx = vm.createContext({
    window: win,
    document: { readyState: 'complete', getElementById: () => null, addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
    Audio: function () {}, MutationObserver: function () {}, console
  });
  vm.runInContext(page[1], ctx);
  const n = win.__narrator;
  assert(n && typeof n.key === 'function', 'The narrator in index.html did not start (window.__narrator is missing)');
  for (const it of items) assert.equal(n.key(it.display), it.key, 'The browser computes a different text key for ' + it.id);
  assert.deepEqual(Object.keys(n.clips).sort(), Object.keys(man.clips).sort(), 'The narrator in index.html lists different clips than narration/manifest.json. Run: npm run build');
  for (const [key, clip] of Object.entries(man.clips)) assert.equal(n.clips[key].f, clip.f, 'The narrator points at a different file for ' + clip.id + '. Run: npm run build');
  report.narratorInPage = true;
}

console.log(JSON.stringify(report));
