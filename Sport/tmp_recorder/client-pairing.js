import { STUDENT_CLIENT_URL } from './client-hosting.js?v=2';
import { folderUrl, webDavRequest } from './webdav-protocol.js?v=1';

const HASH_PREFIX = '#webdav-pin=';
const MAX_QR_LENGTH = 1500;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const CIPHERTEXT_OFFSET = SALT_LENGTH + IV_LENGTH;

async function derivePinKey(pin, salt, usage) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, [usage]
  );
}

export async function createClientPairing(access) {
  const random = new Uint16Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= 60_000);
  const pin = String(random[0] % 10_000).padStart(4, '0');
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await derivePinKey(pin, salt, 'encrypt');
  const plaintext = new TextEncoder().encode(JSON.stringify([access.url, access.authorization]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  const payload = new Uint8Array(CIPHERTEXT_OFFSET + ciphertext.length);
  payload.set(salt);
  payload.set(iv, SALT_LENGTH);
  payload.set(ciphertext, CIPHERTEXT_OFFSET);
  const url = new URL(STUDENT_CLIENT_URL);
  const encoded = btoa(String.fromCharCode(...payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  url.hash = `${HASH_PREFIX}${encoded}`;
  if (url.href.length > MAX_QR_LENGTH) throw new Error('Der WebDAV-Abgabezugang ist zu lang für einen gut lesbaren QR-Code.');
  return { link: url.href, pin };
}

export function readClientPairing(value, expectedClient = STUDENT_CLIENT_URL) {
  if (typeof value !== 'string' || value.length > MAX_QR_LENGTH) return null;
  try {
    const url = new URL(value);
    const expected = new URL(expectedClient);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password
      || url.search || !url.hash.startsWith(HASH_PREFIX)) return null;
    const encoded = url.hash.slice(HASH_PREFIX.length);
    if (!/^[a-z\d_-]+$/i.test(encoded)) return null;
    const payload = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    if (payload.length <= CIPHERTEXT_OFFSET + 16) return null;
    const bytes = Uint8Array.from(payload, (character) => character.charCodeAt(0));
    return {
      salt: bytes.subarray(0, SALT_LENGTH),
      iv: bytes.subarray(SALT_LENGTH, CIPHERTEXT_OFFSET),
      ciphertext: bytes.subarray(CIPHERTEXT_OFFSET)
    };
  } catch {
    return null;
  }
}

export async function unlockClientPairing({ salt, iv, ciphertext }, pin) {
  if (!/^[0-9]{4}$/.test(pin)) return null;
  const key = await derivePinKey(pin, salt, 'decrypt');
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const credentials = JSON.parse(new TextDecoder().decode(plaintext));
    if (!Array.isArray(credentials) || credentials.length !== 2) return null;
    const [folder, authorization] = credentials;
    if (typeof folder !== 'string' || typeof authorization !== 'string' || !/^Basic [a-z\d+/]+={0,2}$/i.test(authorization)) return null;
    const login = atob(authorization.slice(6));
    const separator = login.indexOf(':');
    if (separator <= 0 || separator === login.length - 1) return null;
    return { url: folderUrl(folder), authorization };
  } catch {
    return null;
  }
}

export async function checkSubmissionAccess(access, controller) {
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    await webDavRequest(access.url, access.authorization, controller.signal, {
      method: 'PROPFIND', headers: { Depth: '0' }
    }, { writeOnly: true });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Die WebDAV-Verbindungsprüfung hat zu lange gedauert.', { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadSubmission(access, { title, id, file }, signal) {
  const type = file.type.split(';')[0].toLowerCase();
  if (type !== 'video/mp4' && type !== 'video/webm') throw new Error('Die Aufnahme muss MP4 oder WebM sein.');
  const stem = title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 80).replace(/[\uD800-\uDFFF]/gu, '\uFFFD') || 'Sportvideo';
  const filename = `${stem}-${id}.${type === 'video/mp4' ? 'mp4' : 'webm'}`;
  await webDavRequest(new URL(encodeURIComponent(filename), access.url), access.authorization, signal, {
    method: 'PUT', headers: { 'Content-Type': type }, body: file
  });
}
