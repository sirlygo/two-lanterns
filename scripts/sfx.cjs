#!/usr/bin/env node
'use strict';
/* Two Lanterns :: sound effects. Makes the game's effects with the ElevenLabs Sound Effects API from the prompts in
   sfx/effects.json, saves them in audio/sfx/ and records them in sfx/manifest.json. Run: node scripts/sfx.cjs --help
   The build copies the effects into index.html itself, so they play at once, offline, and from a folder.
   The API key is read from the environment, .env.local or .env. It is never printed or written anywhere. */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const root = path.resolve(__dirname, '..');
const P = { cfg: path.join(root, 'sfx', 'effects.json'), manifest: path.join(root, 'sfx', 'manifest.json'), audio: path.join(root, 'audio', 'sfx') };
const say = s => process.stdout.write(s + '\n');
const fail = s => { process.stderr.write(s + '\n'); process.exit(1); };
const HELP = `Two Lanterns sound effects

  npm run sfx                       make every effect that is missing or whose prompt changed
  npm run sfx -- --list             show what exists and what is missing (no network, no cost)
  npm run sfx -- --only coin        only the effect with that id (audition one first)
  npm run sfx -- --force            make effects again even where one exists (a new take)
  npm run sfx -- --model eleven_text_to_sound_v3   use another model for this run
  npm run sfx -- --prune            delete effect files the manifest no longer uses
  options: --yes (skip the question)

Effects and prompts live in sfx/effects.json: edit a prompt and run again to replace that effect.
Then: npm run build. The effects are copied into index.html, so only index.html needs publishing.
An effect that has not been made keeps its browser-made sound.
Setup: ELEVENLABS_API_KEY comes from the environment, .env.local or .env (the same key the narrator uses).
Effects are billed against your ElevenLabs plan; the cost of each is printed as it is made.`;

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
  let c; try { c = JSON.parse(fs.readFileSync(P.cfg, 'utf8')); } catch (e) { fail('sfx/effects.json is missing or is not valid JSON: ' + e.message); }
  if (!Array.isArray(c.effects) || !c.effects.length) fail('sfx/effects.json lists no effects.');
  c.tracks = c.effects;
  const seen = new Set();
  for (const t of c.tracks) {
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(t.id || '') || seen.has(t.id)) fail('sfx/effects.json: every effect needs its own short id in lower case (got "' + t.id + '").');
    seen.add(t.id);
    if (typeof t.prompt !== 'string' || !t.prompt.trim()) fail('sfx/effects.json: effect "' + t.id + '" has no prompt.');
    if (!(t.seconds >= 0.5 && t.seconds <= 30)) fail('sfx/effects.json: effect "' + t.id + '" needs "seconds" between 0.5 and 30.');
  }
  return c;
}
const readManifest = () => { try { const m = JSON.parse(fs.readFileSync(P.manifest, 'utf8')); return m && m.effects ? { tracks: m.effects } : { tracks: {} }; } catch (e) { return { tracks: {} }; } };
function writeManifest(m) { fs.mkdirSync(path.dirname(P.manifest), { recursive: true }); fs.writeFileSync(P.manifest, JSON.stringify({ base: 'audio/sfx/', effects: m.tracks }, null, 2) + '\n'); }
const fullPrompt = (c, t) => (t.prompt.trim() + ' ' + (c.style || '')).trim();
const influence = (c, t) => { const v = t.influence !== undefined ? +t.influence : c.influence !== undefined ? +c.influence : 0.5; return v >= 0 && v <= 1 ? v : 0.5; };
const keyOf = (c, t) => hash(fullPrompt(c, t) + '|' + t.seconds + '|' + influence(c, t));
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
    res = await fetch(base + '/v1/sound-generation?output_format=' + encodeURIComponent(format), { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: fullPrompt(c, t), duration_seconds: t.seconds, prompt_influence: influence(c, t), loop: false, model_id: model }) });
  } catch (e) { return { ok: false, status: 0, why: 'could not reach ' + base + ' (' + e.message + ')' }; }
  if (!res.ok) {
    let why = ''; try { const j = await res.json(), d = j && j.detail; why = typeof d === 'string' ? d : d && (d.message || d.status) ? [d.status, d.message].filter(Boolean).join(': ') : JSON.stringify(j).slice(0, 300); } catch (e) { /* no body */ }
    return { ok: false, status: res.status, why: why || res.statusText };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 600) return { ok: false, status: res.status, why: 'the reply was too small to be a sound' };
  return { ok: true, buf, cost: parseInt(res.headers.get('character-cost') || '', 10) };
}

