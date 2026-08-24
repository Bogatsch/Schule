const STORE_SCHEMA_VERSION = 1;
const STORE_DIRECTORY = 'sportkamera-media-v1';
const ITEMS_DIRECTORY = 'items';
const METADATA_FILE = 'metadata.json';
const PENDING_FILE = 'pending.json';
const ITEM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_METADATA_BYTES = 64 * 1024;
const MAX_PENDING_BYTES = 4 * 1024;
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;
const IDB_DATABASE = 'sportkamera-media-idb-v1';
const IDB_DATABASE_VERSION = 2;
const IDB_METADATA_STORE = 'metadata';
const IDB_BLOB_STORE = 'media';
const IDB_SETTINGS_STORE = 'settings';
const IDB_BACKEND_KEY = 'storage-backend';

const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
});

export const MEDIA_STORE_SCHEMA_VERSION = STORE_SCHEMA_VERSION;

export class MediaStoreError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = 'MediaStoreError';
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

function hasOpfsDirectoryAccess() {
  return Boolean(
    globalThis.isSecureContext
      && globalThis.navigator?.storage
      && typeof globalThis.navigator.storage.getDirectory === 'function'
  );
}

function hasWritableOpfsBackend() {
  return hasOpfsDirectoryAccess()
    && typeof globalThis.FileSystemFileHandle?.prototype?.createWritable === 'function';
}

function hasIndexedDbBackend() {
  return Boolean(
    globalThis.isSecureContext
      && globalThis.indexedDB
      && typeof globalThis.indexedDB.open === 'function'
  );
}

export function isMediaStoreSupported() {
  return hasWritableOpfsBackend() || hasIndexedDbBackend();
}

function assertStoreSupport() {
  if (!isMediaStoreSupported()) {
    throw new MediaStoreError(
      'unsupported',
      'Der Browser stellt keinen dauerhaften privaten App-Speicher bereit.'
    );
  }
}

let mediaDatabasePromise = null;
let selectedMediaBackendPromise = null;

function openMediaDatabase() {
  if (!hasIndexedDbBackend()) {
    return Promise.reject(new MediaStoreError(
      'unsupported',
      'Der Browser stellt keinen dauerhaften privaten App-Speicher bereit.'
    ));
  }
  if (mediaDatabasePromise) {
    return mediaDatabasePromise;
  }

  const pending = new Promise((resolve, reject) => {
    let request;
    try {
      request = globalThis.indexedDB.open(IDB_DATABASE, IDB_DATABASE_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IDB_METADATA_STORE)) {
        database.createObjectStore(IDB_METADATA_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(IDB_BLOB_STORE)) {
        database.createObjectStore(IDB_BLOB_STORE);
      }
      if (!database.objectStoreNames.contains(IDB_SETTINGS_STORE)) {
        database.createObjectStore(IDB_SETTINGS_STORE);
      }
    };
    request.onerror = () => reject(request.error || new Error('IndexedDB konnte nicht geöffnet werden.'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        mediaDatabasePromise = null;
      };
      resolve(database);
    };
  });
  mediaDatabasePromise = pending.catch((error) => {
    mediaDatabasePromise = null;
    throw error;
  });
  return mediaDatabasePromise;
}

function transactionCompletion(transaction) {
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

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB-Anfrage fehlgeschlagen.'));
  });
}

async function resolveStorageBackend() {
  assertStoreSupport();
  if (!hasWritableOpfsBackend()) {
    return 'indexeddb';
  }
  if (!hasIndexedDbBackend()) {
    return 'opfs';
  }
  if (selectedMediaBackendPromise) {
    return selectedMediaBackendPromise;
  }

  selectedMediaBackendPromise = (async () => {
    try {
      const database = await openMediaDatabase();
      const transaction = database.transaction(
        [IDB_SETTINGS_STORE, IDB_METADATA_STORE],
        'readonly'
      );
      const completion = transactionCompletion(transaction);
      const markerRequest = transaction.objectStore(IDB_SETTINGS_STORE).get(IDB_BACKEND_KEY);
      const countRequest = transaction.objectStore(IDB_METADATA_STORE).count();
      const [marker, mediaCount] = await Promise.all([
        requestResult(markerRequest),
        requestResult(countRequest),
        completion
      ]);
      return marker === 'indexeddb' || mediaCount > 0 ? 'indexeddb' : 'opfs';
    } catch {
      // Ist IndexedDB auf einem OPFS-fähigen Browser blockiert, bleibt OPFS nutzbar.
      return 'opfs';
    }
  })();
  return selectedMediaBackendPromise;
}

