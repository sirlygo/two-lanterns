'use strict';
/* Fixed passages can be recorded once. Selection is a pure function of the shared save. */
module.exports = {
  chapters: [
    'Above you, Ashmere waits for the evening bells. Doors stand open. Suppers cool beside empty chairs. You carry two lights down a stair built for one, because somebody has to find the silence at its source. Nobody volunteered a third lantern.',
    'The last breath of street air leaves your cloaks. Down here the walls carry the marks of hands that worked in darkness so the town above could count its hours. You follow their worn path. Something has begun following yours.',
    'A tremor passes through the stone. For one hopeful instant it might be a bell; then it stops before becoming sound. Somewhere below, the mechanism of Ashmere is still trying to do its work. You keep your lamps level and go on.',
    'At a landing, two sets of old bootprints vanish into a wall. Beside them someone has scratched an arrow pointing down. You follow the arrow. The alternative seems to have been tried rather thoroughly.',
    'The passages bend towards one another. Every draught now comes from below, carrying the smell of cold brass and wet wool. You can no longer pretend these rooms are separate troubles. Something at their centre has drawn all of them tight.',
    'For a moment you hear Ashmere overhead: a latch, a child asking the time, someone setting out an extra cup. Then the stone closes round the sounds. Whatever waits below has the whole town listening with it.',
    'The stair narrows. Beyond the next turning, a chain moves once, link against link, though there is no wind to move it. Your lamps lean towards the sound. They appear to have reached a decision without consulting either of you.',
    'The road ends where every bell-rope of Ashmere would meet if you followed it far enough. Behind you lie all the little bargains that brought you here. Ahead is the one that will matter above ground. You lift both lanterns. The Bellheart has been waiting.'
  ],
  bridges: {
    hurt: 'You stop long enough to bind what can be bound. The cloth comes away darker than it went on. When you move again, the pace is slower, and every small kindness costs someone a little effort.',
    cold: 'At the next fork, you both wait for the other to lead. It is a short silence, and an expensive one. The dark has plenty of room for two people who no longer quite trust each other.',
    warm: 'Without discussing it, you have learned to raise your lamps at different heights: one for the steps, one for what waits ahead. The dark must find this arrangement deeply irritating.',
    fight: 'You listen at the next turning. Nothing follows. For now, that is enough of a victory to walk on with. Neither of you suggests going back to make certain.'
  },
  encounters: {
    collectors: {
      good: 'The crossed pikes are behind you. On the desk, the ledger draws a firm line under your names. Whatever it expected to collect tonight, it will have to manage without it.',
      mixed: 'You clear the checkpoint together, though one of you has paid more dearly for the passage. Behind the arch, the ledger keeps turning pages. There is always another charge to invent.',
      bad: 'You get beyond the hooks by inches. The collectors return to their posts, as patient as debt. You are still going down. It takes a moment to remember why that counts as progress.',
      banter: {
        good: ['“Do you think we are still on their books?”', '“I intend to be a very difficult account.”'],
        mixed: ['“That could have gone more smoothly.”', '“I shall mention it in the complaint we survive to write.”'],
        bad: ['“Next time we take the other road.”', '“Wonderful. Do let me know when one exists.”']
      }
    },
    hounds: {
      good: 'The last silver stitch vanishes into shadow. Both lamps still burn. You wait for a growl that never comes, then remember that silence is what made them frightening in the first place.',
      mixed: 'The pack loses you at the turning. One lamp shakes until its bearer steadies the handle with both hands. You do not discuss how close the dark came to having only one light to follow.',
      bad: 'You stumble clear of the pack. Cloth drags once across the stone behind you, then stills. For several steps you cannot tell whether the breathing you hear belongs to both of you.',
      banter: {
        good: ['“I have decided I am a cat person.”', '“Let us hope the cats down here are less ambitious.”'],
        mixed: ['“Did you see the teeth?”', '“I am trying very hard to see literally anything else.”'],
        bad: ['“Please tell me that was the last of them.”', '“Certainly. Would you like any other comforting inventions?”']
      }
    },
    wickthief: {
      good: 'The third light drifts away. Your own flames straighten, and the warmth returns to your fingers. You had not realised how much of this journey depended on the small comfort of being able to see each other.',
      mixed: 'The reaching shadow slips out of view. You cup your lamps and count two living flames. It is a smaller inventory than you would like, but everything essential is still on it.',
      bad: 'You put stone and distance between yourselves and the reaching hand. Your wicks burn short and angry. It takes several attempts to stop checking that the other light is still there.',
      banter: {
        good: ['“A very rude fellow.”', '“Yes. We should have asked to speak to his haunting supervisor.”'],
        mixed: ['“Was it trying to rob us?”', '“Let us be charitable. Perhaps it was trying to murder us.”'],
        bad: ['“I would like to complain about the hospitality.”', '“Address it to the dark. It seems to be in charge.”']
      }
    }
  },
  banter: {
    good: [
      ['“Look at that. Competence.”', '“Quietly. We do not want to raise expectations.”'],
      ['“We are getting rather good at this.”', '“An alarming thing to discover halfway underground.”']
    ],
    mixed: [
      ['“I had the situation mostly in hand.”', '“Yes. I noticed it biting the hand.”'],
      ['“Shall we call that a success?”', '“Let us get out of earshot before it objects.”']
    ],
    bad: [
      ['“I have had better evenings.”', '“You can tell me about one while we limp.”'],
      ['“A lesson learned.”', '“Good. Next time let us try learning something cheaper.”']
    ]
  }
};
