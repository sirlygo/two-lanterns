'use strict';
/* Room packs: extra rooms kept in rooms/*.cjs. A room joins the game only when its painting exists at art/scenes/<id>.webp,
   so a pack can be written first and painted later, one room at a time. Used by build-art.cjs, verify-art.cjs and the narration scripts. */
const fs = require('node:fs');
const path = require('node:path');
const WORDS = { 36: 'thirty-six', 37: 'thirty-seven', 38: 'thirty-eight', 39: 'thirty-nine', 40: 'forty', 41: 'forty-one', 42: 'forty-two', 43: 'forty-three', 44: 'forty-four', 45: 'forty-five', 46: 'forty-six', 47: 'forty-seven', 48: 'forty-eight' };

function all(root) {
  const dir = path.join(root, 'rooms');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(n => /^pack\d+\.cjs$/.test(n)).sort().map(n => require(path.join(dir, n)));
}
/* the rooms that are painted, with everything that travels with them */
function ready(root) {
  const out = { rooms: [], relics: {}, alts: {}, waiting: [] };
  for (const p of all(root)) for (const r of p.rooms) {
    if (!fs.existsSync(path.join(root, 'art', 'scenes', r.id + '.webp'))) { out.waiting.push(r.id); continue; }
    if (!p.relics[r.relic] || !p.alts[r.id]) throw Error('Room pack: ' + r.id + ' is missing its relic or its second hand of moves');
    out.rooms.push(r); out.relics[r.relic] = p.relics[r.relic]; out.alts[r.id] = p.alts[r.id];
  }
  return out;
}
const js = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
/* write the painted rooms into the page's story data, just before the room pool is drawn up */
function inject(html, add) {
  if (!add.rooms.length) return html;
  const mark = 'D.byId = {};';
  if (html.split(mark).length !== 2) throw Error('Room pack: the room pool marker must appear exactly once');
  const code = '/* room packs: rooms added by scripts/rooms-pack.cjs */\nObject.assign(D.relics, ' + js(add.relics) + ');\nD.extra.push.apply(D.extra, ' + js(add.rooms) + ');\nD.alts = Object.assign(D.alts || {}, ' + js(add.alts) + ');\n';
  html = html.replace(mark, () => code + mark);
  const n = 36 + add.rooms.length, was = 'at random from thirty-six';
  if (!WORDS[n]) throw Error('Room pack: no word for a pool of ' + n);
  if (html.split(was).length !== 2) throw Error('Room pack: the title\'s room count must appear exactly once');
  return html.replace(was, 'at random from ' + WORDS[n]);
}
/* take the pack rooms back out of evaluated game data, so the rest can be compared with the original */
function strip(D, add) {
  const ids = new Set(add.rooms.map(r => r.id));
  D.extra = D.extra.filter(r => !ids.has(r.id));
  D.pool = D.pool.filter(id => !ids.has(id));
  for (const id of ids) { delete D.byId[id]; delete D.alts[id]; }
  for (const k of Object.keys(add.relics)) delete D.relics[k];
  return D;
}
module.exports = { all, ready, inject, strip };
