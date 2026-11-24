import { normalizeSubmissionUrl } from './webdav-qr.js?v=2';

const LEGACY_TARGET_KEY = 'sportkamera-webdav-target-v1';
const LEGACY_RECEIPT_PREFIX = 'sportkamera-webdav-uploaded-v1:';
const ENTER_PASSWORD = 'Verbinde das WebDAV-Ziel mit deinem App-Passwort.';

function folderUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Gib die vollständige HTTPS-Adresse des WebDAV-Ordners ein.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Verwende eine HTTPS-Adresse ohne Zugangsdaten oder Zusätze hinter dem Ordnerpfad.');
  }
  if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
  }
  return url.href;
}

function validateSettings(value) {
  try {
    if (typeof value?.id === 'string' && typeof value.username === 'string'
      && value.username && !value.username.includes(':') && folderUrl(value.url) === value.url) {
      let submissionUrl = null;
      if (typeof value.submissionUrl === 'string') {
        try {
          submissionUrl = normalizeSubmissionUrl(value.submissionUrl, value.url);
        } catch {
          // Die private WebDAV-Konfiguration bleibt auch bei einem ungültigen Abgabelink verwendbar.
        }
      }
      return { id: value.id, url: value.url, username: value.username, credential: value.credential ?? null, submissionUrl };
    }
  } catch {
    // Ungültige Ziele werden beim Laden ignoriert.
  }
  return null;
}

function readLegacyTarget() {
  try {
    return validateSettings(JSON.parse(globalThis.localStorage.getItem(LEGACY_TARGET_KEY)));
  } catch {
    return null;
  }
}

function clearLegacySettings() {
  try {
    const storage = globalThis.localStorage;
    storage.removeItem(LEGACY_TARGET_KEY);
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(LEGACY_RECEIPT_PREFIX)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // IndexedDB bleibt die maßgebliche Quelle, falls Web Storage gesperrt ist.
  }
}

