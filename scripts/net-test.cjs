'use strict';
/* Two Lanterns :: online-play test. Hosts a room in one browser and joins it from another (separate browser contexts), against a broker and a relay that run
   on this machine, and checks what happens on the way: a direct line, a line through the broker, networks that cannot connect, a slow line, a wrong code.
   Needs the dependencies of `npm run qa`, plus:  npm install --no-save peer node-turn
   Run:  node scripts/net-test.cjs [scenario ...]
   Scenarios: direct broker blocked blocked-direct slow slow-direct relay badcode lock   (none named = all)
   TWO_LANTERNS_NODE_MODULES and TWO_LANTERNS_CHROME work as they do for npm run qa. Nothing here touches the real PeerJS broker. */
const path = require('node:path');
const dependency = name => {
  if (process.env.TWO_LANTERNS_NODE_MODULES) { try { return require(path.join(process.env.TWO_LANTERNS_NODE_MODULES, name)); } catch (e) { /* not there: look in the usual places */ } }
  return require(name);
};
const { chromium } = dependency('playwright');
const { PeerServer } = dependency('peer');
const Turn = dependency('node-turn');
const root = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(root, 'index.html');
const FLAGS = ['--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'];      /* let two browsers on one machine see each other's addresses */
const TURN = [{ urls: 'turn:127.0.0.1:3478?transport=udp', username: 'user', credential: 'pass' }];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- the broker: the PeerJS server, made to behave as the public one does. Found by trying 0.peerjs.com on 8 November 2026: a CANDIDATE message is forwarded only when its
   payload is { type: 'data' | 'media', connectionId: <text>, candidate: { candidate: <text> } } and the message is under 32 kB, otherwise the sender's connection is closed;
   and a CANDIDATE for someone who is not connected is not kept for later, the sender at once gets an EXPIRE. (The stock server forwards anything, and keeps what it cannot
   deliver.) A page that sends the broker anything else fails here, as it would in front of a player. ---- */
