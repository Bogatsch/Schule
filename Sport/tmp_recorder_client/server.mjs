import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { createPairingLink, PAIRING_TOKEN_PATTERN } from './pairing.js';

const SESSION_MS = 60 * 60_000;
const UPLOAD_TIMEOUT_MS = 10 * 60_000;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const CAPACITY = { pairings: 24, sessions: 200, uploads: 50 };
const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/lehrkraft/', ['teacher.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/pairing.js', ['pairing.js', 'text/javascript; charset=utf-8']],
  ['/client.js', ['client.js', 'text/javascript; charset=utf-8']],
  ['/teacher.js', ['teacher.js', 'text/javascript; charset=utf-8']],
  ['/vendor/jsqr/jsQR-1.4.0.js', ['vendor/jsqr/jsQR-1.4.0.js', 'text/javascript; charset=utf-8']],
  ['/shared/media-utils.js', ['../tmp_recorder/media-utils.js', 'text/javascript; charset=utf-8']],
  ['/shared/vendor/qrcode-generator/qrcode-2.0.4.js', ['../tmp_recorder/vendor/qrcode-generator/qrcode-2.0.4.js', 'text/javascript; charset=utf-8']]
]);

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function checkedUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('APP_URL und WEBDAV_URL müssen vollständige Adressen sein.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!(url.protocol === 'https:' || (loopback && url.protocol === 'http:'))
    || url.username || url.password || url.search || url.hash) {
    throw new Error('Verwende HTTPS-Adressen ohne Zugangsdaten, Parameter oder Fragmente. HTTP ist für lokale Tests auf Loopback verfügbar.');
  }
  return url;
}

function noCache(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; media-src 'self' blob:; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'");
}

function reply(response, status, value) {
  if (response.destroyed) return;
  response.statusCode = status;
  if (value === undefined) {
    response.end();
    return;
  }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let length = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > 1024) throw new RequestError(413, 'Die Anfrage ist zu groß.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestError(400, 'Die Anfrage konnte nicht gelesen werden.');
  }
}

function newToken() {
  return randomBytes(32).toString('base64url');
}

function digest(value) {
  return createHash('sha256').update(value).digest();
}

function recordingName(value) {
  try {
    return decodeURIComponent(value ?? '')
      .normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
      .replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '')
      .slice(0, 80).replace(/[\uD800-\uDFFF]/gu, '\uFFFD') || 'Video';
  } catch {
    throw new RequestError(400, 'Der Videoname ist ungültig.');
  }
}

function validateVideoHeader(bytes, type) {
  const valid = type === 'video/webm'
    ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : bytes.subarray(4, 8).toString('ascii') === 'ftyp';
  if (!valid) throw new RequestError(415, 'Die Aufnahme ist kein gültiges Videoformat.');
}

async function* videoBody(request, length, type) {
  let seen = 0;
  let header = Buffer.alloc(0);
  for await (const chunk of request) {
    seen += chunk.length;
    if (seen > length) throw new RequestError(400, 'Die Größe der Aufnahme stimmt nicht.');
    if (header !== null) {
      header = Buffer.concat([header, chunk]);
      if (header.length < 8) continue;
      validateVideoHeader(header, type);
      yield header;
      header = null;
      continue;
    }
    yield chunk;
  }
  if (header !== null || seen !== length) throw new RequestError(400, 'Die Aufnahme ist unvollständig.');
}

