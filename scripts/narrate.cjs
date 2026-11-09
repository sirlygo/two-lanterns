#!/usr/bin/env node
'use strict';
/* Two Lanterns :: narration generator.
   Speaks every room, landing and title passage with ElevenLabs, saves the clips under audio/narration/
   and records them in narration/manifest.json. Run: node scripts/narrate.cjs --help
   The API key is read from the environment, .env.local or .env. It is never printed or written anywhere. */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const lib = require('./narration-lib.cjs');
const { paths } = lib;

const say = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rel = p => path.relative(paths.root, p).split(path.sep).join('/');
function fail(msg) { console.error('\n' + msg + '\n'); process.exit(1); }
if (typeof fetch !== 'function') fail('Node 18 or newer is needed (this Node has no fetch).');

const HELP = `Two Lanterns narration generator

  npm run narrate                        speak every passage that has no current clip (asks first)
  npm run narrate -- --only room-stair   only passages whose id starts with that (audition one first)
  npm run narrate -- --list              show what exists and what is missing (no network, no cost)
  npm run narrate -- --check             check the key, model and voice (free)
  npm run narrate -- --voices            list the voices in your ElevenLabs account (free)
  npm run narrate -- --models            list the models that can speak (free)
  npm run narrate -- --force             speak again even where a clip exists
  npm run narrate -- --prune             delete clip files the manifest no longer uses
  options: --yes (skip the question)   --concurrency N (1 to 4, default 2)

Setup: ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID come from the environment, .env.local or .env.
  npx -y @elevenlabs/cli@latest onboard connect    signs in in your browser and stores the key in .env.local
Model, format and pronunciations live in narration/config.json.`;

const FLAGS = new Set(['list', 'yes', 'force', 'prune', 'voices', 'models', 'check', 'help']);
const OPTS = new Set(['only', 'concurrency']);
function parseArgs(argv) {
  const out = { flags: {}, opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!m) fail('Unexpected argument "' + argv[i] + '". Try --help.');
    const name = m[1];
    if (FLAGS.has(name)) out.flags[name] = true;
    else if (OPTS.has(name)) {
      const v = m[2] !== undefined ? m[2] : argv[++i];
      if (v === undefined || String(v).startsWith('--')) fail('--' + name + ' needs a value.');
      out.opts[name] = v;
    } else fail('Unknown option --' + name + '. Try --help.');
  }
  return out;
}

/* Fill gaps in the environment from .env.local, then .env. Values are never printed. */
function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(paths.root, name);
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

function needKey(env) {
  if (env.apiKey) return;
  fail('No ElevenLabs API key found.\n\nIn this folder run:\n  npx -y @elevenlabs/cli@latest onboard connect\nIt signs you in in your browser and saves the key to .env.local for you.\n\nOr create one at https://elevenlabs.io/app/api/api-keys and add this line to .env.local (never commit it):\n  ELEVENLABS_API_KEY=your-key');
}
function needVoice(env) {
  if (env.voiceId) return;
  fail('No voice chosen.\n\nAdd a voice to My Voices in ElevenLabs, run\n  npm run narrate -- --voices\nto see the ids, then put one in .env.local as\n  ELEVENLABS_VOICE_ID=the-id\nor set "voiceId" in narration/config.json.');
}

function describe(r) {
  const d = r.json && r.json.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map(x => (x.loc ? x.loc.join('.') + ': ' : '') + (x.msg || '')).join('; ');
  if (d && typeof d === 'object') return [d.status, d.message].filter(Boolean).join(': ') || JSON.stringify(d).slice(0, 240);
  return r.text ? r.text.slice(0, 240) : '';
}

async function get(env, pathname) {
  let res;
  try { res = await fetch(env.base + pathname, { headers: { 'xi-api-key': env.apiKey, Accept: 'application/json' } }); }
  catch (e) { fail('Could not reach ' + env.base + ' (' + e.message + '). Check your internet connection.'); }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
  return { status: res.status, ok: res.ok, json, text, code: json && json.detail && json.detail.status };
}

const ttsModels = r => (Array.isArray(r.json) ? r.json : []).filter(m => m && m.can_do_text_to_speech);

