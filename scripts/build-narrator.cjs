'use strict';
/* Bakes the narrator into index.html: its styles, the text-key function, the manifest and the player.
   Runs after build-art.cjs. With no clips yet it changes nothing, so the page stays exactly as it was.
   It writes into <head>, so the game's own script stays the last <script> on the page (verify-art.cjs relies on that). */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
html = html.replace(/<style id="narrator-css">[\s\S]*?<\/style>\n?/, '').replace(/<script id="narrator-runtime">[\s\S]*?<\/script>\n?/, '');

let manifest = { clips: {} };
if (fs.existsSync(path.join(root, 'narration/manifest.json'))) manifest = JSON.parse(read('narration/manifest.json'));
const entries = Object.entries(manifest.clips || {});

if (entries.length) {
  const slim = { base: manifest.base || 'audio/narration/', clips: Object.fromEntries(entries.map(([k, c]) => [k, { f: c.f }])) };
  const data = JSON.stringify(slim).replace(/</g, '\\u003c');
  const runtime = read('narration/runtime.js');
  if (runtime.split('__NARRATION_MANIFEST__').length !== 2 || runtime.split('/*__NARRATION_KEY__*/').length !== 2) throw Error('narration/runtime.js must hold each build placeholder exactly once');
  const js = runtime.replace('__NARRATION_MANIFEST__', () => data).replace('/*__NARRATION_KEY__*/', () => read('narration/hash.js'));
  if (/<\/script/i.test(js)) throw Error('The narrator script must not contain a closing script tag');
  const block = '<style id="narrator-css">\n' + read('narration/narrator.css') + '\n</style>\n<script id="narrator-runtime">\n' + js + '\n</script>\n';
  const at = html.indexOf('</head>');
  if (at < 0) throw Error('index.html has no </head>');
  html = html.slice(0, at) + block + html.slice(at);
}

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(JSON.stringify({ narrator: entries.length ? 'injected' : 'skipped (no clips yet)', clips: entries.length, bytes: Buffer.byteLength(html) }));
