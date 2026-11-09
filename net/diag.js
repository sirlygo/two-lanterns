/* ---------- why a line did not open, and keeping the screen awake ---------- */
/* Watches the guest's connection attempt, so a failure can say what really happened: the host answered but the two sides could not find a path
   (the ICE state left 'new'), or the host never answered (it stayed 'new'). Only used for the error message. */
function watchIce(c) {
  const d = X.diag = { ice: '', cand: {}, opened: false, rel: (X.diag && X.diag.rel) || '' };
  const hook = () => {
    const pc = c && c.peerConnection; if (!pc) return false;
    d.ice = pc.iceConnectionState;
    pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState !== 'closed') d.ice = pc.iceConnectionState; });
    pc.addEventListener('icecandidate', e => { const m = e.candidate && / typ (\w+)/.exec(e.candidate.candidate || ''); if (m) d.cand[m[1]] = (d.cand[m[1]] || 0) + 1; });
    return true;
  };
  try { if (!hook()) setTimeout(() => { try { hook(); } catch (e) { /* only for the report */ } }, 0); } catch (e) { /* only for the report */ }
}
const noLine = () => { const d = X && X.diag; return !!d && !d.opened && d.ice !== '' && d.ice !== 'new'; };
const diagText = () => { const d = X && X.diag; if (!d) return ''; return 'Details: ice ' + (d.ice || 'not started') + ', found ' + (Object.keys(d.cand).join(' + ') || 'nothing') + ', relay server ' + (Net.relayed() ? 'set up' : 'not set up') + ', backup route ' + (d.rel === 'ack' ? 'answered' : d.rel === 'asked' ? 'no answer' : 'not used'); };

/* A phone that goes to sleep while it is hosting drops off the matchmaker, and nobody can find the room. Keep the screen on while a room is open. */
let lock = null;
function keepAwake() {
  try {
    const wl = g.navigator && g.navigator.wakeLock; if (!wl || lock) return;
    lock = 'asking';
    wl.request('screen').then(l => { if (lock !== 'asking') { try { l.release(); } catch (e) { /* ignore */ } return; } lock = l; l.addEventListener('release', () => { if (lock === l) lock = null; }); }).catch(() => { lock = null; });
  } catch (e) { lock = null; }
}
function letSleep() { const l = lock; lock = null; try { if (l && l.release) l.release(); } catch (e) { /* ignore */ } }
