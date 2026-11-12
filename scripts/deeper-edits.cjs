'use strict';
/* Splices the deeper rules into the page, after the Adventure layer they build on (scripts/build-art.cjs calls this next). */
const fs = require('node:fs'), path = require('node:path');
module.exports = function (html, root) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const once = (from, to) => { if (html.split(from).length !== 2) throw Error('Deeper marker must occur once: ' + from.slice(0, 95)); html = html.replace(from, () => to); };
  const code = read('deeper/runtime.js').replace('__DEEPER_CONTENT__', () => JSON.stringify(require('../deeper/content.cjs')).replace(/</g, '\\u003c'));
  once('/* Two Lanterns :: saved characters.', code + '\n\n/* Two Lanterns :: saved characters.');
  once('/* Two Lanterns :: net.js.', read('deeper/online.js') + '\n\n/* Two Lanterns :: net.js.');
  once('const Net = { V: 2 };', 'const Net = { V: 3 };');      /* a client from before these rules cannot join a room that has them */
  once('function chrome(inner, where, bare) {', read('deeper/interface.js') + '\n\nfunction chrome(inner, where, bare) {');
  once('</head>', '<style id="deeper-css">\n' + read('deeper/theme.css') + '\n</style>\n</head>');
  once('    ${moodLine}${advTwist()}\n', '    ${moodLine}${advTwist()}${deepStatus()}\n');
  once('${whisper}${mirror}${edgeBox}${advTwist()}${advDeal()}', '${whisper}${mirror}${edgeBox}${advTwist()}${deepStatus()}${advDeal()}');
  once('        ${rr}\n      </div></article>`;', '        ${rr}${deepLend(i)}\n      </div></article>`;');
  once('\n\nfunction boot(data) {', "\nObject.assign(ACT, { lend: t => { if (on()) { act({ a: 'lend' }); return; } if (DEEP.lend(S, +t.dataset.i)) { save(); render(false); } } });\n\nfunction boot(data) {");
  return html;
};