export function createUploadServer({ appUrl, davUrl, davUsername, davPassword, adminKey,
  now = Date.now, sessionMs = SESSION_MS, maxVideoBytes = MAX_VIDEO_BYTES }) {
  const publicUrl = checkedUrl(appUrl);
  if (publicUrl.pathname !== '/') throw new Error('APP_URL muss auf das Stammverzeichnis des Clients zeigen.');
  const destination = checkedUrl(davUrl);
  if (!destination.pathname.endsWith('/')) destination.pathname += '/';
  if (!davUsername || davUsername.includes(':') || !davPassword || !adminKey || adminKey.length < 32) {
    throw new Error('WebDAV-Zugangsdaten und ein Schlüssel mit mindestens 32 Zeichen werden benötigt.');
  }
  const administrator = digest(adminKey);
  const authorization = `Basic ${Buffer.from(`${davUsername}:${davPassword}`).toString('base64')}`;
  const pairings = new Map();
  const sessions = new Map();
  let probing = 0;

  function revokeSession(key, session) {
    session.active?.abort();
    sessions.delete(key);
  }

  function removePairing(key) {
    pairings.delete(key);
    for (const [sessionKey, session] of sessions) {
      if (session.pairing === key) revokeSession(sessionKey, session);
    }
  }

  function expirePairings() {
    for (const [key, expires] of pairings) {
      if (expires <= now()) removePairing(key);
    }
  }

  function checkAdmin(token) {
    if (!timingSafeEqual(digest(token), administrator)) {
      throw new RequestError(401, 'Der Schlüssel für die Lehrkraft ist ungültig.');
    }
  }

  async function checkWebDav() {
    if (probing >= 3) throw new RequestError(429, 'Die Verbindung wird gerade geprüft. Versuche es gleich erneut.');
    probing += 1;
    try {
      const response = await fetch(destination, {
        method: 'PROPFIND', headers: { Authorization: authorization, Depth: '0' }, redirect: 'error',
        signal: AbortSignal.timeout(15_000)
      });
      void response.body?.cancel().catch(() => {});
      if (response.status !== 207) throw new Error();
    } catch {
      throw new RequestError(502, 'Der WebDAV-Ordner konnte nicht geprüft werden.');
    } finally {
      probing -= 1;
    }
  }

  async function uploadVideo(request, response, session, id) {
    if (session.active) throw new RequestError(409, 'Warte, bis der laufende Upload abgeschlossen ist.');
    const type = request.headers['content-type']?.split(';')[0].toLowerCase();
    if (type !== 'video/mp4' && type !== 'video/webm') throw new RequestError(415, 'Die Aufnahme muss MP4 oder WebM sein.');
    const length = Number(request.headers['content-length']);
    if (!Number.isSafeInteger(length) || length < 8) throw new RequestError(400, 'Die Aufnahme ist unvollständig.');
    if (length > maxVideoBytes) throw new RequestError(413, 'Das Video ist zu groß.');
    const previous = session.receipts.get(id);
    if (previous) {
      request.resume();
      return reply(response, 200, { filename: previous });
    }
    if (session.receipts.size >= CAPACITY.uploads) throw new RequestError(429, 'Für diese Sitzung wurden zu viele Videos abgegeben.');
    const filename = `${recordingName(request.headers['x-video-name'])}-${id}.${type === 'video/mp4' ? 'mp4' : 'webm'}`;
    const controller = new AbortController();
    session.active = controller;
    const onClose = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', onClose);
    try {
      const upstream = await fetch(new URL(encodeURIComponent(filename), destination), {
        method: 'PUT', redirect: 'error', duplex: 'half', body: Readable.from(videoBody(request, length, type)),
        headers: { Authorization: authorization, 'Content-Type': type, 'Content-Length': String(length) },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(UPLOAD_TIMEOUT_MS)])
      });
      void upstream.body?.cancel().catch(() => {});
      if (!upstream.ok) {
        if (upstream.status === 413) throw new RequestError(413, 'Der WebDAV-Server erlaubt keine so große Datei.');
        if (upstream.status === 507) throw new RequestError(507, 'Im WebDAV-Ordner ist zu wenig Speicher frei.');
        throw new RequestError(502, 'Der WebDAV-Server hat das Video abgelehnt.');
      }
      session.receipts.set(id, filename);
      return reply(response, 201, { filename });
    } catch (error) {
      if (error instanceof RequestError) throw error;
      if (error.cause instanceof RequestError) throw error.cause;
      throw new RequestError(502, 'Die Übertragung zu WebDAV wurde unterbrochen.');
    } finally {
      response.off('close', onClose);
      session.active = null;
    }
  }

  const server = createServer({ requestTimeout: UPLOAD_TIMEOUT_MS }, async (request, response) => {
    noCache(response);
    try {
      const pathname = new URL(request.url, publicUrl).pathname;
      if (request.method === 'GET' && assets.has(pathname)) {
        const [file, type] = assets.get(pathname);
        const bytes = await readFile(new URL(file, import.meta.url));
        response.setHeader('Content-Type', type);
        return response.end(bytes);
      }
      if (pathname === '/lehrkraft' && request.method === 'GET') {
        response.writeHead(308, { Location: '/lehrkraft/' });
        return response.end();
      }
      if (request.headers.origin && request.headers.origin !== publicUrl.origin) throw new RequestError(403, 'Die Anfrage stammt von einer anderen Webseite.');
      expirePairings();
      const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1] ?? '';
      if (pathname === '/api/pairings' && request.method === 'POST') {
        checkAdmin(token);
        if (pairings.size >= CAPACITY.pairings) throw new RequestError(429, 'Es sind zu viele Abgaben geöffnet.');
        await checkWebDav();
        if (pairings.size >= CAPACITY.pairings) throw new RequestError(429, 'Es sind zu viele Abgaben geöffnet.');
        const pairing = newToken();
        const expires = now() + sessionMs;
        pairings.set(pairing, expires);
        return reply(response, 201, { pairing, expires, link: createPairingLink(publicUrl, pairing) });
      }
      const revokeMatch = /^\/api\/pairings\/([A-Za-z0-9_-]+)$/.exec(pathname);
      if (revokeMatch && request.method === 'DELETE') {
        checkAdmin(token);
        removePairing(revokeMatch[1]);
        return reply(response, 204);
      }
      if (pathname === '/api/session' && request.method === 'POST') {
        const { pairing } = (await readJson(request)) ?? {};
        expirePairings();
        if (typeof pairing !== 'string' || !PAIRING_TOKEN_PATTERN.test(pairing) || !pairings.has(pairing)) {
          throw new RequestError(401, 'Dieser QR-Code gilt nicht mehr. Lass dir einen aktuellen Code zeigen.');
        }
        if (sessions.size >= CAPACITY.sessions) throw new RequestError(429, 'Es sind zu viele Geräte verbunden.');
        const key = newToken();
        sessions.set(key, { pairing, active: null, receipts: new Map() });
        return reply(response, 201, { token: key });
      }
      if (pathname === '/api/session' && request.method === 'DELETE') {
        const session = sessions.get(token);
        if (session) revokeSession(token, session);
        return reply(response, 204);
      }
      const videoId = /^\/api\/video\/([^/]+)$/.exec(pathname)?.[1];
      if (videoId && VIDEO_ID.test(videoId) && request.method === 'PUT') {
        const session = sessions.get(token);
        if (!session) throw new RequestError(401, 'Die Abgabe ist abgelaufen. Scanne einen neuen QR-Code.');
        return await uploadVideo(request, response, session, videoId.toLowerCase());
      }
      throw new RequestError(404, 'Diese Adresse ist nicht verfügbar.');
    } catch (error) {
      if (!request.complete) {
        request.resume();
        if (!response.headersSent) response.setHeader('Connection', 'close');
      }
      const handled = error instanceof RequestError;
      reply(response, handled ? error.status : 500, { message: handled ? error.message : 'Die Anfrage konnte nicht verarbeitet werden.' });
    }
  });
  const cleanup = setInterval(expirePairings, 30_000);
  cleanup.unref();
  server.once('close', () => clearInterval(cleanup));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '127.0.0.1';
  const appUrl = process.env.APP_URL || `http://localhost:${port}/`;
  const server = createUploadServer({ appUrl, davUrl: process.env.WEBDAV_URL,
    davUsername: process.env.WEBDAV_USERNAME, davPassword: process.env.WEBDAV_PASSWORD,
    adminKey: process.env.PAIRING_ADMIN_KEY });
  server.listen(port, host, () => console.log(`Videoabgabe ${appUrl}\nQR-Codes für Lehrkräfte ${new URL('lehrkraft/', appUrl)}`));
}
