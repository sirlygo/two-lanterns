'use strict';
/* Bakes the extras into index.html: sound and touch, feats, and what a phone needs to install the game and open it offline.
   Runs last, after build-art.cjs and build-narrator.cjs. Everything goes into <head>, so the game's own script stays the last
   <script> on the page (verify-art.cjs relies on that), and none of it edits the game: each part only watches the page. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
html = html.replace(/<!-- extras -->[\s\S]*?<!-- \/extras -->\n?/, '');
const parts = [['sound', 'sound/sound.css', 'sound/runtime.js'], ['feats', 'feats/feats.css', 'feats/runtime.js']];
let block = '<!-- extras -->\n' + read('pwa/head.html').trim() + '\n';
for (const [id, css, js] of parts) {
  const code = read(js);
  if (/<\/script/i.test(code)) throw Error(js + ' must not contain a closing script tag');
  block += '<style id="' + id + '-css">\n' + read(css).trim() + '\n</style>\n<script id="' + id + '-runtime">\n' + code.trim() + '\n</script>\n';
}
block += '<script id="offline-register">\n' + read('pwa/register.js').trim() + '\n</script>\n<!-- /extras -->\n';
for (const f of ['manifest.webmanifest', 'sw.js', 'pwa/icon-180.png', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-maskable-512.png']) if (!fs.existsSync(path.join(root, f))) throw Error('Missing ' + f);
JSON.parse(read('manifest.webmanifest'));
const at = html.indexOf('</head>');
if (at < 0) throw Error('index.html has no </head>');
html = html.slice(0, at) + block + html.slice(at);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(JSON.stringify({ extras: parts.map(p => p[0]).concat(['install', 'offline']), bytes: Buffer.byteLength(html) }));