const refused = [], present = new Map();
const accepted = p => !!p && typeof p === 'object' && (p.type === 'data' || p.type === 'media') && typeof p.connectionId === 'string' && p.connectionId !== '' && !!p.candidate && typeof p.candidate === 'object' && typeof p.candidate.candidate === 'string';
function publicRules(app) {
  app.on('connection', c => present.set(c.getId(), c));
  app.on('disconnect', c => { if (present.get(c.getId()) === c) present.delete(c.getId()); });
  app.on('message', (client, message) => {
    if (!message || message.type !== 'CANDIDATE') return;
    const socket = client.getSocket();
    if (!accepted(message.payload) || JSON.stringify(message).length >= 16000) {
      refused.push(client.getId() + ' -> ' + message.dst + ' ' + JSON.stringify(message.payload).slice(0, 100));
      message.type = 'REFUSED';      /* so the server's own handler ignores it */
      if (socket) socket.close(1000);
      return;
    }
    if (!present.has(message.dst)) {
      message.type = 'EXPIRED';
      if (socket) socket.send(JSON.stringify({ type: 'EXPIRE', src: message.dst, dst: client.getId() }));
    }
  });
}
/* the rules themselves, tried with bare WebSockets: if these did not hold, every pass below would mean nothing */
async function rules(browser) {
  const results = [], check = (what, ok, detail) => { results.push({ what, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); };
  const c = await browser.newContext(), p = await c.newPage(); await p.goto('http://localhost:9000/');
  const r = await p.evaluate(async () => {
    const sleep = ms => new Promise(res => setTimeout(res, ms)), rnd = () => Math.random().toString(36).slice(2, 8);
    const mk = id => new Promise((res, rej) => { const w = new WebSocket('ws://localhost:9000/peerjs?key=peerjs&id=' + id + '&token=' + rnd()); w.pid = id; w.got = []; w.closedWith = null; w.onmessage = e => { const m = JSON.parse(e.data); w.got.push(m); if (m.type === 'OPEN') res(w); }; w.onclose = e => { w.closedWith = e.code; }; setTimeout(() => rej(new Error('no OPEN')), 5000); });
    const env = x => Object.assign({ type: 'data', connectionId: 'tl-line', candidate: { candidate: '', sdpMid: '0', sdpMLineIndex: 0 } }, x);
    const trial = async (payload, to) => {
      const a = await mk('rules-a-' + rnd()), b = await mk('rules-b-' + rnd()), t0 = Date.now();
      a.send(JSON.stringify({ type: 'CANDIDATE', dst: to === 'nobody' ? 'rules-nobody-' + rnd() : b.pid, payload }));
      await sleep(600);
      const o = { aOpen: a.closedWith === null, bGot: b.got.filter(m => m.type === 'CANDIDATE').length, expire: a.got.filter(m => m.type === 'EXPIRE').length, ms: Date.now() - t0 };
      a.close(); b.close(); return o;
    };
    return {
      good: await trial(env({ tl: 1, k: 'open', cid: 'x' })),
      bare: await trial({ tl: 1, k: 'open', cid: 'x' }),
      noCandidate: await trial({ type: 'data', connectionId: 'tl-line', tl: 1 }),
      big: await trial(env({ tl: 1, d: 'z'.repeat(17000) })),
      nobody: await trial(env({ tl: 1, k: 'open', cid: 'x' }), 'nobody')
    };
  });
  check('a frame in the accepted envelope is delivered, and the sender stays connected', r.good.aOpen && r.good.bGot === 1, JSON.stringify(r.good));
  check('the bare frame of the first version is refused: the sender is cut off, nothing arrives', !r.bare.aOpen && r.bare.bGot === 0, JSON.stringify(r.bare));
  check('a payload without a candidate is refused', !r.noCandidate.aOpen && r.noCandidate.bGot === 0, JSON.stringify(r.noCandidate));
  check('a frame over 16 kB is refused', !r.big.aOpen && r.big.bGot === 0, JSON.stringify(r.big));
  check('a frame for someone who is not there is answered with an expire, and the sender stays connected', r.nobody.aOpen && r.nobody.expire === 1 && r.nobody.bGot === 0, JSON.stringify(r.nobody));
  await c.close();
  refused.length = 0;      /* the refusals above were on purpose */
  return { name: 'rules', about: 'the test broker keeps the public broker\'s rules', results, secs: '1' };
}

/* ---- what the page is made to live through (runs in every page before the game loads) ---- */
function init(o) {
  window.__frames = 0; window.__ws = []; window.__pcs = []; window.__wl = [];
  const W = window.WebSocket;
  window.WebSocket = function (...a) { const w = new W(...a); window.__ws.push(w); return w; };
  window.WebSocket.prototype = W.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((k, i) => { window.WebSocket[k] = i; });
  const send = W.prototype.send;
  W.prototype.send = function (d) {
    try {
      const m = JSON.parse(d);
      if (m && m.payload && m.payload.tl === 1) window.__frames += 1;      /* a frame of a line through the broker */
      if (o.slow && m) {      /* a poor network: the addresses of each side reach the other ten seconds late */
        if ((m.type === 'OFFER' || m.type === 'ANSWER') && m.payload && m.payload.sdp && m.payload.sdp.sdp) { m.payload.sdp.sdp = m.payload.sdp.sdp.replace(/^a=candidate.*\r?\n/gm, ''); d = JSON.stringify(m); }
        if (m.type === 'CANDIDATE' && !(m.payload && m.payload.tl === 1)) { const t = JSON.stringify(m), self = this; setTimeout(() => { try { send.call(self, t); } catch (e) { /* closed */ } }, 10000); return; }
      }
    } catch (e) { /* not JSON */ }
    return send.call(this, d);
  };
  if (o.blackhole) {      /* two networks that cannot reach each other: every address the browsers offer points at nothing */
    const Orig = window.RTCPeerConnection;
    const mangle = c => { if (!c || !c.candidate) return c; const t = c.candidate.split(' '); t[4] = '192.0.2.77'; return { candidate: t.join(' '), sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment, toJSON() { return { candidate: this.candidate, sdpMid: this.sdpMid, sdpMLineIndex: this.sdpMLineIndex, usernameFragment: this.usernameFragment }; } }; };
    window.RTCPeerConnection = function (...a) {
      const pc = new Orig(...a); let handler = null;
      Object.defineProperty(pc, 'onicecandidate', { get: () => handler, set: h => { handler = h; } });
      pc.addEventListener('icecandidate', e => { if (handler) handler({ candidate: mangle(e.candidate) }); });
      return pc;
    };
    window.RTCPeerConnection.prototype = Orig.prototype;
  }
  const O = window.RTCPeerConnection;
  window.RTCPeerConnection = function (...a) { const pc = new O(...a); window.__pcs.push(pc); return pc; };
  window.RTCPeerConnection.prototype = O.prototype;
  if (o.wake) Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async t => { window.__wl.push('request:' + t); return { release() { window.__wl.push('release'); }, addEventListener() {} }; } } });
}

