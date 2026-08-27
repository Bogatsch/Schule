const AUTH_SCHEMA_VERSION = 1;
const AUTH_DIRECTORY = 'sportkamera-teacher-auth-v1';
const AUTH_RECORD_FILE = 'credential.json';
const PASSWORD_RECORD_FILE = 'password.json';
const ES256_ALGORITHM = -7;
const AUTH_TIMEOUT_MS = 60_000;
const ENROLLMENT_AUTHORIZATION_MS = 2 * 60 * 1000;
const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_MIN_LENGTH = 6;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const AUTH_IDB_DATABASE = 'sportkamera-teacher-auth-idb-v1';
const AUTH_IDB_DATABASE_VERSION = 1;
const AUTH_IDB_STORE = 'credential';
const AUTH_IDB_KEY = 'active';
const PASSWORD_IDB_KEY = 'password';

let cachedCredentialRecord;
let cachedPasswordRecord;
let cachedPlatformAvailability;
let preloadPromise = null;
let authDatabasePromise = null;
let cachedAuthStorageBackend = null;
let enrollmentAuthorizationUntil = 0;

export class TeacherAuthError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = 'TeacherAuthError';
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

function getOrigin() {
  return globalThis.location?.origin || '';
}

function getRpId() {
  return globalThis.location?.hostname || '';
}

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function bytesEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array)) {
    return false;
  }
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function decodeBase64(value, { url = false } = {}) {
  let encoded = String(value);
  if (url) {
    encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  }
  encoded += '='.repeat((4 - (encoded.length % 4)) % 4);
  const binary = globalThis.atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isWebAuthnApiSupported() {
  return Boolean(
    globalThis.isSecureContext
      && globalThis.crypto?.subtle
      && globalThis.navigator?.credentials
      && typeof globalThis.navigator.credentials.create === 'function'
      && typeof globalThis.navigator.credentials.get === 'function'
      && typeof globalThis.PublicKeyCredential !== 'undefined'
      && typeof globalThis.AuthenticatorAttestationResponse !== 'undefined'
      && 'getPublicKey' in globalThis.AuthenticatorAttestationResponse.prototype
      && 'getPublicKeyAlgorithm' in globalThis.AuthenticatorAttestationResponse.prototype
      && 'getAuthenticatorData' in globalThis.AuthenticatorAttestationResponse.prototype
  );
}

function hasWritableOpfsBackend() {
  return Boolean(
    globalThis.isSecureContext
      && globalThis.navigator?.storage
      && typeof globalThis.navigator.storage.getDirectory === 'function'
      && typeof globalThis.FileSystemFileHandle?.prototype?.createWritable === 'function'
  );
}

function hasIndexedDbBackend() {
  return Boolean(
    globalThis.isSecureContext
      && globalThis.indexedDB
      && typeof globalThis.indexedDB.open === 'function'
  );
}

function isAuthStorageSupported() {
  return hasWritableOpfsBackend() || hasIndexedDbBackend();
}

function authStorageBackend() {
  if (cachedAuthStorageBackend === 'opfs' && hasWritableOpfsBackend()) {
    return 'opfs';
  }
  if (cachedAuthStorageBackend === 'indexeddb' && hasIndexedDbBackend()) {
    return 'indexeddb';
  }
  if (hasWritableOpfsBackend()) {
    return 'opfs';
  }
  if (hasIndexedDbBackend()) {
    return 'indexeddb';
  }
  throw new TeacherAuthError('storage-unavailable', 'Privater App-Speicher ist nicht verfügbar.');
}

function openAuthDatabase() {
  if (!hasIndexedDbBackend()) {
    return Promise.reject(new TeacherAuthError(
      'storage-unavailable',
      'Privater App-Speicher ist nicht verfügbar.'
    ));
  }
  if (authDatabasePromise) {
    return authDatabasePromise;
  }

  const pending = new Promise((resolve, reject) => {
    let request;
    try {
      request = globalThis.indexedDB.open(AUTH_IDB_DATABASE, AUTH_IDB_DATABASE_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUTH_IDB_STORE)) {
        database.createObjectStore(AUTH_IDB_STORE);
      }
    };
    request.onerror = () => reject(request.error || new Error('IndexedDB konnte nicht geöffnet werden.'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        authDatabasePromise = null;
      };
      resolve(database);
    };
  });
  authDatabasePromise = pending.catch((error) => {
    authDatabasePromise = null;
    throw error;
  });
  return authDatabasePromise;
}

function idbTransactionCompletion(transaction) {
  return new Promise((resolve, reject) => {
    let requestError = null;
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error
        || requestError
        || new DOMException('IndexedDB-Transaktion abgebrochen.', 'AbortError')
    );
    transaction.onerror = (event) => {
      requestError = event.target?.error || transaction.error || requestError;
    };
  });
}

function idbRequestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB-Anfrage fehlgeschlagen.'));
  });
}

