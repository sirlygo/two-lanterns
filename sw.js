/* Two Lanterns :: offline copy.
   Keeps the last page this device loaded, so the game still opens with no signal (one device; online rooms need the network).
   The network is always tried first, so a new version is picked up the next time the page loads with a connection.
   Only the page itself, the icons and the manifest are kept. Narration clips are left to the browser. */
'use strict';
const CACHE = 'two-lanterns-v1';
const PAGE = new URL('./', self.registration.scope).href;
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('two-lanterns-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || !u.href.startsWith(self.registration.scope)) return;
  const path = u.pathname.slice(new URL(self.registration.scope).pathname.length);
  const page = r.mode === 'navigate' && (path === '' || path === 'index.html');
  const asset = path === 'manifest.webmanifest' || /^pwa\/[\w.-]+\.png$/.test(path);
  if (!page && !asset) return;
  const key = page ? PAGE : u.origin + u.pathname;
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok && res.status === 200) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {})); }
      return res;
    }).catch(() => caches.open(CACHE).then(c => c.match(key)).then(hit => hit || Response.error()))
  );
});
