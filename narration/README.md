# Narration

Optional recorded narration, spoken by an ElevenLabs voice. It is off by default and saved per device, it never blocks play, the text always stays on screen, and moving on stops the voice.

**What is spoken:** the 38 room intros, the 2 chandler landings and the title line: 41 passages, about 10,700 characters. Outcomes, endings and the story-layer lines are different every run, so they stay text.

## One-time setup (on your PC, in this folder)

1. **Get a key.** Run `npx -y @elevenlabs/cli@latest onboard connect`. It opens your browser, you approve once, and it saves the key to `.env.local` (git-ignored). Or create a key at https://elevenlabs.io/app/api/api-keys and add `ELEVENLABS_API_KEY=...` to `.env.local` yourself. Never paste a key into a chat or commit it.
2. **Pick a voice.** Add one to *My Voices* at elevenlabs.io, run `npm run narrate -- --voices`, and put its id in `.env.local` as `ELEVENLABS_VOICE_ID=...` (or set `voiceId` in `narration/config.json`).
3. **Check.** `npm run narrate -- --check` confirms the key, model and voice. It is free.

## Make it

| Step | Command |
| --- | --- |
| Audition one passage | `npm run narrate -- --only room-stair`, then open the `.mp3` it names |
| Speak everything missing | `npm run narrate` (asks first, shows the character count) |
| Bake into the page | `npm run build` |
| Check everything | `npm run verify` |
| Publish | copy `index.html` and the `audio` folder into `.github-publish`, then commit and push |

Stopping part-way is safe: every finished clip is kept, and running the command again carries on.

## Good to know

- `npm run narrate -- --list` shows what is missing or outdated and spends nothing.
- Changing the voice, model, `speakTitle`, pronunciations or seed marks clips *outdated*; `npm run narrate` redoes only those. If you edit a passage's text, it gets a fresh clip and `--prune` removes the old file.
- The model defaults to `eleven_v4`. If your account names it differently, `npm run narrate -- --models` lists the ids and `ELEVENLABS_MODEL_ID` (or `modelId` in `config.json`) switches it.
- ElevenLabs bills by character on your plan. Check your plan's licence terms before you publish the audio.
- Pronunciation fixes go in `config.json`, for example `"pronounce": { "Undertoll": "Under-toll" }`. They change only what the voice reads, never the text on screen.
- Nothing is sent from the game to ElevenLabs. The clips are plain MP3 files served with your page.
- Online play: each player's switch lives on their own device. Leave it off if you are already on a call together.
- With no clips yet, `npm run build` leaves `index.html` exactly as it was.

## Files

- `config.json`: model, format, `speakTitle`, voice settings, pronunciations.
- `manifest.json`: written by the generator; maps each passage's text key to its clip.
- `hash.js`: the text key, shared by the generator and the in-game narrator so a clip only plays for the exact words it was recorded from.
- `runtime.js`, `narrator.css`: the in-game narrator, injected by `scripts/build-narrator.cjs`.
- `scripts/narrate.cjs`, `scripts/narration-lib.cjs`, `scripts/verify-narration.cjs`: generator, shared helpers, checks.
