'use strict';
/* Two Lanterns :: online-play fixes to the base page (called by build-art.cjs, after ui-edits.cjs).
   Joining a room only worked when the two browsers could reach each other directly. PeerJS's free relay servers have been switched off, so every
   connection that needed a relay failed, the guest was told the host had closed the page, and the host never learned that anyone had tried.
   This replaces the dead relay list, lets a relay be plugged in (net/ice.json), and when the two browsers still cannot open a direct line it carries the
   game's messages through the broker they are both already connected to, so a room can often still be joined. It also says what really went wrong,
   shows the host that someone is knocking, gives a slow line longer to open, and keeps a hosting phone awake. The new code lives in net/relay.js, net/diag.js and net/line.js.
   Each edit is an exact-text replacement that must match exactly once, so the build stops loudly if the base page ever drifts. */
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'net', f), 'utf8').replace(/\r\n/g, '\n').trimEnd();

const edits = [
  {
    why: 'one more timing value: how long a line may take to open before the host gives up on it',
    from: 'HELLO_MS = 8000, RETRY = [900, 1800, 3000, 5000, 8000];',
    to: 'HELLO_MS = 8000, OPEN_MS = 30000, RETRY = [900, 1800, 3000, 5000, 8000];'
  },
  {
    why: 'replace the dead relay list (net/relay.js)',
    from: "Net.available = () => typeof g.Peer === 'function';",
    to: "Net.available = () => typeof g.Peer === 'function';\n" + read('relay.js')
  },
  {
    why: 'use our own server list by default, and let ?ice=relay try a relay on its own',
    from: "  if (q && q.get('ice') === 'none') cfg.config = { iceServers: [] };      /* for a test on one machine */",
    to: "  if (q && q.get('ice') === 'none') cfg.config = { iceServers: [] };      /* for a test on one machine */\n" +
      "  if (q && q.get('ice') === 'relay' && !cfg.config) cfg.config = { iceServers: Net.ice(), iceTransportPolicy: 'relay' };      /* to try a relay: no direct line is allowed */\n" +
      '  if (!cfg.config) cfg.config = { iceServers: Net.ice() };'
  },
  {
    why: 'an error can carry a details line',
    from: 'function fail(kind, text) {',
    to: 'function fail(kind, text, diag) {'
  },
  {
    why: '...stored with the error; the screen may sleep again',
    from: "  X.err = { kind, text: text || '' }; clearTimers(); X.linked = false;",
    to: "  X.err = { kind, text: text || '', diag: diag || '' }; clearTimers(); X.linked = false; letSleep();"
  },
  {
    why: 'the screen can see that someone is knocking, and which way the line runs',
    from: "brokerUp: X.brokerUp, why: X.why } : { state: 'closed', linked: false };",
    to: "brokerUp: X.brokerUp, why: X.why, knock: X.knock || '', via: X.via || '' } : { state: 'closed', linked: false };"
  },
  {
    why: 'say in the header comment that the broker can carry the moves too',
    from: "The only server is PeerJS's public broker, and it is used just to introduce the two browsers: once the channel is open, every move goes straight between them. */",
    to: "The only server is PeerJS's public broker, and it is used just to introduce the two browsers: once the channel is open, every move goes straight between them.\n" +
      "   When the two browsers cannot reach each other at all, the broker carries the moves instead (see 'a line through the broker'). */"
  },
  {
    why: 'diagnostics and keep-awake (net/diag.js), and the line through the broker (net/line.js)',
    from: '/* ---------- host ---------- */',
    to: read('diag.js') + '\n\n' + read('line.js') + '\n\n/* ---------- host ---------- */'
  },
  {
    why: 'host: listen for lines through the broker on the room\'s peer',
    from: "  try { peer = new g.Peer(PREFIX + X.code, opts()); } catch (e) { fail('browser', String(e && e.message || e)); return; }\n  X.peer = peer;",
    to: "  try { peer = new g.Peer(PREFIX + X.code, opts()); } catch (e) { fail('browser', String(e && e.message || e)); return; }\n  X.peer = peer;\n  lineHook(peer);"
  },
  {
    why: 'guest: the same on the guest\'s peer, which is where a line through the broker is asked for',
    from: "slice(0, 12), opts()); } catch (e) { fail('browser', String(e && e.message || e)); return; }\n  X.peer = peer;",
    to: "slice(0, 12), opts()); } catch (e) { fail('browser', String(e && e.message || e)); return; }\n  X.peer = peer;\n  lineHook(peer);"
  },
  {
    why: 'a message too big for one frame of a line through the broker goes in pieces (a direct line carries up to 15 kB whole)',
    from: '  if (bytes(s) <= DIRECT) return raw(c, m);',
    to: '  if (bytes(s) <= (c && c.relay ? LINE_BYTES : DIRECT)) return raw(c, m);'
  },
  {
    why: 'host: remember which way the line runs',
    from: "  X.conn = c; X.guestToken = tok || ('t' + Math.floor(Math.random() * 1e9)); X.guestName = String(m.name || '').slice(0, 14);",
    to: "  X.conn = c; X.guestToken = tok || ('t' + Math.floor(Math.random() * 1e9)); X.guestName = String(m.name || '').slice(0, 14); X.via = c.relay ? 'broker' : 'direct';"
  },
  {
    why: 'keep the screen on while hosting',
    from: "  X.guestToken = o.guestToken || null; X.guestName = o.guestName || '';",
    to: "  X.guestToken = o.guestToken || null; X.guestName = o.guestName || '';\n  keepAwake();"
  },
  {
    why: 'keep the screen on while joining',
    from: "  X = fresh('guest', code); X.token = o.token || Net.makeToken(); X.name = String(o.name || '').slice(0, 14);",
    to: "  X = fresh('guest', code); X.token = o.token || Net.makeToken(); X.name = String(o.name || '').slice(0, 14);\n  keepAwake();"
  },
  {
    why: 'let the screen sleep again when the room is left',
    from: '  X = null; serial += 1;      /* every callback that is still in flight now sees a stranger and stops */',
    to: '  X = null; serial += 1;      /* every callback that is still in flight now sees a stranger and stops */\n  letSleep();'
  },
  {
    why: 'a page that wakes up takes the screen lock back',
    from: 'Net.wake = function () {',
    to: "Net.wake = function () {\n  if (X && X.state !== 'error') keepAwake();"
  },
  {
    why: 'host: the hello is only waited for once the line has opened, and the host shows that someone is knocking',
    from: '  const me = X.id, timer = setTimeout(() => { if (!said) { try { c.close(); } catch (e) { /* ignore */ } } }, HELLO_MS);',
    to: "  const me = X.id, miss = () => { if (X && X.id === me && !X.linked && X.knockConn === c && X.knock !== 'failed') set(X.state, { knock: 'failed' }); };\n" +
      '  const bye = () => { if (said) return; try { c.close(); } catch (e) { /* ignore */ } miss(); };      /* a line that never opened gives no close event, so giving up has to say so itself */\n' +
      '  let timer = setTimeout(bye, OPEN_MS);      /* a line can be slow to open on a poor network: the hello is only waited for once it has */\n' +
      "  if (!X.linked) set(X.state, { knock: 'connecting', knockConn: c });\n" +
      "  c.on('open', () => { if (!said) { clearTimeout(timer); timer = setTimeout(bye, HELLO_MS); } });"
  },
  {
    why: 'host: the hello arrived, so nobody is knocking any more',
    from: "    if (!said) { if (m.t !== 'hello') return; said = true; clearTimeout(timer); hostHello(c, m); return; }",
    to: "    if (!said) { if (m.t !== 'hello') return; said = true; clearTimeout(timer); if (X.knock) set(X.state, { knock: '', knockConn: null }); hostHello(c, m); return; }"
  },
  {
    why: 'host: a line that closed before any hello means someone tried and could not get through',
    from: "  c.on('close', () => { clearTimeout(timer); if (X && X.id === me && c === X.conn) lost('closed'); });",
    to: "  c.on('close', () => { clearTimeout(timer); if (!said) miss(); if (X && X.id === me && c === X.conn) lost('closed'); });"
  },
  {
    why: 'guest: a dial can be told which way to go (direct or through the broker)',
    from: 'function dial(peer) {',
    to: 'function dial(peer, via) {'
  },
  {
    why: 'guest: start on the broker when the last line ran through it, or when ?link=broker says so',
    from: "  try { c = peer.connect(PREFIX + X.code, { reliable: true, serialization: 'json' }); } catch (e) { fail('browser'); return; }",
    to: "  if (via === undefined) X.diag = null;      /* a fresh try: forget what the last one saw */\n" +
      "  const onLine = via === 'broker' || (via === undefined && canLine(peer) && (X.relayFirst || lineMode() === 'broker'));\n" +
      "  try { c = onLine ? lineVia(peer) : peer.connect(PREFIX + X.code, { reliable: true, serialization: 'json' }); } catch (e) { fail('browser'); return; }"
  },
  {
    why: 'guest: watch the direct attempt',
    from: '  X.conn = c; clearTimeout(X.dial);',
    to: '  X.conn = c; clearTimeout(X.dial); if (!c.relay) watchIce(c);'
  },
  {
    why: 'guest: the direct line gets a few seconds, then the broker is tried; running out of time after the host has answered is a network problem, not a silent host',
    from: "  X.dial = setTimeout(() => { if (X && X.id === me && !X.linked && X.conn === c) { if (X.everLinked) { try { c.close(); } catch (e) { /* ignore */ } redial(X.tries); } else fail('timeout'); } }, DIAL_MS);",
    to: "  let late = false;\n" +
      "  const check = () => {\n" +
      "    if (!(X && X.id === me && !X.linked && X.conn === c)) return;\n" +
      "    if (!late && !c.relay && canLine(peer)) {      /* the direct line has had its time: ask for a line through the broker, unless the direct one has only just opened */\n" +
      "      if (c.open) { late = true; X.dial = setTimeout(check, DIAL_MS - SWITCH_MS); return; }\n" +
      "      switchToLine(peer, c); return;\n" +
      "    }\n" +
      "    if (c.relay && lineMode() !== 'broker') X.relayFirst = false;      /* the broker did not answer: the next try starts with the direct line again */\n" +
      "    if (X.everLinked) { try { c.close(); } catch (e) { /* ignore */ } redial(X.tries); } else fail(noLine() ? 'webrtc' : 'timeout', '', diagText());\n" +
      "  };\n" +
      "  X.dial = setTimeout(check, c.relay ? LINE_MS : canLine(peer) ? SWITCH_MS : DIAL_MS);"
  },
  {
    why: 'guest: remember that the line opened',
    from: "  c.on('open', () => { if (X && X.id === me && X.conn === c) raw(c, { t: 'hello', v: Net.V, token: X.token, name: X.name }); });",
    to: "  c.on('open', () => { if (X && X.id === me && X.conn === c) { if (X.diag) X.diag.opened = true; raw(c, { t: 'hello', v: Net.V, token: X.token, name: X.name }); } });"
  },
  {
    why: 'guest: a direct line that closed before it ever opened goes to the broker; one that failed its checks with nothing else to try is a network problem',
    from: "if (X.linked) lost('closed'); else if (X.everLinked) redial(X.tries); else if (X.state !== 'error') fail('closed'); } });",
    to: "if (X.linked) lost('closed'); else if (!c.relay && canLine(peer)) switchToLine(peer, c); else if (X.everLinked) redial(X.tries); else if (X.state !== 'error') fail(X.diag && !X.diag.opened && X.diag.ice === 'failed' ? 'webrtc' : 'closed', '', diagText()); } });"
  },
  {
    why: 'guest: a direct line that errors before it opens will not open: go to the broker now rather than at the end of the wait',
    from: "  c.on('error', () => { /* the close that follows decides */ });",
    to: "  c.on('error', () => { if (X && X.id === me && X.conn === c && !c.relay && !c.open && !X.linked && canLine(peer)) switchToLine(peer, c); /* otherwise the close that follows decides */ });"
  },
  {
    why: 'guest: remember which way the line runs, and that a room reached through the broker is dialled that way first next time',
    from: '      clearTimeout(X.dial); X.linked = true; X.everLinked = true; X.tries = 0;',
    to: "      clearTimeout(X.dial); X.linked = true; X.everLinked = true; X.tries = 0; X.via = c.relay ? 'broker' : 'direct'; X.relayFirst = !!c.relay;"
  },
  {
    why: 'guest: a peer-level webrtc error before the line is up goes to the broker too',
    from: '    if (X.everLinked || X.tries < 2) { X.tries += 1; redial(k); return; }',
    to: '    if (!X.linked && X.conn && !X.conn.relay && canLine(peer)) { switchToLine(peer, X.conn); return; }\n    if (X.everLinked || X.tries < 2) { X.tries += 1; redial(k); return; }'
  },
  {
    why: 'screen: the guest\'s waiting text does not promise a direct line, since the line may run through the broker',
    from: "'Found the room. Opening a direct line…'",
    to: "'Found the room. Opening the line…'"
  },
  {
    why: 'guest: peer-level webrtc errors carry the details too',
    from: "fail('webrtc', String(e && e.message || '')); return;",
    to: "fail('webrtc', String(e && e.message || ''), diagText()); return;"
  },
  {
    why: 'screen: the no-direct-line message says what it usually means and what to try',
    from: "  webrtc: 'The room was found, but the two browsers could not open a direct line. Some office, school and mobile networks block that. Try another network, or another browser.',",
    to: "  webrtc: 'The room was found, but the two devices could not open a direct line. That usually means they are on different networks, say one on Wi-Fi and one on mobile data, and a direct connection is not allowed between them. Put both devices on the same Wi-Fi and try again.',"
  },
  {
    why: 'screen: the host sees when someone has found the room',
    from: "  else if (host) status = info.linked ? 'Connected. Setting up the room…' : info.state === 'connecting' ? 'Opening the room…' : 'Waiting for your partner to join…';",
    to: "  else if (host) status = info.linked ? 'Connected. Setting up the room…' : info.state === 'connecting' ? 'Opening the room…' : info.knock === 'connecting' ? 'Your partner found the room. Opening a direct line…' : info.knock === 'failed' ? 'Someone found the room, but the direct line would not open. They are probably on a different network. Both of you on the same Wi-Fi works best. They can try again.' : 'Waiting for your partner to join…';"
  },
  {
    why: 'screen: an error shows its details line',
    from: '    ${pstatLine(cls, status)}',
    to: "    ${pstatLine(cls, status)}\n    ${bad && info.err.diag ? `<p class=\"fine center ldiag\">${esc(info.err.diag)}</p>` : ''}"
  }
];

module.exports = function applyNetEdits(html, root) {
  for (const e of edits) {
    const n = html.split(e.from).length - 1;
    if (n !== 1) throw new Error('Net edit "' + e.why + '" matched ' + n + ' times, expected exactly 1');
    html = html.replace(e.from, () => e.to);
  }
  /* the relay servers the build was given: net/ice.json -> window.TL_ICE (read by Net.ice) */
  const file = path.join(root, 'net', 'ice.json');
  const ice = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).iceServers || [] : [];
  if (!Array.isArray(ice)) throw new Error('net/ice.json: "iceServers" must be a list');
  for (const s of ice) if (!s || !s.urls) throw new Error('net/ice.json: every server needs "urls"');
  const at = '<style id="undertoll-theme">';
  if (html.split(at).length !== 2) throw new Error('the theme style tag was not found exactly once');
  return html.replace(at, () => '<script>window.TL_ICE=window.TL_ICE||' + JSON.stringify(ice).replace(/</g, '\\u003c') + ';</script>\n' + at);
};
module.exports.count = edits.length;