(async () => {
  const o = args(process.argv.slice(2));
  if (o.help) { say(HELP); return; }
  const c = config(), man = readManifest();
  if (o.only && !c.tracks.some(t => t.id === o.only)) fail('No effect "' + o.only + '" in sfx/effects.json. Ids: ' + c.tracks.map(t => t.id).join(', '));
  if (o.prune) {
    const keep = new Set(Object.values(man.tracks).map(x => x.f)); let n = 0;
    if (fs.existsSync(P.audio)) for (const f of fs.readdirSync(P.audio)) if (/\.mp3$/.test(f) && !keep.has(f)) { fs.unlinkSync(path.join(P.audio, f)); n++; }
    say('Removed ' + n + ' unused effect file' + (n === 1 ? '' : 's') + '.'); return;
  }
  const rows = plan(c, man, o);
  if (o.list) { for (const r of rows) say('  ' + r.t.id.padEnd(10) + String(r.t.seconds).padStart(5) + 's  ' + (r.state === 'ok' ? 'made   ' + man.tracks[r.t.id].f : r.state === 'changed' ? 'prompt changed since it was made' : 'not made yet')); return; }
  const todo = rows.filter(r => o.force || r.state !== 'ok');
  if (!todo.length) { say('Every effect is made. Use --force for a new take, or edit a prompt in sfx/effects.json.'); return; }
  loadEnv();
  const key = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || '';
  if (!key) fail('No ElevenLabs API key found.\n\nIn this folder run:\n  npx -y @elevenlabs/cli@latest onboard connect\nIt signs you in in your browser and saves the key to .env.local for you.');
  const base = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/+$/, '');
  let model = o.model || process.env.ELEVENLABS_SFX_MODEL_ID || c.modelId || 'eleven_text_to_sound_v2';
  const format = c.outputFormat || 'mp3_44100_128', total = todo.reduce((n, r) => n + r.t.seconds, 0);
  say('About to make ' + todo.length + ' effect' + (todo.length === 1 ? '' : 's') + ' (' + todo.map(r => r.t.id).join(', ') + '), ' + Math.round(total * 10) / 10 + ' seconds of sound in all, with ' + model + '.');
  say('This is billed against your ElevenLabs plan.');
  if (!o.yes && !(await ask('Go ahead? (y/N) '))) { say('Nothing made.'); return; }
  fs.mkdirSync(P.audio, { recursive: true });
  let made = 0, bad = 0, spent = 0, priced = 0;
  for (const r of todo) {
    process.stdout.write('  ' + r.t.id.padEnd(10) + ' making... ');
    let out = await compose(base, key, model, format, c, r.t);
    if (!out.ok && model !== 'eleven_text_to_sound_v2' && !o.model && [400, 403, 404, 422].includes(out.status) && /model/i.test(out.why)) {      /* a plan without the newer model: fall back once, and stay there */
      say('\n  ' + model + ' was refused (' + out.why + '). Trying eleven_text_to_sound_v2.'); model = 'eleven_text_to_sound_v2';
      process.stdout.write('  ' + r.t.id.padEnd(10) + ' making... ');
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
    if (out.cost >= 0) { spent += out.cost; priced++; }
    say('saved audio/sfx/' + f + ' (' + Math.round(out.buf.length / 1024) + ' kB' + (out.cost >= 0 ? ', ' + out.cost + ' credits' : '') + ')');
  }
  say('\n' + made + ' made' + (bad ? ', ' + bad + ' failed (run again to retry those)' : '') + (priced ? '. ElevenLabs reported ' + spent + ' credits for ' + (priced === made ? 'them' : priced + ' of them') : '') + '.');
  if (made) say('Listen to them in audio/sfx/. To redo one: npm run sfx -- --only <id> --force\nThen: npm run build && npm run verify, and publish index.html.');
  if (bad) process.exit(1);
})();
