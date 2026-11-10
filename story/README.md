# Story sources

The original game and move-specific prose remain in `backups/index-placeholders.html`. The build adds these authored layers without changing their stats or consequences:

- `descent.cjs`: eight descent chapters, reactive bridges and wandering-encounter exchanges.
- `room-pages.cjs`: an arrival, a private decision and an aftermath for all 47 rooms. The additions total at least 130 words per room before its original introduction, move text and consequences.
- `page-scenes.cjs`: 17 scenes for the surrounding screens, three shared consequence passages, and 14 ending epilogues.
- `runtime.js`, `pages-runtime.js`: pure selections from saved state. Room choices never read the other player’s selected move. The longer epilogue is included in copied endings.
- `page-interface.js`: places the new passages on each screen, alongside the existing practical instructions and choices. Everything is plain escaped text. Story paragraphs carry `data-narrate` so the same exact words select their recorded clips.
- `draw-rooms.js`: the existing one-or-two wandering-encounter draw.

`scripts/story-edits.cjs` injects the layers into the preserved source. `npm run build` rebuilds the full page with art, narrator and music. `npm run verify` checks coverage and rules. `npm run qa` checks the rendered screens, mobile layouts, copied epilogues and voice sequencing.

The 175 expanded passages add 9,749 words. They are all recorded using the existing ElevenLabs configuration; the game now has 246 clips in total. The narrator reads a screen’s passages in document order. Existing recordings are reused, and each new screen has a Listen control. Story can be read or skipped at the players’ own pace.

To edit prose, change the data files, run `npm run narrate -- --list`, record the changed passages with `npm run narrate`, then build and verify. The generator handles API credentials locally and keeps completed clips when interrupted.
