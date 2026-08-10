const CACHE_PREFIX = 'sportkamera-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v5`;

// Nur diese statischen Dateien dürfen in Cache Storage gelangen.
const APP_SHELL = Object.freeze([
  './',
  './index.html',
  './styles.css',
  './media-utils.js',
  './app.js',
  './manifest.webmanifest',
  './icons/favicon-64.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
]);

const ALLOWED_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));
const OFFLINE_DOCUMENT = new URL('./index.html', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Navigationen werden online geladen; offline folgt ausschließlich index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_DOCUMENT))
    );
    return;
  }

  // Blob-URLs und alle nicht ausdrücklich genannten Requests werden nie gecacht.
  if (!ALLOWED_URLS.has(requestUrl.href)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
  );
});
