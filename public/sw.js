// Minimal service worker — its only job here is to EXIST so Chrome's
// installability criteria are met (manifest + registered SW + HTTPS).
// You can grow this later into real offline caching if you want.

const CACHE_NAME = "billing-app-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler. Having a fetch handler registered is part
// of what makes Chrome treat the site as a valid installable PWA.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});