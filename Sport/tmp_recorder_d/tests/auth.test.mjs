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

const {
  getTeacherAuthState,
  preloadTeacherAuth,
  resetAuthentication,
  setInitialPassword,
  verifyPassword
} = await import('../teacher-auth.js');

test('richtet ein eigenes Passwort einmalig ein, prüft und löscht es wieder', async () => {
  await preloadTeacherAuth();
  assert.equal(getTeacherAuthState().passwordConfigured, false);
  await assert.rejects(
    () => setInitialPassword('kurz'),
    (error) => error?.code === 'password-too-short'
  );

  const password = 'Ein-Testpasswort-42';
  await setInitialPassword(password);
  assert.equal(getTeacherAuthState().passwordConfigured, true);
  assert.equal(await verifyPassword(password), true);
  assert.equal(await verifyPassword('Falsches-Passwort'), false);
  await assert.rejects(
    () => setInitialPassword('Noch-ein-Passwort'),
    (error) => error?.code === 'already-configured'
  );

  const authDirectory = root.children.get('sportkamera-teacher-auth-v1');
  const passwordFile = authDirectory.children.get('password.json');
  assert.ok(passwordFile);
  const serializedPassword = await (await passwordFile.getFile()).text();
  assert.ok(!serializedPassword.includes(password));
  const firstRecord = JSON.parse(serializedPassword);

  const reloadedAuth = await import('../teacher-auth.js?reload-test=1');
  await reloadedAuth.preloadTeacherAuth();
  assert.equal(reloadedAuth.getTeacherAuthState().passwordConfigured, true);
  assert.equal(await reloadedAuth.verifyPassword(password), true);

  await resetAuthentication();
  assert.equal(getTeacherAuthState().passwordConfigured, false);
  assert.equal(authDirectory.children.has('password.json'), false);

  await setInitialPassword(password);
  const secondPasswordFile = authDirectory.children.get('password.json');
  const secondRecord = JSON.parse(await (await secondPasswordFile.getFile()).text());
  assert.notEqual(secondRecord.salt, firstRecord.salt);
  assert.equal(await verifyPassword(password), true);
  await resetAuthentication();
});
