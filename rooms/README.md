# Room packs

`pack1.cjs` holds six more rooms for the pool, each with two hands of four moves, a relic, two edges and a painting prompt:

| id | Room | Relic |
|---|---|---|
| `lamps` | The Lamplighters' Rest | Lamplighter's Wick (Spirit) |
| `sluice` | The Sluice Gate | Lockkeeper's Windlass (Might) |
| `wake` | The Wake Table | Mourner's Veil (Guile) |
| `maps` | The Map Floor | Brass Dividers (Lore) |
| `ropewalk` | The Rope Walk | Ropemaker's Slipknot (Guile) |
| `confess` | The Confessional Row | Confessor's Grille (Lore) |

A room joins the game only when its painting exists, so they can be painted one at a time.

## Adding a room's painting

1. Make the painting with the same image tool and style reference as the other scenes (`art/README.md`). The room's prompt is under `prompts` in `pack1.cjs`: it describes only the composition, so put the usual Undertoll style wording and the reference image with it. Print them all with `node -e "const p=require('./rooms/pack1.cjs').prompts;for(const k in p)console.log(k+': '+p[k]+'\n')"`.
2. Save it as `art/scenes/<id>.webp` (for example `art/scenes/lamps.webp`), the same size and shape as the other scenes.
3. `npm run build`, then `npm run verify`. The build prints which pack rooms are in (`packRooms`) and which are still waiting for a painting (`packWaiting`), and the title screen's room count follows.
4. Optional: `npm run narrate` records the new room's opening in the narrator's voice (uses the ElevenLabs key in `.env.local`), then `npm run build` again.
5. Publish `index.html` (and any new `audio/narration` clips).

Saved games keep the rooms they drew. Danger belongs to the slot a room lands in, not to the room.

## Wandering encounters

`pack2.cjs` adds the Toll Collectors (`collectors`), Hush Hounds (`hounds`) and Wick Thief (`wickthief`). Each is marked `combat: true`, has its painting in `art/scenes/`, and its full generation prompt in `art/prompts/`. New descents include one or two of them within the six middle slots, spaced apart when there are two. They use the existing four stats, secret choices, assistance, health and relic rules, with ways to fight, deceive, bargain or protect your companion.

The draw is in `story/draw-rooms.js`, inserted inside the engine so `Engine.setRng` still controls every random choice. Encounter aftermaths and extra banter are in `story/descent.cjs`. `npm run verify` checks both the new draw and every combination of enemy, hand, slot, pair of moves and dice results.
