export const PAIRING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createPairingLink(clientUrl, token) {
  const url = new URL(clientUrl);
  url.hash = `abgabe=${token}`;
  return url.href;
}

export function readPairingLink(value, clientUrl) {
  try {
    const url = new URL(value);
    const client = new URL(clientUrl);
    if (url.origin !== client.origin || url.pathname !== client.pathname || url.search || url.username || url.password) {
      return null;
    }
    const token = url.hash.slice('#abgabe='.length);
    return url.hash.startsWith('#abgabe=') && PAIRING_TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}
