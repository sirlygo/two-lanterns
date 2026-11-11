# Two Lanterns

A two-player dungeon crawler in one HTML file: build two lantern-bearers, go down eight rooms of the Bell Stair, and find one of thousands of different endings.

**Play:** https://sirlygo.github.io/two-lanterns/

- **One device:** choose *Play on one device* and pass the screen between you.
- **Two devices:** one of you chooses *Play on two devices*, then *Host a room*, and shares the four-letter code (or the *Copy link* link). The other joins with it. Your moves stay hidden on your own screen until you have both locked in.

There is no game server. [PeerJS](https://peerjs.com)'s free public matchmaker introduces the two browsers, and after that every move goes straight from one browser to the other (WebRTC). When the two devices cannot open that direct line (one on mobile data, a strict school or office network), the page falls back to passing the moves through the matchmaker, a free shared service that makes no promises, and a room that still cannot be reached says so plainly. For the best connection on every network, add a relay server of your own. How both work is in [`net/README.md`](net/README.md). Saved lanterns, your game in progress and the Book of Endings stay in each browser's local storage.

Everything is in `index.html`, with the fonts and PeerJS inside it. Licences are in `LICENSES.txt`: Cinzel and Spectral are SIL OFL 1.1, PeerJS is MIT.

The **Undertoll art edition** replaces the placeholder artwork with the approved eerie direction: shadowy travelers, ragged cloaks, cold mist, and amber-and-mint lamps. Play at the link above or open `index.html` directly; all artwork is embedded, so it remains a single portable file.

Open [the art gallery](https://sirlygo.github.io/two-lanterns/art-review.html) or `art-review.html` to browse every room, supporting scene, Bell outcome, character calling, symbol, and die face. The optimized image sources, exact generation prompts, renderer, theme, and asset inventory live in `art/`. The original game is preserved in `backups/index-placeholders.html`.

After changing art or story sources, run `npm run build`. Run `npm run verify` for asset coverage, portrait and ending combinations, script syntax, and checks that the original story data and resolution rules are preserved. These two commands need only Node.js. Verification also checks online-play messages, 4,000 random routes, 6,912 wandering-encounter resolutions, and complete expanded-story coverage. To run the browser checks, install development dependencies with `npm install`, install Chromium with `npx playwright install chromium`, then run `npm run qa`. This covers a complete descent, phone layouts, all three enemies and both hands, saved routes, narrator sequencing with actual MP3 playback, every room’s three story screens, online waiting states, and all 14 epilogues. Optional `TWO_LANTERNS_NODE_MODULES` and `TWO_LANTERNS_CHROME` environment variables select an existing dependency directory and browser executable.

## Wandering encounters and the story

There are now **47 illustrated rooms**: the Bell Stair, the Bellheart, and 45 possibilities between them. Each new descent draws six middle rooms, including one wandering encounter (65%) or two (35%). Two encounters have at least one other room between them. The Toll Collectors, Hush Hounds and Wick Thief offer physical, clever and spoken approaches through the existing secret-choice-and-dice rules. Each has a relic and two different hands of moves. Games already in progress keep their saved route.

`rooms/pack2.cjs` contains these encounters. `story/descent.cjs` holds eight connective chapters, four passages that react to your condition or relationship, encounter aftermaths, and dry exchanges between the lantern-bearers. Selection depends only on the shared save, so both online players see the same story. `scripts/story-edits.cjs` builds these additions into the preserved source.

Every room now has a longer arrival, a private decision passage, and an aftermath in `story/room-pages.cjs`. `story/page-scenes.cjs` adds longer scenes for names, saved lanterns, all five creation questions, the threshold, handoffs, online waiting, the chandler, the Book, revealed moves, and all 14 ending types. This expansion adds approximately **9,750 words in 175 passages**. Existing move-specific consequences remain alongside the new scenes. The new ending epilogue also appears in **Copy this ending**.

The original expanded story has **246 recordings** in the existing ElevenLabs voice. The new Adventure layer adds 45 written passages: 27 are recorded and 18 are awaiting ElevenLabs credits, for **273 available clips**. The **Narrator** switch reads the public story in order; **Listen** replays the current sequence. Sealed bargains are skipped automatically and have an explicit **Listen privately** control. Changing screens stops the previous sequence and, when Narrator is on, begins the next one after a user gesture has enabled audio. Playback never blocks progression. Run `npm run narrate -- --list` to see pending work, then `npm run narrate` after adding credits. Publish `audio/narration/` alongside the page.

## More reasons to surprise each other

New descents include private chandler bargains, four team combinations, optional two-step searches that require both players’ agreement, and two meetings with **Nim**, whose help depends on earlier kindness. Rare encounters include a ragpicker, ghost festival, false exit, and the **Bellmarked Huntsman**, a two-exchange fight with coordinated approaches and a retreat option. Some descents draw a temporary twist: borrowed skills, a third footstep that notices selfishness, or a reversed chooser order. Effects, prices and risks are stated before committing.

These events fit between the existing eight rooms. Saves and online snapshots carry their state; hidden offers and votes are masked for the other seat. Five new illustrations are in the art gallery, and the ending remembers what happened between rooms. Start a new descent to draw these additions; ongoing games keep their existing rules. Refresh both devices for online play. Full rules, art paths, prompts, recording status and validation are in [`adventure/README.md`](adventure/README.md).

## Sound, feats and phones

Three extras are baked into `index.html` by `scripts/build-extras.cjs`, the last step of `npm run build`. None of them edits the game: each one only watches the page, so the rules, the story and saved games are untouched.

- `sound/`: every sound is made in the browser (no audio files). A low bed that tightens as the Bell grows restless, a toll for each room, dice, a phrase for each outcome, coin at the stall, and a short buzz on phones that support it. The button in the header steps through all sound, effects only and off, and the bed drops under the narrator.
- `feats/`: 32 things worth doing on the way down, kept on the device, shown on the ending and in the Book of Endings. Erasing the Book erases them.
- `manifest.webmanifest`, `sw.js`, `pwa/`: lets a phone add the game to its home screen and open it with no signal (one device; online rooms need the network). These files must be published beside `index.html`. The network is always tried first, so a new version shows up on the next load with a connection.

`npm run verify` now also runs `scripts/verify-extras.cjs`, which tests every feat against a descent that should earn it.

## Music

The score is made with the ElevenLabs Music API, from the prompts in `music/tracks.json`: a title theme, three moods for the descent (`calm`, `restless`, `awake`, chosen by how restless the Bell is), the chandler's landing and the ending.

```
npm run music -- --list          what exists (free)
npm run music -- --only title    make one first and listen to it
npm run music                    make the rest
npm run build && npm run verify
```

It uses the same key as the narrator (`.env.local`) and is billed by length against the ElevenLabs plan: the six tracks come to about ten and a half minutes. Tracks land in `audio/music/` and are listed in `music/manifest.json`; publish that folder beside `index.html`. To skip a slow opening or a fade at the end without paying for a new take, give the track `"from"` and `"to"` (seconds) in `music/tracks.json` and build again: the game starts it there and brings it round there. `"gain"` (for example 0.65) turns one track down against the others. To change a track, edit its prompt (or the shared `style`) and run `npm run music` again; `--force` makes a new take of the same prompt.

In the game the tracks cross-fade, loop, drop under the narrator, and follow the sound button (all sound plays them, effects only and off do not). Until a track exists the nearest one is used, and with none at all the browser-made drone plays as before.
