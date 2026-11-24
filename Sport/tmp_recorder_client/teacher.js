import qrcode from './shared/vendor/qrcode-generator/qrcode-2.0.4.js';

const get = (id) => document.getElementById(id);
let active = null;
let expiryTimer = null;

function status(message, error = false) {
  get('status').textContent = message;
  get('status').dataset.error = String(error);
}

function drawCode(link) {
  const code = qrcode(0, 'M');
  code.addData(link);
  code.make();
  const canvas = get('qr');
  canvas.width = canvas.height = (code.getModuleCount() + 8) * 6;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(24, 24);
  code.renderTo2dContext(context, 6);
}

function clearPairing(message) {
  clearTimeout(expiryTimer);
  active = null;
  get('qr').width = 0;
  get('qr').height = 0;
  get('active-pairing').hidden = true;
  get('pairing-form').hidden = false;
  status(message);
}

get('pairing-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const field = get('admin-key');
  const key = field.value;
  const button = get('create-pairing');
  field.value = '';
  button.disabled = field.disabled = true;
  status('WebDAV wird geprüft …');
  try {
    const response = await fetch('/api/pairings', { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    drawCode(result.link);
    active = { ...result, key };
    get('expires').textContent = `Gültig bis ${new Date(result.expires).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    get('pairing-form').hidden = true;
    get('active-pairing').hidden = false;
    status('Die Schülerinnen und Schüler scannen diesen Code im Client.');
    expiryTimer = setTimeout(() => clearPairing('Die Abgabe ist abgelaufen.'), Math.max(0, result.expires - Date.now()));
  } catch (error) {
    status(error instanceof TypeError ? 'Der Upload-Dienst konnte nicht erreicht werden.' : error.message, true);
  } finally {
    button.disabled = field.disabled = false;
  }
});

get('copy-link').addEventListener('click', async () => {
  if (!active) return;
  try {
    await navigator.clipboard.writeText(active.link);
    status('Abgabelink kopiert.');
  } catch {
    status('Der Link konnte nicht kopiert werden. Du kannst den QR-Code direkt zeigen.', true);
  }
});

get('end-pairing').addEventListener('click', async () => {
  if (!active) return;
  const button = get('end-pairing');
  button.disabled = true;
  try {
    const response = await fetch(`/api/pairings/${active.pairing}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${active.key}` }
    });
    if (!response.ok) throw new Error();
    clearPairing('Abgabe geschlossen.');
  } catch {
    status('Die Abgabe konnte nicht geschlossen werden. Versuche es erneut.', true);
  } finally {
    button.disabled = false;
  }
});