async function listVoices(env) {
  needKey(env);
  const r = await get(env, '/v1/voices');
  if (r.code === 'missing_permissions') fail('This key cannot read voices (it is restricted). Copy the voice id from ElevenLabs instead: Voices > My Voices > the voice > ID.');
  if (!r.ok) fail('ElevenLabs answered ' + r.status + ': ' + describe(r));
  const voices = (r.json && r.json.voices) || [];
  if (!voices.length) return say('No voices in this account yet. Add one from the Voice Library (Voices > Explore), then run this again.');
  say('Voices in your account:\n');
  for (const v of voices) say('  ' + String(v.voice_id).padEnd(24) + ' ' + String(v.name || '').padEnd(28) + ' ' + (v.category || ''));
  say('\nPut your pick in .env.local as ELEVENLABS_VOICE_ID=<id>.');
}

async function listModels(env) {
  needKey(env);
  const r = await get(env, '/v1/models');
  if (r.code === 'missing_permissions') fail('This key cannot list models (it is restricted). Set ELEVENLABS_MODEL_ID by hand instead.');
  if (!r.ok) fail('ElevenLabs answered ' + r.status + ': ' + describe(r));
  say('Models that can speak:\n');
  for (const m of ttsModels(r)) say('  ' + String(m.model_id).padEnd(32) + ' ' + (m.name || '') + (m.model_id === env.cfg.modelId ? '   <- in use' : ''));
  say('\nSwitch with ELEVENLABS_MODEL_ID=<id> or "modelId" in narration/config.json.');
}

async function check(env) {
  needKey(env);
  let bad = 0;
  const m = await get(env, '/v1/models');
  if (m.status === 401 && m.code !== 'missing_permissions') { say('key:    REJECTED. ' + describe(m)); bad++; }
  else if (m.code === 'missing_permissions') say('key:    accepted (restricted, so the model check is skipped)');
  else if (!m.ok) { say('key:    unexpected answer ' + m.status + ': ' + describe(m)); bad++; }
  else {
    say('key:    accepted');
    const list = ttsModels(m), has = list.some(x => x.model_id === env.cfg.modelId);
    say('model:  ' + env.cfg.modelId + (has ? ' - available' : ' - NOT available. Try one of: ' + list.map(x => x.model_id).join(', ')));
    if (!has) bad++;
  }
  if (!env.voiceId) say('voice:  not set (run --voices)');
  else {
    const v = await get(env, '/v1/voices/' + encodeURIComponent(env.voiceId));
    if (v.ok) say('voice:  ' + env.voiceId + ' - ' + ((v.json && v.json.name) || 'found'));
    else if (v.code === 'missing_permissions') say('voice:  ' + env.voiceId + ' (restricted key, not checked)');
    else { say('voice:  ' + env.voiceId + ' - NOT found in this account (' + describe(v) + ')'); bad++; }
  }
  process.exit(bad ? 1 : 0);
}

async function preflight(env) {
  const m = await get(env, '/v1/models');
  if (m.status === 401 && m.code !== 'missing_permissions') fail('ElevenLabs rejected the API key. ' + describe(m) + '\nMake a fresh one with: npx -y @elevenlabs/cli@latest onboard connect --replace');
  if (!m.ok) return;
  const list = ttsModels(m);
  if (list.length && !list.some(x => x.model_id === env.cfg.modelId)) {
    fail('Model "' + env.cfg.modelId + '" is not available to this account.\nModels that can speak: ' + list.map(x => x.model_id).join(', ') + '\nSet ELEVENLABS_MODEL_ID=<id> or "modelId" in narration/config.json, then run again. Nothing was spent.');
  }
}

const isMp3 = b => b.length > 4 && (b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));

function hint(status) {
  if (status === 401) return ' (key rejected or out of credits; check the plan at elevenlabs.io)';
  if (status === 402 || status === 403) return ' (the account or plan does not allow this request)';
  if (status === 404) return ' (voice not found: it must be in My Voices; run --voices)';
  if (status === 400 || status === 422) return ' (request refused: check the model with --models and narration/config.json)';
  return '';
}

