#!/usr/bin/env node
'use strict';
/* Two Lanterns :: music. Makes the game's score with the ElevenLabs Music API from the prompts in music/tracks.json,
   saves the tracks in audio/music/ and records them in music/manifest.json. Run: node scripts/music.cjs --help
   The API key is read from the environment, .env.local or .env. It is never printed or written anywhere. */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const root = path.resolve(__dirname, '..');
const P = { cfg: path.join(root, 'music', 'tracks.json'), manifest: path.join(root, 'music', 'manifest.json'), audio: path.join(root, 'audio', 'music') };
const say = s => process.stdout.write(s + '\n');
const fail = s => { process.stderr.write(s + '\n'); process.exit(1); };
const HELP = `Two Lanterns music

  npm run music                     make every track that is missing or whose prompt changed
  npm run music -- --list           show what exists and what is missing (no network, no cost)
  npm run music -- --only calm      only the track with that id (audition one first)
  npm run music -- --force          make tracks again even where one exists (a new take)
  npm run music -- --model music_v1 use another model for this run
  npm run music -- --prune          delete track files the manifest no longer uses
  options: --yes (skip the question)

Tracks and prompts live in music/tracks.json: edit a prompt and run again to replace that track.
Then: npm run build, and publish index.html with the audio/music folder.
Setup: ELEVENLABS_API_KEY comes from the environment, .env.local or .env (the same key the narrator uses).
Music is billed by length against your ElevenLabs plan and needs a paid plan.`;

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (/^\s*#/.test(raw)) continue;
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
      if (!m) continue;
      let v = m[2];
      if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1); else v = v.replace(/\s+#.*$/, '');
      if (process.env[m[1]] === undefined || process.env[m[1]] === '') process.env[m[1]] = v;
    }
  }
}
function args(argv) {
  const o = {}, flags = ['help', 'list', 'force', 'yes', 'prune'], vals = ['only', 'model'];
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!m) fail('Unexpected argument "' + argv[i] + '". Try --help.');
    if (flags.includes(m[1])) o[m[1]] = true;
    else if (vals.includes(m[1])) { const v = m[2] !== undefined ? m[2] : argv[++i]; if (v === undefined || String(v).startsWith('--')) fail('--' + m[1] + ' needs a value.'); o[m[1]] = v; }
    else fail('Unknown option --' + m[1] + '. Try --help.');
  }
  return o;
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function config() {
  let c; try { c = JSON.parse(fs.readFileSync(P.cfg, 'utf8')); } catch (e) { fail('music/tracks.json is missing or is not valid JSON: ' + e.message); }
  if (!Array.isArray(c.tracks) || !c.tracks.length) fail('music/tracks.json lists no tracks.');
  const seen = new Set();
  for (const t of c.tracks) {
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(t.id || '') || seen.has(t.id)) fail('music/tracks.json: every track needs its own short id in lower case (got "' + t.id + '").');
    seen.add(t.id);
    if (typeof t.prompt !== 'string' || !t.prompt.trim()) fail('music/tracks.json: track "' + t.id + '" has no prompt.');
    if (!(t.seconds >= 10 && t.seconds <= 300)) fail('music/tracks.json: track "' + t.id + '" needs "seconds" between 10 and 300.');
  }
  return c;
}
const readManifest = () => { try { const m = JSON.parse(fs.readFileSync(P.manifest, 'utf8')); return m && m.tracks ? m : { tracks: {} }; } catch (e) { return { tracks: {} }; } };
function writeManifest(m) { fs.mkdirSync(path.dirname(P.manifest), { recursive: true }); fs.writeFileSync(P.manifest, JSON.stringify({ base: 'audio/music/', tracks: m.tracks }, null, 2) + '\n'); }
const fullPrompt = (c, t) => (t.prompt.trim() + ' ' + (c.style || '')).trim();
const keyOf = (c, t) => hash(fullPrompt(c, t) + '|' + t.seconds);
function plan(c, man, o) {
  return c.tracks.filter(t => !o.only || t.id === o.only).map(t => {
    const k = keyOf(c, t), have = man.tracks[t.id], file = have && path.join(P.audio, have.f);
    const state = !have || !fs.existsSync(file) ? 'missing' : have.k !== k ? 'changed' : 'ok';
    return { t, k, state };
  });
}
function ask(q) { return new Promise(r => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); r(/^y(es)?$/i.test(a.trim())); }); }); }
async function compose(base, key, model, format, c, t) {
  let res;
  try {
    res = await fetch(base + '/v1/music?output_format=' + encodeURIComponent(format), { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ prompt: fullPrompt(c, t), music_length_ms: Math.round(t.seconds * 1000), model_id: model, force_instrumental: true }) });
  } catch (e) { return { ok: false, status: 0, why: 'could not reach ' + base + ' (' + e.message + ')' }; }
  if (!res.ok) {
    let why = ''; try { const j = await res.json(), d = j && j.detail; why = typeof d === 'string' ? d : d && (d.message || d.status) ? [d.status, d.message].filter(Boolean).join(': ') : JSON.stringify(j).slice(0, 300); } catch (e) { /* no body */ }
    return { ok: false, status: res.status, why: why || res.statusText };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) return { ok: false, status: res.status, why: 'the reply was too small to be a track' };
  return { ok: true, buf };
}

