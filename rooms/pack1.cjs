'use strict';
/* Two Lanterns :: room pack 1. Six more rooms for the pool, written to the same pattern as the thirty that came before:
   two hands of four moves (Might, Guile, Lore, Spirit), one relic, two edges. {n} = the lantern acting, {p} = its partner.
   A room here joins the game only once its painting exists at art/scenes/<id>.webp (see rooms/README.md). */
module.exports = {
  relics: {
    wick: { name: 'Lamplighter’s Wick', k: 'S', amt: 1, d: 'It has never once gone out on anyone who was afraid.' },
    windlass: { name: 'Lockkeeper’s Windlass', k: 'M', amt: 1, d: 'A handle for turning things that would rather not turn.' },
    veil: { name: 'Mourner’s Veil', k: 'G', amt: 1, d: 'Nobody looks twice at grief.' },
    dividers: { name: 'Brass Dividers', k: 'L', amt: 1, d: 'They measure the distance between what was said and what was meant.' },
    slipknot: { name: 'Ropemaker’s Slipknot', k: 'G', amt: 1, d: 'It holds for exactly as long as you want it to.' },
    grille: { name: 'Confessor’s Grille', k: 'L', amt: 1, d: 'Whatever is said through it comes out true.' }
  },
  rooms: [
    { id: 'lamps', title: 'The Lamplighters’ Rest', relic: 'wick',
      intro: 'A dormitory cut into the rock, with forty narrow cots and a lantern hung on a hook above each one. Every lantern is dark but the last, at the far end, which burns low and steady over a cot that has been slept in. The blankets on the others are folded. The poles are stacked by the door, in order of height.',
      alt: 'A long stone dormitory of narrow cots, a dark lantern over each, one still burning at the far end',
      perks: [{ tag: 'tallow', amt: 1, line: 'The dark lanterns know a working flame when they see one' }, { tag: 'vow', amt: 1, line: 'Someone here kept a promise every dusk for forty years' }],
      opts: [
        { k: 'M', ic: 'torch', a: 'team', t: 'Carry the long pole', d: 'Take the tallest lighting-pole and go ahead of {p}, lifting each dark lantern off its hook before it can turn to look.',
          out: { good: '{n} walks the row with the pole held level and unhooks forty lanterns without a clink. {p} follows down a clear aisle.', meh: '{n} gets most of them down. The last few swing on their hooks and watch {p} go by.', bad: 'The pole is heavier at the far end than it has any right to be. Something has taken hold of it.' } },
        { k: 'G', ic: 'coins', a: 'self', loot: true, t: 'Go through the footlockers', d: 'Forty lamplighters, forty lockers, forty years of wages. They will not be wanting them.', fx: { win: { gold: 2 } },
          out: { good: '{n} opens every locker without waking a hinge and comes away with a quiet weight of small coin.', meh: 'Most of it is wick-trimmings and letters home. {n} finds a little coin under the letters.', bad: 'The last locker is the one that has been used lately. Its owner has not gone far.' } },
        { k: 'L', ic: 'book', a: 'team', t: 'Read the lighting roster', d: 'A roster by the door lists who lit which street. Read {p} the safe order to walk the cots, last name first.',
          out: { good: '{n} reads the roster backwards, as the night shift did, and {p} walks the row in exactly the right order.', meh: '{n} loses the place around the middle names. The cots creak, but nobody sits up.', bad: '{n} reads out a name that is still answering to it.' } },
        { k: 'S', ic: 'flame', a: 'solo', loot: true, relic: true, t: 'Ask the last lamp for its wick', d: 'One lantern is still lit. Ask it, properly, whether its work is done, and take the wick if it says yes.', fx: { win: { gold: 1 } },
          out: { good: 'The flame bows, once, and goes out by itself. The wick is still warm when {n} lifts it free.', meh: 'The flame thinks about it for a long time, and decides it has one more night in it.', bad: 'The flame says no, and every dark lantern in the room turns to see who asked.' } }
      ] },
    { id: 'sluice', title: 'The Sluice Gate', relic: 'windlass',
      intro: 'The passage ends at an iron gate as tall as a house, and the river is on the other side of it. You can hear the whole weight of the water leaning there. Wheels and chains climb the wall to a lockkeeper’s platform, where a chair faces the gate and a cold pipe rests on the arm. Water comes through the seams in threads, and each thread is ringing very faintly.',
      alt: 'A huge riveted iron sluice gate with water threading through its seams, wheels and chains rising to a small platform',
      perks: [{ tag: 'dockrat', amt: 1, line: 'You grew up reading what a river means to do' }, { tag: 'guard', amt: 1, line: 'You have stood a post in front of worse' }],
      opts: [
        { k: 'M', ic: 'chain', a: 'solo', loot: true, relic: true, t: 'Free the seized windlass', d: 'The lockkeeper’s windlass has rusted onto its shaft. Break it loose, and take the handle with you.', fx: { win: { gold: 1 } },
          out: { good: '{n} leans on it until the rust gives all at once. The handle comes away clean, with a purse of toll-pennies tied to it.', meh: 'It turns a quarter and seizes again. The gate groans as if it had been asked a personal question.', bad: 'The windlass comes free, and so, a little, does the gate.' } },
        { k: 'G', ic: 'wave', a: 'team', t: 'Find the dry line', d: 'The spray falls in a pattern. Pick out the one path across the floor that stays dry, and walk {p} along it.', fx: { win: { hp: 1 } },
          out: { good: '{n} crosses the room as if the water had agreed to it beforehand, and {p} arrives with dry boots and a steadier heart.', meh: 'The dry line holds for most of the way. The last yard is a matter of opinion.', bad: '{n} steps where the floor only looked dry. The river notices the weight.' } },
        { k: 'L', ic: 'scroll', a: 'team', t: 'Read the lockkeeper’s tally', d: 'Chalk tallies on the platform record every opening and closing. Work out which wheel is safe for {p} to pass under.',
          out: { good: '{n} reads forty years of tides in a minute, and points. {p} ducks under the one wheel that will never turn again.', meh: 'The tally is in a private shorthand. {n} gets the wheel right and the timing slightly wrong.', bad: 'The last line of the tally is not in chalk, and it is not a number.' } },
        { k: 'S', ic: 'coins', a: 'self', loot: true, t: 'Collect the toll', d: 'A brass box under the chair still holds the river’s takings. Say the lockkeeper’s good-night, and help yourself.', fx: { win: { gold: 1 } },
          out: { good: '{n} says good-night to the empty chair with real feeling, and the box opens without being touched.', meh: 'The box opens. The chair creaks, as chairs do when someone leans forward.', bad: '{n} takes the toll. The gate, which was owed it, takes exception.' } }
      ] },
    { id: 'wake', title: 'The Wake Table', relic: 'veil',
      intro: 'A long table is laid for a funeral supper: black cloth, cold meats, a seed cake cut once. Every chair has a coat hung on its back and a hat set on its seat, and the coats are sitting very upright. At the head of the table there is one empty chair with no coat. A black veil is folded on the plate in front of it.',
      alt: 'A long table set for a funeral supper, coats and hats sitting in the chairs, one empty chair at its head',
      perks: [{ tag: 'gravedigger', amt: 1, line: 'You have eaten at more wakes than weddings' }, { tag: 'letter', amt: 1, line: 'Your letter has a black edge, and the coats make room for it' }],
      opts: [
        { k: 'M', ic: 'fist', a: 'team', t: 'Hold the head chair back', d: 'The empty chair keeps sliding out to offer itself. Plant your feet and hold it in while {p} gets past.',
          out: { good: '{n} holds the chair to the table by main force, and it gives up with a small polite scrape. {p} is not invited to sit.', meh: 'The chair gets a leg out. {p} has to step around it rather carefully.', bad: 'The chair goes back in. {n} finds, with some surprise, that it went back in with {n} on it.' } },
        { k: 'G', ic: 'mask', a: 'solo', loot: true, relic: true, t: 'Take the veil from the plate', d: 'Lift the veil off the head plate between one breath of the room and the next. Mourners leave small coin under such things.', fx: { win: { gold: 1 } },
          out: { good: '{n} has the veil and the coin beneath it before a single hat can turn. Nobody looks twice at grief.', meh: 'A sleeve twitches. {n} sets the veil down again, exactly as it lay.', bad: 'Every coat at the table leans in to see who has been bereaved.' } },
        { k: 'L', ic: 'envelope', a: 'self', loot: true, t: 'Read the place cards', d: 'Each setting has a card, and a few have a bequest tucked under the plate. Work out which guests left something they will not miss.', fx: { win: { gold: 1 } },
          out: { good: '{n} reads the table like a will and collects from the three guests who died owing nobody.', meh: 'Two of the bequests are real. The third is a bill.', bad: '{n} finds a card with {n}’s own name on it, in a careful hand, at the setting nearest the door.' } },
        { k: 'S', ic: 'candle', a: 'team', t: 'Say a few words', d: 'Somebody has to. Stand, say something true and short for whoever this was, and let {p} leave while the table bows its hats.', fx: { win: { hp: 1 } },
          out: { good: '{n} says four plain sentences, and means them. Every hat dips, and the room lets out a breath it has held for years.', meh: '{n} runs long. The coats are too well brought up to show it.', bad: '{n} says a kind thing about the wrong person. The table knows exactly who it is burying.' } }
      ] },
    { id: 'maps', title: 'The Map Floor', relic: 'dividers',
      intro: 'The floor of this hall is Ashmere, laid out in tile no bigger than a thumbnail: every roof, every lane, the river in blue glass. A point of light burns in the window of each house. As you watch, one of them goes out, and then another, in no hurry. A pair of brass dividers stands open on the chapel roof, one point down.',
      alt: 'A vast floor mosaic of a town seen from above, tiny lights in its windows, some of them going dark',
      perks: [{ tag: 'bellkin', amt: 1, line: 'You have seen this town from the tower every day of your life' }, { tag: 'truth', amt: 1, line: 'The map shows what is so, and that is what you came for' }],
      opts: [
        { k: 'M', ic: 'shield', a: 'team', t: 'Carry your partner across', d: 'The tiles are thin as eggshell and the lit houses will not take a boot. Take {p} on your back and tread only on the river.',
          out: { good: '{n} walks the blue glass from bank to bank with {p} aboard, and not one window so much as flickers.', meh: '{n} clips a warehouse. Its light gutters, steadies, and stays offended.', bad: 'The river is glass, and glass has its limits.' } },
        { k: 'G', ic: 'coins', a: 'self', loot: true, t: 'Lift the gilt weathercocks', d: 'Every church on the map has a real gold weathercock the size of a lentil. There are nine churches.', fx: { win: { gold: 1 } },
          out: { good: '{n} goes over the rooftops on fingertips and comes back with nine small golden birds, all pointing the same way.', meh: '{n} gets five. The other four turn to face {n}, which is not what wind does.', bad: 'A light goes out in the house {n} is leaning on. It was a house {n} knew.' } },
        { k: 'L', ic: 'eye', a: 'solo', loot: true, relic: true, t: 'Take the dividers’ bearing', d: 'The dividers are measuring something. Work out what, finish the measurement for them, and they are yours.', fx: { win: { gold: 1 } },
          out: { good: '{n} walks the dividers from the chapel to the river, counts the steps, and says the number aloud. The brass goes slack in the hand, satisfied.', meh: '{n} is one step out. The dividers close with a snap and stand back where they were.', bad: 'The dividers were measuring the distance to {n}. They have their answer.' } },
        { k: 'S', ic: 'heart', a: 'team', t: 'Find your own windows', d: 'Somewhere on this floor are the two houses you came from. Find both, and tell {p} that the lights are still on.', fx: { win: { hp: 1 } },
          out: { good: '{n} finds both windows burning, and says so. It is astonishing how much lighter a lantern is to carry after that.', meh: '{n} finds one window lit, and does not go looking for the other.', bad: '{n} finds the street. It takes a while to be sure which house, because of the dark.' } }
      ] },
    { id: 'ropewalk', title: 'The Rope Walk', relic: 'slipknot',
      intro: 'A gallery far longer than it is wide, where the bell-ropes of Ashmere were laid. Strands as thick as wrists run its whole length at waist height, and they are still being twisted, slowly, from the far end, by nothing you can see. Coils hang from every rafter. One short length on the bench has been tied into a knot that nobody has yet managed to draw.',
      alt: 'A very long low gallery strung with thick ropes twisting by themselves, coils hanging from the rafters',
      perks: [{ tag: 'bellkin', amt: 1, line: 'Your hands know a bell-rope the way they know each other' }, { tag: 'thief', amt: 1, line: 'You have left by rope more often than by door' }],
      opts: [
        { k: 'M', ic: 'rope', a: 'self', loot: true, t: 'Cut the gilded sally', d: 'One finished rope has gold thread worked through its grip. Brace a foot on the bench and cut the grip free.', fx: { win: { gold: 1 } },
          out: { good: '{n} takes the gold-worked grip off in two strokes. The rest of the rope lies down, as if relieved of a responsibility.', meh: 'It takes six strokes, and the rope does not hold still for any of them.', bad: 'The rope has been pulled by ringers all its life. It knows what to do with a pair of hands.' } },
        { k: 'G', ic: 'key', a: 'solo', loot: true, relic: true, t: 'Untie the knot on the bench', d: 'Nobody can draw that knot, which only means nobody has untied it yet. A ropemaker’s penny is caught in the middle.', fx: { win: { gold: 1 } },
          out: { good: '{n} finds the one strand that is only pretending, and the whole knot falls open into a neat loop with a penny in it.', meh: '{n} gets it half undone. It is now a different knot, and slightly smug.', bad: 'The knot comes undone at one end and does itself up again at the other, around {n}’s wrist.' } },
        { k: 'L', ic: 'hourglass', a: 'team', t: 'Count the twist', d: 'The strands turn to a count. Learn it, and call {p} through each gap as it opens.',
          out: { good: '{n} has the count in three turns and calls it like a dance. {p} steps through the whole walk without touching hemp.', meh: '{n} calls one beat early. {p} is brushed by a strand, which takes a button as a keepsake.', bad: 'The count changes the moment {n} is sure of it.' } },
        { k: 'S', ic: 'bell', a: 'team', t: 'Ring them down', d: 'Every rope here wants a bell on the end of it. Take two in your hands and ring a short, kind round on nothing, so they will let {p} by.', fx: { win: { hp: 1 } },
          out: { good: '{n} rings eight changes on empty air. The ropes go slack with something very like contentment, and {p} walks through.', meh: 'The ropes enjoy it, and would like another. {n} obliges, at some cost to the shoulders.', bad: '{n} rings, and far below, something with a bell on the end of it answers.' } }
      ] },
    { id: 'confess', title: 'The Confessional Row', relic: 'grille',
      intro: 'A corridor of confessionals, twenty to a side, their doors all closed and their curtains all drawn. A low voice is speaking in each one, and none of them is waiting for an answer. As you pass, the nearest voice stops, and then says your name, with a question after it. A brass grille has been unscrewed from the last booth and left on its step.',
      alt: 'A narrow corridor lined with dark wooden confessional booths, curtains drawn, a faint light behind each',
      perks: [{ tag: 'novice', amt: 1, line: 'You have sat on both sides of that curtain' }, { tag: 'witch', amt: 1, line: 'You owe this place nothing, and it can tell' }],
      opts: [
        { k: 'M', ic: 'door', a: 'team', t: 'Hold the doors shut', d: 'The booths open inward for whoever is named. Put your back to the row and keep them closed while {p} walks it.',
          out: { good: '{n} goes down the row a door at a time, and each one stays shut. {p} is named twice, and is let alone twice.', meh: 'One door gets a hand’s width open. A good deal of whispering comes out through the gap.', bad: 'The door behind {n} opens the other way.' } },
        { k: 'G', ic: 'coins', a: 'self', loot: true, t: 'Empty the offering slots', d: 'Each booth has a slot for penance paid in coin. The priests are long gone, and the boxes are not locked so much as trusted.', fx: { win: { gold: 1 } },
          out: { good: '{n} lifts forty years of small guilt out of the boxes and feels none whatever.', meh: 'Half the boxes hold coin. The other half hold what people gave when they had no coin.', bad: 'A voice behind the curtain names the exact sum, and asks {n} what it is for.' } },
        { k: 'L', ic: 'ear', a: 'solo', loot: true, relic: true, t: 'Answer the question correctly', d: 'The voice asked something, and it wants a true answer, exactly worded. Give it one, and take the grille as your receipt.', fx: { win: { gold: 1 } },
          out: { good: '{n} thinks, and answers in nine words with nothing spare. The voice says, “Yes. That is what it was.” The grille is warm.', meh: '{n}’s answer is true, but not what was asked. The voice waits, with terrible patience, for the rest.', bad: '{n} answers, and hears it come back through the grille, corrected.' } },
        { k: 'S', ic: 'cross', a: 'team', t: 'Hear one out', d: 'Sit down on the priest’s side of one booth, and listen to the end. It is all any of them want. Let {p} pass while it talks.', fx: { win: { hp: 1 } },
          out: { good: '{n} listens until the voice has nothing left, and says the short thing that comes after. One booth in forty falls silent, and the row is easier for it.', meh: '{n} listens. It goes on a good while longer than expected, and some of it sticks.', bad: 'The voice finishes and asks, kindly, whether {n} has anything to add.' } }
      ] }
  ],
  alts: {
    lamps: [
      { k: 'M', ic: 'hammer', a: 'self', loot: true, t: 'Break the oil store', d: 'A locked cupboard holds the brass oil-measures, and brass sells. Put a shoulder to it.', fx: { win: { gold: 2 } },
        out: { good: 'The cupboard gives on the second try. {n} takes the measures and leaves the oil, which seems only fair.', meh: 'The door gives. So does a shelf, and the measures arrive on {n}’s foot.', bad: 'The noise goes round the room twice. On its second pass, someone turns over.' } },
      { k: 'G', ic: 'feather', a: 'team', t: 'Turn down the blankets', d: 'An unmade cot is an occupied cot, and a made one is not. Go ahead of {p}, and make every bed as you pass it.',
        out: { good: '{n} squares forty blankets on the move, with hospital corners. Nothing lies down in a made bed, and {p} strolls through.', meh: '{n} misses one. It is the one {p} happens to be passing.', bad: 'One of the blankets is already tucked in, from underneath.' } },
      { k: 'L', ic: 'lantern', a: 'solo', loot: true, relic: true, t: 'Trim the last lamp', d: 'The lit lantern is burning badly. Trim it the way the roster says, and the old wick is yours, with the trimmer’s penny.', fx: { win: { gold: 1 } },
        out: { good: '{n} trims it to the roster’s exact mark. The flame stands up straight, and the spent wick drops into {n}’s palm like a tip.', meh: '{n} trims it a hair short. The flame carries on, and keeps its wick.', bad: '{n} trims it out. It is extremely dark, and one cot creaks.' } },
      { k: 'S', ic: 'note', a: 'team', t: 'Sing lights-out', d: 'There was a song for the end of the round. Sing it through for the forty, so they stay down while {p} goes by.', fx: { win: { hp: 1, toll: -1 } },
        out: { good: '{n} sings it quietly to the end. The folded blankets seem to settle, and the one lit lantern burns a little easier.', meh: '{n} knows the tune and guesses the words. It serves.', bad: '{n} sings the dawn song by mistake. It is time to get up.' } }
    ],
    sluice: [
      { k: 'M', ic: 'fist', a: 'team', t: 'Brace the weeping seam', d: 'One seam is letting in more than threads. Set your shoulder against the plate and hold it while {p} crosses beneath.',
        out: { good: '{n} holds back a river with one shoulder for the count of thirty, and {p} crosses dry.', meh: 'The seam holds. {n}’s shoulder will be discussing it for a week.', bad: 'The plate moves. Not much. It is still the wrong direction.' } },
      { k: 'G', ic: 'key', a: 'solo', loot: true, relic: true, t: 'Slip the windlass pin', d: 'The windlass is held by a single cotter pin and a great deal of habit. Draw the pin without waking the chain.', fx: { win: { gold: 1 } },
        out: { good: 'The pin comes out between two drips. {n} lowers the windlass into a coat, and finds the lockkeeper’s tip-jar behind it.', meh: 'The pin is out. The chain shifts one link, and {n} puts the pin back.', bad: 'The chain was waiting on that pin for forty years, and wastes no time.' } },
      { k: 'L', ic: 'coins', a: 'self', loot: true, t: 'Audit the toll box', d: 'The takings never matched the tally. Work out where the difference was hidden, and collect it.', fx: { win: { gold: 1 } },
        out: { good: '{n} finds the false bottom the lockkeeper thought nobody would. It was a good hiding place. It was a better pension.', meh: '{n} finds the false bottom, and a note saying most of it went on tobacco.', bad: '{n} finds the difference. The river had been collecting it.' } },
      { k: 'S', ic: 'wave', a: 'team', t: 'Talk to the river', d: 'It has been leaning on that gate a long time and nobody has said a word to it. Say one, for {p}’s sake.', fx: { win: { hp: 1 } },
        out: { good: '{n} tells the river it is doing very well, and to carry on. The ringing in the seams drops by a full tone.', meh: 'The river listens. It is hard to tell what it made of that.', bad: '{n} asks the river how it is. The river begins to explain.' } }
    ],
    wake: [
      { k: 'M', ic: 'chest', a: 'self', loot: true, t: 'Carry off the silver', d: 'The serving dishes are solid plate and the dead eat lightly. Take the heaviest, and walk out as if you were staff.', fx: { win: { gold: 1 } },
        out: { good: '{n} clears a tureen from the table with a waiter’s bow. Not a hat turns.', meh: 'The tureen is full. {n} gets it out, and wears some of it.', bad: 'A sleeve catches {n}’s wrist, quite gently, the way one stops a servant.' } },
      { k: 'G', ic: 'feather', a: 'team', t: 'Pass as mourners', d: 'Take two hats from the sideboard, one for you and one for {p}, and walk the length of the table at a funeral pace.',
        out: { good: '{n} sets the hats at the correct sorrowful angle. The coats take both of you for family, and look away.', meh: 'The hats pass. {p}’s is a little large, and has to be held on.', bad: 'The hats were not spare.' } },
      { k: 'L', ic: 'candle', a: 'team', t: 'Find whose wake it is', d: 'No name is on anything. Work it out from the dishes and the order of seating, and say it aloud, so the table can finish and let {p} go.', fx: { win: { hp: 1 } },
        out: { good: '{n} names the dead from a seed cake and a seating plan. The coats sag in their chairs with relief. They had forgotten.', meh: '{n} gets the family right and the person wrong. The table is touched by the effort.', bad: '{n} works it out, and wishes very much to be mistaken.' } },
      { k: 'S', ic: 'ghost', a: 'solo', loot: true, relic: true, t: 'Sit in the empty chair', d: 'It is kept for the chief mourner. Sit, grieve honestly for a stranger for one minute, and the veil and the mourner’s purse are yours by right.', fx: { win: { gold: 1 } },
        out: { good: '{n} sits, and finds there is always someone to grieve for. When the minute is up the veil is in {n}’s lap, and nobody objects.', meh: '{n} sits, and cannot quite manage it. The chair lets {n} up again, disappointed.', bad: '{n} sits. The chair pulls itself in to the table.' } }
    ],
    maps: [
      { k: 'M', ic: 'gem', a: 'self', loot: true, t: 'Prise up the river', d: 'The river is real blue glass, and the long reach by the docks is one flawless piece. Get a blade under it.', fx: { win: { gold: 1 } },
        out: { good: 'The reach comes up whole, as long as a forearm and worth a month’s rent. The map makes do with a dry bed.', meh: 'It comes up in three pieces. Two of them will sell.', bad: 'Under the glass there is water, and it is not painted.' } },
      { k: 'G', ic: 'stairs', a: 'team', t: 'Walk the back lanes', d: 'You know which alleys have no windows on them. Lead {p} across the whole town without passing a single light.',
        out: { good: '{n} takes {p} from the east gate to the west by ways the lamplighters never bothered with. No window sees them go.', meh: 'One lane has had a window put in since. {n} hurries {p} past it.', bad: 'The lane {n} remembers is not on the map, and the map is right.' } },
      { k: 'L', ic: 'scroll', a: 'team', t: 'Find the order of the dark', d: 'The lights are not going out at random. Find the rule, and stand {p} on a street that is not next.', fx: { win: { hp: 1 } },
        out: { good: '{n} sees it: the dark is following the old ringing route, bell by bell. {p} is moved two streets over, and breathes again.', meh: '{n} has most of the rule. {p} is safe for now, which is the only kind of safe on offer.', bad: '{n} finds the rule, follows it forward, and sees where it ends.' } },
      { k: 'S', ic: 'bell', a: 'solo', loot: true, relic: true, t: 'Stand on the chapel', d: 'The dividers have one point on the chapel roof. Stand there with them, and promise the town what you came down to do. A collection plate sits by the door.', fx: { win: { gold: 1 } },
        out: { good: '{n} says it plainly. The dividers fold themselves up, as an instrument does when the reading is taken, and tip into {n}’s hand.', meh: '{n} says it. The dividers swing round to check, and are not convinced.', bad: '{n} promises, and three more windows go out, as if to say: quickly, then.' } }
    ],
    ropewalk: [
      { k: 'M', ic: 'rope', a: 'team', t: 'Hold the strands apart', d: 'Take a strand in each fist and force a gap in the twist, wide enough and long enough for {p} to get through.',
        out: { good: '{n} holds two bell-ropes apart at arm’s length while {p} walks between them, and then lets go very carefully indeed.', meh: 'The gap holds. {n}’s palms are a different colour afterwards.', bad: 'The strands finish their turn with {n} still holding on.' } },
      { k: 'G', ic: 'coins', a: 'self', loot: true, t: 'Rob the ropemaker’s till', d: 'Up in the rafters, where the coils hang, there is a cash-box on a pulley. Go up a coil and bring it down.', fx: { win: { gold: 1 } },
        out: { good: '{n} goes up one coil and comes down another with the box under an arm, and neither coil the wiser.', meh: '{n} gets the box. The coil lets {n} down faster than agreed.', bad: 'The coil {n} is climbing starts, hand over hand, to climb back.' } },
      { k: 'L', ic: 'book', a: 'solo', loot: true, relic: true, t: 'Name the knot', d: 'Every knot ever tied here is in the pattern book, with its price, except the one on the bench. Work out what it is for, and it will come undone for you.', fx: { win: { gold: 1 } },
        out: { good: '{n} reads the knot rather than the book: it is for holding only as long as it is wanted. Said aloud, that is enough. It opens, and pays its own price.', meh: '{n} names it wrongly, though close. The knot tightens, the way a face does.', bad: 'It is a knot for keeping someone where they are. {n} learns this by holding it.' } },
      { k: 'S', ic: 'note', a: 'team', t: 'Hum the walking song', d: 'Ropemakers walked backwards and sang to keep the twist even. Hum it, and the strands will keep time and leave {p} a clear path.', fx: { win: { hp: 1 } },
        out: { good: '{n} hums, walking backwards, and the whole gallery falls into step. {p} goes down the middle as if down an aisle.', meh: 'The strands keep time. It is {n} who loses it, near the end.', bad: '{n} hums the song, and the ropes start laying something new, at speed.' } }
    ],
    confess: [
      { k: 'M', ic: 'hammer', a: 'self', loot: true, t: 'Break open the poor box', d: 'An iron-bound poor box stands at the end of the row, and it is full. The poor of Ashmere have other troubles tonight.', fx: { win: { gold: 1 } },
        out: { good: 'One blow on the hasp. {n} fills a pocket, and promises, quite sincerely, to feel bad about it later.', meh: 'It takes several blows, each one stopping every voice in the row for a moment.', bad: 'The box breaks. Forty voices say the same word together, and it is {n}’s name.' } },
      { k: 'G', ic: 'mask', a: 'team', t: 'Answer to the wrong name', d: 'When a voice asks for {p}, answer as {p}, convincingly, from the far end of the row. Let it talk to you instead.',
        out: { good: '{n} does {p}’s voice well enough to fool forty confessors, and {p} walks the row unnamed.', meh: 'The voice is not sure. It asks {n} a thing only {p} would know, and {n} guesses.', bad: 'The voice believes {n} completely, and begins on {p}’s sins. It knows a great many.' } },
      { k: 'L', ic: 'scroll', a: 'team', t: 'Give them their penance', d: 'They are stuck because nobody ever told them what they owed. Work out a fair penance, and set it, so the booths go quiet for {p}.', fx: { win: { hp: 1 } },
        out: { good: '{n} sets each voice something small and possible. One by one they stop, to get on with it.', meh: '{n} is fair, on the whole. Two voices appeal.', bad: '{n} sets a penance, and a voice asks, reasonably, what {n}’s own is.' } },
      { k: 'S', ic: 'heart', a: 'solo', loot: true, relic: true, t: 'Confess something', d: 'The last booth is open, and the grille is on its step. Go in, say the thing you have not said, and leave your coin or take the one that is there.', fx: { win: { gold: 1 } },
        out: { good: '{n} says it, and it was smaller said than carried. The grille comes away in {n}’s hand like something handed over.', meh: '{n} says most of it. The booth waits, and then lets {n} out with the rest.', bad: '{n} confesses, and something on the other side, very gently, begins to disagree.' } }
    ]
  },
  /* what the image tool is told about each room, beyond its intro and its one-line look */
  prompts: {
    lamps: 'Long barrel-vaulted dormitory in one-point perspective, two rows of narrow iron cots receding, a dark hanging lantern above every cot, one small steady amber flame far at the end, tall lighting-poles stacked by the doorway in the foreground. Dry stone floor. No bell.',
    sluice: 'A colossal riveted iron sluice gate fills the back wall, low camera looking up, thin bright threads of water jetting through its seams, heavy toothed wheels and chains climbing the left wall to a small railed platform with an empty chair. Wet flagstones only near the gate. Industrial, not ecclesiastical. No bell.',
    wake: 'Side-on view of a very long banquet table under a low beamed ceiling, black cloth, covered dishes and unlit candlesticks, tall-backed chairs each draped with a dark coat and topped with a hat so they read as seated figures with no bodies, one bare empty chair at the near head of the table with a folded black veil on its plate. Dry stone floor. No bell.',
    maps: 'High three-quarter view down onto a huge hall whose whole floor is a miniature mosaic town seen from above, tiny warm points of light in its windows with dark patches where lights have gone out, a ribbon of blue glass river, an oversized pair of brass dividers standing on one roof. The two travelers stand at the edge, small. No bell.',
    ropewalk: 'Extremely long, low, narrow gallery in deep one-point perspective, several thick ropes stretched its full length at waist height and visibly twisted, large coils hanging from the rafters like sleeping shapes, a workbench in the foreground with a single knotted length of rope. Dry plank floor. No bell.',
    confess: 'Narrow corridor in one-point perspective lined on both sides with tall dark wooden confessional booths, heavy curtains drawn, a faint cold light leaking under each door, the last booth at the end standing open with a small brass grille resting on its step. Dry stone floor. No bell.'
  }
};