async function speak(it, env) {
  const url = env.base + '/v1/text-to-speech/' + encodeURIComponent(env.voiceId) + '?output_format=' + encodeURIComponent(env.cfg.outputFormat);
  const body = { text: it.spoken, model_id: env.cfg.modelId };
  if (env.cfg.voiceSettings) body.voice_settings = env.cfg.voiceSettings;
  if (env.cfg.seed !== null && env.cfg.seed !== undefined) body.seed = env.cfg.seed;
  for (let attempt = 0; ; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 120000);
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': env.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body), signal: ctl.signal });
    } catch (e) {
      clearTimeout(timer);
      if (attempt < 4) { await sleep(1000 * 2 ** attempt); continue; }
      throw new Error('network error: ' + e.message);
    }
    clearTimeout(timer);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isMp3(buf) || buf.length < 1024) throw new Error('ElevenLabs sent something that is not an MP3 (' + buf.length + ' bytes)');
      return buf;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 5) {
      const wait = Number(res.headers.get('retry-after'));
      await sleep(wait > 0 ? Math.min(wait, 60) * 1000 : Math.min(30000, 1000 * 2 ** attempt));
      continue;
    }
    const err = new Error('HTTP ' + res.status + ' ' + describe({ json, text }) + hint(res.status));
    err.fatal = !retryable;
    throw err;
  }
}

function saveClip(it, buf, env, man) {
  const spec = lib.specFor(it, env.voiceId, env.cfg);
  const f = it.id + '.' + spec.slice(0, 6) + '.mp3';
  fs.mkdirSync(paths.audio, { recursive: true });
  const tmp = path.join(paths.audio, f + '.part');
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, path.join(paths.audio, f));
  for (const [k, c] of Object.entries(man.clips)) {
    if (c.id === it.id && k !== it.key) { delete man.clips[k]; if (c.f !== f) try { fs.unlinkSync(path.join(paths.audio, c.f)); } catch (e) { /* already gone */ } }
  }
  const old = man.clips[it.key];
  if (old && old.f !== f) { try { fs.unlinkSync(path.join(paths.audio, old.f)); } catch (e) { /* already gone */ } }
  man.clips[it.key] = { id: it.id, f, spec, chars: it.spoken.length, voice: env.voiceId, model: env.cfg.modelId, format: env.cfg.outputFormat, at: new Date().toISOString() };
  lib.writeManifest(man);
  return f;
}

async function generate(todo, env, man) {
  const queue = todo.slice(), failed = [];
  let done = 0, stop = false;
  const total = todo.length;
  const worker = async () => {
    while (queue.length && !stop) {
      const it = queue.shift();
      try {
        const buf = await speak(it, env);
        saveClip(it, buf, env, man);
        done++;
        say('  [' + (done + failed.length) + '/' + total + '] ' + it.id.padEnd(26) + String(it.spoken.length).padStart(5) + ' chars  ok  ' + Math.round(buf.length / 1024) + ' KB');
      } catch (e) {
        failed.push({ it, e });
        say('  [' + (done + failed.length) + '/' + total + '] ' + it.id.padEnd(26) + 'FAILED  ' + e.message);
        if (e.fatal || (done === 0 && failed.length >= 3)) stop = true;
      }
    }
  };
  await Promise.all(Array.from({ length: env.concurrency }, worker));
  return { done, failed, stopped: stop && queue.length > 0 };
}

function clipStatus(it, man, env) {
  const have = man.clips[it.key];
  if (!have || have.id !== it.id || !fs.existsSync(path.join(paths.audio, have.f))) return 'missing';
  if (env.voiceId && have.spec !== lib.specFor(it, env.voiceId, env.cfg)) return 'outdated';
  return 'ok';
}

function ask(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, a => { rl.close(); resolve(/^y(es)?$/i.test(a.trim())); });
  });
}