async function readCredentialRecordFromIndexedDb() {
  const database = await openAuthDatabase();
  const transaction = database.transaction(AUTH_IDB_STORE, 'readonly');
  const completion = idbTransactionCompletion(transaction);
  const request = transaction.objectStore(AUTH_IDB_STORE).get(AUTH_IDB_KEY);
  const [record] = await Promise.all([idbRequestResult(request), completion]);
  return normalizeCredentialRecord(record);
}

async function writeCredentialRecordToIndexedDb(record) {
  const database = await openAuthDatabase();
  const transaction = database.transaction(AUTH_IDB_STORE, 'readwrite');
  const completion = idbTransactionCompletion(transaction);
  transaction.objectStore(AUTH_IDB_STORE).put(record, AUTH_IDB_KEY);
  await completion;
}

async function deleteCredentialRecordFromIndexedDb() {
  const database = await openAuthDatabase();
  const transaction = database.transaction(AUTH_IDB_STORE, 'readwrite');
  const completion = idbTransactionCompletion(transaction);
  const store = transaction.objectStore(AUTH_IDB_STORE);
  const existingRequest = store.get(AUTH_IDB_KEY);
  const existingResult = idbRequestResult(existingRequest);
  store.delete(AUTH_IDB_KEY);
  const [existing] = await Promise.all([existingResult, completion]);
  return existing !== undefined;
}

function normalizePasswordRecord(value) {
  if (
    !value
      || typeof value !== 'object'
      || value.schemaVersion !== AUTH_SCHEMA_VERSION
      || typeof value.salt !== 'string'
      || !BASE64URL_PATTERN.test(value.salt)
      || typeof value.derivedKey !== 'string'
      || !BASE64URL_PATTERN.test(value.derivedKey)
      || value.iterations !== PASSWORD_ITERATIONS
      || typeof value.createdAt !== 'string'
      || Number.isNaN(Date.parse(value.createdAt))
  ) {
    return null;
  }
  try {
    if (decodeBase64(value.salt, { url: true }).length !== 16) {
      return null;
    }
    if (decodeBase64(value.derivedKey, { url: true }).length !== 32) {
      return null;
    }
  } catch {
    return null;
  }
  return {
    schemaVersion: AUTH_SCHEMA_VERSION,
    salt: value.salt,
    derivedKey: value.derivedKey,
    iterations: PASSWORD_ITERATIONS,
    createdAt: value.createdAt
  };
}

async function readPasswordRecordFromIndexedDb() {
  const database = await openAuthDatabase();
  const transaction = database.transaction(AUTH_IDB_STORE, 'readonly');
  const completion = idbTransactionCompletion(transaction);
  const request = transaction.objectStore(AUTH_IDB_STORE).get(PASSWORD_IDB_KEY);
  const [record] = await Promise.all([idbRequestResult(request), completion]);
  return normalizePasswordRecord(record);
}

async function writePasswordRecordToIndexedDb(record) {
  const database = await openAuthDatabase();
  const transaction = database.transaction(AUTH_IDB_STORE, 'readwrite');
  const completion = idbTransactionCompletion(transaction);
  transaction.objectStore(AUTH_IDB_STORE).put(record, PASSWORD_IDB_KEY);
  await completion;
}

async function deletePasswordRecordFromIndexedDb() {
  const database = await openAuthDatabase();
  const transaction = database.transaction(AUTH_IDB_STORE, 'readwrite');
  const completion = idbTransactionCompletion(transaction);
  const store = transaction.objectStore(AUTH_IDB_STORE);
  const existingRequest = store.get(PASSWORD_IDB_KEY);
  const existingResult = idbRequestResult(existingRequest);
  store.delete(PASSWORD_IDB_KEY);
  const [existing] = await Promise.all([existingResult, completion]);
  return existing !== undefined;
}

async function detectPlatformAuthenticator() {
  if (!isWebAuthnApiSupported()) {
    return false;
  }
  const check = globalThis.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
  if (typeof check !== 'function') {
    return false;
  }
  try {
    return Boolean(await check.call(globalThis.PublicKeyCredential));
  } catch {
    return false;
  }
}

function normalizeCredentialRecord(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== AUTH_SCHEMA_VERSION) {
    return null;
  }
  if (
    typeof value.credentialId !== 'string'
      || !BASE64URL_PATTERN.test(value.credentialId)
      || typeof value.publicKeySpki !== 'string'
      || !BASE64URL_PATTERN.test(value.publicKeySpki)
      || typeof value.userId !== 'string'
      || !BASE64URL_PATTERN.test(value.userId)
      || value.algorithm !== ES256_ALGORITHM
      || value.rpId !== getRpId()
      || value.origin !== getOrigin()
      || !Number.isInteger(value.signCount)
      || value.signCount < 0
  ) {
    return null;
  }
  return {
    schemaVersion: AUTH_SCHEMA_VERSION,
    credentialId: value.credentialId,
    publicKeySpki: value.publicKeySpki,
    userId: value.userId,
    algorithm: ES256_ALGORITHM,
    rpId: value.rpId,
    origin: value.origin,
    signCount: value.signCount,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    lastUsedAt: typeof value.lastUsedAt === 'string' ? value.lastUsedAt : null
  };
}

