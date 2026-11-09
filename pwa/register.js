/* Two Lanterns :: keep an offline copy, where the page is served over https. */
(function () {
  'use strict';
  try {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  } catch (e) {}
})();
