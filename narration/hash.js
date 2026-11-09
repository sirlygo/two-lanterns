/* Narration key: cyrb53 over whitespace-normalised text.
   One source of truth. The generator and the verifier require this file; the build inlines the same text into the in-game narrator,
   so a clip is found only when the passage on screen is word for word the passage that was spoken. */
function narrationKey(text) {
  var s = String(text).replace(/\s+/g, ' ').trim(), h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
if (typeof module !== 'undefined' && module.exports) module.exports = narrationKey;