async function getAuthDirectory({ create }) {
  if (!hasWritableOpfsBackend()) {
    throw new TeacherAuthError('storage-unavailable', 'Privater App-Speicher ist nicht verfügbar.');
  }
  const root = await globalThis.navigator.storage.getDirectory();
  return root.getDirectoryHandle(AUTH_DIRECTORY, { create });
}

async function readCredentialRecordFromOpfs() {
  try {
    const directory = await getAuthDirectory({ create: false });
    const handle = await directory.getFileHandle(AUTH_RECORD_FILE);
    const file = await handle.getFile();
    if (!file.size || file.size > 16 * 1024) {
      return null;
    }
    return normalizeCredentialRecord(JSON.parse(await file.text()));
  } catch (error) {
    if (error?.name === 'NotFoundError' || error?.code === 'storage-unavailable') {
      return null;
    }
    return null;
  }
}

async function writeCredentialRecordToOpfs(normalized) {
  const directory = await getAuthDirectory({ create: true });
  const handle = await directory.getFileHandle(AUTH_RECORD_FILE, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(JSON.stringify(normalized));
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // Das ursprüngliche Schreibproblem wird weitergereicht.
    }
    throw new TeacherAuthError('storage-write-failed', 'Die Geräteanmeldung konnte nicht gespeichert werden.', error);
  }
}

async function deleteCredentialRecordFromOpfs() {
  try {
    const directory = await getAuthDirectory({ create: false });
    await directory.removeEntry(AUTH_RECORD_FILE);
    return true;
  } catch (error) {
    if (error?.name === 'NotFoundError') {
      return false;
    }
    throw error;
  }
}

