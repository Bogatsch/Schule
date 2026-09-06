import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { GUIDE_TREE } from '../pages/leitbilder/guide-tree.js';
import { flattenVideos } from '../tools/build-leitbilder.mjs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerSource = await readFile(path.join(root, 'sw.js'), 'utf8');
const listeners = new Map();
const workerScope = {
  location: { href: 'https://example.test/Sport/tmp_recorder/sw.js' },
  addEventListener(type, listener) {
    listeners.set(type, listener);
  },
  skipWaiting() {}
};
const context = vm.createContext({
  Blob,
  Headers,
  Request,
  Response,
  URL,
  caches: {
    open: async () => ({ addAll: async () => {}, match: async () => null }),
    keys: async () => []
  },
  fetch: async () => new Response(),
  self: workerScope
});

vm.runInContext(`${workerSource}\nself.testApi = { createVideoResponse, GUIDE_VIDEOS };`, context);

const videoBytes = Uint8Array.from({ length: 100 }, (_, index) => index);

function cachedVideoResponse() {
  return new Response(videoBytes, {
    headers: {
      'Content-Length': String(videoBytes.length),
      'Content-Type': 'video/mp4'
    }
  });
}

async function requestRange(range) {
  const request = new Request('https://example.test/Sport/tmp_recorder/video.mp4', {
    headers: range ? { Range: range } : {}
  });
  return workerScope.testApi.createVideoResponse(request, cachedVideoResponse());
}

test('Leitbild-Videos sind vollständig für den Offline-Cache aufgelistet', () => {
  // Die Liste wird aus dem Ordner Videos erzeugt und darf nicht davon abweichen.
  assert.deepEqual(
    Array.from(workerScope.testApi.GUIDE_VIDEOS),
    flattenVideos(GUIDE_TREE).map((video) => `./${video.src}`)
  );
});

test('vollständige Leitbild-Anfragen bleiben normale 200-Antworten', async () => {
  const response = await requestRange();
  assert.equal(response.status, 200);
  assert.equal((await response.arrayBuffer()).byteLength, 100);
});

test('Leitbild-Cache beantwortet einen begrenzten Byte-Bereich', async () => {
  const response = await requestRange('bytes=10-19');
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('content-range'), 'bytes 10-19/100');
  assert.equal(response.headers.get('content-length'), '10');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [...videoBytes.slice(10, 20)]);
});

test('Leitbild-Cache unterstützt offene und rückwärts gerichtete Byte-Bereiche', async () => {
  const openResponse = await requestRange('bytes=90-');
  assert.equal(openResponse.status, 206);
  assert.equal(openResponse.headers.get('content-range'), 'bytes 90-99/100');
  assert.equal((await openResponse.arrayBuffer()).byteLength, 10);

  const suffixResponse = await requestRange('bytes=-8');
  assert.equal(suffixResponse.status, 206);
  assert.equal(suffixResponse.headers.get('content-range'), 'bytes 92-99/100');
  assert.equal((await suffixResponse.arrayBuffer()).byteLength, 8);
});

test('ungültige Leitbild-Bereiche werden mit 416 abgewiesen', async () => {
  const response = await requestRange('bytes=100-110');
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('content-range'), 'bytes */100');
});

test('Service Worker registriert Install-, Aktivierungs- und Fetch-Handler', () => {
  assert.deepEqual([...listeners.keys()].sort(), ['activate', 'fetch', 'install']);
});
