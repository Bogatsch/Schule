import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWebDavUpload } from '../webdav-upload.js';

const login = {
  url: 'https://dav.example.org/remote/Sport%20Kamera',
  username: 'Lehrkraft',
  password: 'Beispiel-Passwort-ä'
};
const authorization = `Basic ${Buffer.from(`${login.username}:${login.password}`).toString('base64')}`;

function setup(t) {
  const legacy = new Map();
  const requests = [];
  const items = new Map();
  const environment = { uploadStatus: 201, connectStatus: 207, waitForSettings: null };
  let settings = null;
  const localStorage = {
    get length() { return legacy.size; },
    key: (index) => Array.from(legacy.keys())[index] ?? null,
    getItem: (key) => legacy.get(key) ?? null,
    removeItem: (key) => legacy.delete(key)
  };
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });
  t.after(() => {
    if (previousStorage) {
      Object.defineProperty(globalThis, 'localStorage', previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: String(url), ...options });
    const status = options.method === 'PROPFIND' ? environment.connectStatus : environment.uploadStatus;
    return new Response(null, { status });
  });
  const newSession = () => createWebDavUpload({
    getMedia: async (id) => items.get(id),
    readSettings: async () => {
      await environment.waitForSettings;
      return structuredClone(settings);
    },
    writeSettings: async (next, { expectedId } = {}) => {
      if (expectedId !== undefined && (settings?.id ?? null) !== expectedId) throw new Error('Ziel geändert');
      settings = structuredClone(next);
    },
    onChange: () => {},
    onSettingsChange: () => {}
  });
  function save(id, { kind = 'video', mimeType = 'video/webm' } = {}) {
    const extension = mimeType.endsWith('mp4') ? 'mp4' : 'webm';
    const file = new File([id], `media.${extension}`, { type: mimeType });
    items.set(id, {
      file,
      metadata: { id, kind, mimeType, suggestedDownloadName: `Übung #1.${extension}`, mediaFile: `media.${extension}` }
    });
    return file;
  }
  const uploads = () => requests.filter(({ method }) => method === 'PUT');
  return { newSession, save, uploads, requests, legacy, environment, settings: () => settings };
}

test('sendet nur die ausdrücklich ausgewählten Videos im Originalformat', async (t) => {
  const { newSession, save, uploads, requests } = setup(t);
  const upload = newSession();
  const file = save('aufnahme', { mimeType: 'video/mp4' });
  const secondFile = save('zweite-aufnahme');
  save('foto', { kind: 'photo' });
  save('nicht-ausgewählt');
  assert.deepEqual(await upload.uploadSelected(['aufnahme']), { needsCredentials: true });
  await upload.connect({ ...login, url: 'http://dav.example.org/Sportkamera' });
  await upload.connect({ ...login, url: 'https://user:password@dav.example.org/Sportkamera' });
  assert.equal(requests.length, 0);
  assert.equal(await upload.connect(login), true);
  assert.equal(uploads().length, 0);

  const result = await upload.uploadSelected(['aufnahme', 'foto', 'aufnahme', 'zweite-aufnahme']);
  assert.equal(result.sent, 2);
  assert.equal(uploads().length, 2);
  const [probe, put, secondPut] = requests;
  assert.equal(probe.method, 'PROPFIND');
  assert.equal(probe.headers.Depth, '0');
  assert.equal(probe.url, `${login.url}/`);
  assert.equal(put.url, `${login.url}/%C3%9Cbung%20%231-aufnahme.mp4`);
  assert.equal(put.body, file);
  assert.equal(secondPut.body, secondFile);
  assert.match(secondPut.url, /-zweite-aufnahme\.webm$/);
  assert.equal(put.headers['Content-Type'], 'video/mp4');
  assert.equal(put.headers.Authorization, authorization);
  assert.equal(put.redirect, 'error');
  assert.equal(put.credentials, 'omit');
});

test('verwendet das verschlüsselt gemerkte Passwort nach einem App-Neustart', async (t) => {
  const { newSession, save, requests, settings } = setup(t);
  const first = newSession();
  assert.equal(await first.connect({ ...login, remember: true }), true);
  const { key, iv, ciphertext } = settings().credential;
  assert.equal(key.extractable, false);
  assert.equal(iv.byteLength, 12);
  const encrypted = Buffer.from(ciphertext);
  assert.ok(!encrypted.includes(login.password));
  assert.ok(!encrypted.includes(authorization));
  save('nach-neustart');

  const reopened = newSession();
  await reopened.refresh();
  assert.equal(reopened.getState().remembered, true);
  assert.equal((await reopened.uploadSelected(['nach-neustart'])).sent, 1);
  assert.deepEqual(requests.map(({ method }) => method), ['PROPFIND', 'PUT']);
  assert.equal(requests[1].headers.Authorization, authorization);

  await reopened.forget({ passwordOnly: true });
  assert.equal(settings().url, `${login.url}/`);
  assert.equal(settings().credential, undefined);
  assert.deepEqual(await newSession().uploadSelected(['nach-neustart']), { needsCredentials: true });
  await reopened.forget();
  assert.equal(settings(), null);
});

test('übernimmt ein älteres WebDAV-Ziel und speichert Zugangsdaten nur bei gesetzter Option', async (t) => {
  const { newSession, save, requests, legacy, settings } = setup(t);
  legacy.set('sportkamera-webdav-target-v1', JSON.stringify({ id: 'alt', since: 1, url: `${login.url}/`, username: login.username }));
  legacy.set('sportkamera-webdav-uploaded-v1:alt:video', '1');
  const upload = newSession();
  assert.deepEqual(await upload.uploadSelected(['video']), { needsCredentials: true });
  assert.equal(requests.length, 0);
  assert.equal(await upload.connect({ password: login.password }), true);
  assert.equal(settings().username, login.username);
  assert.equal(settings().credential, undefined);
  assert.equal(legacy.size, 0);
  save('video');
  assert.equal((await upload.uploadSelected(['video'])).sent, 1);
  assert.deepEqual(await newSession().uploadSelected(['video']), { needsCredentials: true });
});

test('fordert bei abgelehnter Anmeldung ein neues Passwort an und behält beim erneuten Upload den Dateinamen', async (t) => {
  const { newSession, save, uploads, environment } = setup(t);
  const upload = newSession();
  environment.connectStatus = 401;
  assert.equal(await upload.connect(login), false);
  assert.match(upload.getState().status, /Zugriff verweigert/);

  environment.connectStatus = 207;
  assert.equal(await upload.connect({ ...login, remember: true }), true);
  save('video');
  environment.uploadStatus = 401;
  assert.equal((await upload.uploadSelected(['video'])).sent, 0);
  assert.deepEqual(await upload.uploadSelected(['video']), { needsCredentials: true });

  environment.uploadStatus = 204;
  assert.equal(await upload.connect({ password: login.password }), true);
  assert.equal((await upload.uploadSelected(['video'])).sent, 1);
  assert.equal(uploads().length, 2);
  assert.equal(uploads()[0].url, uploads()[1].url);
});

test('bricht auch beim Laden der Einstellungen ab, wenn die Galerie geschlossen wird', async (t) => {
  const { newSession, save, uploads, environment } = setup(t);
  const upload = newSession();
  await upload.connect(login);
  save('video');
  let resume;
  environment.waitForSettings = new Promise((resolve) => { resume = resolve; });
  const pending = upload.uploadSelected(['video']);
  upload.cancelUpload();
  resume();
  assert.equal((await pending).cancelled, true);
  assert.equal(uploads().length, 0);
});
