const SESSION_DURATION_MS = 90 * 60 * 1000;
const SESSION_STORE = 'session';
const VIDEO_STORE = 'videos';
const SESSION_KEY = 'current';
let databasePromise;

function credentialContext({ id, expiresAt, destination }) {
  return new TextEncoder().encode(JSON.stringify([id, expiresAt, destination]));
}

async function sealAccess(session, access) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: credentialContext(session) },
    key,
    new TextEncoder().encode(JSON.stringify({ url: access.url, authorization: access.authorization }))
  );
  return { key, iv, ciphertext };
}

export async function restoreSubmissionAccess(session) {
  if (!session.credential || session.expiresAt <= Date.now()) return null;
  const { key, iv, ciphertext } = session.credential;
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: credentialContext(session) },
    key,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('sportkamera-submission-v1', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(SESSION_STORE);
        request.result.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function transact(action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SESSION_STORE, VIDEO_STORE], 'readwrite');
    const sessions = transaction.objectStore(SESSION_STORE);
    const videos = transaction.objectStore(VIDEO_STORE);
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error ?? new Error('Lokale Speicheroperation abgebrochen.'));
    const request = sessions.get(SESSION_KEY);
    request.onsuccess = () => {
      try {
        let session = request.result;
        const expired = Boolean(session && session.expiresAt <= Date.now());
        if (expired) {
          sessions.delete(SESSION_KEY);
          videos.clear();
          session = null;
        }
        result = action({ session, expired, sessions, videos });
      } catch (error) {
        reject(error);
        transaction.abort();
      }
    };
  });
}

export async function loadSubmission() {
  const saved = await transact(({ session, expired, videos }) => ({
    session: session ?? null,
    expired,
    videoRequest: session ? videos.getAll() : null
  }));
  return { session: saved.session, expired: saved.expired, videos: saved.videoRequest?.result ?? [] };
}

export async function createSubmission(destination, access) {
  const created = { id: crypto.randomUUID(), expiresAt: Date.now() + SESSION_DURATION_MS, names: '', destination };
  created.credential = await sealAccess(created, access);
  return transact(({ session, sessions }) => {
    if (session) return null;
    sessions.add(created, SESSION_KEY);
    return created;
  });
}

export async function updateSubmissionAccess(session, access) {
  const credential = await sealAccess(session, access);
  return updateSubmission(session.id, { credential, pairing: null });
}

export function updateSubmission(id, fields) {
  return transact(({ session, sessions }) => {
    if (session?.id !== id) return null;
    const updated = { ...session, ...fields };
    sessions.put(updated, SESSION_KEY);
    return updated;
  });
}

export function storeVideo(id, video) {
  return transact(({ session, videos }) => {
    if (session?.id !== id) return false;
    videos.put(video);
    return true;
  });
}

export function selectUpload(id, videoId) {
  return transact(({ session, sessions }) => {
    if (session?.id !== id) return 'ended';
    if (session.uploadVideoId && session.uploadVideoId !== videoId) return 'another-video';
    sessions.put({ ...session, uploadVideoId: videoId }, SESSION_KEY);
    return 'selected';
  });
}

export function deleteSubmission(id) {
  return transact(({ session, sessions, videos }) => {
    if (session?.id !== id) return;
    sessions.delete(SESSION_KEY);
    videos.clear();
  });
}