async function saveMediaToIndexedDb(blob, metadata) {
  try {
    const database = await openMediaDatabase();
    const transaction = database.transaction(
      [IDB_METADATA_STORE, IDB_BLOB_STORE, IDB_SETTINGS_STORE],
      'readwrite'
    );
    const completion = transactionCompletion(transaction);
    transaction.objectStore(IDB_METADATA_STORE).put(metadata);
    transaction.objectStore(IDB_BLOB_STORE).put(blob, metadata.id);
    transaction.objectStore(IDB_SETTINGS_STORE).put('indexeddb', IDB_BACKEND_KEY);
    await completion;
    return metadata;
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      throw new MediaStoreError('quota-exceeded', 'Der private App-Speicher ist voll.', error);
    }
    throw new MediaStoreError('write-failed', 'Die Aufnahme konnte nicht dauerhaft gespeichert werden.', error);
  }
}

async function listMediaFromIndexedDb(kind) {
  try {
    const database = await openMediaDatabase();
    const transaction = database.transaction(IDB_METADATA_STORE, 'readonly');
    const completion = transactionCompletion(transaction);
    const records = [];
    const cursorRequest = transaction.objectStore(IDB_METADATA_STORE).openCursor();
    const cursorCompletion = new Promise((resolve, reject) => {
      cursorRequest.onerror = () => reject(
        cursorRequest.error || new Error('IndexedDB-Cursor fehlgeschlagen.')
      );
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        try {
          const metadata = validateMetadata(cursor.value, cursor.key);
          if (!kind || metadata.kind === kind) {
            records.push(metadata);
          }
        } catch {
          // Beschädigte Einzelmetadaten blockieren die restliche Galerie nicht.
        }
        cursor.continue();
      };
    });
    await Promise.all([cursorCompletion, completion]);
    records.sort((left, right) => right.createdAtMs - left.createdAtMs || right.id.localeCompare(left.id));
    return records;
  } catch (error) {
    throw new MediaStoreError('read-failed', 'Die Galerie konnte nicht gelesen werden.', error);
  }
}

async function getMediaFromIndexedDb(id) {
  try {
    const database = await openMediaDatabase();
    const transaction = database.transaction(
      [IDB_METADATA_STORE, IDB_BLOB_STORE],
      'readonly'
    );
    const completion = transactionCompletion(transaction);
    const metadataRequest = transaction.objectStore(IDB_METADATA_STORE).get(id);
    const blobRequest = transaction.objectStore(IDB_BLOB_STORE).get(id);
    const [storedMetadata, storedBlob] = await Promise.all([
      requestResult(metadataRequest),
      requestResult(blobRequest),
      completion
    ]);
    if (storedMetadata === undefined && storedBlob === undefined) {
      return null;
    }
    const metadata = validateMetadata(storedMetadata, id);
    if (!(storedBlob instanceof Blob) || storedBlob.size !== metadata.size || storedBlob.size <= 0) {
      throw new MediaStoreError('corrupt-media', 'Die gespeicherte Aufnahme ist unvollständig.');
    }
    const file = new File([storedBlob], metadata.mediaFile, {
      type: metadata.mimeType,
      lastModified: metadata.createdAtMs
    });
    return { metadata, file };
  } catch (error) {
    if (error instanceof MediaStoreError) {
      throw error;
    }
    throw new MediaStoreError('read-failed', 'Die Aufnahme konnte nicht gelesen werden.', error);
  }
}

async function deleteMediaFromIndexedDb(uniqueIds) {
  const result = { deletedIds: [], missingIds: [], errors: [] };
  if (!uniqueIds.length) {
    return result;
  }

  let database;
  try {
    database = await openMediaDatabase();
  } catch (error) {
    throw new MediaStoreError('delete-failed', 'Die Galerie konnte nicht zum Löschen geöffnet werden.', error);
  }

  for (const id of uniqueIds) {
    try {
      const transaction = database.transaction(
        [IDB_METADATA_STORE, IDB_BLOB_STORE],
        'readwrite'
      );
      const completion = transactionCompletion(transaction);
      const metadataStore = transaction.objectStore(IDB_METADATA_STORE);
      const existingRequest = metadataStore.get(id);
      const existingResult = requestResult(existingRequest);
      metadataStore.delete(id);
      transaction.objectStore(IDB_BLOB_STORE).delete(id);
      const [existing] = await Promise.all([existingResult, completion]);
      if (existing === undefined) {
        result.missingIds.push(id);
      } else {
        result.deletedIds.push(id);
      }
    } catch (error) {
      result.errors.push({ id, error });
    }
  }
  return result;
}

