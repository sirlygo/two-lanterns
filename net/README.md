# Online play: how two devices find each other

Two Lanterns has no game server. One player hosts a room, the other joins it with the four-letter code, and [PeerJS](https://peerjs.com) connects the two browsers. This folder holds the part of the page that decides *how*.

## What was wrong

PeerJS's built-in connection settings include two free relay servers. Their maintainers switched them off in 2024 and the names no longer point anywhere. Two devices that can reach each other directly (the same Wi-Fi, two ordinary home networks) still connected. Two devices that cannot (one on mobile data, a strict school or office network) had no way through, so joining with the code failed. The guest was told the room "did not answer", and the host never learned that anyone had tried.

## What the page does now

1. **Direct line first.** The page gives PeerJS its own server list (`relay.js`): Google, Cloudflare and Twilio STUN servers, which are enough for most home networks.
2. **If no direct line opens within about seven seconds** (or it fails sooner), the guest asks the room for a **line through the broker** (`line.js`). The broker is the PeerJS matchmaker both browsers are already connected to, and it passes messages between peers that are registered with it. A move is a few hundred bytes. The two devices then play exactly as before; only the route differs. Joining from a phone on mobile data takes about eight seconds this way.
3. **A room reached through the broker stays on it**, and after a dropped line the guest tries the broker first. The host just answers whichever line arrives.
4. **If both fail**, the guest sees what actually happened: either the room could not be found, or the room was found but no line could be opened, with a small "Details:" line for support. The host's screen shows that someone found the room and could not get through.
5. **The screen stays awake** while a room is open (where the browser allows it), because a phone that goes to sleep drops off the matchmaker and nobody can find the room.

A line through the broker is a convenience, not a guarantee. The public matchmaker only passes on what looks like connection set-up, so each move travels dressed as an (empty) connection candidate: `{ type: 'data', connectionId, candidate: { candidate } }` with the game's own fields beside it. That is what it accepted when tried against `0.peerjs.com` on 8 November 2026: it carried frames of up to about 16 kB, in order, ten a second, and it closes the connection of anyone who sends it any other shape or 32 kB and over. It is a free shared service with no promises about speed, uptime or what it will accept next year, and its operator can see the moves passing through it (game choices, nothing else). If it stops passing them, a guest sees the honest "could not connect" message, and a relay server of your own, below, is the fix. For the best connection on every network, add one.

## Adding a relay (TURN) server

A relay carries the direct line itself, so play stays peer to peer in feel and does not depend on the matchmaker once the line is open.

1. Get TURN credentials from a provider. Several (Metered, Twilio, Cloudflare and others) offer a free allowance; check their current terms.
2. Put them in `net/ice.json`:

   ```json
   {
     "iceServers": [
       {
         "urls": ["turn:YOUR-RELAY-HOST:3478", "turns:YOUR-RELAY-HOST:443?transport=tcp"],
         "username": "YOUR-USERNAME",
         "credential": "YOUR-CREDENTIAL"
       }
     ]
   }
   ```

3. Run `npm run build`, check with `npm run verify`, and publish. The build puts the list into the page (`window.TL_ICE`) and stops if the file is malformed.

The credentials end up in the public page, so anyone who opens it can read them. Use a free or capped account and one you can revoke. A self-hosted page can instead set `window.TL_ICE` itself, before the game loads.

## Page options

| Option | Effect |
| --- | --- |
| `?link=direct` | Never use the broker as the line. A guest who cannot connect directly gets the "different networks" message after 25 seconds. |
| `?link=broker` | Start every join on the broker line (for testing, or to see what a player on a hostile network gets). |
| `?ice=relay` | Allow only a relay server: no direct addresses. Needs a relay in `net/ice.json` or `window.TL_ICE`. |
| `?ice=none` | No STUN or relay servers at all: two browsers on one machine. |
| `?peer=host:port/path`, `?tls=0` or `?tls=1` | Use a PeerJS broker of your own instead of the public one. |

`window.TL_PEER`, `window.TL_ICE` and `window.TL_LINK` (`'direct'` or `'broker'`) do the same from a page that sets them before the game loads.

## Files

| File | Role |
| --- | --- |
| `relay.js` | The server list: STUN, plus whatever is in `ice.json`. |
| `line.js` | The line through the broker: the frames and the envelope the public broker accepts, how a guest decides to use it, how a room answers. |
| `diag.js` | Why a line did not open (for the guest's message and details line), and keeping the screen awake. |
| `ice.json` | Relay servers for this build. Empty by default. |

`scripts/net-edits.cjs` fits these into the page at build time. Each edit must match the original `net.js` exactly once, or the build stops.

## Testing

- `npm run verify` runs `scripts/verify-net.cjs` with the rest. It runs the page's online code against a stand-in for PeerJS and checks the server list, a room answering a guest over the broker, messages both ways (a big one in pieces), a stranger unable to enter someone else's line, a flood of requests, a guest switching to the broker after seven seconds, `?link=direct`, a room that does not exist, and that PeerJS is never handed a frame. Everything the page sends is held to the public broker's rules (`brokerRefuses` in that file), so a change the real broker would refuse fails here. It needs only Node.js.
- `node scripts/net-test.cjs [scenario ...]` hosts and joins a room in two real browsers, against a PeerJS server and a relay that it starts on your machine (nothing touches the public broker). The test server is made to keep the public one's rules (what it forwards, what it refuses, an immediate "expired" for someone who is not there), and a `rules` block at the top proves that before any scenario runs; every scenario also checks that the broker refused nothing the pages sent. It needs the packages for `npm run qa` plus `npm install --no-save peer node-turn`, and Chromium (`npx playwright install chromium`). Scenarios: `direct`, `broker` (including losing the broker and a host coming back), `blocked` (two networks that cannot connect), `blocked-direct`, `slow`, `slow-direct`, `relay`, `badcode`, `lock`.
