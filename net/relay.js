/* Which servers help two browsers find each other.
   PeerJS ships a list of relay (TURN) servers, eu-0.turn.peerjs.com and us-0.turn.peerjs.com. Its maintainers switched them off and the names no longer point anywhere,
   so the library's list is replaced here. STUN is enough for two browsers behind ordinary home routers to find each other. When they cannot (one side on mobile data,
   a strict school or office network) only a relay can carry the line: a page can set window.TL_ICE to a list of { urls, username, credential } and those are added.
   The build fills window.TL_ICE from net/ice.json. */
const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }];
const isRelay = s => !!s && [].concat(s.urls || []).some(u => /^turns?:/i.test(String(u)));
Net.ice = () => STUN.concat(Array.isArray(g.TL_ICE) ? g.TL_ICE.filter(s => s && s.urls) : []);
Net.relayed = () => Array.isArray(g.TL_ICE) && g.TL_ICE.some(isRelay);
