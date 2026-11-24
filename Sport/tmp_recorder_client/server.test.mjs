import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { createUploadServer } from './server.mjs';
import { readPairingLink } from './pairing.js';

const adminKey = 'test-key-for-the-video-upload-service';
const admin = { Authorization: `Bearer ${adminKey}` };
const appUrl = 'https://video.example.test/';
const davUsername = 'Testlehrkraft';
const davPassword = 'Testpasswort';
const sample = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x01]);

async function listen(server, t) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function setup(t, { handleUpload, ...options } = {}) {
  const stored = [];
  const probes = [];
  const dav = createServer(async (request, response) => {
    try {
      if (request.method === 'PROPFIND') {
        probes.push({ url: request.url, headers: request.headers });
        return response.writeHead(207).end();
      }
      if (handleUpload) return await handleUpload(request, response);
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      stored.push({ url: decodeURIComponent(request.url), headers: request.headers, file: Buffer.concat(chunks) });
      return response.writeHead(201).end();
    } catch {
      response.destroy();
    }
  });
  const davUrl = `${await listen(dav, t)}/privat/videos/`;
  const server = createUploadServer({ appUrl, davUrl, davUsername, davPassword, adminKey, ...options });
  const address = await listen(server, t);
  const api = (pathname, options = {}) => fetch(address + pathname, options);
  async function createPairing() {
    const response = await api('/api/pairings', { method: 'POST', headers: admin });
    assert.equal(response.status, 201);
    return response.json();
  }
  function redeem(pairing) {
    return api('/api/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairing })
    });
  }
  function upload(token, id, { body = sample, type = 'video/webm', name = 'Übung / Lauf' } = {}) {
    return api(`/api/video/${id}`, {
      method: 'PUT', body, headers: { Authorization: `Bearer ${token}`, 'Content-Type': type, 'X-Video-Name': encodeURIComponent(name) }
    });
  }
  return { api, createPairing, redeem, upload, probes, stored };
}

test('liefert den Client und erzeugt QR-Einladungen nur mit Freigabeschlüssel', async (t) => {
  const { api, createPairing, probes } = await setup(t);
  const home = await api('/');
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('cache-control'), 'no-store');
  assert.match(await home.text(), /Abgabe-QR-Code scannen/);
  assert.equal((await api('/vendor/jsqr/jsQR-1.4.0.js')).status, 200);
  assert.equal((await api('/.env')).status, 404);
  assert.equal((await api('/api/pairings', { method: 'POST' })).status, 401);
  assert.equal((await api('/api/pairings', { method: 'POST', headers: { ...admin, Origin: 'https://foreign.example' } })).status, 403);
  assert.equal(probes.length, 0);
  const { pairing, link } = await createPairing();
  assert.equal(readPairingLink(link, appUrl), pairing);
  assert.equal(readPairingLink(link.replace('video.example', 'fremd.example'), appUrl), null);
  assert.equal(readPairingLink(`${appUrl}?token=anderer#${new URL(link).hash.slice(1)}`, appUrl), null);
  assert.equal(link.includes(davPassword) || link.includes('privat') || link.includes(davUsername), false);
  assert.equal(probes[0].url, '/privat/videos/');
  assert.equal(probes[0].headers.depth, '0');
});

test('überträgt ein Video unverändert und wiederholt eine bestätigte Aufnahme ohne zweite Datei', async (t) => {
  const { createPairing, redeem, upload, stored } = await setup(t);
  const { pairing } = await createPairing();
  const redeemed = await redeem(pairing);
  assert.equal(redeemed.status, 201);
  const { token } = await redeemed.json();
  const id = randomUUID();
  const sent = await upload(token, id);
  assert.equal(sent.status, 201);
  const result = await sent.json();
  assert.equal(result.filename, `Übung - Lauf-${id}.webm`);
  assert.equal(stored[0].url, `/privat/videos/${result.filename}`);
  assert.equal(stored[0].headers.authorization, `Basic ${Buffer.from(`${davUsername}:${davPassword}`).toString('base64')}`);
  assert.deepEqual(stored[0].file, sample);
  assert.equal((await upload(token, id)).status, 200);
  assert.equal(stored.length, 1);
});

test('widerruft beim Abmelden genau die Sitzung und mit der Freigabe alle zugehörigen Sitzungen', async (t) => {
  const { api, createPairing, redeem, upload, stored } = await setup(t);
  const { pairing } = await createPairing();
  const first = (await (await redeem(pairing)).json()).token;
  const second = (await (await redeem(pairing)).json()).token;
  assert.notEqual(first, second);
  assert.equal((await api('/api/session', { method: 'DELETE', headers: { Authorization: `Bearer ${first}` } })).status, 204);
  assert.equal((await upload(first, randomUUID())).status, 401);
  assert.equal((await upload(second, randomUUID())).status, 201);
  assert.equal((await api(`/api/pairings/${pairing}`, { method: 'DELETE', headers: admin })).status, 204);
  assert.equal((await upload(second, randomUUID())).status, 401);
  assert.equal((await redeem(pairing)).status, 401);
  assert.equal(stored.length, 1);
});

test('weist abgelaufene Freigaben und ungültige oder zu große Videos ab', async (t) => {
  let instant = 0;
  const { createPairing, redeem, upload, stored } = await setup(t, { now: () => instant, sessionMs: 100, maxVideoBytes: 24 });
  const { pairing } = await createPairing();
  const { token } = await (await redeem(pairing)).json();
  assert.equal((await upload(token, randomUUID(), { type: 'image/jpeg' })).status, 415);
  assert.equal((await upload(token, randomUUID(), { body: Buffer.alloc(25) })).status, 413);
  assert.equal((await upload(token, randomUUID(), { body: Buffer.alloc(12) })).status, 415);
  instant = 100;
  assert.equal((await redeem(pairing)).status, 401);
  assert.equal((await upload(token, randomUUID())).status, 401);
  assert.equal(stored.length, 0);
});

test('bricht beim Abmelden eine laufende Übertragung zum WebDAV-Server ab', { timeout: 3000 }, async (t) => {
  let signalStarted;
  let signalClosed;
  const started = new Promise((resolve) => { signalStarted = resolve; });
  const closed = new Promise((resolve) => { signalClosed = resolve; });
  const { api, createPairing, redeem, upload } = await setup(t, {
    handleUpload(request, response) {
      request.resume();
      response.once('close', signalClosed);
      signalStarted();
    }
  });
  const { pairing } = await createPairing();
  const { token } = await (await redeem(pairing)).json();
  const pending = upload(token, randomUUID());
  await started;
  assert.equal((await api('/api/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 204);
  await closed;
  assert.equal((await pending).status, 502);
  assert.equal((await upload(token, randomUUID())).status, 401);
});