async function clearMediaFromIndexedDb() {
  const database = await openMediaDatabase();
  const transaction = database.transaction(
    [IDB_METADATA_STORE, IDB_BLOB_STORE, IDB_SETTINGS_STORE],
    'readwrite'
  );
  const completion = transactionCompletion(transaction);
  transaction.objectStore(IDB_METADATA_STORE).clear();
  transaction.objectStore(IDB_BLOB_STORE).clear();
  transaction.objectStore(IDB_SETTINGS_STORE).clear();
  await completion;
}

function isNotFoundError(error) {
  return error?.name === 'NotFoundError';
}

function assertItemId(id) {
  if (typeof id !== 'string' || !ITEM_ID_PATTERN.test(id)) {
    throw new MediaStoreError('invalid-id', 'Die Medien-ID ist ungültig.');
  }
  return id;
}

function createItemId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeKind(kind, mimeType) {
  const inferredKind = mimeType.startsWith('image/')
    ? 'photo'
    : mimeType.startsWith('video/')
      ? 'video'
      : '';
  const normalized = kind || inferredKind;
  if (normalized !== 'photo' && normalized !== 'video') {
    throw new MediaStoreError('invalid-kind', 'Die Aufnahmeart ist ungültig.');
  }
  if (inferredKind && normalized !== inferredKind) {
    throw new MediaStoreError('mime-mismatch', 'Aufnahmeart und Dateiformat passen nicht zusammen.');
  }
  return normalized;
}

function normalizeNumber(value, { integer = false } = {}) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }
  return integer ? Math.round(number) : number;
}

function extensionFor(mimeType, kind) {
  const essence = String(mimeType).split(';', 1)[0].trim().toLowerCase();
  return MIME_EXTENSIONS[essence] || (kind === 'photo' ? 'jpg' : 'webm');
}

function defaultMimeType(kind) {
  return kind === 'photo' ? 'image/jpeg' : 'video/webm';
}

function createMetadata(blob, options) {
  const provisionalMimeType = String(blob.type || '').toLowerCase();
  const kind = normalizeKind(options.kind, provisionalMimeType);
  const mimeType = provisionalMimeType || defaultMimeType(kind);
  const createdAtMs = Number.isFinite(Number(options.createdAt))
    ? Number(options.createdAt)
    : Date.now();
  const createdAt = new Date(createdAtMs);
  if (Number.isNaN(createdAt.getTime())) {
    throw new MediaStoreError('invalid-date', 'Das Aufnahmedatum ist ungültig.');
  }

  const id = createItemId();
  const extension = extensionFor(mimeType, kind);
  const datePart = createdAt.toISOString().replace(/[:.]/g, '-');
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    id,
    kind,
    createdAt: createdAt.toISOString(),
    createdAtMs: createdAt.getTime(),
    mimeType,
    size: blob.size,
    width: normalizeNumber(options.width, { integer: true }),
    height: normalizeNumber(options.height, { integer: true }),
    durationMs: normalizeNumber(options.durationMs),
    mediaFile: `media.${extension}`,
    suggestedDownloadName: `Sportkamera-${kind === 'photo' ? 'Foto' : 'Video'}-${datePart}.${extension}`
  };
}