async function readPasswordRecordFromOpfs() {
  try {
    const directory = await getAuthDirectory({ create: false });
    const handle = await directory.getFileHandle(PASSWORD_RECORD_FILE);
    const file = await handle.getFile();
    if (!file.size || file.size > 8 * 1024) {
      return null;
    }
    return normalizePasswordRecord(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}

async function writePasswordRecordToOpfs(record) {
  const directory = await getAuthDirectory({ create: true });
  const handle = await directory.getFileHandle(PASSWORD_RECORD_FILE, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(JSON.stringify(record));
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // Das ursprüngliche Schreibproblem wird weitergereicht.
    }
    throw new TeacherAuthError('storage-write-failed', 'Das Passwort konnte nicht gespeichert werden.', error);
  }
}

async function deletePasswordRecordFromOpfs() {
  try {
    const directory = await getAuthDirectory({ create: false });
    await directory.removeEntry(PASSWORD_RECORD_FILE);
    return true;
  } catch (error) {
    if (error?.name === 'NotFoundError') {
      return false;
    }
    throw error;
  }
}

function credentialRecordRecency(record) {
  if (!record) {
    return -1;
  }
  const createdAt = Date.parse(record.createdAt || '');
  const lastUsedAt = Date.parse(record.lastUsedAt || '');
  return Math.max(
    Number.isFinite(createdAt) ? createdAt : 0,
    Number.isFinite(lastUsedAt) ? lastUsedAt : 0
  );
}

async function readCredentialRecord() {
  if (!isAuthStorageSupported()) {
    cachedAuthStorageBackend = null;
    return null;
  }

  const [opfsRecord, indexedDbRecord] = await Promise.all([
    hasWritableOpfsBackend() ? readCredentialRecordFromOpfs() : Promise.resolve(null),
    hasIndexedDbBackend()
      ? readCredentialRecordFromIndexedDb().catch(() => null)
      : Promise.resolve(null)
  ]);
  const preferIndexedDb = Boolean(
    indexedDbRecord
      && (!opfsRecord || credentialRecordRecency(indexedDbRecord) > credentialRecordRecency(opfsRecord))
  );

  if (preferIndexedDb && hasWritableOpfsBackend()) {
    try {
      await writeCredentialRecordToOpfs(indexedDbRecord);
      cachedAuthStorageBackend = 'opfs';
      try {
        await deleteCredentialRecordFromIndexedDb();
      } catch {
        // Der migrierte OPFS-Datensatz bleibt maßgeblich; eine IDB-Kopie ist harmlos.
      }
      return indexedDbRecord;
    } catch {
      cachedAuthStorageBackend = 'indexeddb';
      return indexedDbRecord;
    }
  }

  if (opfsRecord) {
    cachedAuthStorageBackend = 'opfs';
    if (indexedDbRecord?.credentialId === opfsRecord.credentialId) {
      try {
        await deleteCredentialRecordFromIndexedDb();
      } catch {
        // Eine identische alte IDB-Kopie beeinträchtigt die OPFS-Anmeldung nicht.
      }
    }
    return opfsRecord;
  }
  if (indexedDbRecord) {
    cachedAuthStorageBackend = 'indexeddb';
    return indexedDbRecord;
  }

  cachedAuthStorageBackend = hasWritableOpfsBackend() ? 'opfs' : 'indexeddb';
  return null;
}

async function readPasswordRecord() {
  if (!isAuthStorageSupported()) {
    return null;
  }

  const [opfsRecord, indexedDbRecord] = await Promise.all([
    hasWritableOpfsBackend() ? readPasswordRecordFromOpfs() : Promise.resolve(null),
    hasIndexedDbBackend()
      ? readPasswordRecordFromIndexedDb().catch(() => null)
      : Promise.resolve(null)
  ]);
  const indexedDbIsNewer = Boolean(
    indexedDbRecord
      && (!opfsRecord || Date.parse(indexedDbRecord.createdAt) > Date.parse(opfsRecord.createdAt))
  );

  if (indexedDbIsNewer && hasWritableOpfsBackend()) {
    try {
      await writePasswordRecordToOpfs(indexedDbRecord);
      cachedAuthStorageBackend = 'opfs';
      try {
        await deletePasswordRecordFromIndexedDb();
      } catch {
        // Die gültige OPFS-Kopie bleibt maßgeblich.
      }
      return indexedDbRecord;
    } catch {
      cachedAuthStorageBackend = 'indexeddb';
      return indexedDbRecord;
    }
  }

  if (opfsRecord) {
    cachedAuthStorageBackend = 'opfs';
    if (indexedDbRecord?.derivedKey === opfsRecord.derivedKey) {
      try {
        await deletePasswordRecordFromIndexedDb();
      } catch {
        // Eine identische alte Kopie beeinträchtigt die Anmeldung nicht.
      }
    }
    return opfsRecord;
  }
  if (indexedDbRecord) {
    cachedAuthStorageBackend = 'indexeddb';
    return indexedDbRecord;
  }
  return null;
}

async function writePasswordRecord(record) {
  const normalized = normalizePasswordRecord(record);
  if (!normalized) {
    throw new TeacherAuthError('invalid-password-record', 'Die lokale Passwortinformation ist ungültig.');
  }
  try {
    const backend = authStorageBackend();
    if (backend === 'indexeddb') {
      await writePasswordRecordToIndexedDb(normalized);
    } else {
      await writePasswordRecordToOpfs(normalized);
    }
    cachedAuthStorageBackend = backend;
    cachedPasswordRecord = normalized;
  } catch (error) {
    if (error instanceof TeacherAuthError && error.code === 'storage-write-failed') {
      throw error;
    }
    throw new TeacherAuthError('storage-write-failed', 'Das Passwort konnte nicht gespeichert werden.', error);
  }
}

async function writeCredentialRecord(record) {
  const normalized = normalizeCredentialRecord(record);
  if (!normalized) {
    throw new TeacherAuthError('invalid-record', 'Die lokale Anmeldeinformation ist ungültig.');
  }
  try {
    const backend = authStorageBackend();
    if (backend === 'indexeddb') {
      await writeCredentialRecordToIndexedDb(normalized);
    } else {
      await writeCredentialRecordToOpfs(normalized);
    }
    cachedAuthStorageBackend = backend;
    cachedCredentialRecord = normalized;
  } catch (error) {
    if (error instanceof TeacherAuthError && error.code === 'storage-write-failed') {
      throw error;
    }
    throw new TeacherAuthError('storage-write-failed', 'Die Geräteanmeldung konnte nicht gespeichert werden.', error);
  }
}

/**
 * Lädt Credential-Metadaten und die Plattformfähigkeit vorab. Diese Funktion beim
 * App-Start abwarten, damit create()/get() später ohne vorgeschaltetes await direkt
 * aus dem jeweiligen Klick-Handler aufgerufen werden kann (Safari User-Gesture).
 */
export async function preloadTeacherAuth() {
  if (preloadPromise) {
    return preloadPromise;
  }
  preloadPromise = Promise.all([
    readCredentialRecord(),
    readPasswordRecord(),
    detectPlatformAuthenticator()
  ])
    .then(([credentialRecord, passwordRecord, platformAvailable]) => {
      cachedCredentialRecord = credentialRecord;
      cachedPasswordRecord = passwordRecord;
      cachedPlatformAvailability = platformAvailable;
      return getTeacherAuthState();
    });
  return preloadPromise;
}

export function getTeacherAuthState() {
  return {
    ready: cachedCredentialRecord !== undefined
      && cachedPasswordRecord !== undefined
      && cachedPlatformAvailability !== undefined,
    platformAvailable: cachedPlatformAvailability === true,
    platformEnrolled: Boolean(cachedCredentialRecord && cachedPasswordRecord),
    passwordConfigured: Boolean(cachedPasswordRecord),
    passwordAvailable: Boolean(globalThis.crypto?.subtle),
    storageAvailable: isAuthStorageSupported()
  };
}

function requireReadyPlatformAuth({ requireRecord = false } = {}) {
  if (
    cachedCredentialRecord === undefined
      || cachedPasswordRecord === undefined
      || cachedPlatformAvailability === undefined
  ) {
    throw new TeacherAuthError('not-ready', 'Die Geräteanmeldung wird noch vorbereitet.');
  }
  if (!cachedPlatformAvailability || !isWebAuthnApiSupported()) {
    throw new TeacherAuthError('platform-unavailable', 'Auf diesem Gerät ist keine Plattformanmeldung verfügbar.');
  }
  if (!isAuthStorageSupported()) {
    throw new TeacherAuthError('storage-unavailable', 'Privater App-Speicher ist nicht verfügbar.');
  }
  if (requireRecord && (!cachedCredentialRecord || !cachedPasswordRecord)) {
    throw new TeacherAuthError('not-enrolled', 'Für dieses App-Profil ist noch keine Geräteanmeldung eingerichtet.');
  }
}

function parseClientData(buffer, expectedType, expectedChallenge) {
  let clientData;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    clientData = JSON.parse(text);
  } catch (error) {
    throw new TeacherAuthError('invalid-client-data', 'Die WebAuthn-Antwort enthält ungültige Clientdaten.', error);
  }
  if (!clientData || typeof clientData !== 'object' || Array.isArray(clientData)) {
    throw new TeacherAuthError('invalid-client-data', 'Die WebAuthn-Antwort enthält ungültige Clientdaten.');
  }
  const hasCrossOrigin = Object.prototype.hasOwnProperty.call(clientData, 'crossOrigin');
  const hasTopOrigin = Object.prototype.hasOwnProperty.call(clientData, 'topOrigin');
  if (
    clientData.type !== expectedType
      || clientData.challenge !== base64UrlEncode(expectedChallenge)
      || clientData.origin !== getOrigin()
      || (hasCrossOrigin && clientData.crossOrigin !== false)
      || (hasTopOrigin && clientData.topOrigin !== getOrigin())
      || (hasTopOrigin && clientData.crossOrigin !== true)
  ) {
    throw new TeacherAuthError('client-data-mismatch', 'Challenge oder Herkunft der Geräteanmeldung stimmt nicht.');
  }
  return clientData;
}

