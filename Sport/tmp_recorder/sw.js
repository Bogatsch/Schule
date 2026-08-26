const CACHE_PREFIX = 'sportkamera-shell-';
const GUIDE_CACHE_PREFIX = 'sportkamera-guides-';
const CACHE_VERSION = 'v37';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const GUIDE_CACHE_NAME = `${GUIDE_CACHE_PREFIX}${CACHE_VERSION}`;

// Nur diese statischen Dateien dürfen in Cache Storage gelangen.
const APP_SHELL = Object.freeze([
  './',
  './index.html',
  './styles.css?v=34',
  './annotation.js',
  './annotation.js?v=27',
  './annotation.js?v=29',
  './media-store.js',
  './media-store.js?v=29',
  './media-store.js?v=30',
  './media-store.js?v=31',
  './teacher-auth.js',
  './teacher-auth.js?v=29',
  './teacher-auth.js?v=30',
  './media-utils.js',
  './media-utils.js?v=26',
  './media-utils.js?v=29',
  './video-converter.js',
  './video-converter.js?v=35',
  './zip-utils.js',
  './zip-utils.js?v=33',
  './vendor/mediabunny/mediabunny-1.55.2.min.js?v=1.55.2',
  './app.js?v=35',
  './manifest.webmanifest',
  './pages/leitbilder/index.html',
  './pages/leitbilder/styles.css',
  './pages/leitbilder/app.js',
  './pages/leitbilder/volleyball/index.html',
  './pages/leitbilder/volleyball/angriffsschlag/index.html',
  './pages/leitbilder/volleyball/angriffsschlag/app.js?v=28',
  './pages/leitbilder/volleyball/pritschen-seitlich/index.html',
  './icons/favicon-64.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
]);

const GUIDE_VIDEOS = Object.freeze([
  './Videos/Spielsportarten/Volleyball/Angriffsschlag/Angriffschlag.mp4',
  './Videos/Spielsportarten/Volleyball/Pritschen/Pritschen%20seitlich.mp4'
]);

const ALLOWED_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));
const GUIDE_VIDEO_URLS = new Set(GUIDE_VIDEOS.map((path) => new URL(path, self.location.href).href));
const OFFLINE_DOCUMENT = new URL('./index.html', self.location.href).href;

function rangeNotSatisfiable(size) {
  return new Response(null, {
    status: 416,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes */${size}`
    }
  });
}

async function createVideoResponse(request, cachedResponse) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) {
    return cachedResponse;
  }

  const videoBlob = await cachedResponse.blob();
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2]) || videoBlob.size === 0) {
    return rangeNotSatisfiable(videoBlob.size);
  }

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return rangeNotSatisfiable(videoBlob.size);
    }
    start = Math.max(videoBlob.size - suffixLength, 0);
    end = videoBlob.size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : videoBlob.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      return rangeNotSatisfiable(videoBlob.size);
    }
    end = Math.min(end, videoBlob.size - 1);
  }

  if (start < 0 || start >= videoBlob.size || start > end) {
    return rangeNotSatisfiable(videoBlob.size);
  }

  const partialBlob = videoBlob.slice(start, end + 1, videoBlob.type || 'video/mp4');
  const headers = new Headers(cachedResponse.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(partialBlob.size));
  headers.set('Content-Range', `bytes ${start}-${end}/${videoBlob.size}`);

  return new Response(partialBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(GUIDE_CACHE_NAME).then((cache) => cache.addAll(GUIDE_VIDEOS))
    ])
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => (
            (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            || (name.startsWith(GUIDE_CACHE_PREFIX) && name !== GUIDE_CACHE_NAME)
          ))
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

  // Navigationen werden online geladen; offline folgt die passende gecachte Seite.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => (
        caches.match(request, { ignoreSearch: true })
          .then((cachedResponse) => cachedResponse || caches.match(OFFLINE_DOCUMENT))
      ))
    );
    return;
  }

  if (GUIDE_VIDEO_URLS.has(requestUrl.href)) {
    event.respondWith(
      caches.open(GUIDE_CACHE_NAME)
        .then((cache) => cache.match(requestUrl.href))
        .then((cachedResponse) => (
          cachedResponse ? createVideoResponse(request, cachedResponse) : fetch(request)
        ))
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