function validateMetadata(value, expectedId = null) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== STORE_SCHEMA_VERSION) {
    throw new MediaStoreError('invalid-metadata', 'Die gespeicherten Metadaten sind ungültig.');
  }
  assertItemId(value.id);
  if (expectedId && value.id !== expectedId) {
    throw new MediaStoreError('invalid-metadata', 'Medien-ID und Metadaten passen nicht zusammen.');
  }
  if (value.kind !== 'photo' && value.kind !== 'video') {
    throw new MediaStoreError('invalid-metadata', 'Die gespeicherte Aufnahmeart ist ungültig.');
  }
  if (typeof value.mimeType !== 'string' || !value.mimeType.startsWith(`${value.kind === 'photo' ? 'image' : 'video'}/`)) {
    throw new MediaStoreError('invalid-metadata', 'Das gespeicherte Dateiformat ist ungültig.');
  }
  if (!Number.isFinite(value.createdAtMs) || Number.isNaN(Date.parse(value.createdAt))) {
    throw new MediaStoreError('invalid-metadata', 'Das gespeicherte Aufnahmedatum ist ungültig.');
  }
  if (!Number.isFinite(value.size) || value.size <= 0) {
    throw new MediaStoreError('invalid-metadata', 'Die gespeicherte Dateigröße ist ungültig.');
  }
  if (typeof value.mediaFile !== 'string' || !/^media\.[a-z0-9]{2,5}$/i.test(value.mediaFile)) {
    throw new MediaStoreError('invalid-metadata', 'Der gespeicherte Dateiname ist ungültig.');
  }
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    id: value.id,
    kind: value.kind,
    createdAt: value.createdAt,
    createdAtMs: value.createdAtMs,
    mimeType: value.mimeType,
    size: value.size,
    width: normalizeNumber(value.width, { integer: true }),
    height: normalizeNumber(value.height, { integer: true }),
    durationMs: normalizeNumber(value.durationMs),
    mediaFile: value.mediaFile,
    suggestedDownloadName: typeof value.suggestedDownloadName === 'string'
      ? value.suggestedDownloadName
      : `Sportkamera-${value.id}.${extensionFor(value.mimeType, value.kind)}`
  };
}

async function getStoreDirectory({ create }) {
  assertStoreSupport();
  const root = await globalThis.navigator.storage.getDirectory();
  return root.getDirectoryHandle(STORE_DIRECTORY, { create });
}

async function getItemsDirectory({ create }) {
  const store = await getStoreDirectory({ create });
  return store.getDirectoryHandle(ITEMS_DIRECTORY, { create });
}

async function writeFile(directory, name, data) {
  const fileHandle = await directory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // Das ursprüngliche Schreibproblem ist für die aufrufende Stelle aussagekräftiger.
    }
    throw error;
  }
}

async function readMetadata(itemDirectory, expectedId) {
  const metadataHandle = await itemDirectory.getFileHandle(METADATA_FILE);
  const metadataFile = await metadataHandle.getFile();
  if (!metadataFile.size || metadataFile.size > MAX_METADATA_BYTES) {
    throw new MediaStoreError('invalid-metadata', 'Die gespeicherten Metadaten haben eine ungültige Größe.');
  }
  let parsed;
  try {
    parsed = JSON.parse(await metadataFile.text());
  } catch (error) {
    throw new MediaStoreError('invalid-metadata', 'Die gespeicherten Metadaten konnten nicht gelesen werden.', error);
  }
  return validateMetadata(parsed, expectedId);
}

