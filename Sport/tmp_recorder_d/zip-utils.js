const ZIP_VERSION = 20;
const UTF8_FLAG = 0x0800;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;

let crcTable = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }
  crcTable = new Uint32Array(256);
  for (let value = 0; value < crcTable.length; value += 1) {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crcTable[value] = crc >>> 0;
  }
  return crcTable;
}

async function crc32(blob) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  const update = (bytes) => {
    for (const byte of bytes) {
      crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
    }
  };

  if (typeof blob.stream === 'function') {
    const reader = blob.stream().getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        update(value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    update(new Uint8Array(await blob.arrayBuffer()));
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function safeEntryName(name, fallback) {
  const basename = String(name || '')
    .replaceAll('\\', '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return basename && basename !== '.' && basename !== '..' ? basename : fallback;
}

function uniqueEntryName(name, usedNames) {
  if (!usedNames.has(name.toLocaleLowerCase('de'))) {
    usedNames.add(name.toLocaleLowerCase('de'));
    return name;
  }
  const extensionIndex = name.lastIndexOf('.');
  const hasExtension = extensionIndex > 0;
  const stem = hasExtension ? name.slice(0, extensionIndex) : name;
  const extension = hasExtension ? name.slice(extensionIndex) : '';
  let suffix = 2;
  while (usedNames.has(`${stem} (${suffix})${extension}`.toLocaleLowerCase('de'))) {
    suffix += 1;
  }
  const uniqueName = `${stem} (${suffix})${extension}`;
  usedNames.add(uniqueName.toLocaleLowerCase('de'));
  return uniqueName;
}

function zipDateTime(value) {
  const source = value instanceof Date ? value : new Date(value || Date.now());
  const valid = Number.isNaN(source.getTime()) ? new Date() : source;
  const year = Math.min(2107, Math.max(1980, valid.getFullYear()));
  return {
    date: ((year - 1980) << 9) | ((valid.getMonth() + 1) << 5) | valid.getDate(),
    time: (valid.getHours() << 11) | (valid.getMinutes() << 5) | Math.floor(valid.getSeconds() / 2)
  };
}

function localHeader(entry) {
  const header = new ArrayBuffer(30);
  const view = new DataView(header);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, UTF8_FLAG, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, entry.time, true);
  view.setUint16(12, entry.date, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.size, true);
  view.setUint32(22, entry.size, true);
  view.setUint16(26, entry.nameBytes.length, true);
  view.setUint16(28, 0, true);
  return header;
}

function centralHeader(entry) {
  const header = new ArrayBuffer(46);
  const view = new DataView(header);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_VERSION, true);
  view.setUint16(8, UTF8_FLAG, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, entry.time, true);
  view.setUint16(14, entry.date, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.offset, true);
  return header;
}

function endRecord(entryCount, centralSize, centralOffset) {
  const record = new ArrayBuffer(22);
  const view = new DataView(record);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

export async function createZip(entries, { onProgress } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new TypeError('Mindestens eine Datei wird für das ZIP benötigt.');
  }
  if (entries.length > MAX_UINT16) {
    throw new RangeError('Zu viele Dateien für ein ZIP-Archiv.');
  }

  const encoder = new TextEncoder();
  const usedNames = new Set();
  const prepared = [];
  let offset = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const source = entries[index];
    if (!(source?.blob instanceof Blob)) {
      throw new TypeError('Jeder ZIP-Eintrag benötigt einen Blob.');
    }
    if (source.blob.size > MAX_UINT32) {
      throw new RangeError('Eine Datei ist zu groß für dieses ZIP-Format.');
    }
    const fallback = `Sportkamera-Aufnahme-${index + 1}`;
    const name = uniqueEntryName(safeEntryName(source.name, fallback), usedNames);
    const nameBytes = encoder.encode(name);
    if (nameBytes.length > MAX_UINT16) {
      throw new RangeError('Ein Dateiname ist zu lang für das ZIP-Archiv.');
    }
    const { date, time } = zipDateTime(source.lastModified);
    const entry = {
      blob: source.blob,
      crc: await crc32(source.blob),
      date,
      time,
      nameBytes,
      offset,
      size: source.blob.size
    };
    prepared.push(entry);
    offset += 30 + nameBytes.length + source.blob.size;
    if (offset > MAX_UINT32) {
      throw new RangeError('Die Auswahl ist zu groß für ein einzelnes ZIP-Archiv.');
    }
    onProgress?.({ completed: index + 1, total: entries.length, name });
  }

  const centralOffset = offset;
  const localParts = [];
  const centralParts = [];
  for (const entry of prepared) {
    localParts.push(localHeader(entry), entry.nameBytes, entry.blob);
    centralParts.push(centralHeader(entry), entry.nameBytes);
  }
  const centralSize = centralParts.reduce((size, part) => size + part.byteLength, 0);
  if (centralOffset + centralSize > MAX_UINT32) {
    throw new RangeError('Die Auswahl ist zu groß für ein einzelnes ZIP-Archiv.');
  }

  return new Blob(
    [...localParts, ...centralParts, endRecord(prepared.length, centralSize, centralOffset)],
    { type: 'application/zip' }
  );
}
