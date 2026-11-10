'use strict';
/* Shared by the narration scripts: where things live, which passages get spoken,
   and the key that ties a clip to the exact text it was recorded from. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const narrationKey = require('../narration/hash.js');

const root = path.resolve(__dirname, '..');
const paths = {
  root,
  source: path.join(root, 'backups', 'index-placeholders.html'),
  config: path.join(root, 'narration', 'config.json'),
  manifest: path.join(root, 'narration', 'manifest.json'),
  audio: path.join(root, 'audio', 'narration')
};
const DEFAULTS = { modelId: 'eleven_v4', outputFormat: 'mp3_44100_96', speakTitle: true, voiceId: '', voiceSettings: null, seed: null, pronounce: {} };

function loadConfig() {
  let user = {};
  if (fs.existsSync(paths.config)) {
    try { user = JSON.parse(fs.readFileSync(paths.config, 'utf8')); }
    catch (e) { throw new Error('narration/config.json is not valid JSON: ' + e.message); }
  }
  const cfg = Object.assign({}, DEFAULTS, user);
  if (!/^mp3_\d+_\d+$/.test(cfg.outputFormat)) throw new Error('narration/config.json: outputFormat must be an MP3 format such as mp3_44100_96 (the game plays .mp3 clips).');
  return cfg;
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…' };
function entities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return Object.prototype.hasOwnProperty.call(NAMED, e.toLowerCase()) ? NAMED[e.toLowerCase()] : m;
  });
}

/* Evaluate the game's story data exactly as verify-art.cjs does: the last <script>, up to the saved-characters section. */
function readGame() {
  const html = fs.readFileSync(paths.source, 'utf8');
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const main = scripts[scripts.length - 1];
  const cut = main.indexOf('/* Two Lanterns :: saved characters.');
  if (cut < 0) throw new Error('Could not find the end of the story data in ' + path.relative(root, paths.source));
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(main.slice(0, cut), ctx);
  const D = ctx.Data;
  if (!D || !Array.isArray(D.rooms) || !Array.isArray(D.extra) || !D.stall || !Array.isArray(D.stall.stops)) throw new Error('The game data has an unexpected shape.');
  const tag = /<p class="tag">([^<]+)<\/p>/.exec(html);
  const packed = require('./rooms-pack.cjs').ready(root).rooms;      /* rooms from rooms/*.cjs that have their painting */
  return { rooms: D.rooms.concat(D.extra, packed), stops: D.stall.stops, tag: tag ? entities(tag[1]) : null };
}

/* Every passage the narrator can speak: `display` is the text on screen (it makes the key), `spoken` is what the voice reads. */
function buildItems(game, cfg) {
  const lead = title => (cfg.speakTitle && title ? String(title).replace(/[\s.!?…]+$/, '') + '. ' : '');
  const items = [];
  for (const r of game.rooms) items.push({ id: 'room-' + r.id, label: r.title, display: r.intro, spoken: lead(r.title) + r.intro });
  for (const s of game.stops) items.push({ id: 'stall-' + s.plate, label: s.title, display: s.intro, spoken: lead(s.title) + s.intro });
  if (game.tag) items.push({ id: 'title-tag', label: 'Title line', display: game.tag, spoken: game.tag });
  const story = require('../story/descent.cjs');
  story.chapters.forEach((text, i) => items.push({ id: 'journey-' + i, label: 'Descent chapter ' + (i + 1), display: text, spoken: text }));
  for (const [id, text] of Object.entries(story.bridges)) items.push({ id: 'bridge-' + id, label: 'On the way: ' + id, display: text, spoken: text });
  for (const r of game.rooms.filter(r => r.combat)) for (const result of ['good', 'mixed', 'bad']) {
    const text = story.encounters[r.id][result];
    items.push({ id: 'encounter-' + r.id + '-' + result, label: r.title + ': ' + result, display: text, spoken: text });
  }
  const pages = require('../story/page-scenes.cjs'), rooms = require('../story/room-pages.cjs');
  const passage = (id, text) => items.push({ id: 'page-' + id.replace(/:/g, '-'), label: id, display: text, spoken: text });
  for (const r of game.rooms) {
    if (!rooms[r.id]) throw Error('Missing expanded room story: ' + r.id);
    for (const part of ['arrival', 'choice', 'aftermath']) passage('room-' + r.id + '-' + part, rooms[r.id][part]);
  }
  for (const [group, texts] of Object.entries(pages)) for (const [id, text] of Object.entries(texts)) passage(group + '-' + id, text);
  const swaps = Object.entries(cfg.pronounce || {}).map(([from, to]) => [new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), String(to)]);
  const keys = new Set(), ids = new Set();
  for (const it of items) {
    for (const [re, to] of swaps) it.spoken = it.spoken.replace(re, () => to);
    it.key = narrationKey(it.display);
    if (keys.has(it.key)) throw new Error('Two passages share the same text: ' + it.id);
    if (ids.has(it.id)) throw new Error('Duplicate passage id: ' + it.id);
    keys.add(it.key); ids.add(it.id);
  }
  return items;
}

/* Changes whenever anything that shapes the recording changes: the spoken words, voice, model, format, settings or seed. */
function specFor(item, voiceId, cfg) {
  return narrationKey(JSON.stringify([item.spoken, voiceId, cfg.modelId, cfg.outputFormat, cfg.voiceSettings, cfg.seed]));
}

function readManifest() {
  try {
    const m = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    if (m && typeof m === 'object' && m.clips && typeof m.clips === 'object') return { version: 1, base: m.base || 'audio/narration/', clips: m.clips };
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error('narration/manifest.json is unreadable: ' + e.message);
  }
  return { version: 1, base: 'audio/narration/', clips: {} };
}

function writeManifest(m) {
  fs.mkdirSync(path.dirname(paths.manifest), { recursive: true });
  const clips = Object.fromEntries(Object.entries(m.clips).sort((a, b) => String(a[1].id).localeCompare(String(b[1].id))));
  const tmp = paths.manifest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, base: m.base || 'audio/narration/', clips }, null, 2) + '\n');
  fs.renameSync(tmp, paths.manifest);
}

module.exports = { paths, narrationKey, loadConfig, readGame, buildItems, specFor, readManifest, writeManifest };
