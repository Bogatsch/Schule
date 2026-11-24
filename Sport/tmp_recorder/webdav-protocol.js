export function folderUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Gib die vollständige HTTPS-Adresse des WebDAV-Ordners ein.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Verwende eine HTTPS-Adresse ohne eingebettete Zugangsdaten oder Zusätze hinter dem Ordnerpfad.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

export function authorizationHeader(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`;
}

export async function webDavRequest(url, authorization, signal, options, { writeOnly = false } = {}) {
  const headers = { ...options.headers };
  if (authorization) headers.Authorization = authorization;
  let response;
  try {
    response = await fetch(url, {
      ...options, headers, signal,
      mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'
    });
  } catch (cause) {
    throw new Error('WebDAV ist nicht erreichbar. Prüfe die Ordneradresse, Netzwerkverbindung und CORS-Freigabe.', { cause });
  }
  const { status } = response;
  void response.body?.cancel().catch(() => {});
  const checking = options.method === 'PROPFIND';
  if (checking ? status === 207 || (writeOnly && (status === 403 || status === 405)) : response.ok) return;

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
