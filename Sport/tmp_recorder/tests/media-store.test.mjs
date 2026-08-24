import assert from 'node:assert/strict';
import test from 'node:test';

function notFound() {
  return new DOMException('Nicht gefunden', 'NotFoundError');
}

class MemoryFileHandle {
  constructor(name) {
    this.kind = 'file';
    this.name = name;
    this.data = new Blob();
  }

  async createWritable() {
    const handle = this;
    let pending = handle.data;
    return {
      async write(data) {
        pending = data instanceof Blob ? data : new Blob([data]);
      },
      async close() {
        handle.data = pending;
      },
      async abort() {}
    };
  }

  async getFile() {
    return new File([this.data], this.name, { type: this.data.type });
  }
}

class MemoryDirectoryHandle {
  constructor(name = '') {
    this.kind = 'directory';
    this.name = name;
    this.children = new Map();
  }

  async getDirectoryHandle(name, { create = false } = {}) {
    const existing = this.children.get(name);
    if (existing?.kind === 'directory') {
      return existing;
    }
    if (!create) {
      throw notFound();
    }
    const directory = new MemoryDirectoryHandle(name);
    this.children.set(name, directory);
    return directory;
  }

  async getFileHandle(name, { create = false } = {}) {
    const existing = this.children.get(name);
    if (existing?.kind === 'file') {
      return existing;
    }
    if (!create) {
      throw notFound();
    }
    const file = new MemoryFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async removeEntry(name) {
    if (!this.children.delete(name)) {
      throw notFound();
    }
  }

  async *entries() {
    yield* this.children.entries();
  }
}

const root = new MemoryDirectoryHandle();
let persistRequested = false;
Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
Object.defineProperty(globalThis, 'FileSystemFileHandle', {
  configurable: true,
  value: MemoryFileHandle
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    storage: {
      async getDirectory() {
        return root;
      },
      async estimate() {
        return { usage: 2048, quota: 8192 };
      },
      async persisted() {
        return false;
      },
      async persist() {
        persistRequested = true;
        return true;
      }
    }
  }
});

const {
  deleteMedia,
  getMedia,
  getStorageEstimate,
  isMediaStoreSupported,
  listMedia,
  requestPersistentStorage,
  resetMediaStore,
  saveMedia
} = await import('../media-store.js');

test('speichert, sortiert, liest und löscht Fotos und Videos im OPFS', async () => {
  assert.equal(isMediaStoreSupported(), true);
  assert.deepEqual(await listMedia(), []);

  const photo = await saveMedia(new Blob(['foto'], { type: 'image/jpeg' }), {
    kind: 'photo',
    createdAt: 1_700_000_000_000,
    width: 1280,
    height: 720
  });
  const video = await saveMedia(new Blob(['video'], { type: 'video/webm' }), {
    kind: 'video',
    createdAt: 1_700_000_001_000,
    durationMs: 2500,
    title: '  Sprungwurf   8a  '
  });
  const mp4 = await saveMedia(new Blob(['mp4'], { type: 'video/mp4;codecs=avc1.42e01e' }), {
    kind: 'video',
    createdAt: 1_700_000_002_000,
    title: 'Aufschlag / Zeitlupe'
  });

  assert.deepEqual((await listMedia()).map((item) => item.id), [mp4.id, video.id, photo.id]);
  assert.deepEqual((await listMedia({ kind: 'photo' })).map((item) => item.id), [photo.id]);
  assert.equal(video.title, 'Sprungwurf 8a');
  assert.equal(video.suggestedDownloadName, 'Sprungwurf 8a.webm');
  assert.equal(mp4.title, 'Aufschlag / Zeitlupe');
  assert.equal(mp4.suggestedDownloadName, 'Aufschlag - Zeitlupe.mp4');

  const storedVideo = await getMedia(video.id);
  assert.equal(storedVideo.metadata.kind, 'video');
  assert.equal(storedVideo.metadata.title, 'Sprungwurf 8a');
  assert.equal(storedVideo.metadata.suggestedDownloadName, 'Sprungwurf 8a.webm');
  assert.equal(storedVideo.file.type, 'video/webm');
  assert.equal(await storedVideo.file.text(), 'video');

  const deletion = await deleteMedia([photo.id, video.id, mp4.id]);
  assert.deepEqual(new Set(deletion.deletedIds), new Set([photo.id, video.id, mp4.id]));
  assert.deepEqual(deletion.errors, []);
  assert.deepEqual(await listMedia(), []);
});

test('liefert Speicherbelegung und fordert bestmögliche Persistenz an', async () => {
  assert.deepEqual(await getStorageEstimate(), { usage: 2048, quota: 8192, available: 6144 });
  const persistence = await requestPersistentStorage();
  assert.equal(persistence.persisted, true);
  assert.equal(persistRequested, true);
});

test('setzt den lokalen Medienspeicher vollständig zurück', async () => {
  await saveMedia(new Blob(['foto'], { type: 'image/jpeg' }), { kind: 'photo' });
  await saveMedia(new Blob(['video'], { type: 'video/webm' }), { kind: 'video' });
  assert.equal((await listMedia()).length, 2);
  await resetMediaStore();
  assert.deepEqual(await listMedia(), []);
});
