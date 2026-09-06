import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  appRoot,
  buildLeitbilderIndex,
  collapse,
  displayName,
  encodePath,
  flattenVideos,
  hasAudioTrack,
  renderWorkerList,
  workerFile
} from '../tools/build-leitbilder.mjs';
import { GUIDE_TREE, GUIDE_VIDEO_COUNT } from '../pages/leitbilder/guide-tree.js';

const index = await buildLeitbilderIndex();

test('der ausgelieferte Leitbild-Index passt zum Ordner Videos', () => {
  assert.equal(
    index.stale,
    false,
    'Der Leitbild-Index ist veraltet. "npm run leitbilder" ausführen und die Änderung committen.'
  );
});

test('jedes Leitbild taucht unter seinem Dateinamen ohne Endung auf', () => {
  const videos = flattenVideos(GUIDE_TREE);
  assert.equal(videos.length, GUIDE_VIDEO_COUNT);
  assert.ok(videos.length > 0, 'Es ist kein Leitbild hinterlegt.');

  for (const video of videos) {
    assert.doesNotMatch(video.name, /\.(?:mp4|m4v|webm)$/iu, `${video.name} trägt noch eine Dateiendung`);
    const fileName = decodeURIComponent(video.src.split('?')[0].split('/').at(-1));
    assert.equal(video.name, displayName(fileName));
    assert.equal(video.path.split('/').at(-1), encodeURIComponent(video.name));
  }
});

test('jede Adresse im Index verweist auf eine vorhandene Videodatei', async () => {
  for (const video of flattenVideos(GUIDE_TREE)) {
    const relative = decodeURIComponent(video.src.split('?')[0]);
    const content = await readFile(path.join(appRoot, relative));
    assert.equal(content.length, video.bytes, `${video.name} hat eine abweichende Größe`);
  }
});

// Leitbilder dürfen eine Tonspur enthalten; die App gibt sie grundsätzlich stumm
// wieder. Der Generator meldet eine vorhandene Tonspur weiterhin als Hinweis,
// weil sie die Datei unnötig vergrößert.
test('meldet Leitbilder mit Tonspur als Hinweis', () => {
  const withAudio = index.videos.filter((video) => video.hasAudio).map((video) => video.file);
  assert.ok(Array.isArray(withAudio));
  if (withAudio.length > 0) {
    console.log(`  Hinweis: Tonspur vorhanden in ${withAudio.join(', ')}`);
  }
});

test('der Service Worker kennt genau die Videos des Index', async () => {
  const worker = await readFile(workerFile, 'utf8');
  const listed = [...worker.matchAll(/'\.\/(Videos\/[^']+)'/gu)].map((match) => match[1]);
  assert.deepEqual(listed, flattenVideos(GUIDE_TREE).map((video) => video.src));
  assert.ok(worker.includes(renderWorkerList(index.videos)));
});

test('ein Ordner mit genau einem Video wird zu diesem Video zusammengefasst', () => {
  const single = collapse({
    name: 'Volleyball',
    isVideo: false,
    children: [
      { name: 'Aufschlag', isVideo: false, children: [{ name: 'Aufschlag von oben', isVideo: true }] }
    ]
  });
  // Die Sportart bleibt erhalten, nur der Übungsordner verschwindet.
  assert.equal(single.name, 'Volleyball');
  assert.equal(single.children.length, 1);
  assert.equal(single.children[0].name, 'Aufschlag von oben');
  assert.equal(single.children[0].isVideo, true);

  const several = collapse({
    name: 'Aufschlag',
    isVideo: false,
    children: [
      { name: 'Von oben', isVideo: true },
      { name: 'Von unten', isVideo: true }
    ]
  });
  assert.equal(several.name, 'Aufschlag');
  assert.equal(several.children.length, 2);
});

test('erkennt Tonspuren in MP4- und WebM-Dateien', () => {
  const mp4WithAudio = Buffer.concat([
    Buffer.from('....hdlr', 'latin1'),
    Buffer.alloc(8),
    Buffer.from('soun', 'latin1')
  ]);
  const mp4WithoutAudio = Buffer.concat([
    Buffer.from('....hdlr', 'latin1'),
    Buffer.alloc(8),
    Buffer.from('vide', 'latin1')
  ]);
  assert.equal(hasAudioTrack(mp4WithAudio, '.mp4'), true);
  assert.equal(hasAudioTrack(mp4WithoutAudio, '.mp4'), false);
  assert.equal(hasAudioTrack(Buffer.from('xxA_OPUSxx', 'latin1'), '.webm'), true);
  assert.equal(hasAudioTrack(Buffer.from('V_VP9', 'latin1'), '.webm'), false);
});