/* ---- the scenarios: how the page is told to behave, and what must come out ---- */
const SCENARIOS = {
  direct: { about: 'two browsers that can reach each other: a direct line, nothing through the broker', init: {}, link: '' },
  broker: { about: 'a line through the broker from the start (?link=broker), then the broker drops the host and the host comes back', init: {}, link: 'broker' },
  blocked: { about: 'two networks that cannot connect: the game falls back to the broker', init: { blackhole: true }, link: '' },
  'blocked-direct': { about: 'the same, with the broker route switched off (?link=direct): an honest message on both screens', init: { blackhole: true }, link: 'direct' },
  slow: { about: 'a slow network: a line opens one way or the other', init: { slow: true }, link: '' },
  'slow-direct': { about: 'a slow network, broker route off: the direct line is given the time it needs', init: { slow: true }, link: 'direct' },
  relay: { about: 'a relay server (TURN) in the list and nothing else allowed: the line runs through the relay', init: {}, link: 'direct', ice: 'relay' },
  badcode: { about: 'a code nobody is hosting: "no such room", quickly', init: {}, link: '', code: 'ZZZZ' },
  lock: { about: 'the screen is kept awake in a room and let go when the room is left', init: { wake: true }, link: '' }
};

const info = p => p.evaluate(() => { const i = __tl.NT.info(); return { state: i.state, linked: i.linked, err: i.err, via: i.via, knock: i.knock, guestToken: i.guestToken, guestName: i.guestName, code: i.code }; });
const screenText = p => p.evaluate(() => (document.querySelector('.screen') ? document.querySelector('.screen').innerText : '').replace(/\s+/g, ' ').trim());
async function until(fn, ms, step = 250) { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step); } }

/* messages both ways, in four sizes (small; too big for one frame of a line through the broker but whole on a direct line; big enough to travel in pieces on both; small again): arrive whole, in order */
async function exchange(H, G) {
  const tap = p => p.evaluate(() => { if (window.__got) { window.__got.length = 0; return; } window.__got = []; const o = __tl.NT.onMsg; __tl.NT.onMsg = m => { if (m && m.t === 'tltest') window.__got.push(m); else if (o) o(m); }; });
  await tap(H.p); await tap(G.p);
  const big = 'x'.repeat(30000) + 'END', mid = 'm'.repeat(12000) + 'MID';
  const burst = (p, who) => p.evaluate(([big, mid, who]) => [__tl.NT.send({ t: 'tltest', n: 1, who, d: 'hello' }), __tl.NT.send({ t: 'tltest', n: 2, who, d: mid }), __tl.NT.send({ t: 'tltest', n: 3, who, d: big }), __tl.NT.send({ t: 'tltest', n: 4, who, d: 'last' })], [big, mid, who]);
  const sent = [await burst(H.p, 'host'), await burst(G.p, 'guest')];
  const got = async p => (await until(async () => { const a = await p.evaluate(() => window.__got); return a.length >= 4 ? a : null; }, 10000)) || (await p.evaluate(() => window.__got));
  const gh = await got(H.p), gg = await got(G.p);
  const whole = (a, who) => a.length === 4 && a.every((m, i) => m.n === i + 1 && m.who === who) && a[1].d === mid && a[2].d === big;
  return { sentOk: sent.flat().every(Boolean), host: whole(gh, 'guest'), guest: whole(gg, 'host') };
}

