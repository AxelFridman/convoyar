/* Caravana service worker — cache básico de shell + tiles OSM (soporte offline simple). */
const SHELL = "caravana-shell-v1";
const TILES = "caravana-tiles-v1";
const TILE_LIMIT = 250;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", "/index.html", "/manifest.webmanifest", "/icon.svg"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL, TILES].includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
async function putWithLimit(cacheName, req, res) {
  const cache = await caches.open(cacheName);
  await cache.put(req, res);
  const keys = await cache.keys();
  if (keys.length > TILE_LIMIT) await cache.delete(keys[0]);
}
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isTile = /tile\.openstreetmap\.org$/.test(url.hostname);
  if (isTile) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            putWithLimit(TILES, e.request, res.clone());
            return res;
          })
      )
    );
    return;
  }
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
  }
});
