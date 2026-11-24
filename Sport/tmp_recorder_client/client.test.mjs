import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STUDENT_CLIENT_URL } from '../tmp_recorder/client-hosting.js';
import {
  checkSubmissionAccess, createClientPairing, createSubmissionAccess, readClientPairing, uploadSubmission
} from '../tmp_recorder/client-pairing.js';

const login = { url: 'https://dav.example.org/Abgabe Sport', username: 'kurs-sport', password: 'Übung:2026' };

test('liest den WebDAV-Abgabezugang aus dem Fragment der festen Client-Adresse', () => {
  const access = createSubmissionAccess(login);
  const link = createClientPairing(access);
  assert.ok(link.startsWith(`${STUDENT_CLIENT_URL}#webdav=`));
  assert.equal(new URL(link).search, '');
  assert.deepEqual(readClientPairing(link), access);
  assert.equal(access.url, 'https://dav.example.org/Abgabe%20Sport/');
  assert.equal(Buffer.from(access.authorization.slice(6), 'base64').toString('utf8'), 'kurs-sport:Übung:2026');
  assert.equal(readClientPairing(link.replace('bogatsch.github.io', 'fremd.example.org')), null);
  assert.equal(readClientPairing(link.replace('#webdav=', '?webdav=')), null);
  assert.equal(readClientPairing(`${STUDENT_CLIENT_URL}#abgabe=alte-freigabe`), null);
  const unsafe = createClientPairing({ ...access, url: 'http://dav.example.org/Abgabe/' });
  assert.equal(readClientPairing(unsafe), null);
});

test('verbindet sich und sendet das Originalvideo direkt an denselben WebDAV-Ordner', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(null, { status: options.method === 'PROPFIND' ? 207 : 201 });
  });
  const access = readClientPairing(createClientPairing(createSubmissionAccess(login)));
  const controller = new AbortController();
  await checkSubmissionAccess(access, controller);
  const file = new Blob(['Originalvideo'], { type: 'video/webm;codecs=vp8' });
  const video = { title: 'Übung / 1', id: 'bbc8b2f2-e2c8-401d-8575-1c3515a36988', file };
  await uploadSubmission(access, video, controller.signal);
  await uploadSubmission(access, video, controller.signal);
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
  const access = createSubmissionAccess(login);
  const controller = new AbortController();
  await checkSubmissionAccess(access, controller);
  const file = new Blob(['Video'], { type: 'video/mp4' });
  await assert.rejects(uploadSubmission(access, { title: 'Übung', id: 'video-1', file }, controller.signal), { status: 403 });
  status = 401;
  await assert.rejects(checkSubmissionAccess(access, controller), { status: 401 });
});
