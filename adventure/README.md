# Between the rooms

The Adventure layer adds six kinds of interaction to fresh descents. Existing descents without `S.adventure` keep their rules and route. The eight-room structure and 47-room pool stay intact; interludes happen between those rooms.

1. **Private bargains.** On leaving the first chandler’s stall, each lantern gets a different offer. Accept secretly, accept openly, or decline. Four objectives track selfish successes, helpful successes, two rooms without treasure, or a successful optional search. Confessing an accepted offer grants trust +1 once. Fulfilling it while keeping it sealed grants an extra gold instead. Settlement before the Bellheart reveals and pays the accounts once; missing a deal has no penalty.
2. **Team combinations.** Cover and slip (helpful Might + Guile), Name and answer (helpful Lore + Spirit), Shoulder to shoulder (two helpful Might moves), and A lie with witnesses (two Guile moves, at least one helpful). A successful setup adds the displayed +1 to the target rolls. Both succeeding adds trust +1 and a combination-specific reward. Private hints explain the possibilities without reading a partner’s selected card.
3. **Optional searches.** After each middle room, both players privately choose to search or leave. Either can veto. The first search succeeds on 3–6: 1 gold each; failure costs 1 health each. A successful find opens one deeper temptation. That succeeds on 4–6: 2 more gold each; failure costs 2 health each and Undertoll +1. Banking keeps the first reward. There is no third step.
4. **Nim.** Meet the small guide after the first middle room. Free him, hire him, or leave him. He returns after the fourth middle room. Earlier kindness makes his knucklebone free; a business relationship costs 1 gold, and leaving him costs 2. A kind word can quiet the Bell instead. His return, chalk marks at the false exit, and an ending callback remember the relationship.
5. **Rare encounters.** Forty percent of descents get one extra encounter after the third or fifth middle room: the ragpicker, a ghost festival, a false exit, or the Bellmarked Huntsman. The Huntsman has 3 resolve over two exchanges, distinct approaches using each stat, coordinated-pair bonuses, retreat choices, and a special relic on defeat. Targets are 5 then 6; failed fighting approaches cost 1 then 2 health. Retreating makes no attack and takes no damage in that exchange. Both retreating ends the encounter.
6. **Mid-descent twists.** Sixty-five percent of descents draw a twist after the third middle room. Borrowed Light grants +1 in the companion’s strongest stat. The Third Footstep grants helpful moves +1 while successful selfish moves add Undertoll +1. The Backward Hour reverses chooser order and grants Lore +1. Every twist lasts exactly the next two rooms, shows its effect, and survives a save/reload.

## State, privacy and saves

`runtime.js` stores the layer under `S.adventure`. A seed chosen from the already-random route fixes the schedule and interlude dice. Rendering, preview and option functions do not consume randomness or mutate state. Nonces identify each phase, result, depth and round; duplicate votes, stale actions and repeated payments are rejected. Scar and health rules use the existing engine helper.

The host applies online actions through `online.js`. Guest snapshots remove the host’s concealed contract, pending vote values, future schedule, seed and queue. Accepting openly or confessing explicitly discloses the bargain. These are peer-hosted games, so the authoritative host owns the complete game state, as it already does for secret move cards.

Sealed notes carry `data-private-narration`. The narrator skips those paragraphs during automatic reading, including on a shared device. **Listen privately** explicitly includes the private text. Controls mount outside closed details. Headphones are recommended for private listening. Publicly disclosed bargains can be narrated normally.

Online protocol version 2 prevents an older cached client from joining a game with the new phases. Refresh both devices before hosting. Existing local save keys are unchanged, and online saves now accept the interlude screen.

## Art and voice

Five images were made with the built-in image generator, using the approved eerie reference. The optimized sources and exact prompts are:

| Scene | Image | Prompt |
|---|---|---|
| Nim | `art/scenes/nim.webp` | `art/prompts/nim.txt` |
| Nim returns | `art/scenes/nim-return.webp` | `art/prompts/nim-return.txt` |
| Ghost festival | `art/scenes/festival.webp` | `art/prompts/festival.txt` |
| False exit | `art/scenes/falseexit.webp` | `art/prompts/falseexit.txt` |
| Huntsman | `art/scenes/huntsman.webp` | `art/prompts/huntsman.txt` |

All **45 Adventure narration passages are recorded** in the existing ElevenLabs voice. Together with the core story’s 246 recordings, all **291 collected passages** have clips. The 18 passages previously held up by the account quota are now complete. After future prose edits, use `npm run narrate -- --list`, then `npm run narrate -- --yes` to record only missing or outdated clips. Build and publish the updated page, manifest and MP3 files afterwards.

## Checks

`npm run verify` tests 266 interlude action cases, every option pair, save determinism, vetoes, rewards, contracts, duplicate actions, snapshots, combination roll math, twist expiry and 600 coordinated Huntsman fights. Browser QA covers mobile layouts, a full hot-seat descent, two real browser contexts using the real host/guest message handlers over a simulated transport, private-audio protection and resuming a guest’s interlude. The sequence test uses mocked Audio with real recorded-clip references; native MP3 playback is tested separately.

Run `npm run qa` with strict narration coverage. Missing recordings fail the story check. `TWO_LANTERNS_ALLOW_PENDING_VOICE=1` remains available for developing new prose before recording it; the flag never adds placeholder audio to the game.
