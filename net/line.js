/* ---------- a line through the broker ---------- */
/* Two browsers on different networks often cannot open a WebRTC line at all (one on mobile data, a strict school or office network), and PeerJS's own relay servers
   are gone. Both of them are already talking to the broker, and the broker passes messages between registered peers, so when the direct line does not open, the game's
   messages go through the broker instead. To the rest of this file such a line looks like a DataConnection: open, send, close, and the 'open', 'data' and 'close' events.
   The public broker only forwards what looks like connection set-up. Tried against 0.peerjs.com on 8 November 2026: a CANDIDATE message goes through when its payload is
   { type: 'data', connectionId: <text>, candidate: { candidate: <text> } } (anything else beside those is passed along untouched), up to about 16 kB, in order, at
   ten a second. For any other shape, or 32 kB and over, the broker closes the sender's connection. So a frame is a CANDIDATE message with that envelope (a candidate that
   says nothing) and our own fields beside it: tl, k, cid, d. The browser's PeerJS is kept from filing them, because it keeps what it cannot match for good, and the
   broker answers a frame for a room nobody holds with the same 'expired' it gives a call, which the game already understands.
   Frames: open (guest asks), ack (host agrees), msg (one game message), close (either side hangs up). ?link=direct turns this off, ?link=broker uses it from the start. */
const SWITCH_MS = 7000, LINE_MS = 12000, MAX_LINES = 16;      /* how long the direct line gets to open before the broker is tried; how long the broker line gets to answer */
const TAG = 'tl-line', FRAME_MAX = 12000, LINE_BYTES = 6000;      /* the connection id every frame carries; the most a frame may weigh; the most a game message may weigh to go in one frame (send() cuts anything bigger into pieces of 2400) */
const LINES = new WeakMap();      /* peer -> its open broker lines, by 'who|cid' */
const lineMode = () => { try { return String(new URLSearchParams(g.location.search).get('link') || g.TL_LINK || ''); } catch (e) { return String(g.TL_LINK || ''); } };
const canLine = peer => !!peer && LINES.has(peer) && lineMode() !== 'direct';
const isFrame = m => !!m && m.type === 'CANDIDATE' && !!m.payload && m.payload.tl === 1 && m.payload.connectionId === TAG;
const frame = (peer, dst, p) => {
  try {
    if (!peer || peer.disconnected || peer.destroyed) return false;
    const m = { type: 'CANDIDATE', dst, payload: Object.assign({ type: 'data', connectionId: TAG, candidate: { candidate: '', sdpMid: '0', sdpMLineIndex: 0 } }, p, { tl: 1 }) };
    if (JSON.stringify(m).length > FRAME_MAX) return false;      /* the broker closes the connection of anyone who sends it more than it carries */
    peer.socket.send(m); return true;
  } catch (e) { return false; }
};
function makeLine(peer, lines, remote, cid) {
  const on = { open: [], data: [], close: [], error: [] }, key = remote + '|' + cid;
  const c = {
    relay: true, open: false, dead: false, peer: remote, cid,
    on(ev, fn) { (on[ev] || (on[ev] = [])).push(fn); return c; },
    emit(ev, a) { (on[ev] || []).slice().forEach(fn => { try { fn(a); } catch (e) { /* the listener's problem */ } }); },
    send(m) { if (c.open && !c.dead) frame(peer, remote, { k: 'msg', cid, d: m }); },
    end() { if (c.dead) return; const was = c.open; c.dead = true; c.open = false; if (lines.get(key) === c) lines.delete(key); if (was) c.emit('close'); },      /* like a DataConnection, a line that never opened says nothing */
    close() { if (c.dead) return; if (c.open) frame(peer, remote, { k: 'close', cid }); c.end(); }
  };
  lines.set(key, c);
  return c;
}
/* listen for frames on this peer's broker socket (both roles), and take every line down when the broker is lost: there the broker is the line */
function lineHook(peer) {
  try {
    const s = peer && peer.socket; if (!s || typeof s.send !== 'function' || typeof s.on !== 'function' || typeof peer.on !== 'function') return;
    const lines = new Map(); LINES.set(peer, lines);
    const drop = () => { Array.from(lines.values()).forEach(c => c.end()); lines.clear(); };
    try {      /* PeerJS never sees our frames. Where it cannot be told so, what it filed is thrown away after each message instead */
      const inner = peer._handleMessage;
      if (typeof inner === 'function') peer._handleMessage = function (m) { return isFrame(m) ? undefined : inner.apply(this, arguments); };
    } catch (e) { /* the clean-up below covers it */ }
    s.on('message', m => {
      try { lineFrame(peer, lines, m); } catch (e) { /* one bad frame must not take the room down */ }
      try { if (peer._lostMessages) peer._lostMessages.delete(TAG); } catch (e) { /* ignore */ }
    });
    peer.on('disconnected', drop); peer.on('close', drop);
  } catch (e) { /* no broker line: the direct line is all there is */ }
}
function lineFrame(peer, lines, m) {
  if (!isFrame(m)) return;
  const p = m.payload;
  if (typeof m.src !== 'string' || typeof p.cid !== 'string' || p.cid.length > 24) return;
  let c = lines.get(m.src + '|' + p.cid);
  if (p.k === 'open') {
    if (!X || X.role !== 'host' || X.peer !== peer || c || lines.size >= MAX_LINES) return;
    c = makeLine(peer, lines, m.src, p.cid); c.open = true;
    frame(peer, m.src, { k: 'ack', cid: p.cid });
    hostConn(c); c.emit('open');
    return;
  }
  if (!c) { if (p.k === 'msg') frame(peer, m.src, { k: 'close', cid: p.cid }); return; }      /* a line this side no longer knows: say so, so the other side stops waiting */
  if (p.k === 'ack') { if (!c.open && !c.dead) { if (X && X.diag) X.diag.rel = 'ack'; c.open = true; c.emit('open'); } }
  else if (p.k === 'msg') { if (c.open) c.emit('data', p.d); }
  else if (p.k === 'close') c.end();
}
/* guest: ask the host for a line through the broker */
function lineVia(peer) {
  const lines = LINES.get(peer); if (!lines) return null;
  const c = makeLine(peer, lines, PREFIX + X.code, rand(2).map(x => x.toString(36)).join('').slice(0, 10));
  X.diag = X.diag || { ice: '', cand: {}, opened: false }; X.diag.rel = 'asked';
  frame(peer, c.peer, { k: 'open', cid: c.cid });
  return c;
}
/* guest: the direct line is not opening, so try the broker */
function switchToLine(peer, c) {
  if (!X || X.peer !== peer || X.conn !== c) return;
  X.conn = null; try { c.close(); } catch (e) { /* ignore */ }
  dial(peer, 'broker');
}
