'use strict';
/* Checks the extras: they are in the page, they parse, and every feat is earned by the descent that should earn it and by no other. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const id of ['sound-css', 'feats-css']) assert(html.includes('<style id="' + id + '">'), 'Missing ' + id);
const grab = id => { const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>')); assert(m, 'Missing ' + id); new vm.Script(m[1]); return m[1]; };
const snd = grab('sound-runtime'); grab('offline-register');
assert(!snd.includes('__MUSIC_MANIFEST__'), 'The music list was not written into the page');
const mm = snd.match(/var MUSIC = (.*?);\s+\/\* \{ base/); assert(mm, 'Missing the music list');
const music = JSON.parse(mm[1]), tracks = music ? Object.keys(music.tracks) : [];
for (const t of tracks) assert(fs.existsSync(path.join(root, music.base, music.tracks[t].f)), 'Missing music file for ' + t);
assert(!snd.includes('__SFX_MANIFEST__'), 'The effects were not written into the page');
const sm = snd.match(/var SFX = (.*?);\s+\/\* \{ id:/); assert(sm, 'Missing the effects list');
const sfx = JSON.parse(sm[1]), effects = sfx ? Object.keys(sfx) : [];
for (const e of effects) assert(Buffer.from(sfx[e].d, 'base64').length > 600, 'Effect ' + e + ' is empty');
const known = ['tick', 'rattle', 'land', 'toll', 'disaster', 'scrape', 'success', 'triumph', 'coin', 'shop', 'joined', 'end', 'crack', 'rumble'];
for (const e of effects) assert(known.includes(e), 'The game has no use for an effect called ' + e);
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
assert(scripts.at(-1)[1].includes('window.__tl = '), 'The game must stay the last script on the page');
assert(html.includes('<link rel="manifest" href="manifest.webmanifest">'), 'Missing manifest link');
const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const i of man.icons) assert(fs.existsSync(path.join(root, i.src)), 'Missing icon ' + i.src);
new vm.Script(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'));

const ctx = vm.createContext({}); vm.runInContext(grab('feats-runtime'), ctx);
const F = ctx.__feats; assert(F && F.FEATS.length === 32, 'Expected 32 feats');
assert.equal(new Set(F.FEATS.map(f => f.id)).size, 32, 'Feat ids must be unique');
const row = (o = {}) => Object.assign({ rid: 'x', pair: 'nn', a: ['solo', 'solo'], k: ['M', 'M'], d: [3, 4], oi: [0, 0], tier: [1, 1] }, o);
const base = (o = {}) => {
  const S = { toll: 2, trust: 0, log: [row({ pair: 'tn', a: ['team', 'solo'] })].concat(Array.from({ length: 6 }, () => row()), [row({ pair: 'fin' })]),
    p: [0, 1].map(() => ({ scars: 1, gold: 1, relics: [], picks: { calling: 'guard' } })), shop: { buys: [{ kind: 'broth', price: 3, to: 0, payer: 0 }] },
    end: { dk: 'ring:fair', kind: 'ring', fates: ['weary', 'weary'], bond: { id: 'wary' }, motiveLines: [{ glad: false }, { glad: true }], index: 1 } };
  if (o.S) o.S(S); return S;
};
const C0 = { games: 1, causes: 0, causeTotal: 5, solved: false, callings: 1 };
const got = (mut, C) => Array.from(F.evaluate(base({ S: mut }), Object.assign({}, C0, C || {})));
assert.deepEqual(got(), ['first'], 'An ordinary descent earns only First Light');
const cases = {
  ring: S => { S.end.dk = 'ring:strong'; }, break: S => { S.end.dk = 'break:strong'; S.end.kind = 'break'; }, steal: S => { S.end.dk = 'steal:strong'; }, keep: S => { S.end.dk = 'keep:strong'; },
  ruin: S => { S.end.kind = 'deadlock'; S.end.dk = 'deadlock'; }, whole: S => { S.p.forEach(c => { c.scars = 0; }); }, scars: S => { S.p[1].scars = 3; },
  stay: S => { S.end.fates[0] = 'martyr'; }, carried: S => { S.end.fates[1] = 'carried'; }, unbreakable: S => { S.end.bond.id = 'unbreakable'; }, enemies: S => { S.end.bond.id = 'betray'; },
  together: S => { for (let i = 0; i < 4; i++) S.log[i] = row({ pair: 'tt', a: ['team', 'team'] }); }, glad: S => { S.end.motiveLines[0].glad = true; },
  snake: S => { S.log[2].d = [1, 1]; }, boxcars: S => { S.log[2].d = [6, 6]; }, instep: S => { S.log[3].tier = [3, 3]; }, streak: S => { for (let i = 0; i < 4; i++) S.log[i].tier = [1, 3]; },
  clean: S => { S.log.forEach(l => { l.tier = [2, 1]; }); S.log[0].tier = [3, 0]; }, magpie: S => { S.p[0].relics = ['a', 'b', 'c']; }, purse: S => { S.p[0].gold = 6; S.p[1].gold = 4; },
  customer: S => { S.shop.buys.push({ kind: 'curio', price: 6, to: 1, payer: 1 }, { kind: 'wax', price: 3, to: 1, payer: 1 }); }, window: S => { S.shop.buys = []; },
  treat: S => { S.shop.buys[0].payer = 1; }, dip: S => { S.shop.buys.push({ kind: 'gamble', price: 2, slip: 'relic', to: 0, payer: 0 }); }, bitten: S => { S.shop.buys.push({ kind: 'gamble', price: 2, slip: 'sting', to: 0, payer: 0 }); },
  quiet: S => { S.toll = 0; }
};
for (const [id, mut] of Object.entries(cases)) assert.deepEqual(got(mut).sort(), ['first', id].sort(), 'Feat ' + id);
assert.deepEqual(got(S => { S.log.forEach(l => { l.a = ['self', 'solo']; l.pair = l.pair === 'fin' ? 'fin' : 'sn'; }); }).sort(), ['alone', 'first'], 'Feat alone');
assert.deepEqual(got(null, { solved: true }).sort(), ['first', 'page'], 'Feat page');
assert.deepEqual(got(null, { causes: 5 }).sort(), ['first', 'truth'], 'Feat truth');
assert.deepEqual(got(null, { games: 10 }).sort(), ['first', 'ten'], 'Feat ten');
assert.deepEqual(got(null, { callings: 4 }).sort(), ['callings', 'first'], 'Feat callings');
assert.equal(Object.keys(cases).length + 6, 32, 'Every feat has a test');
assert.deepEqual(Array.from(F.evaluate({}, C0)), [], 'An unfinished descent earns nothing');
console.log(JSON.stringify({ ok: true, feats: F.FEATS.length, music: tracks, effects, sound: true, install: true, offline: true }));
