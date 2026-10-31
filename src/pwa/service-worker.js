// Installation and updates only. Requests (including auth and API calls) go
// directly to the network; there is no second cache of private app data or HTML.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