(async () => {
  const o = args(process.argv.slice(2));
  if (o.help) { say(HELP); return; }
  const c = config(), man = readManifest();
  if (o.only && !c.tracks.some(t => t.id === o.only)) fail('No track "' + o.only + '" in music/tracks.json. Ids: ' + c.tracks.map(t => t.id).join(', '));
  if (o.prune) {
    const keep = new Set(Object.values(man.tracks).map(x => x.f)); let n = 0;
    if (fs.existsSync(P.audio)) for (const f of fs.readdirSync(P.audio)) if (/\.mp3$/.test(f) && !keep.has(f)) { fs.unlinkSync(path.join(P.audio, f)); n++; }
    say('Removed ' + n + ' unused track file' + (n === 1 ? '' : 's') + '.'); return;
  }
  const rows = plan(c, man, o);
  if (o.list) { for (const r of rows) say('  ' + r.t.id.padEnd(10) + String(r.t.seconds).padStart(4) + 's  ' + (r.state === 'ok' ? 'made   ' + man.tracks[r.t.id].f : r.state === 'changed' ? 'prompt changed since it was made' : 'not made yet')); return; }
  const todo = rows.filter(r => o.force || r.state !== 'ok');
  if (!todo.length) { say('Every track is made. Use --force for a new take, or edit a prompt in music/tracks.json.'); return; }
  loadEnv();
  const key = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || '';
  if (!key) fail('No ElevenLabs API key found.\n\nIn this folder run:\n  npx -y @elevenlabs/cli@latest onboard connect\nIt signs you in in your browser and saves the key to .env.local for you.');
  const base = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/+$/, '');
  let model = o.model || process.env.ELEVENLABS_MUSIC_MODEL_ID || c.modelId || 'music_v1';
  const format = c.outputFormat || 'mp3_44100_128', total = todo.reduce((n, r) => n + r.t.seconds, 0);
  say('About to make ' + todo.length + ' track' + (todo.length === 1 ? '' : 's') + ' (' + todo.map(r => r.t.id).join(', ') + '), ' + total + ' seconds of music in all, with ' + model + '.');
  say('This is billed against your ElevenLabs plan.');
  if (!o.yes && !(await ask('Go ahead? (y/N) '))) { say('Nothing made.'); return; }
  fs.mkdirSync(P.audio, { recursive: true });
  let made = 0, bad = 0;
  for (const r of todo) {
    process.stdout.write('  ' + r.t.id.padEnd(10) + ' composing (this can take a minute or two)... ');
    let out = await compose(base, key, model, format, c, r.t);
    if (!out.ok && model !== 'music_v1' && !o.model && [400, 403, 404, 422].includes(out.status) && /model/i.test(out.why)) {      /* a plan without the newer model: fall back once, and stay there */
      say('\n  ' + model + ' was refused (' + out.why + '). Trying music_v1.'); model = 'music_v1';
      process.stdout.write('  ' + r.t.id.padEnd(10) + ' composing... ');
      out = await compose(base, key, model, format, c, r.t);
    }
    if (!out.ok) {
      bad++; say('FAILED (' + (out.status || 'network') + '): ' + out.why);
      if (out.status === 401) fail('\nThe key was refused. Check ELEVENLABS_API_KEY in .env.local.');
      if (out.status === 402 || /payment|paid|subscription|quota|credit/i.test(out.why)) fail('\nYour plan or remaining credit does not cover this. See elevenlabs.io/app/subscription.');
      continue;
    }
    const f = r.t.id + '.' + r.k + '.mp3', old = man.tracks[r.t.id];
    fs.writeFileSync(path.join(P.audio, f), out.buf);
    if (old && old.f !== f) { try { fs.unlinkSync(path.join(P.audio, old.f)); } catch (e) { /* already gone */ } }
    man.tracks[r.t.id] = { f, k: r.k, seconds: r.t.seconds, model, bytes: out.buf.length };
    writeManifest(man); made++;
    say('saved audio/music/' + f + ' (' + Math.round(out.buf.length / 1024) + ' kB)');
  }
  say('\n' + made + ' made' + (bad ? ', ' + bad + ' failed (run again to retry those)' : '') + '.');
  if (made) say('Listen to them in audio/music/. To redo one: npm run music -- --only <id> --force\nThen: npm run build && npm run verify, and publish index.html with the audio/music folder.');
  if (bad) process.exit(1);
})();
