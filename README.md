# Two Lanterns

A two-player dungeon crawler in one HTML file: build two lantern-bearers, go down eight rooms of the Bell Stair, and find one of thousands of different endings.

**Play:** https://sirlygo.github.io/two-lanterns/

- **One device:** choose *Play on one device* and pass the screen between you.
- **Two devices:** one of you chooses *Play on two devices*, then *Host a room*, and shares the four-letter code (or the *Copy link* link). The other joins with it. Your moves stay hidden on your own screen until you have both locked in.

There is no game server. [PeerJS](https://peerjs.com)'s free public matchmaker introduces the two browsers, and after that every move goes straight from one browser to the other (WebRTC). When the two devices cannot open that direct line (one on mobile data, a strict school or office network), the page falls back to passing the moves through the matchmaker, a free shared service that makes no promises, and a room that still cannot be reached says so plainly. For the best connection on every network, add a relay server of your own. How both work is in [`net/README.md`](net/README.md). Saved lanterns, your game in progress and the Book of Endings stay in each browser's local storage.

Everything is in `index.html`, with the fonts and PeerJS inside it. Licences are in `LICENSES.txt`: Cinzel and Spectral are SIL OFL 1.1, PeerJS is MIT.

The **Undertoll art edition** replaces the placeholder artwork with the approved eerie direction: shadowy travelers, ragged cloaks, cold mist, and amber-and-mint lamps. Play at the link above or open `index.html` directly; all artwork is embedded, so it remains a single portable file.

Open [the art gallery](https://sirlygo.github.io/two-lanterns/art-review.html) or `art-review.html` to browse every room, supporting scene, Bell outcome, character calling, symbol, and die face. The optimized image sources, exact generation prompts, renderer, theme, and asset inventory live in `art/`. The original game is preserved in `backups/index-placeholders.html`.

After changing art sources, run `npm run build`. Run `npm run verify` for asset coverage, portrait and ending combinations, script syntax, and checks that the story and game rules match the original. These two commands need only Node.js, and `npm run verify` also checks the online-play code (a room, a guest, a line through the matchmaker, held to the rules the public matchmaker enforces) without a browser. To run the browser checks, install development dependencies with `npm install`, install Chromium with `npx playwright install chromium`, then run `npm run qa`. Optional `TWO_LANTERNS_NODE_MODULES` and `TWO_LANTERNS_CHROME` environment variables select an existing dependency directory and browser executable.

## Sound, feats and phones

Three extras are baked into `index.html` by `scripts/build-extras.cjs`, the last step of `npm run build`. None of them edits the game: each one only watches the page, so the rules, the story and saved games are untouched.

- `sound/`: every sound is made in the browser (no audio files). A low bed that tightens as the Bell grows restless, a toll for each room, dice, a phrase for each outcome, coin at the stall, and a short buzz on phones that support it. The button in the header steps through all sound, effects only and off, and the bed drops under the narrator.
- `feats/`: 32 things worth doing on the way down, kept on the device, shown on the ending and in the Book of Endings. Erasing the Book erases them.
- `manifest.webmanifest`, `sw.js`, `pwa/`: lets a phone add the game to its home screen and open it with no signal (one device; online rooms need the network). These files must be published beside `index.html`. The network is always tried first, so a new version shows up on the next load with a connection.

`npm run verify` now also runs `scripts/verify-extras.cjs`, which tests every feat against a descent that should earn it.
