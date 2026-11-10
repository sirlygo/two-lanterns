'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1], ctx = vm.createContext({ console });
vm.runInContext(source.slice(0, source.indexOf('/* Two Lanterns :: saved characters.')), ctx);
const { Engine: E, Data: D, Story: T } = ctx, rooms = require('../story/room-pages.cjs'), scenes = require('../story/page-scenes.cjs');
const lib = require('./narration-lib.cjs'), items = lib.buildItems(lib.readGame(), lib.loadConfig()), keys = new Map(items.map(i => [i.display, i.key]));
const S = E.fresh(); S.names = ['Ember', 'Mint']; S.picks = [0, 1].map(() => Object.fromEntries(D.create.map(q => [q.id, q.opts[0].id]))); E.begin(S);
const readyRooms = D.rooms.concat(D.extra); assert.equal(Object.keys(rooms).length, readyRooms.length);
const checkText = (text, min, label) => {
  assert.equal(typeof text, 'string', label); assert(text.split(/\s+/).length >= min, 'Scene is too short: ' + label);
  assert(!/[<>]|\{[np]\}/.test(text), 'Narration must be plain text without dynamic names: ' + label);
  assert(keys.has(text), 'Missing narration collection: ' + label);
};
for (const r of readyRooms) {
  S.order[1] = r.id; S.room = 1;
  const before = JSON.stringify(S);
  for (const [part, min] of [['arrival', 60], ['choice', 40], ['aftermath', 30]]) {
    const text = rooms[r.id][part]; checkText(text, min, r.id + ':' + part); assert.equal(T.roomPage(S, part)[0], text);
  }
  for (const tier of [[3, 2], [2, 1], [0, 1]]) {
    const result = T.resultScene(S, tier); assert(result.includes(rooms[r.id].aftermath));
    if (!r.combat) assert.equal(result.length, 2);
  }
  assert.equal(JSON.stringify(S), before, 'Story changed the shared save: ' + r.id);
}
for (const [id, text] of Object.entries(scenes.pages)) checkText(text, 60, id);
for (const [id, text] of Object.entries(scenes.results)) checkText(text, 50, id);
assert.deepEqual(Object.keys(scenes.endings).sort(), [...E.DUNK].sort());
for (const [id, text] of Object.entries(scenes.endings)) {
  checkText(text, 60, id); S.end = { dk: id }; assert.equal(T.pageScene(S, 'ending')[0], text);
}
S.end = null;
for (let i = -1; i < D.create.length; i++) { S.cq = i; assert.equal(T.pageScene(S, 'create')[0], scenes.pages[i < 0 ? 'roster' : D.create[i].id]); }
console.log(JSON.stringify({ ok: true, expandedRooms: readyRooms.length, roomPassages: readyRooms.length * 3, otherScenes: Object.keys(scenes.pages).length, endings: E.DUNK.length, narrationPassages: items.length }));
