import test from 'node:test';
import assert from 'node:assert/strict';

import { createZip } from '../zip-utils.js';

function findEndRecord(bytes) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}

test('erstellt ein gültig abgeschlossenes ZIP mit mehreren Dateien', async () => {
  const progress = [];
  const zip = await createZip([
    { name: 'Sprungwurf.mp4', blob: new Blob(['video-a']), lastModified: '2026-08-25T10:30:00Z' },
    { name: 'Pritschen.webm', blob: new Blob(['video-b']), lastModified: '2026-08-25T10:31:00Z' }
  ], {
    onProgress: (state) => progress.push(state.completed)
  });
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const endOffset = findEndRecord(bytes);

  assert.equal(zip.type, 'application/zip');
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  assert.ok(endOffset > 0);
  const end = new DataView(bytes.buffer, endOffset, 22);
  assert.equal(end.getUint16(8, true), 2);
  assert.equal(end.getUint16(10, true), 2);
  assert.deepEqual(progress, [1, 2]);
});

test('entfernt Verzeichnisse und vergibt für doppelte Namen eindeutige Einträge', async () => {
  const zip = await createZip([
    { name: '../Video.mp4', blob: new Blob(['a']) },
    { name: 'video.mp4', blob: new Blob(['b']) }
  ]);
  const archiveText = new TextDecoder().decode(await zip.arrayBuffer());

  assert.match(archiveText, /Video\.mp4/);
  assert.match(archiveText, /video \(2\)\.mp4/);
  assert.doesNotMatch(archiveText, /\.\.\/Video/);
});

test('lehnt leere Archive ab', async () => {
  await assert.rejects(() => createZip([]), /Mindestens eine Datei/);
});

test('schreibt die standardkonforme CRC32-Prüfsumme', async () => {
  const zip = await createZip([
    { name: 'Pruefsumme.txt', blob: new Blob(['123456789']) }
  ]);
  const bytes = await zip.arrayBuffer();
  const localHeader = new DataView(bytes, 0, 30);

  assert.equal(localHeader.getUint32(14, true), 0xcbf43926);
});