async function run(browser, name, ctl) {
  const sc = SCENARIOS[name], results = [], t0 = Date.now(), refusedBefore = refused.length;
  const check = (what, ok, detail) => { results.push({ what, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); };
  const mk = async () => {
    const c = await browser.newContext({ viewport: { width: 900, height: 900 } });
    await c.addInitScript(init, sc.init);
    const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    return { c, p, errs };
  };
  const H = await mk(), G = await mk();
  const q = '?peer=localhost:9000/' + (sc.link ? '&link=' + sc.link : '') + (sc.ice ? '&ice=' + sc.ice : '');
  await H.p.goto(PAGE + q); await G.p.goto(PAGE + q);
  if (sc.ice === 'relay') for (const P of [H.p, G.p]) await P.evaluate(ice => { window.TL_ICE = ice; }, TURN);
  await H.p.click('[data-act=online]'); await H.p.waitForSelector('[data-form=lobby]');
  await H.p.fill('input[name=n]', 'Hosty'); await H.p.click('[data-act=host]'); await H.p.waitForSelector('.roomcode');
  const code = await H.p.$eval('.roomcode', e => [...e.querySelectorAll('span')].map(s => s.textContent).join(''));
  check('the host opens a room', await until(async () => (await info(H.p)).state === 'waiting', 15000), code);
  const join = async (P, who, to) => {
    await P.click('[data-act=online]'); await P.waitForSelector('[data-form=lobby]');
    await P.fill('input[name=n]', who);
    await P.fill('input[name=code]', to.toLowerCase());      /* lower case on purpose: the form must accept it */
    await P.click('form[data-form=lobby] button[type=submit]');
  };
  const tJoin = Date.now(); await join(G.p, 'Joiner', sc.code || code);
  const both = async () => { const g = await info(G.p), h = await info(H.p); return g.linked && h.linked ? { g, h } : null; };
  const failed = async () => { const g = await info(G.p); return g.state === 'error' ? g : null; };
  const settle = await until(async () => (await both()) || (await failed()), name.startsWith('blocked-direct') ? 40000 : 60000);
  const secs = () => ((Date.now() - tJoin) / 1000).toFixed(1);
  const linked = settle && settle.g && settle.h;
  let g = await info(G.p), h = await info(H.p);

  if (name === 'badcode') {
    check('the guest is told there is no such room', g.state === 'error' && g.err && g.err.kind === 'noroom', g.err && g.err.kind);
    check('...within 12 seconds', g.state === 'error' && +secs() < 12, secs() + 's');
    check('nothing went through the broker', (await G.p.evaluate(() => window.__frames)) === 0);
  } else if (name === 'blocked-direct') {
    check('the guest gets the "different networks" message', g.state === 'error' && g.err && g.err.kind === 'webrtc', g.err && g.err.kind);
    check('...with a details line that says the broker route was not used', g.err && /^Details: ice \w+/.test(g.err.diag) && /backup route not used/.test(g.err.diag), g.err && g.err.diag);
    check('...and the screen shows it', /different networks/.test(await screenText(G.p)));
    const knock = await until(async () => (await info(H.p)).knock === 'failed', 45000);
    check('the host is told that someone found the room but could not get through', knock, (await info(H.p)).knock);
    check('...and its screen says so', /found the room, but the direct line would not open/.test(await screenText(H.p)));
  } else {
    check('both players are linked', linked, linked ? secs() + 's' : 'guest ' + g.state + (g.err ? ' (' + g.err.kind + ')' : '') + ', host ' + h.state);
    if (linked) {
      if (name === 'direct') {
        check('the line is direct on both sides', g.via === 'direct' && h.via === 'direct', g.via + '/' + h.via);
        check('nothing went through the broker', (await G.p.evaluate(() => window.__frames)) + (await H.p.evaluate(() => window.__frames)) === 0);
      }
      if (name === 'broker' || name === 'blocked') {
        check('the line runs through the broker on both sides', g.via === 'broker' && h.via === 'broker', g.via + '/' + h.via);
        if (name === 'blocked') {
          check('it took the direct line a few seconds to give up, not half a minute', +secs() > 5 && +secs() < 20, secs() + 's');
          await sleep(Math.max(0, 33000 - (Date.now() - tJoin)));      /* past the moment the host gives up on the direct attempt the guest walked away from */
          const late = await info(H.p);
          check('the host, now linked, is not told that the abandoned direct attempt failed', late.linked && !late.knock && !/would not open/.test(await screenText(H.p)), late.state + ' knock=' + late.knock);
        }
      }
      if (name === 'slow') check('a line is open (' + g.via + ')', true, secs() + 's');
      if (name === 'slow-direct') { check('the slow direct line opened', g.via === 'direct' && h.via === 'direct', g.via + '/' + h.via); check('...after the ten seconds it was held up', +secs() > 9, secs() + 's'); }
      if (name === 'relay') {
        const path = await G.p.evaluate(async () => { const r = []; for (const pc of window.__pcs) { try { const st = await pc.getStats(), by = {}; st.forEach(s => { by[s.id] = s; }); st.forEach(s => { if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') r.push((by[s.localCandidateId] || {}).candidateType + '->' + (by[s.remoteCandidateId] || {}).candidateType); }); } catch (e) { /* closed */ } } return r; });
        check('the direct line runs through the relay server', g.via === 'direct' && path.includes('relay->relay'), g.via + ' ' + path.join(','));
      }
      if (name !== 'lock') {
        const x = await exchange(H, G);
        check('messages (a mid-size one and a big one in pieces) arrive whole and in order, both ways', x.sentOk && x.host && x.guest, JSON.stringify(x));
      }
      if (name === 'broker') {
        await H.p.evaluate(() => { window.__ws.forEach(w => { try { w.close(); } catch (e) { /* closed */ } }); });      /* the host loses the broker */
        check('the host notices the line is gone', await until(async () => !(await info(H.p)).linked, 8000));
        const tBlip = Date.now();
        const back = await until(async () => (await both()) ? true : null, 40000);
        const g2 = await info(G.p), h2 = await info(H.p);
        check('the host gets back on the broker and the guest finds the room again', back && g2.via === 'broker' && h2.via === 'broker', back ? 'linked again after ' + ((Date.now() - tBlip) / 1000).toFixed(1) + 's' : 'host ' + h2.state + ', guest ' + g2.state);
        if (back) {
          const x2 = await exchange(H, G);
          check('...and messages still cross', x2.sentOk && x2.host && x2.guest, JSON.stringify(x2));
          const keep = { code: h2.code, guestToken: h2.guestToken, guestName: h2.guestName };
          await H.p.evaluate(o => { __tl.NT.host(o); }, keep);      /* the host page comes back with the same room, as after a reload */
          const again = await until(async () => { const a = await info(G.p), b = await info(H.p); return a.linked && b.linked && b.state === 'linked' ? { a, b } : null; }, 45000);
          check('a host that comes back with the same room is joined again by the same player', again && again.b.guestToken === keep.guestToken, again ? again.a.via + '/' + again.b.via : 'not linked');
          const G3 = await mk(); await G3.p.goto(PAGE + q); await join(G3.p, 'Third', keep.code);
          const full = await until(async () => { const i = await info(G3.p); return i.state === 'error' ? i : null; }, 25000);
          check('a third player is told the room is full', full && full.err.kind === 'full', full ? full.err.kind : 'no answer');
          await G3.c.close();
          await H.p.evaluate(() => { __tl.NT.leave(true); });
          const left = await until(async () => { const i = await info(G.p); return i.state === 'error' ? i : null; }, 12000);
          check('when the host leaves on purpose the guest is told', left && left.err.kind === 'left', left ? left.err.kind : 'no answer');
        }
      }
      if (name === 'lock') {
        const wl = { host: await H.p.evaluate(() => window.__wl), guest: await G.p.evaluate(() => window.__wl) };
        check('both screens ask to stay awake', wl.host.includes('request:screen') && wl.guest.includes('request:screen'), JSON.stringify(wl));
        await H.p.evaluate(() => __tl.NT.leave(true)); await sleep(500);
        const after = await H.p.evaluate(() => window.__wl);
        check('the host lets its screen sleep again on leaving', after.includes('release'), JSON.stringify(after));
      }
    }
  }
  check('the broker refused nothing the pages sent', refused.length === refusedBefore, refused.slice(refusedBefore).join(' | '));
  check('no script errors on either page', !H.errs.length && !G.errs.length, [...H.errs, ...G.errs].join(' | '));
  await H.c.close(); await G.c.close();
  return { name, about: sc.about, results, secs: ((Date.now() - t0) / 1000).toFixed(0) };
}

(async () => {
  const want = process.argv.slice(2), names = want.length ? want : Object.keys(SCENARIOS);
  for (const n of names) if (!SCENARIOS[n]) { console.error('Unknown scenario "' + n + '". Known: ' + Object.keys(SCENARIOS).join(' ')); process.exit(2); }
  publicRules(PeerServer({ port: 9000, host: '127.0.0.1', path: '/', allow_discovery: false }));      /* a broker, as peerjs.com runs it */
  const turn = new Turn({ authMech: 'long-term', credentials: { user: 'pass' }, listeningPort: 3478, listeningIps: ['127.0.0.1'], relayIps: ['127.0.0.1'], minPort: 49160, maxPort: 49200, debugLevel: 'OFF' });
  turn.start();
  const launch = { args: FLAGS }; if (process.env.TWO_LANTERNS_CHROME) launch.executablePath = process.env.TWO_LANTERNS_CHROME;
  const browser = await chromium.launch(launch);
  let bad = 0;
  const show = r => {
    console.log('\n' + r.name + ' (' + r.secs + 's): ' + r.about);
    for (const c of r.results) { console.log('  ' + (c.ok ? 'pass' : 'FAIL') + '  ' + c.what + (c.detail ? '  [' + c.detail + ']' : '')); if (!c.ok) bad += 1; }
  };
  try { show(await rules(browser)); } catch (e) { show({ name: 'rules', about: 'the test broker keeps the public broker\'s rules', secs: '?', results: [{ what: 'the rules were tried', ok: false, detail: e && e.message }] }); }
  for (const n of names) {
    let r;
    try { r = await run(browser, n); } catch (e) { r = { name: n, about: SCENARIOS[n].about, secs: '?', results: [{ what: 'the scenario ran', ok: false, detail: e && e.message }] }; }
    show(r);
  }
  await browser.close(); try { turn.stop(); } catch (e) { /* ignore */ }
  console.log('\n' + (bad ? bad + ' check(s) failed' : 'all checks passed'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
