'use strict';
/* Bakes the extras into index.html: the options panel, sound and touch, feats, the wide-screen layout, and what a phone needs
   to install the game and open it offline.
   Runs last, after build-art.cjs and build-narrator.cjs. Everything goes into <head>, so the game's own script stays the last
   <script> on the page (verify-art.cjs relies on that), and none of it edits the game: each part only watches the page. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
html = html.replace(/<!-- extras -->[\s\S]*?<!-- \/extras -->\n?/, '');
const extra = {};
/* options goes first: it settles the saved choices (and carries an old one over) before the sound part reads them */
const parts = [['options', 'options/options.css', 'options/runtime.js'], ['sound', 'sound/sound.css', 'sound/runtime.js'], ['feats', 'feats/feats.css', 'feats/runtime.js']];
let block = '<!-- extras -->\n' + read('pwa/head.html').trim() + '\n';
for (const [id, css, js] of parts) {
  let code = read(js);
  if (id === 'sound') {      /* the score: only tracks whose files are really there */
    let music = null;
    if (fs.existsSync(path.join(root, 'music/manifest.json'))) {
      const m = JSON.parse(read('music/manifest.json')), base = m.base || 'audio/music/', tracks = {};
      const cuts = {};      /* music/tracks.json may say where a track starts and where it comes round: "from" and "to", in seconds */
      if (fs.existsSync(path.join(root, 'music/tracks.json'))) for (const t of JSON.parse(read('music/tracks.json')).tracks || []) cuts[t.id] = t;
      for (const [k, t] of Object.entries(m.tracks || {})) if (t && t.f && fs.existsSync(path.join(root, base, t.f))) {
        const c = cuts[k] || {}, from = +c.from || 0, to = +c.to || 0;
        if (from < 0 || (to && to - from < 15)) throw Error('music/tracks.json: "' + k + '" needs at least 15 seconds between "from" and "to"');
        const gain = +c.gain || 0;
        if (gain < 0 || gain > 1.5) throw Error('music/tracks.json: "' + k + '" gain must be between 0 and 1.5');
        tracks[k] = Object.assign({ f: t.f }, from ? { from } : {}, to ? { to } : {}, gain ? { gain } : {});
      }
      if (Object.keys(tracks).length) music = { base, tracks };
    }
    if (code.split('__MUSIC_MANIFEST__').length !== 2) throw Error('sound/runtime.js must hold the music placeholder exactly once');
    code = code.replace('__MUSIC_MANIFEST__', () => JSON.stringify(music).replace(/</g, '\\u003c'));
    extra.music = music ? Object.keys(music.tracks) : [];
    /* the effects: carried in the page itself, so they play at once, with no signal, and from a folder */
    let sfx = null;
    if (fs.existsSync(path.join(root, 'sfx/manifest.json'))) {
      const m = JSON.parse(read('sfx/manifest.json')), base = m.base || 'audio/sfx/', gains = {}, out = {};
      if (fs.existsSync(path.join(root, 'sfx/effects.json'))) for (const e of JSON.parse(read('sfx/effects.json')).effects || []) gains[e.id] = +e.gain || 0;
      for (const [k, e] of Object.entries(m.effects || {})) {
        if (!e || !e.f || !fs.existsSync(path.join(root, base, e.f))) continue;
        const buf = fs.readFileSync(path.join(root, base, e.f));
        if (buf.length > 600000) throw Error('audio/sfx/' + e.f + ' is too big to carry in the page (' + buf.length + ' bytes)');
        if (gains[k] < 0 || gains[k] > 3) throw Error('sfx/effects.json: "' + k + '" gain must be between 0 and 3');
        out[k] = Object.assign({ d: buf.toString('base64') }, gains[k] ? { gain: gains[k] } : {});
      }
      if (Object.keys(out).length) sfx = out;
    }
    if (code.split('__SFX_MANIFEST__').length !== 2) throw Error('sound/runtime.js must hold the effects placeholder exactly once');
    code = code.replace('__SFX_MANIFEST__', () => JSON.stringify(sfx));
    extra.sfx = sfx ? Object.keys(sfx) : [];
  }
  if (/<\/script/i.test(code)) throw Error(js + ' must not contain a closing script tag');
  block += '<style id="' + id + '-css">\n' + read(css).trim() + '\n</style>\n<script id="' + id + '-runtime">\n' + code.trim() + '\n</script>\n';
}
block += '<style id="layout-css">\n' + read('layout/desk.css').trim() + '\n</style>\n';
block += '<script id="offline-register">\n' + read('pwa/register.js').trim() + '\n</script>\n<!-- /extras -->\n';
for (const f of ['manifest.webmanifest', 'sw.js', 'pwa/icon-180.png', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-maskable-512.png']) if (!fs.existsSync(path.join(root, f))) throw Error('Missing ' + f);
JSON.parse(read('manifest.webmanifest'));
const at = html.indexOf('</head>');
if (at < 0) throw Error('index.html has no </head>');
html = html.slice(0, at) + block + html.slice(at);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(JSON.stringify({ extras: parts.map(p => p[0]).concat(['layout', 'install', 'offline']), music: extra.music, sfx: extra.sfx, bytes: Buffer.byteLength(html) }));
