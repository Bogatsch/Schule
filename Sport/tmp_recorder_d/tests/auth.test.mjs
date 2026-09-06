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
}

const root = new MemoryDirectoryHandle();
Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
Object.defineProperty(globalThis, 'FileSystemFileHandle', {
  configurable: true,
  value: MemoryFileHandle
});
Object.defineProperty(globalThis, 'location', {
  configurable: true,
  value: { origin: 'https://example.test', hostname: 'example.test' }
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    storage: {
      async getDirectory() {
        return root;
      }
    }
  }
});

const teacherAuth = await import('../teacher-auth.js');
const {
  getTeacherAuthState,
  preloadTeacherAuth,
  resetAuthentication,
  verifyPassword
} = teacherAuth;

test('prüft ausschließlich das fest hinterlegte Zugangspasswort', async () => {
  await preloadTeacherAuth();
  const state = getTeacherAuthState();
  assert.equal(state.ready, true);
  assert.equal(state.passwordAvailable, true);
  assert.equal(Object.hasOwn(state, 'passwordConfigured'), false);
  assert.equal(typeof teacherAuth.setInitialPassword, 'undefined');

  assert.equal(await verifyPassword('Falsches-Passwort'), false);
  assert.equal(await verifyPassword(''), false);
  assert.equal(await verifyPassword(null), false);

  // Das feste Passwort steht nicht im Repository. Wird es beim Testlauf über die
  // Umgebungsvariable gesetzt, wird zusätzlich der erfolgreiche Fall geprüft.
  const expectedPassword = process.env.SPORTKAMERA_TEST_PASSWORD || '';
  if (expectedPassword) {
    assert.equal(await verifyPassword(expectedPassword), true);
  }

  await resetAuthentication();
});

test('legt kein Passwort lokal ab und entfernt Altbestände beim Zurücksetzen', async () => {
  await preloadTeacherAuth();
  await verifyPassword('Falsches-Passwort');
  assert.equal(
    root.children.get('sportkamera-teacher-auth-v1')?.children.has('password.json') || false,
    false
  );

  // Passwortdatensatz einer früheren App-Version mit selbst vergebenem Passwort.
  const authDirectory = await root.getDirectoryHandle('sportkamera-teacher-auth-v1', { create: true });
  const legacyFile = await authDirectory.getFileHandle('password.json', { create: true });
  const writable = await legacyFile.createWritable();
  await writable.write('{"schemaVersion":1}');
  await writable.close();

  await resetAuthentication();
  assert.equal(authDirectory.children.has('password.json'), false);
});