async function inspectAuthenticatorData(buffer, { requireAttestedCredential = false } = {}) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 37) {
    throw new TeacherAuthError('invalid-authenticator-data', 'Die Authenticator-Daten sind zu kurz.');
  }

  const expectedRpHash = new Uint8Array(
    await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(getRpId()))
  );
  if (!bytesEqual(bytes.slice(0, 32), expectedRpHash)) {
    throw new TeacherAuthError('rp-mismatch', 'Die Geräteanmeldung gehört nicht zu dieser Website.');
  }

  const flags = bytes[32];
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0) {
    throw new TeacherAuthError('verification-required', 'Die Person wurde vom Gerät nicht verifiziert.');
  }
  if ((flags & 0x10) !== 0 && (flags & 0x08) === 0) {
    throw new TeacherAuthError('invalid-authenticator-data', 'Der Backup-Status des Credentials ist ungültig.');
  }
  if (requireAttestedCredential && (flags & 0x40) === 0) {
    throw new TeacherAuthError('invalid-registration', 'Der Registrierung fehlt der Credential-Datensatz.');
  }

  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signCount = dataView.getUint32(33, false);
  let attestedCredentialId = null;
  if (requireAttestedCredential) {
    const credentialIdLengthOffset = 37 + 16;
    const credentialIdOffset = credentialIdLengthOffset + 2;
    if (bytes.length <= credentialIdOffset) {
      throw new TeacherAuthError('invalid-registration', 'Der Credential-Datensatz ist unvollständig.');
    }
    const credentialIdLength = dataView.getUint16(credentialIdLengthOffset, false);
    const credentialIdEnd = credentialIdOffset + credentialIdLength;
    if (!credentialIdLength || credentialIdEnd >= bytes.length) {
      throw new TeacherAuthError('invalid-registration', 'Die Credential-ID der Registrierung ist ungültig.');
    }
    attestedCredentialId = bytes.slice(credentialIdOffset, credentialIdEnd);
  }
  return { bytes, flags, signCount, attestedCredentialId };
}

function readDerLength(bytes, state) {
  if (state.offset >= bytes.length) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur ist unvollständig.');
  }
  const first = bytes[state.offset];
  state.offset += 1;
  if ((first & 0x80) === 0) {
    return first;
  }
  const byteCount = first & 0x7f;
  if (!byteCount || byteCount > 2 || state.offset + byteCount > bytes.length) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signaturlänge ist ungültig.');
  }
  let length = 0;
  for (let index = 0; index < byteCount; index += 1) {
    length = (length << 8) | bytes[state.offset];
    state.offset += 1;
  }
  return length;
}