async function fileTimestamp(directory, name, { maxBytes = null, jsonTimestamp = false } = {}) {
  try {
    const handle = await directory.getFileHandle(name);
    const file = await handle.getFile();
    if (maxBytes !== null && file.size > maxBytes) {
      return Number.isFinite(file.lastModified) ? file.lastModified : null;
    }
    if (jsonTimestamp && file.size > 0) {
      try {
        const value = JSON.parse(await file.text());
        if (Number.isFinite(value?.startedAtMs)) {
          return value.startedAtMs;
        }
      } catch {
        // Bei einem beschädigten Marker dient die Dateiänderungszeit als sichere Näherung.
      }
    }
    return Number.isFinite(file.lastModified) ? file.lastModified : null;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

async function newestEntryTimestamp(itemDirectory) {
  let newest = null;
  for await (const [, handle] of itemDirectory.entries()) {
    if (handle.kind !== 'file') {
      continue;
    }
    try {
      const file = await handle.getFile();
      if (Number.isFinite(file.lastModified)) {
        newest = newest === null ? file.lastModified : Math.max(newest, file.lastModified);
      }
    } catch {
      // Nicht lesbare Einzeldateien verhindern keine spätere Bereinigung anderer Einträge.
    }
  }
  return newest;
}

async function isStaleOrphan(itemDirectory) {
  try {
    const pendingTimestamp = await fileTimestamp(itemDirectory, PENDING_FILE, {
      maxBytes: MAX_PENDING_BYTES,
      jsonTimestamp: true
    });
    const newestTimestamp = pendingTimestamp ?? await newestEntryTimestamp(itemDirectory);
    if (newestTimestamp === null || Date.now() - newestTimestamp <= ORPHAN_GRACE_MS) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function removePendingMarker(itemDirectory) {
  try {
    await itemDirectory.removeEntry(PENDING_FILE);
  } catch (error) {
    if (!isNotFoundError(error)) {
      // Ein verbleibender Marker ist harmlos; ein späteres listMedia() versucht es erneut.
    }
  }
}

/**
 * Speichert dauerhaft im gewählten lokalen Backend. OPFS verwendet Metadaten als
 * Commit-Marker; der IndexedDB-Fallback schreibt Blob und Metadaten atomar.
 */
export async function saveMedia(blob, options = {}) {
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new MediaStoreError('invalid-blob', 'Die Aufnahme enthält keine speicherbaren Daten.');
  }

  const metadata = createMetadata(blob, options);
  if (await resolveStorageBackend() === 'indexeddb') {
    return saveMediaToIndexedDb(blob, metadata);
  }

  let items = null;
  try {
    items = await getItemsDirectory({ create: true });
    const itemDirectory = await items.getDirectoryHandle(metadata.id, { create: true });
    await writeFile(itemDirectory, PENDING_FILE, JSON.stringify({
      schemaVersion: STORE_SCHEMA_VERSION,
      id: metadata.id,
      startedAtMs: Date.now()
    }));
    await writeFile(itemDirectory, metadata.mediaFile, blob);
    await writeFile(itemDirectory, METADATA_FILE, JSON.stringify(metadata));
    await removePendingMarker(itemDirectory);
    return metadata;
  } catch (error) {
    if (items) {
      try {
        await items.removeEntry(metadata.id, { recursive: true });
      } catch {
        // Unvollständige Verzeichnisse werden beim Auflisten ignoriert.
      }
    }
    if (error?.name === 'QuotaExceededError') {
      throw new MediaStoreError('quota-exceeded', 'Der private App-Speicher ist voll.', error);
    }
    throw new MediaStoreError('write-failed', 'Die Aufnahme konnte nicht dauerhaft gespeichert werden.', error);
  }
}

/** Listet vollständige Aufnahmen, neueste zuerst. */
export async function listMedia({ kind = null } = {}) {
  if (kind !== null && kind !== 'photo' && kind !== 'video') {
    throw new MediaStoreError('invalid-kind', 'Der Medienfilter ist ungültig.');
  }
  if (await resolveStorageBackend() === 'indexeddb') {
    return listMediaFromIndexedDb(kind);
  }

  let items;
  try {
    items = await getItemsDirectory({ create: false });
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw new MediaStoreError('read-failed', 'Die Galerie konnte nicht gelesen werden.', error);
  }

  const records = [];
  const staleOrphanIds = [];
  try {
    for await (const [id, handle] of items.entries()) {
      if (handle.kind !== 'directory' || !ITEM_ID_PATTERN.test(id)) {
        continue;
      }
      try {
        const metadata = await readMetadata(handle, id);
        const mediaHandle = await handle.getFileHandle(metadata.mediaFile);
        const mediaFile = await mediaHandle.getFile();
        if (mediaFile.size !== metadata.size || mediaFile.size <= 0) {
          continue;
        }
        await removePendingMarker(handle);
        if (!kind || metadata.kind === kind) {
          records.push(metadata);
        }
      } catch {
        // Ein abgebrochener oder beschädigter einzelner Eintrag blockiert nicht die übrige Galerie.
        if (await isStaleOrphan(handle)) {
          staleOrphanIds.push(id);
        }
      }
    }
  } catch (error) {
    throw new MediaStoreError('read-failed', 'Die Galerie konnte nicht vollständig gelesen werden.', error);
  }

  for (const id of staleOrphanIds) {
    try {
      await items.removeEntry(id, { recursive: true });
    } catch {
      // Eine fehlgeschlagene Wartungsbereinigung blockiert die sichtbaren Aufnahmen nicht.
    }
  }

  records.sort((left, right) => right.createdAtMs - left.createdAtMs || right.id.localeCompare(left.id));
  return records;
}

/** Liefert Metadaten und ein File, aus dem bei Bedarf eine kurzlebige Blob-URL erzeugt werden kann. */
export async function getMedia(id) {
  assertItemId(id);
  if (await resolveStorageBackend() === 'indexeddb') {
    return getMediaFromIndexedDb(id);
  }
  let itemDirectory;
  try {
    const items = await getItemsDirectory({ create: false });
    itemDirectory = await items.getDirectoryHandle(id);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw new MediaStoreError('read-failed', 'Die Aufnahme konnte nicht gelesen werden.', error);
  }

  try {
    const metadata = await readMetadata(itemDirectory, id);
    const mediaHandle = await itemDirectory.getFileHandle(metadata.mediaFile);
    const storedFile = await mediaHandle.getFile();
    if (storedFile.size !== metadata.size || storedFile.size <= 0) {
      throw new MediaStoreError('corrupt-media', 'Die gespeicherte Aufnahme ist unvollständig.');
    }
    const file = storedFile.type === metadata.mimeType
      ? storedFile
      : new File([storedFile], metadata.mediaFile, {
          type: metadata.mimeType,
          lastModified: metadata.createdAtMs
        });
    return { metadata, file };
  } catch (error) {
    if (error instanceof MediaStoreError) {
      throw error;
    }
    throw new MediaStoreError('read-failed', 'Die Aufnahme konnte nicht gelesen werden.', error);
  }
}

/**
 * Löscht eine oder mehrere IDs. Teilfehler werden zurückgegeben, damit die Oberfläche
 * nur tatsächlich gelöschte Karten entfernt.
 */
export async function deleteMedia(ids) {
  const requestedIds = typeof ids === 'string' ? [ids] : [...(ids || [])];
  const uniqueIds = [...new Set(requestedIds.map(assertItemId))];
  if (await resolveStorageBackend() === 'indexeddb') {
    return deleteMediaFromIndexedDb(uniqueIds);
  }
  const result = { deletedIds: [], missingIds: [], errors: [] };
  if (!uniqueIds.length) {
    return result;
  }

  let items;
  try {
    items = await getItemsDirectory({ create: false });
  } catch (error) {
    if (isNotFoundError(error)) {
      result.missingIds.push(...uniqueIds);
      return result;
    }
    throw new MediaStoreError('delete-failed', 'Die Galerie konnte nicht zum Löschen geöffnet werden.', error);
  }

  for (const id of uniqueIds) {
    try {
      await items.removeEntry(id, { recursive: true });
      result.deletedIds.push(id);
    } catch (error) {
      if (isNotFoundError(error)) {
        result.missingIds.push(id);
      } else {
        result.errors.push({ id, error });
      }
    }
  }
  return result;
}

/** Löscht sämtliche Medien aus OPFS und IndexedDB, auch aus einem alten Fallback-Backend. */
export async function resetMediaStore() {
  const errors = [];
  if (hasOpfsDirectoryAccess()) {
    try {
      const root = await globalThis.navigator.storage.getDirectory();
      await root.removeEntry(STORE_DIRECTORY, { recursive: true });
    } catch (error) {
      if (!isNotFoundError(error)) {
        errors.push(error);
      }
    }
  }
  if (hasIndexedDbBackend()) {
    try {
      await clearMediaFromIndexedDb();
    } catch (error) {
      errors.push(error);
    }
  }
  selectedMediaBackendPromise = null;
  if (errors.length) {
    throw new MediaStoreError(
      'reset-failed',
      'Die gespeicherten Aufnahmen konnten nicht vollständig gelöscht werden.',
      errors[0]
    );
  }
  return true;
}

export async function getStorageEstimate() {
  if (!globalThis.navigator?.storage || typeof globalThis.navigator.storage.estimate !== 'function') {
    return { usage: null, quota: null, available: null };
  }
  const estimate = await globalThis.navigator.storage.estimate();
  const usage = Number.isFinite(estimate.usage) ? estimate.usage : null;
  const quota = Number.isFinite(estimate.quota) ? estimate.quota : null;
  return {
    usage,
    quota,
    available: usage !== null && quota !== null ? Math.max(0, quota - usage) : null
  };
}

/** Sollte aus einer bewussten Benutzeraktion heraus aufgerufen werden. */
export async function requestPersistentStorage() {
  assertStoreSupport();
  const storage = globalThis.navigator.storage;
  let persisted = false;
  let requested = false;

  if (typeof storage?.persisted === 'function') {
    try {
      persisted = await storage.persisted();
    } catch {
      persisted = false;
    }
  }
  if (!persisted && typeof storage?.persist === 'function') {
    requested = true;
    try {
      persisted = await storage.persist();
    } catch {
      persisted = false;
    }
  }

  let estimate = { usage: null, quota: null, available: null };
  try {
    estimate = await getStorageEstimate();
  } catch {
    // Die Aufnahmefunktion bleibt auch ohne Quotaschätzung verfügbar.
  }
  return { supported: true, requested, persisted, ...estimate };
}

export const mediaStore = Object.freeze({
  isSupported: isMediaStoreSupported,
  save: saveMedia,
  list: listMedia,
  get: getMedia,
  delete: deleteMedia,
  reset: resetMediaStore,
  estimate: getStorageEstimate,
  requestPersistence: requestPersistentStorage
});
