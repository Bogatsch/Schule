const INVITATION = /^[A-Za-z0-9_-]{43}$/;

export function normalizeClientService(value) {
  const message = 'Gib die HTTPS-Adresse des Schüler-Clients ein.';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(message);
  }
  return url.origin;
}

export function normalizeClientPairing(value) {
  if (!value) return null;
  const service = normalizeClientService(value.service);
  if (typeof value.code === 'string' && INVITATION.test(value.code) && Number.isSafeInteger(value.expires) && value.expires > 0) {
    return { service, code: value.code, expires: value.expires };
  }
  return { service, code: null, expires: null };
}

export function clientPairingLink(pairing) {
  return pairing?.code && pairing.expires > Date.now() ? `${pairing.service}/#abgabe=${pairing.code}` : null;
}

async function pairingRequest(service, endpoint, key, options) {
  let response;
  try {
    response = await fetch(new URL(endpoint, service), {
      ...options, headers: { ...options.headers, Authorization: `Bearer ${key}` },
      mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(20_000)
    });
  } catch (cause) {
    throw new Error('Der Upload-Dienst ist nicht erreichbar. Prüfe seine Adresse und die CORS-Freigabe für die Hauptapp.', { cause });
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Der Upload-Dienst hat die Anfrage abgelehnt.');
  return data;
}

export async function createClientPairing({ service, key, targetUrl, previous }) {
  const origin = normalizeClientService(service);
  if (!key?.trim()) throw new Error('Gib den Freigabeschlüssel des Upload-Dienstes ein.');
  const bytes = new TextEncoder().encode(targetUrl);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const folderHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const replace = previous?.service === origin && clientPairingLink(previous) ? previous.code : undefined;
  const data = await pairingRequest(origin, '/api/pairings', key.trim(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderHash, replace })
  });
  const pairing = normalizeClientPairing({ service: origin, code: data?.pairing, expires: data?.expires });
  const link = clientPairingLink(pairing);
  if (!link || data.link !== link) throw new Error('Der Upload-Dienst hat keinen gültigen QR-Code für diesen Schüler-Client geliefert.');
  return pairing;
}

export async function closeClientPairing(pairing, key) {
  const current = normalizeClientPairing(pairing);
  if (!current?.code) return;
  if (!key?.trim()) throw new Error('Gib zum Schließen den Freigabeschlüssel ein.');
  await pairingRequest(current.service, `/api/pairings/${current.code}`, key.trim(), { method: 'DELETE' });
}