function readDerInteger(bytes, state, outputSize) {
  if (bytes[state.offset] !== 0x02) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur enthält keinen gültigen Integer.');
  }
  state.offset += 1;
  const length = readDerLength(bytes, state);
  if (!length || state.offset + length > bytes.length) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur ist unvollständig.');
  }
  let integer = bytes.slice(state.offset, state.offset + length);
  state.offset += length;
  if ((integer[0] & 0x80) !== 0) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur enthält einen negativen Integer.');
  }
  while (integer.length > 1 && integer[0] === 0) {
    integer = integer.slice(1);
  }
  if (integer.length > outputSize) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur überschreitet die erwartete Größe.');
  }
  const output = new Uint8Array(outputSize);
  output.set(integer, outputSize - integer.length);
  return output;
}

// WebAuthn liefert ES256 als ASN.1 DER; Web Crypto erwartet die feste r||s-Darstellung.
function derEs256ToP1363(signature) {
  const bytes = new Uint8Array(signature);
  const state = { offset: 0 };
  if (bytes[state.offset] !== 0x30) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur ist nicht DER-codiert.');
  }
  state.offset += 1;
  const sequenceLength = readDerLength(bytes, state);
  if (state.offset + sequenceLength !== bytes.length) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur hat eine ungültige Sequenzlänge.');
  }
  const r = readDerInteger(bytes, state, 32);
  const s = readDerInteger(bytes, state, 32);
  if (state.offset !== bytes.length) {
    throw new TeacherAuthError('invalid-signature', 'Die WebAuthn-Signatur enthält unerwartete Daten.');
  }
  const output = new Uint8Array(64);
  output.set(r, 0);
  output.set(s, 32);
  return output;
}

function concatenate(left, right) {
  const first = left instanceof Uint8Array ? left : new Uint8Array(left);
  const second = right instanceof Uint8Array ? right : new Uint8Array(right);
  const result = new Uint8Array(first.length + second.length);
  result.set(first, 0);
  result.set(second, first.length);
  return result;
}

/**
 * Richtet nach einer bereits erfolgreichen Passwortprüfung die Plattformanmeldung ein.
 * Direkt aus einem eigenen Klick-Handler aufrufen, ohne vorher in diesem Handler zu awaiten.
 */
export async function enrollPlatformCredential() {
  if (!enrollmentAuthorizationUntil || Date.now() > enrollmentAuthorizationUntil) {
    enrollmentAuthorizationUntil = 0;
    throw new TeacherAuthError(
      'authorization-required',
      'Vor der Einrichtung ist eine neue erfolgreiche Passwortprüfung erforderlich.'
    );
  }
  requireReadyPlatformAuth();
  const challenge = randomBytes();
  const userId = randomBytes();
  const previousCredential = cachedCredentialRecord
    ? [{
        type: 'public-key',
        id: decodeBase64(cachedCredentialRecord.credentialId, { url: true }),
        transports: ['internal']
      }]
    : [];

  let pendingCredential;
  try {
    pendingCredential = globalThis.navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: getRpId(), name: 'Sportkamera' },
        user: { id: userId, name: 'sportkamera@lokal', displayName: 'Sportkamera-Zugang' },
        pubKeyCredParams: [{ type: 'public-key', alg: ES256_ALGORITHM }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required'
        },
        excludeCredentials: previousCredential,
        timeout: AUTH_TIMEOUT_MS,
        attestation: 'none'
      }
    });
  } catch (error) {
    throw new TeacherAuthError('registration-start-failed', 'Die Geräteanmeldung konnte nicht gestartet werden.', error);
  }

  let credential;
  try {
    credential = await pendingCredential;
  } catch (error) {
    throw new TeacherAuthError(
      error?.name === 'NotAllowedError' ? 'cancelled' : 'registration-failed',
      error?.name === 'NotAllowedError'
        ? 'Die Geräteanmeldung wurde abgebrochen.'
        : 'Die Geräteanmeldung ist fehlgeschlagen.',
      error
    );
  }
  enrollmentAuthorizationUntil = 0;
  if (!credential || credential.type !== 'public-key') {
    throw new TeacherAuthError('invalid-registration', 'Der Browser lieferte kein gültiges Credential.');
  }
  if (credential.authenticatorAttachment && credential.authenticatorAttachment !== 'platform') {
    throw new TeacherAuthError('wrong-authenticator', 'Es wurde kein Geräte-Authenticator verwendet.');
  }

  const response = credential.response;
  parseClientData(response.clientDataJSON, 'webauthn.create', challenge);
  const authenticator = await inspectAuthenticatorData(
    response.getAuthenticatorData(),
    { requireAttestedCredential: true }
  );
  if (!bytesEqual(new Uint8Array(credential.rawId), authenticator.attestedCredentialId)) {
    throw new TeacherAuthError(
      'credential-mismatch',
      'Die Credential-ID stimmt nicht mit den signierten Authenticator-Daten überein.'
    );
  }
  const publicKey = response.getPublicKey();
  const algorithm = response.getPublicKeyAlgorithm();
  if (!publicKey || algorithm !== ES256_ALGORITHM) {
    throw new TeacherAuthError('unsupported-key', 'Der Browser lieferte keinen unterstützten ES256-Schlüssel.');
  }

  const now = new Date().toISOString();
  const record = {
    schemaVersion: AUTH_SCHEMA_VERSION,
    credentialId: base64UrlEncode(credential.rawId),
    publicKeySpki: base64UrlEncode(publicKey),
    userId: base64UrlEncode(userId),
    algorithm,
    rpId: getRpId(),
    origin: getOrigin(),
    signCount: authenticator.signCount,
    createdAt: now,
    lastUsedAt: null
  };
  await writeCredentialRecord(record);
  return { method: 'platform', enrolled: true };
}

