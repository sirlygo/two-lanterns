'use strict';
/* Two Lanterns :: checks on the online-play code that need only Node.js (run by verify-art.cjs, so `npm run verify` covers them).
   The page's net.js is run on its own, against a stand-in for PeerJS and a clock that only moves when the test says so, and the checks follow a room through:
   which servers are offered to the browsers, how a line through the broker is opened, used and lost, and how a guest decides to try it.
   The two browsers themselves are tested by net-test.cjs, which needs a browser. */
const vm = require('node:vm');
const assert = require('node:assert/strict');

module.exports = function verifyNet(html) {
  const a = html.indexOf('/* Two Lanterns :: net.js.'), b = html.indexOf('/* Two Lanterns :: interface (hot-seat');
  assert(a > 0 && b > a, 'net.js was not found in the page');
  const source = html.slice(a, b);

  /* the public broker's rules for a CANDIDATE message, as found by trying it (0.peerjs.com, 8 November 2026): a payload of { type: 'data' | 'media', connectionId: <text>,
     candidate: { candidate: <text> } } is forwarded, anything else closes the sender's connection, and so does a message of 32 kB or more. Everything the page sends is
     held to this, so a change that the real broker would refuse fails here and not in front of a player. */
  const brokerRefuses = m => {
    if (!m || typeof m.type !== 'string') return 'no type';
    if (m.type !== 'CANDIDATE') return '';
    const p = m.payload;
    if (!p || typeof p !== 'object') return 'no payload';
    if (p.type !== 'data' && p.type !== 'media') return 'payload.type is ' + JSON.stringify(p.type);
    if (typeof p.connectionId !== 'string' || !p.connectionId) return 'no connectionId';
    if (!p.candidate || typeof p.candidate !== 'object' || typeof p.candidate.candidate !== 'string') return 'no candidate.candidate';
    if (JSON.stringify(m).length >= 16000) return 'over 16 kB';
    return '';
  };
  const refused = [];

  /* a PeerJS stand-in: a peer with a socket that records what is sent, and connections that never open by themselves. Like PeerJS it hands every message from the
     broker to _handleMessage first, and files what it cannot match to a connection (the "lost" messages that it keeps) */
  const peers = [], timers = [];
  class Emitter {
    constructor() { this.h = {}; }
    on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this; }
    emit(ev, x) { (this.h[ev] || []).slice().forEach(fn => fn(x)); }
  }
  class FakeConn extends Emitter { constructor() { super(); this.open = false; this.closed = 0; } send() {} close() { this.closed += 1; } }
  class FakePeer extends Emitter {
    constructor(id, opts) { super(); this.id = id; this.opts = opts; this.disconnected = false; this.destroyed = false; this.conns = []; this.sent = []; this.seen = []; this._lostMessages = new Map();
      const me = this; this.socket = Object.assign(new Emitter(), { send(m) { const why = brokerRefuses(m); if (why) refused.push(why + ': ' + JSON.stringify(m).slice(0, 120)); me.sent.push(m); } });
      this.socket.on('message', m => { me._handleMessage(m); }); peers.push(this); }
    _handleMessage(m) { this.seen.push(m); const k = m.payload && m.payload.connectionId; if (k) { if (!this._lostMessages.has(k)) this._lostMessages.set(k, []); this._lostMessages.get(k).push(m); } }
    connect() { const c = new FakeConn(); this.conns.push(c); return c; }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.emit('close'); }
    reconnect() {}
  }
  let id = 0;
  const ctx = vm.createContext({
    console, URLSearchParams, TextEncoder, Peer: FakePeer, location: { search: '' },
    setTimeout: (fn, ms) => { const t = { id: ++id, fn, ms, on: true }; timers.push(t); return t.id; },
    clearTimeout: i => { const t = timers.find(x => x.id === i); if (t) t.on = false; },
    setInterval: () => ++id, clearInterval: () => {}
  });
  vm.runInContext(source, ctx);
  const Net = ctx.Net;
  const fire = ms => { const t = timers.find(x => x.on && x.ms === ms); assert(t, 'no timer of ' + ms + ' ms is waiting'); t.on = false; t.fn(); };
  const isFrame = m => m && m.type === 'CANDIDATE' && m.payload && m.payload.tl === 1;
  const frames = p => p.sent.filter(isFrame);
  /* what the broker hands a peer: the frame as its sender put it, in the envelope the broker accepts, with the sender's id on it */
  const deliver = (p, src, payload) => p.socket.emit('message', { type: 'CANDIDATE', src, payload: Object.assign({ type: 'data', connectionId: 'tl-line', candidate: { candidate: '', sdpMid: '0', sdpMLineIndex: 0 }, tl: 1 }, payload) });
  const urls = list => list.flatMap(s => [].concat(s.urls));
  const out = {};

  /* 1. the servers offered to the browsers: STUN, and no relay unless one was put in the page (PeerJS's own relays no longer exist) */
  const cfg = Net.config();
  assert(cfg.config && Array.isArray(cfg.config.iceServers) && cfg.config.iceServers.length >= 2, 'The page must always pass its own server list to PeerJS');
  assert(urls(cfg.config.iceServers).every(u => /^stun:/.test(u)), 'Only STUN servers are expected before a relay is configured');
  assert.equal(Net.relayed(), false);
  ctx.TL_ICE = [{ urls: 'turn:relay.example:3478', username: 'u', credential: 'c' }];
  assert(urls(Net.ice()).includes('turn:relay.example:3478') && Net.relayed(), 'A configured relay must be offered to the browsers');
  ctx.location.search = '?ice=relay';
  assert.equal(Net.config().config.iceTransportPolicy, 'relay');
  ctx.location.search = '?ice=none';
  assert.deepEqual(JSON.parse(JSON.stringify(Net.config().config)), { iceServers: [] });
  ctx.location.search = ''; ctx.TL_ICE = undefined;
  out.servers = true;

  /* 2. a host: a guest asks for a line through the broker, the room answers, the hello and welcome cross, messages cross, the line is lost */
  const room = Net.host();
  const hp = peers.at(-1);
  assert(hp.opts.config && hp.opts.config.iceServers.length >= 2, 'The host peer must be given the page\'s server list');
  hp.emit('open');
  assert.equal(Net.info().state, 'waiting');
  const got = [];
  Net.onMsg = m => got.push(m);
  deliver(hp, 'twolanterns-g-abc', { k: 'msg', cid: 'zz', d: { t: 'hb' } });
  assert.equal(frames(hp).at(-1).payload.k, 'close', 'A message for a line the room does not know must be answered with a close');
  deliver(hp, 'twolanterns-g-abc', { k: 'open', cid: 'c1' });
  const ack = frames(hp).at(-1);
  assert(ack.dst === 'twolanterns-g-abc' && ack.payload.k === 'ack' && ack.payload.cid === 'c1', 'The room must answer a request for a line with an ack');
  deliver(hp, 'twolanterns-g-abc', { k: 'msg', cid: 'c1', d: { t: 'hello', v: Net.V, token: 'tok123', name: 'Gus' } });
  assert.equal(frames(hp).at(-1).payload.d.t, 'welcome', 'The room must welcome a player who says hello over the broker');
  let i = Net.info();
  assert(i.linked && i.via === 'broker' && i.guestName === 'Gus', 'The room must be linked through the broker');
  assert(got.some(m => m.t === 'join' && m.name === 'Gus'), 'The game must be told that a player joined');
  deliver(hp, 'twolanterns-g-abc', { k: 'msg', cid: 'c1', d: { t: 'move', n: 7 } });
  assert(got.some(m => m.t === 'move' && m.n === 7), 'A message sent over the broker must reach the game');
  assert(Net.send({ t: 'pick', n: 2 }) && frames(hp).at(-1).payload.d.t === 'pick' && frames(hp).at(-1).dst === 'twolanterns-g-abc', 'A message from the game must go to the guest through the broker');
  const before = frames(hp).length;
  assert(Net.send({ t: 'ending', text: 'x'.repeat(30000) }), 'A big message must be sent');
  assert(frames(hp).length - before >= 12, 'A big message must travel in pieces');      /* every piece is held to the broker's rules by the socket above */
  const mid = frames(hp).length;
  assert(Net.send({ t: 'state', text: 'y'.repeat(10000) }), 'A message of 10 kB must be sent');
  assert(frames(hp).length - mid >= 4, 'A message too big for one frame, but under what a direct line carries whole, must go in pieces, not vanish');
  const small = frames(hp).length;
  assert(Net.send({ t: 'state', text: 'z'.repeat(3000) }) && frames(hp).length - small === 1, 'A message that fits in one frame must go in one frame');
  hp.emit('error', { type: 'peer-unavailable' });      /* the broker says the guest is not there (a frame went to a peer that has left): the line's own heartbeat decides, not the room */
  assert(Net.info().linked, 'A room must not give up its guest because the broker says a peer is gone');
  assert.equal(hp.seen.filter(isFrame).length, 0, 'PeerJS must never be handed one of the broker line\'s frames');
  assert.equal(hp._lostMessages.size, 0, 'PeerJS must not be left keeping the broker line\'s frames');
  hp.socket.emit('message', { type: 'CANDIDATE', src: 'twolanterns-g-abc', payload: { type: 'data', connectionId: 'dc_real', candidate: { candidate: 'candidate:1 1 UDP 1 192.0.2.5 9 typ host', sdpMid: '0', sdpMLineIndex: 0 } } });
  assert.equal(hp.seen.filter(m => m.payload && m.payload.connectionId === 'dc_real').length, 1, 'An ordinary candidate must still reach PeerJS');
  deliver(hp, 'twolanterns-g-evil', { k: 'msg', cid: 'c1', d: { t: 'move', n: 666 } });
  assert(!got.some(m => m.n === 666), 'A message from another peer must not enter someone else\'s line');
  deliver(hp, 'twolanterns-g-abc', { k: 'close', cid: 'c1' });
  i = Net.info();
  assert(!i.linked && i.state === 'away', 'A line that the guest hung up must show as lost');
  deliver(hp, 'twolanterns-g-abc', { k: 'open', cid: 'c2' });
  deliver(hp, 'twolanterns-g-abc', { k: 'msg', cid: 'c2', d: { t: 'hello', v: Net.V, token: 'tok123', name: 'Gus' } });
  assert(Net.info().linked, 'The same player must be able to come back');
  hp.emit('disconnected');
  assert(!Net.info().linked, 'Losing the broker must take the broker lines down: there the broker is the line');
  for (let k = 0; k < 40; k++) deliver(hp, 'twolanterns-g-' + k, { k: 'open', cid: 'f' + k });
  assert(frames(hp).filter(f => f.payload.k === 'ack' && /^f/.test(f.payload.cid)).length <= 16, 'A flood of requests must not open more than a handful of lines');
  Net.leave(false);
  assert.deepEqual(refused, [], 'The broker would have refused what the room sent');
  out.host = true;

  /* 3. a guest: the direct line gets a few seconds, then the broker is asked; the hello and welcome cross; the next try starts on the broker */
  assert(Net.join('bcdf', { name: 'Gus', token: 'tok123' }));
  let gp = peers.at(-1);
  assert(/^twolanterns-g-/.test(gp.id));
  gp.emit('open');
  assert.equal(gp.conns.length, 1, 'The guest must first try the direct line');
  assert.equal(frames(gp).length, 0);
  fire(7000);      /* the direct line has not opened in time */
  assert.equal(gp.conns[0].closed, 1, 'The direct attempt must be let go when the broker is tried');
  const open = frames(gp).at(-1);
  assert(open.dst === 'twolanterns-BCDF' && open.payload.k === 'open', 'The guest must ask the room for a line through the broker');
  deliver(gp, 'twolanterns-BCDF', { k: 'ack', cid: open.payload.cid });
  const hello = frames(gp).at(-1).payload.d;
  assert(hello && hello.t === 'hello' && hello.token === 'tok123' && hello.v === Net.V, 'The guest must say hello when the broker line answers');
  const heard = [];
  Net.onMsg = m => heard.push(m);
  deliver(gp, 'twolanterns-BCDF', { k: 'msg', cid: open.payload.cid, d: { t: 'welcome', v: Net.V, code: 'BCDF' } });
  i = Net.info();
  assert(i.linked && i.via === 'broker', 'The guest must be linked through the broker');
  assert(heard.some(m => m.t === 'welcome'));
  deliver(gp, 'twolanterns-BCDF', { k: 'msg', cid: open.payload.cid, d: { t: 'reveal', n: 3 } });
  assert(heard.some(m => m.t === 'reveal' && m.n === 3), 'A message from the room must reach the game');
  gp.emit('disconnected');      /* the guest's own broker connection drops */
  assert(!Net.info().linked, 'The guest must notice that its broker line is gone');
  fire(900);      /* the first redial */
  gp = peers.at(-1);
  gp.emit('open');
  assert.equal(gp.conns.length, 0, 'After a line through the broker, the next try starts on the broker');
  assert.equal(frames(gp).at(-1).payload.k, 'open');
  Net.leave(false);
  assert.deepEqual(refused, [], 'The broker would have refused what the guest sent');
  out.guest = true;

  /* 3b. the direct line did not open and nobody holds the room: the broker answers the guest's first frame with 'expired', and the guest is told there is no such room at once */
  assert(Net.join('bcdf', { name: 'Gus', token: 'tok123' }));
  gp = peers.at(-1); gp.emit('open');
  fire(7000);
  assert.equal(frames(gp).at(-1).payload.k, 'open');
  gp.emit('error', { type: 'peer-unavailable' });
  assert(Net.info().state === 'error' && Net.info().err.kind === 'noroom', 'An "expired" for the first frame must show as "no such room"');
  Net.leave(false);
  assert.deepEqual(refused, [], 'The broker would have refused what the guest sent');
  out.expired = true;

  /* 4. a guest told not to use the broker (?link=direct) waits the whole time and then says so */
  ctx.location.search = '?link=direct';
  assert(Net.join('bcdf', { name: 'Gus', token: 'tok123' }));
  gp = peers.at(-1); gp.emit('open');
  assert(!timers.some(t => t.on && t.ms === 7000), '?link=direct must not set a time to switch to the broker');
  fire(25000);
  assert.equal(Net.info().state, 'error');
  assert.equal(frames(gp).length, 0, '?link=direct must not send anything through the broker');
  Net.leave(false);
  ctx.location.search = '';
  out.direct = true;

  /* 5. a room nobody hosts: the broker says so and the guest is told, without trying anything else */
  assert(Net.join('bcdf', { name: 'Gus' }));
  gp = peers.at(-1); gp.emit('open');
  gp.emit('error', { type: 'peer-unavailable' });
  assert(Net.info().state === 'error' && Net.info().err.kind === 'noroom');
  assert.equal(frames(gp).length, 0);
  Net.leave(false);
  out.noroom = true;
  assert.deepEqual(refused, [], 'The broker would have refused something the page sent');
  out.brokerRules = true;
  return out;
};
