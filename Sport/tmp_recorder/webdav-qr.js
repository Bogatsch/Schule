import qrcode from './vendor/qrcode-generator/qrcode-2.0.4.js';

function comparablePath(url) {
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // URL-Pfade können auch Prozentzeichen enthalten, die kein gültiges UTF-8 ergeben.
  }
  return pathname.replace(/\/+$/, '').toLowerCase();
}

export function normalizeSubmissionUrl(value, webDavUrl) {
  const message = 'Gib einen HTTPS-Link zur Abgabeseite ohne eingebettete Zugangsdaten ein.';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 512) {
    throw new Error(message);
  }
  if (webDavUrl) {
    const folder = new URL(webDavUrl);
    if (url.origin === folder.origin) {
      const submissionPath = comparablePath(url);
      const folderPath = comparablePath(folder);
      if (submissionPath === folderPath || (folderPath && submissionPath.startsWith(`${folderPath}/`))) {
        throw new Error('Gib den Link zur Abgabeseite an. Die WebDAV-Ordneradresse ist privat.');
      }
    }
  }
  return url.href;
}

export function drawSubmissionQr(canvas, submissionUrl) {
  const code = qrcode(0, 'M');
  code.addData(normalizeSubmissionUrl(submissionUrl), 'Byte');
  code.make();

  const modules = code.getModuleCount();
  const moduleSize = 6;
  const margin = 4;
  const size = (modules + margin * 2) * moduleSize;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#000';
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (code.isDark(row, column)) {
        context.fillRect((column + margin) * moduleSize, (row + margin) * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}