/**
 * Prüft Challenge, Origin, RP-ID, UP/UV-Flags und die ES256-Signatur vollständig lokal.
 * Direkt aus dem Login-Klick aufrufen; preloadTeacherAuth() muss vorher abgeschlossen sein.
 */
export async function authenticateWithPlatform() {
  requireReadyPlatformAuth({ requireRecord: true });
  const record = cachedCredentialRecord;
  const challenge = randomBytes();
  const credentialId = decodeBase64(record.credentialId, { url: true });

  let pendingAssertion;
  try {
    pendingAssertion = globalThis.navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: record.rpId,
        allowCredentials: [{ type: 'public-key', id: credentialId, transports: ['internal'] }],
        userVerification: 'required',
        timeout: AUTH_TIMEOUT_MS
      }
    });
  } catch (error) {
    throw new TeacherAuthError('authentication-start-failed', 'Die Geräteprüfung konnte nicht gestartet werden.', error);
  }

  let credential;
  try {
    credential = await pendingAssertion;
  } catch (error) {
    throw new TeacherAuthError(
      error?.name === 'NotAllowedError' ? 'cancelled' : 'authentication-failed',
      error?.name === 'NotAllowedError'
        ? 'Die Geräteprüfung wurde abgebrochen.'
        : 'Die Geräteprüfung ist fehlgeschlagen.',
      error
    );
  }
  if (!credential || credential.type !== 'public-key') {
    throw new TeacherAuthError('invalid-assertion', 'Der Browser lieferte keine gültige Bestätigung.');
  }
  if (credential.authenticatorAttachment && credential.authenticatorAttachment !== 'platform') {
    throw new TeacherAuthError('wrong-authenticator', 'Es wurde kein Geräte-Authenticator verwendet.');
  }
  if (!bytesEqual(new Uint8Array(credential.rawId), credentialId)) {
    throw new TeacherAuthError('credential-mismatch', 'Die Bestätigung gehört nicht zur eingerichteten Anmeldung.');
  }

  const response = credential.response;
  parseClientData(response.clientDataJSON, 'webauthn.get', challenge);
  const authenticator = await inspectAuthenticatorData(response.authenticatorData);
  if (response.userHandle) {
    const expectedUserId = decodeBase64(record.userId, { url: true });
    if (!bytesEqual(new Uint8Array(response.userHandle), expectedUserId)) {
      throw new TeacherAuthError('user-mismatch', 'Die Bestätigung gehört nicht zum eingerichteten Zugang.');
    }
  }
  if (
    record.signCount !== 0
      && authenticator.signCount !== 0
      && authenticator.signCount <= record.signCount
  ) {
    throw new TeacherAuthError('counter-regression', 'Der Signaturzähler der Geräteanmeldung ist ungültig.');
  }

  const clientDataHash = new Uint8Array(
    await globalThis.crypto.subtle.digest('SHA-256', response.clientDataJSON)
  );
  const signedData = concatenate(authenticator.bytes, clientDataHash);
  const signature = derEs256ToP1363(response.signature);
  let publicKey;
  try {
    publicKey = await globalThis.crypto.subtle.importKey(
      'spki',
      decodeBase64(record.publicKeySpki, { url: true }),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  } catch (error) {
    throw new TeacherAuthError('invalid-public-key', 'Der gespeicherte öffentliche Schlüssel ist ungültig.', error);
  }

  const verified = await globalThis.crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    signedData
  );
  if (!verified) {
    throw new TeacherAuthError('invalid-signature', 'Die kryptografische Gerätebestätigung ist ungültig.');
  }

  const updatedRecord = {
    ...record,
    signCount: authenticator.signCount,
    lastUsedAt: new Date().toISOString()
  };
  try {
    await writeCredentialRecord(updatedRecord);
  } catch {
    // Eine bereits verifizierte Anmeldung bleibt gültig, auch wenn nur der Zähler nicht gespeichert werden konnte.
  }
  return { method: 'platform', verified: true };
}

async function derivePassword(candidate, salt, iterations = PASSWORD_ITERATIONS) {
  const passwordBytes = new TextEncoder().encode(candidate.normalize('NFKC'));
  try {
    const imported = await globalThis.crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    return new Uint8Array(await globalThis.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    }, imported, 256));
  } finally {
    passwordBytes.fill(0);
  }
}

