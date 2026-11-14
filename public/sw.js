// Caches the app shell for weak networks. /api is never cached, so private data stays off the device.
const CACHE = "ky-v2"; // bumping the name clears files left by older deploys
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icon-192.png"]))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api")) return;
  if (e.request.mode === "navigate") {
    // Fresh page when the network answers; on a stalled rural connection, the saved shell after 4 seconds.
    const net = fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return r; });
    const slow = new Promise((ok) => setTimeout(ok, 4000)).then(() => caches.match("/")).then((hit) => hit || net);
    e.respondWith(Promise.race([net, slow]).catch(() => caches.match("/")));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  })));
});
