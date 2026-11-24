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
  setInitialPassword,
  verifyPassword
} = teacherAuth;

test('richtet ein eigenes Passwort ein und prüft es nach einem Neustart', async () => {
  await preloadTeacherAuth();
  assert.equal(getTeacherAuthState().ready, true);
  assert.equal(getTeacherAuthState().passwordConfigured, false);
  const password = 'Passwort-Test Lüneburg';
  assert.equal(await verifyPassword(password), false);
  await assert.rejects(setInitialPassword('kurz'), { code: 'password-too-short' });
  const [first, second] = await Promise.allSettled([
    setInitialPassword(password),
    setInitialPassword('Anderes-Passwort')
  ]);
  assert.deepEqual(first, { status: 'fulfilled', value: true });
  assert.equal(second.status, 'rejected');
  assert.equal(second.reason.code, 'already-configured');

  const directory = await root.getDirectoryHandle('sportkamera-teacher-auth-v1');
  const handle = await directory.getFileHandle('password.json');
  const text = await (await handle.getFile()).text();
  assert.equal(text.includes(password), false);
  const record = JSON.parse(text);
  assert.match(record.salt, /^[A-Za-z0-9_-]{22}$/);
  assert.match(record.derivedKey, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(record.iterations, 600_000);

  const reopened = await import('../teacher-auth.js?reopened');
  await reopened.preloadTeacherAuth();
  assert.equal(reopened.getTeacherAuthState().passwordConfigured, true);
  assert.equal(await reopened.verifyPassword('Anderes-Passwort'), false);
  assert.equal(await reopened.verifyPassword(password), true);

  await resetAuthentication();
  assert.equal(directory.children.has('password.json'), false);
  assert.equal(getTeacherAuthState().passwordConfigured, false);
});

test('ein Reset entfernt Altbestände und erlaubt ein neues eigenes Passwort', async () => {
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
  assert.equal(await setInitialPassword('Neues-Passwort-nach-Reset'), true);
  await resetAuthentication();
});
