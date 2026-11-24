import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STUDENT_CLIENT_URL } from '../tmp_recorder/client-hosting.js';
import {
  checkSubmissionAccess, createClientPairing, readClientPairing, unlockClientPairing, uploadSubmission
} from '../tmp_recorder/client-pairing.js';
import { authorizationHeader, folderUrl } from '../tmp_recorder/webdav-protocol.js';

const login = { url: 'https://dav.example.org/Abgabe Sport', username: 'kurs-sport', password: 'Übung:2026' };
const access = { url: folderUrl(login.url), authorization: authorizationHeader(login.username, login.password) };

test('entschlüsselt den vorhandenen WebDAV-Zugang nur mit dem passenden vierstelligen Zahlencode', async (t) => {
  const random = crypto.getRandomValues.bind(crypto);
  t.mock.method(crypto, 'getRandomValues', (bytes) => {
    if (bytes instanceof Uint16Array) { bytes[0] = 123; return bytes; }
    return random(bytes);
  });
  const { link, pin } = await createClientPairing(access);
  assert.equal(pin, '0123');
  assert.ok(link.startsWith(`${STUDENT_CLIENT_URL}#webdav-pin=`));
  assert.equal(new URL(link).search, '');
  const packet = Buffer.from(new URL(link).hash.slice('#webdav-pin='.length), 'base64url');
  assert.equal(packet.includes(access.url), false);
  assert.equal(packet.includes(access.authorization), false);
  const pairing = readClientPairing(link);
  assert.equal(await unlockClientPairing(pairing, '123'), null);
  assert.equal(await unlockClientPairing(pairing, '1123'), null);
  assert.deepEqual(await unlockClientPairing(pairing, pin), access);
  packet[packet.length - 1] ^= 1;
  const modifiedLink = `${STUDENT_CLIENT_URL}#webdav-pin=${packet.toString('base64url')}`;
  assert.equal(await unlockClientPairing(readClientPairing(modifiedLink), pin), null);
  assert.equal(readClientPairing(link.replace('bogatsch.github.io', 'fremd.example.org')), null);
  assert.equal(readClientPairing(link.replace('#webdav-pin=', '?webdav-pin=')), null);
  assert.equal(readClientPairing(`${STUDENT_CLIENT_URL}#webdav=alter-code`), null);
});

test('verbindet sich und sendet das Originalvideo direkt an denselben WebDAV-Ordner', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(null, { status: options.method === 'PROPFIND' ? 207 : 201 });
  });
  const { link, pin } = await createClientPairing(access);
  const unlocked = await unlockClientPairing(readClientPairing(link), pin);
  const controller = new AbortController();
  await checkSubmissionAccess(unlocked, controller);
  const file = new Blob(['Originalvideo'], { type: 'video/webm;codecs=vp8' });
  const video = { title: 'Übung / 1', id: 'bbc8b2f2-e2c8-401d-8575-1c3515a36988', file };
  await uploadSubmission(unlocked, video, controller.signal);
  await uploadSubmission(unlocked, video, controller.signal);
  assert.deepEqual(requests.map(({ options }) => options.method), ['PROPFIND', 'PUT', 'PUT']);
  assert.equal(requests[0].url, access.url);
  assert.equal(requests[0].options.headers.Depth, '0');
  assert.equal(requests[1].url, `${access.url}%C3%9Cbung%20-%201-${video.id}.webm`);
  assert.equal(requests[2].url, requests[1].url);
  assert.equal(requests[1].options.body, file);
  assert.equal(requests[1].options.headers['Content-Type'], 'video/webm');
  for (const { options } of requests) {
    assert.equal(options.headers.Authorization, access.authorization);
    assert.equal(options.signal, controller.signal);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
  }
});

test('unterstützt einen WebDAV-Zugang, dessen Ordner keine Leseoperationen erlaubt', async (t) => {
  let status = 403;
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status }));
  const controller = new AbortController();
  await checkSubmissionAccess(access, controller);
  const file = new Blob(['Video'], { type: 'video/mp4' });
  await assert.rejects(uploadSubmission(access, { title: 'Übung', id: 'video-1', file }, controller.signal), { status: 403 });
  status = 401;
  await assert.rejects(checkSubmissionAccess(access, controller), { status: 401 });
});