/** Legt genau einmal ein gerätespezifisches Passwort mit zufälligem Salt an. */
export async function setInitialPassword(candidate) {
  enrollmentAuthorizationUntil = 0;
  if (cachedPasswordRecord === undefined || cachedPlatformAvailability === undefined) {
    throw new TeacherAuthError('not-ready', 'Die Anmeldung wird noch vorbereitet.');
  }
  if (cachedPasswordRecord) {
    throw new TeacherAuthError('already-configured', 'Ein Passwort ist bereits eingerichtet.');
  }
  if (!isAuthStorageSupported() || !globalThis.crypto?.subtle) {
    throw new TeacherAuthError('storage-unavailable', 'Das Passwort kann in diesem Browser nicht sicher gespeichert werden.');
  }
  const normalized = typeof candidate === 'string' ? candidate.normalize('NFKC') : '';
  if (normalized.length < PASSWORD_MIN_LENGTH) {
    throw new TeacherAuthError(
      'password-too-short',
      `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`
    );
  }
  const salt = randomBytes(16);
  const derived = await derivePassword(normalized, salt);
  const record = {
    schemaVersion: AUTH_SCHEMA_VERSION,
    salt: base64UrlEncode(salt),
    derivedKey: base64UrlEncode(derived),
    iterations: PASSWORD_ITERATIONS,
    createdAt: new Date().toISOString()
  };
  salt.fill(0);
  derived.fill(0);
  // Alte Plattform-Credentials aus der vorherigen App-Version werden nicht übernommen.
  if (cachedCredentialRecord) {
    await forgetPlatformCredential();
  }
  await writePasswordRecord(record);
  enrollmentAuthorizationUntil = Date.now() + ENROLLMENT_AUTHORIZATION_MS;
  return true;
}

/** Prüft das zuvor auf diesem Browserprofil eingerichtete Passwort. */
export async function verifyPassword(candidate) {
  enrollmentAuthorizationUntil = 0;
  if (
    typeof candidate !== 'string'
      || !globalThis.crypto?.subtle
      || !cachedPasswordRecord
  ) {
    return false;
  }
  const derived = await derivePassword(
    candidate,
    decodeBase64(cachedPasswordRecord.salt, { url: true }),
    cachedPasswordRecord.iterations
  );
  const expected = decodeBase64(cachedPasswordRecord.derivedKey, { url: true });
  const verified = bytesEqual(derived, expected);
  derived.fill(0);
  expected.fill(0);
  if (verified) {
    enrollmentAuthorizationUntil = Date.now() + ENROLLMENT_AUTHORIZATION_MS;
  }
  return verified;
}

/** Entfernt nur den lokalen Verweis; den Passkey selbst verwaltet das Betriebssystem. */
export async function forgetPlatformCredential({ preserveEnrollmentAuthorization = false } = {}) {
  cachedCredentialRecord = null;
  if (!preserveEnrollmentAuthorization) {
    enrollmentAuthorizationUntil = 0;
  }
  if (!isAuthStorageSupported()) {
    return false;
  }
  let removed = false;
  const errors = [];
  if (hasWritableOpfsBackend()) {
    try {
      removed = await deleteCredentialRecordFromOpfs() || removed;
    } catch (error) {
      errors.push(error);
    }
  }
  if (hasIndexedDbBackend()) {
    try {
      removed = await deleteCredentialRecordFromIndexedDb() || removed;
    } catch (error) {
      errors.push(error);
    }
  }
  cachedAuthStorageBackend = hasWritableOpfsBackend()
    ? 'opfs'
    : hasIndexedDbBackend()
      ? 'indexeddb'
      : null;
  if (errors.length) {
    throw new TeacherAuthError(
      'storage-delete-failed',
      'Die lokale Geräteanmeldung konnte nicht vollständig entfernt werden.',
      errors[0]
    );
  }
  return removed;
}

/** Löscht Passwort und Geräte-Credential aus allen lokalen Auth-Speichern. */
export async function resetAuthentication() {
  enrollmentAuthorizationUntil = 0;
  if (!isAuthStorageSupported()) {
    cachedCredentialRecord = null;
    cachedPasswordRecord = null;
    preloadPromise = null;
    return false;
  }

  const errors = [];
  if (hasWritableOpfsBackend()) {
    for (const remove of [deleteCredentialRecordFromOpfs, deletePasswordRecordFromOpfs]) {
      try {
        await remove();
      } catch (error) {
        errors.push(error);
      }
    }
  }
  if (hasIndexedDbBackend()) {
    for (const remove of [deleteCredentialRecordFromIndexedDb, deletePasswordRecordFromIndexedDb]) {
      try {
        await remove();
      } catch (error) {
        errors.push(error);
      }
    }
  }
  cachedAuthStorageBackend = hasWritableOpfsBackend()
    ? 'opfs'
    : hasIndexedDbBackend()
      ? 'indexeddb'
      : null;
  if (errors.length) {
    throw new TeacherAuthError(
      'storage-delete-failed',
      'Die lokalen Anmeldedaten konnten nicht vollständig gelöscht werden.',
      errors[0]
    );
  }
  cachedCredentialRecord = null;
  cachedPasswordRecord = null;
  preloadPromise = null;
  return true;
}