function authorizationHeader(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`;
}

function credentialContext(target) {
  return new TextEncoder().encode(JSON.stringify([target.id, target.url, target.username]));
}

async function sealCredential(target, authorization) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: credentialContext(target) },
    key,
    new TextEncoder().encode(authorization)
  );
  return { key, iv, ciphertext };
}

async function unsealCredential(target) {
  const { key, iv, ciphertext } = target.credential;
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: credentialContext(target) }, key, ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

function videoUrl(target, metadata) {
  const extension = metadata.mediaFile.split('.').pop();
  const stem = metadata.suggestedDownloadName
    .replace(new RegExp(`\\.${extension}$`, 'i'), '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
    .replace(/[\uD800-\uDFFF]/gu, '\uFFFD');
  const name = `${stem}-${metadata.id}.${extension}`;
  return new URL(encodeURIComponent(name), target.url);
}

async function webDavRequest(url, authorization, signal, options) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: authorization },
      signal,
      mode: 'cors',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer'
    });
  } catch (cause) {
    throw new Error('WebDAV ist nicht erreichbar. Prüfe die Ordneradresse, Netzwerkverbindung und CORS-Freigabe.', { cause });
  }
  const { status } = response;
  void response.body?.cancel().catch(() => {});
  const checking = options.method === 'PROPFIND';
  if (checking ? status === 207 : response.ok) {
    return;
  }

  let message = `WebDAV hat die Anfrage abgelehnt (HTTP ${status}).`;
  if (status === 401 || status === 403) {
    message = 'WebDAV-Zugriff verweigert. Prüfe die Zugangsdaten und Ordnerberechtigungen.';
  } else if (status === 404 || status === 409) {
    message = 'Der WebDAV-Ordner wurde nicht gefunden. Prüfe die Ordneradresse.';
  } else if (status === 413) {
    message = 'Das Video überschreitet die erlaubte Uploadgröße des WebDAV-Servers.';
  } else if (status === 507) {
    message = 'Der WebDAV-Server meldet zu wenig Speicherplatz.';
  } else if (checking && response.ok) {
    message = 'Die Adresse hat nicht als WebDAV-Ordner geantwortet. Prüfe die Ordneradresse.';
  }
  const error = new Error(message);
  error.status = status;
  throw error;
}

export function createWebDavUpload({ getMedia, readSettings, writeSettings, onChange, onSettingsChange }) {
  let target = readLegacyTarget();
  let authorization = null;
  let credentialRejected = false;
  let probe = null;
  let upload = null;
  let pendingWrite = Promise.resolve();
  let status = target ? ENTER_PASSWORD : '';
  let error = false;

  function getState() {
    return {
      target: target && { url: target.url, username: target.username },
      submissionUrl: target?.submissionUrl ?? null,
      ready: Boolean(authorization || (target?.credential && !credentialRejected)),
      remembered: Boolean(target?.credential),
      connecting: probe !== null,
      uploading: upload !== null,
      status,
      error
    };
  }

  function notify() {
    onChange(getState());
  }

  function updateStatus(message, failed = false) {
    status = message;
    error = failed;
    notify();
  }

  function targetStatus() {
    if (!target) return '';
    if (target.credential) return 'Das WebDAV-Passwort ist auf diesem Gerät gespeichert.';
    if (authorization) return 'WebDAV ist für diese App-Sitzung verbunden.';
    return ENTER_PASSWORD;
  }

  async function savedTarget() {
    const saved = await readSettings();
    return validateSettings(saved) ?? readLegacyTarget();
  }

  async function refresh({ cancelTransfer = true } = {}) {
    try {
      const writing = pendingWrite;
      await writing.catch(() => {});
      const saved = await savedTarget();
      if (writing !== pendingWrite) return;
      if (saved?.id === target?.id) {
        if (saved?.submissionUrl !== target?.submissionUrl) {
          target = saved;
          notify();
        }
        return;
      }
      cancelConnection();
      if (cancelTransfer) cancelUpload();
      target = saved;
      authorization = null;
      credentialRejected = false;
      updateStatus(targetStatus());
    } catch {
      updateStatus('Die gespeicherten WebDAV-Einstellungen konnten nicht gelesen werden.', true);
    }
  }

  function persist(settings, options) {
    pendingWrite = pendingWrite.catch(() => {}).then(() => writeSettings(settings, options));
    return pendingWrite;
  }

  async function setSubmissionUrl(value) {
    if (!getState().ready || probe || upload) {
      throw new Error('Verbinde WebDAV, um den Abgabelink zu speichern.');
    }
    const next = { ...target, submissionUrl: normalizeSubmissionUrl(value, target.url) };
    try {
      await persist(next, { expectedId: next.id });
    } catch (cause) {
      throw new Error('Der Abgabelink konnte nicht gespeichert werden.', { cause });
    }
    await refresh();
    onSettingsChange();
  }

  function cancelConnection() {
    if (!probe) return;
    probe.abort();
    probe = null;
    updateStatus(targetStatus());
  }

  function cancelUpload() {
    upload?.abort();
  }

  async function forget({ passwordOnly = false } = {}) {
    cancelConnection();
    cancelUpload();
    const previous = target;
    const next = passwordOnly && previous
      ? { id: crypto.randomUUID(), url: previous.url, username: previous.username, submissionUrl: previous.submissionUrl }
      : null;
    await persist(next, next ? { expectedId: previous.id } : undefined);
    clearLegacySettings();
    target = next;
    authorization = null;
    credentialRejected = false;
    updateStatus(targetStatus());
    onSettingsChange();
  }

  async function connect({ url, username, password, remember = false }) {
    if (probe || upload) return false;
    const controller = new AbortController();
    const shownTarget = target;
    probe = controller;
    updateStatus('WebDAV-Verbindung wird geprüft …');
    try {
      const stored = await readSettings();
      const current = validateSettings(stored) ?? readLegacyTarget();
      if (probe !== controller) return false;
      if (current?.id !== shownTarget?.id) {
        await refresh();
        return false;
      }
      const next = {
        id: crypto.randomUUID(),
        url: current?.url ?? folderUrl(url),
        username: current?.username ?? username?.trim(),
        submissionUrl: current?.submissionUrl ?? null
      };
      if (!next.username || next.username.includes(':') || !password) {
        throw new Error('Gib einen Benutzernamen ohne Doppelpunkt und ein WebDAV-Passwort ein.');
      }
      const header = authorizationHeader(next.username, password);
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        await webDavRequest(next.url, header, controller.signal, { method: 'PROPFIND', headers: { Depth: '0' } });
      } catch (connectionError) {
        if (controller.signal.aborted) {
          throw new Error('Die WebDAV-Verbindungsprüfung hat zu lange gedauert.');
        }
        throw connectionError;
      } finally {
        clearTimeout(timeout);
      }
      try {
        if (remember) next.credential = await sealCredential(next, header);
        if (probe !== controller) return false;
        await persist(next, { expectedId: stored?.id ?? null });
      } catch (cause) {
        throw new Error('Die WebDAV-Einstellung konnte nicht gespeichert werden.', { cause });
      }
      clearLegacySettings();
      if (probe !== controller) {
        onSettingsChange();
        return false;
      }
      target = next;
      authorization = remember ? null : header;
      credentialRejected = false;
      updateStatus(targetStatus());
      onSettingsChange();
      return true;
    } catch (connectionError) {
      if (probe === controller) updateStatus(connectionError.message, true);
      return false;
    } finally {
      if (probe === controller) {
        probe = null;
        notify();
      }
    }
  }

  async function uploadSelected(ids, { onProgress } = {}) {
    if (!ids.length || upload || probe) return null;
    const controller = new AbortController();
    const { signal } = controller;
    const selected = [...new Set(ids)];
    const result = { sent: 0, total: selected.length, error: '', cancelled: false };
    upload = controller;
    notify();
    try {
      await refresh({ cancelTransfer: false });
      if (signal.aborted) return { ...result, cancelled: true };
      const destination = target;
      if (!getState().ready) return { needsCredentials: true };
      let header = authorization;
      if (!header) {
        try {
          header = await unsealCredential(destination);
        } catch {
          if (signal.aborted) return { ...result, cancelled: true };
          credentialRejected = true;
          updateStatus('Das gespeicherte Passwort konnte nicht gelesen werden. Verbinde WebDAV erneut.', true);
          return { needsCredentials: true };
        }
      }
      for (const [index, id] of selected.entries()) {
        if (signal.aborted) break;
        onProgress?.({ current: index + 1, total: selected.length });
        let stored;
        try {
          stored = await getMedia(id);
        } catch {
          result.error ||= 'Eine Aufnahme konnte lokal nicht gelesen werden.';
          continue;
        }
        if (signal.aborted) break;
        if (stored?.metadata.kind !== 'video' || !(stored.file instanceof Blob) || !stored.file.size) {
          result.error ||= 'Mindestens ein ausgewähltes Video ist lokal nicht verfügbar.';
          continue;
        }
        if ((await savedTarget())?.id !== destination.id) {
          result.error = 'Das WebDAV-Ziel wurde geändert.';
          break;
        }
        if (signal.aborted) break;
        try {
          await webDavRequest(videoUrl(destination, stored.metadata), header, signal, {
            method: 'PUT',
            headers: { 'Content-Type': stored.metadata.mimeType },
            body: stored.file
          });
          result.sent += 1;
        } catch (uploadError) {
          if (signal.aborted) break;
          result.error = uploadError.message;
          if (uploadError.status === 401) {
            authorization = null;
            credentialRejected = true;
            updateStatus('Das WebDAV-Passwort wurde abgelehnt. Verbinde WebDAV erneut.', true);
          }
          if (uploadError.status !== 413) break;
        }
      }
    } catch {
      result.error = 'Die WebDAV-Einstellungen konnten nicht geprüft werden.';
    } finally {
      upload = null;
      notify();
    }
    result.cancelled = signal.aborted;
    return result;
  }

  return { getState, refresh, connect, cancelConnection, uploadSelected, cancelUpload, forget, setSubmissionUrl };
}
