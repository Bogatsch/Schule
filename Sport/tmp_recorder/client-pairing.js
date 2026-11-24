import { STUDENT_CLIENT_URL } from './client-hosting.js?v=2';
import { authorizationHeader, folderUrl, webDavRequest } from './webdav-protocol.js?v=1';

const HASH_PREFIX = '#webdav=';
const MAX_QR_LENGTH = 1500;

export function createSubmissionAccess({ url, username, password }) {
  const user = username.trim();
  if (!user || user.includes(':') || !password) {
    throw new Error('Gib den WebDAV-Benutzernamen ohne Doppelpunkt und das Passwort für die Abgabe ein.');
  }
  return { url: folderUrl(url), authorization: authorizationHeader(user, password) };
}

export function createClientPairing(access) {
  const url = new URL(STUDENT_CLIENT_URL);
  const encoded = btoa(JSON.stringify([access.url, access.authorization]))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  url.hash = `${HASH_PREFIX}${encoded}`;
  if (url.href.length > MAX_QR_LENGTH) throw new Error('Der WebDAV-Abgabezugang ist zu lang für einen gut lesbaren QR-Code.');
  return url.href;
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
    const payload = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
    if (!Array.isArray(payload) || payload.length !== 2) return null;
    const [folder, authorization] = payload;
    if (typeof folder !== 'string' || typeof authorization !== 'string' || !/^Basic [a-z\d+/]+={0,2}$/i.test(authorization)) return null;
    const credentials = atob(authorization.slice(6));
    const separator = credentials.indexOf(':');
    if (separator <= 0 || separator === credentials.length - 1) return null;
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
