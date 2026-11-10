'use strict';
const fs = require('node:fs');
const path = require('node:path');
module.exports = function (html, root) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const once = (from, to) => {
    if (html.split(from).length !== 2) throw Error('Story edit needs one marker: ' + from.slice(0, 75));
    html = html.replace(from, () => to);
  };
  const draw = /E\.drawRooms = function \(\) \{[\s\S]*?\n\};/;
  if (!draw.test(html)) throw Error('Cannot find the descent draw');
  html = html.replace(draw, () => read('story/draw-rooms.js').trim());
  const js = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const code = read('story/runtime.js').replace('__DESCENT_STORY__', () => js(require('../story/descent.cjs'))) + '\n' +
    read('story/pages-runtime.js').replace('__PAGE_SCENES__', () => js(require('../story/page-scenes.cjs'))).replace('__ROOM_PAGES__', () => js(require('../story/room-pages.cjs')));
  once('/* Two Lanterns :: saved characters.', code + '\n\n/* Two Lanterns :: saved characters.');
  once('</head>', '<style id="descent-story-css">\n' + read('story/story.css') + '\n</style>\n</head>');
  once('function chrome(inner, where, bare) {', read('story/page-interface.js') + '\n\nfunction chrome(inner, where, bare) {\n  inner = enrichStory(inner);');
  once('    <p class="story">${esc(r.intro)}</p>\n    ${storyBits(r)}',
    '    ${ST.journey(S).map(t => `<p class="journey" data-narrate>${esc(t)}</p>`).join(\'\')}\n' +
    '    <p class="story" data-narrate>${esc(r.intro)}</p>\n' +
    '    ${r.combat ? \'<p class="encounter-note">Wandering encounter · Choose your approach in secret. Fight, outwit, or talk your way through; the dice decide the cost.</p>\' : \'\'}\n    ${storyBits(r)}');
  once('    <div class="resgrid">${cards}</div>\n    ${pg ? pageHtml(pg) : \'\'}',
    '    <div class="resgrid">${cards}</div>\n' +
    '    ${r.combat ? `<p class="encounter-story" data-narrate>${esc(ST.encounter(S, ev.tier))}</p>` : \'\'}\n' +
    '    ${pg ? pageHtml(pg) : \'\'}');
  once("r.finale ? 'Two hands on one Bell' : 'Moves revealed'", "r.finale ? 'Two hands on one Bell' : r.combat ? 'Stand together. Choose for yourself.' : 'Moves revealed'");
  once("r.finale ? 'Both choices are made. The Bell is listening.' : 'Both moves are locked in. Time to see what the dark thinks of them.'", "r.finale ? 'Both choices are made. The Bell is listening.' : r.combat ? 'The encounter turns on these two moves. Roll to discover what it costs to get through.' : 'Both moves are locked in. Time to see what the dark thinks of them.'");
  return html;
};
