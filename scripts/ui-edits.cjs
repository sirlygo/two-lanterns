'use strict';
/* Two Lanterns :: Undertoll edition, wording and layout edits to the base page (called by build-art.cjs).
   Each edit is an exact-text replacement that must match exactly once, so the build stops loudly if the base
   page ever drifts, instead of quietly dropping a change. The matching styles are at the end of art/theme.css. */
const edits = [
  {
    why: 'no credit line at the foot of a screen; an online room keeps only its room code',
    from: `const fine = net ? \`Online · room \${esc(S.net.code)} · art drawn in code\` : S.screen === 'lobby' ? 'Online play · art drawn in code' : 'Pass-and-play for two · art drawn in code';`,
    to: `const fine = net ? \`Online · room \${esc(S.net.code)}\` : '';`
  },
  {
    why: 'draw the footer only when it has something in it',
    from: `<footer class="foot">\${reset}<span class="fine">\${fine}</span></footer>`,
    to: `\${reset || fine ? \`<footer class="foot">\${reset}\${fine ? \`<span class="fine">\${fine}</span>\` : ''}</footer>\` : ''}`
  },
  {
    why: 'title: first play button',
    from: 'data-act="start">Light the lanterns</button>',
    to: 'data-act="start">Play on one device</button>'
  },
  {
    why: 'title: second play button',
    from: `data-act="online">\${ico('lantern')}Play online</button>`,
    to: `data-act="online">\${ico('lantern')}Play on two devices</button>`
  },
  {
    why: 'title: how the two ways to play differ',
    from: '<p class="fine center">About twenty-five minutes. On one device, a hand-off screen hides each pick from your partner. Online, each pick stays on your own screen until you are both locked in.</p>',
    to: '<p class="fine center">About twenty-five minutes.<br>On one device, you pass it back and forth and a hand-off screen hides each pick from your partner.<br>On two devices, each pick stays on your own screen until you are both locked in.</p>'
  },
  {
    why: 'sandbox notice: use the new name',
    from: '<b>Play online</b> works there',
    to: '<b>Play on two devices</b> works there'
  },
  {
    why: 'room menu: heading uses the new name',
    from: '<h2 data-focus tabindex="-1">Play online</h2>',
    to: '<h2 data-focus tabindex="-1">Play on two devices</h2>'
  },
  {
    why: 'room menu: centred intro, without repeating the heading',
    from: '<p class="lead">One lantern each, on two devices. One of you hosts a room and gives its four-letter code to the other. Your moves stay on your own screen until you are both locked in.</p>',
    to: '<p class="lead center">One lantern each. One of you hosts a room and gives its four-letter code to the other. Your moves stay on your own screen until you are both locked in.</p>'
  },
  {
    why: 'room menu: drop the matchmaker explanation (a custom broker is still named)',
    from: `<p class="fine center lfine">\${NT.custom() ? 'Rooms are set up through ' + esc(NT.broker()) + '.' : 'Rooms are set up through the free PeerJS matchmaker, which only introduces the two browsers. After that, every move goes straight between you.'}</p>`,
    to: `\${NT.custom() ? '<p class="fine center lfine">Rooms are set up through ' + esc(NT.broker()) + '.</p>' : ''}`
  },
  {
    why: 'host screen: tell the partner the new name',
    from: '<p class="lead center">They open the game, choose <b>Play online</b>, then <b>Join a room</b>, and type it in.</p>',
    to: '<p class="lead center">They open the game, choose <b>Play on two devices</b>, then <b>Join a room</b>, and type it in.</p>'
  }
];

module.exports = function applyUiEdits(html) {
  for (const e of edits) {
    const n = html.split(e.from).length - 1;
    if (n !== 1) throw new Error('UI edit "' + e.why + '" matched ' + n + ' times, expected exactly 1');
    html = html.replace(e.from, () => e.to);
  }
  return html;
};
module.exports.count = edits.length;
