'use strict';
/* Two Lanterns :: the deeper rules. Words for the fork in the stair, what a landing teaches, named wounds,
   relics that answer once, and the two exchanges with the Bell before the last choice. */
module.exports = {
  text: {
    fork: 'The stair divides. One way is lit, in the grudging manner of a town that still pays somebody to trim wicks. The other is a door standing a hand open on the dark, and whatever is behind it has not been counted by anyone in a long time. You can hear your partner deciding.',
    forkLit: 'You keep to the lit stair. It is the sensible way, and it knows it.',
    forkDark: 'You take the dark door. The lamps shrink to the size of what you are holding, and the stair on the far side has more on it than it should.',
    forkSplit: 'You wanted different doors. It was {n}’s turn to have the choosing of it.',
    upgrade0: 'A landing is the only place on this stair where anyone has time to think about how they have been doing it. You have both learned something on the way down. It is not the same thing.',
    upgrade1: 'The last landing. Below it the stair stops pretending to be a stair. Whatever you are going to be when you reach the Bell, this is where you finish becoming it.',
    upgradeDone: 'You shoulder what you have learned and go on down.',
    bell: 'The Bell is not waiting for you. It is turning, slowly, on a yoke nobody has greased in your lifetime, and the air turns with it. Before either of you can choose what to do about it, you have to get close enough to choose. It will not make that easy twice.',
    bellRound: 'The Bell has noticed. The rope walks across the floor on its own and the sound comes up through your boots. One more exchange and you will be standing where the choice is.',
    bellAgain: 'It turns the other way now, faster. What worked a moment ago it has already learned. Find another way to stand your ground.',
    bellDone: 'You are at the Bellheart. Whoever held their ground stands a little surer for it, and whoever gave it twice will feel that in the last throw. There is only the choice left.'
  },
  wounds: {
    M: { name: 'Wrenched shoulder', line: '{n} has a wrenched shoulder' },
    G: { name: 'Shaking hands', line: '{n}’s hands are shaking' },
    L: { name: 'Ringing ears', line: '{n}’s ears are ringing' },
    S: { name: 'Cold dread', line: '{n} is carrying a cold dread' }
  },
  upgrades: [
    [{ id: 'low', title: 'Steadier hands', note: '+1 {low}, your weakest stat.' }, { id: 'breath', title: 'A deep breath', note: 'Heal to full health.' }, { id: 'coin', title: 'A coin in the boot', note: '+2 gold.' }],
    [{ id: 'high', title: 'What you are good at', note: '+1 {high}, your strongest stat.' }, { id: 'bone', title: 'A knucklebone', note: 'One more reroll, to throw in any room.' }, { id: 'bind', title: 'Bind the wounds', note: 'Clear your wounds and heal 2 health.' }]
  ],
  approaches: [
    { k: 'M', title: 'Hold the rope' }, { k: 'G', title: 'Slip the stay' }, { k: 'L', title: 'Read the casting marks' }, { k: 'S', title: 'Sing the counter-note' }
  ]
};