function prune(items, man) {
  const used = new Set(Object.values(man.clips).map(c => c.f));
  let gone = 0;
  if (fs.existsSync(paths.audio)) {
    for (const f of fs.readdirSync(paths.audio)) {
      if (!/\.(mp3|part)$/.test(f) || used.has(f)) continue;
      fs.unlinkSync(path.join(paths.audio, f));
      say('  removed ' + f);
      gone++;
    }
  }
  const live = new Map(items.map(it => [it.key, it.id]));
  let dropped = 0;
  for (const [k, c] of Object.entries(man.clips)) if (live.get(k) !== c.id) { delete man.clips[k]; dropped++; }
  if (dropped) lib.writeManifest(man);
  say(gone || dropped ? 'Removed ' + gone + ' unused file(s) and ' + dropped + ' manifest entr' + (dropped === 1 ? 'y' : 'ies') + '.' : 'Nothing to prune.');
}

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.help) return say(HELP);
  loadEnv();
  let cfg;
  try { cfg = lib.loadConfig(); } catch (e) { fail(e.message); }
  if (process.env.ELEVENLABS_MODEL_ID) cfg.modelId = process.env.ELEVENLABS_MODEL_ID.trim();
  const env = {
    cfg,
    apiKey: (process.env.ELEVENLABS_API_KEY || '').trim(),
    voiceId: (process.env.ELEVENLABS_VOICE_ID || cfg.voiceId || '').trim(),
    base: (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/+$/, ''),
    concurrency: clamp(parseInt(opts.concurrency || '2', 10) || 2, 1, 4)
  };
  if (flags.voices) return listVoices(env);
  if (flags.models) return listModels(env);
  if (flags.check) return check(env);

  let items, man;
  try { items = lib.buildItems(lib.readGame(), cfg); man = lib.readManifest(); } catch (e) { fail(e.message); }
  if (flags.prune) return prune(items, man);

  const want = opts.only ? opts.only.split(',').map(s => s.trim()).filter(Boolean) : null;
  const pick = want ? items.filter(it => want.some(w => it.id === w || it.id.startsWith(w))) : items;
  if (want && !pick.length) fail('No passage id starts with "' + opts.only + '". The ids are:\n  ' + items.map(i => i.id).join('\n  '));
  const rows = pick.map(it => ({ it, status: flags.force ? 'forced' : clipStatus(it, man, env) }));
  const todo = rows.filter(r => r.status !== 'ok').map(r => r.it);
  const chars = todo.reduce((n, it) => n + it.spoken.length, 0);
  const count = s => rows.filter(r => r.status === s).length;

  if (flags.list) {
    say('Passages: ' + rows.length + '   ok ' + count('ok') + '   missing ' + count('missing') + '   outdated ' + count('outdated') + (flags.force ? '   forced ' + count('forced') : ''));
    for (const r of rows) say('  ' + r.it.id.padEnd(26) + String(r.it.spoken.length).padStart(5) + ' chars  ' + r.status);
    say('\nVoice: ' + (env.voiceId || '(not set)') + '   Model: ' + cfg.modelId + '   Format: ' + cfg.outputFormat);
    say(todo.length ? 'To speak: ' + todo.length + ' passage(s), ' + chars.toLocaleString('en-US') + ' characters.' : 'Nothing to speak.');
    return;
  }
  if (!todo.length) return say('Nothing to do: every passage already has a current clip.\nRun npm run build to bake the narrator into index.html.');

  needKey(env);
  needVoice(env);
  await preflight(env);
  say('About to speak ' + todo.length + ' passage(s), ' + chars.toLocaleString('en-US') + ' characters, with voice ' + env.voiceId + ' on ' + cfg.modelId + ' (' + cfg.outputFormat + ').');
  say('ElevenLabs bills this by character against your plan. Safe to stop and run again: finished clips are kept.');
  if (!flags.yes) {
    if (!process.stdin.isTTY) fail('This is not an interactive terminal. Add --yes to go ahead.');
    if (!(await ask('Go ahead? [y/N] '))) return say('Cancelled. Nothing was spent.');
  }
  say('');
  const res = await generate(todo, env, man);

  const live = new Map(items.map(it => [it.key, it.id]));
  let changed = false;
  for (const [k, c] of Object.entries(man.clips)) if (live.get(k) !== c.id) { delete man.clips[k]; changed = true; }
  if (changed) lib.writeManifest(man);

  say('\nSpoke ' + res.done + ' of ' + todo.length + '.' + (res.failed.length ? ' ' + res.failed.length + ' failed, so run the same command again to retry them.' : ''));
  if (res.stopped) say('Stopped early because the error above will repeat for every passage.');
  if (res.done && opts.only) say('Listen: double-click ' + rel(paths.audio) + '/' + man.clips[todo.find(t => man.clips[t.key]).key].f + '\nHappy with it? Run npm run narrate for the rest.');
  else if (res.done) say('Next: npm run build, then publish index.html together with the audio folder.');
  if (res.failed.length) process.exit(1);
}

main().catch(e => fail(e && e.message ? e.message : String(e)));
