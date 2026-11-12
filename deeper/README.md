# The deeper rules

Five additions for fresh descents, built on the Adventure layer (`adventure/`). A descent already in progress keeps the rules it began with: everything here is switched by `S.deep`, which only a new descent gets.

1. **The fork.** After the first, third and fifth rooms the stair divides and both lanterns choose privately. The lit stair is the room that was dealt. The dark door is another room from the pool: every roll there is 1 harder and every success pays 1 more gold. Each door names its room, its relic and who has an edge there. If the lanterns disagree, whoever chooses first in the rooms decides.
2. **The landings.** Leaving each chandler's landing, each lantern takes one of three things. First landing: +1 to its weakest stat, heal to full, or 2 gold. Last landing: +1 to its strongest stat, a knucklebone reroll, or clear its wounds and heal 2.
3. **Wounds.** A scar taken in a room is a named wound: -1 to the stat that was being used, for the next two rooms. One wound per stat.
4. **Relics answer once.** Each relic can be called on one time in a descent: on the results screen to reroll your partner's die (never your own), or against the Bell to hold without a roll.
5. **The Bell.** Before the last room there are two exchanges, at 5 and then 6. Each lantern picks an approach by stat and cannot repeat it. Giving ground costs 1 health the first time and raises the Undertoll the second. A lantern that holds both times has +1 on its last roll; one that gives ground both times has -1.

## Where it lives

- `deeper/content.cjs`: every word. `deeper/runtime.js`: the rules, as three kinds of interlude (`fork`, `upgrade`, `bell`) registered with `Adventure.kinds`, plus wrappers round five engine functions. `deeper/interface.js`: the status box and the relic button. `deeper/online.js`: the host applies a guest's relic call. `scripts/deeper-edits.cjs` splices them in from `scripts/build-art.cjs`.
- `adventure/runtime.js` gained the `kinds` registry and `util`, so further interludes need no changes there.
- Because the fork, the landings and the Bell are Adventure interludes, they keep its nonces, hidden votes, guest snapshots and saves. The online protocol is version 3: refresh both devices before hosting.

## Voice

The ten passages that read the same in every descent are collected by `scripts/narration-lib.cjs` (`deeper-fork`, `deeper-bell` and so on), so `npm run narrate` records them with the rest. The one line that names a lantern (`forkSplit`) stays unvoiced; the narrator passes over it.

## Checks

`npm run verify` runs `scripts/verify-deeper.cjs`: 3,000 whole descents with and without the rules, every fork outcome, each landing choice, wound timing, relic limits, the Bell's exchanges and a save in the middle of one. It also prints how the rules move the balance under random play. `npm run qa` runs `scripts/browser-deeper-qa.cjs`: two browsers vote on a fork over the real message handlers, and a guest calls on a relic.
