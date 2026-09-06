/**
 * Erzeugt den Leitbild-Index aus dem Ordner `Videos/`.
 *
 * Eine statische Seite kann kein Verzeichnis auflisten, deshalb entsteht der
 * Index hier einmal vor dem Ausliefern. Erzeugt werden:
 *
 * - `pages/leitbilder/guide-tree.js` – ES-Modul mit dem Ordnerbaum
 * - die Liste `GUIDE_VIDEOS` in `sw.js` – Positivliste des Offline-Caches
 *
 * Ordner werden zu Navigationsebenen, Dateinamen ohne Endung zu Titeln. Ein
 * Ordner mit genau einem Video und ohne Unterordner wird direkt als dieses
 * Video angezeigt.
 *
 * Aufruf: `npm run leitbilder`; mit `--check` wird nur geprüft, nicht geschrieben.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const videoRoot = path.join(appRoot, 'Videos');
export const treeFile = path.join(appRoot, 'pages/leitbilder/guide-tree.js');
export const workerFile = path.join(appRoot, 'sw.js');

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm']);

export function displayName(fileName) {
  return fileName.replace(/\.[^.]+$/u, '');
}

export function encodePath(segments) {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

/** Erkennt eine Tonspur ohne externe Werkzeuge: ISO-BMFF `hdlr` bzw. Matroska-Codec-Kennung. */
export function hasAudioTrack(buffer, extension) {
  if (extension === '.webm') {
    return ['A_OPUS', 'A_VORBIS', 'A_AAC', 'A_MPEG'].some(
      (codec) => buffer.includes(Buffer.from(codec, 'latin1'))
    );
  }
  let index = 0;
  while ((index = buffer.indexOf('hdlr', index, 'latin1')) !== -1) {
    if (buffer.toString('latin1', index + 12, index + 16) === 'soun') {
      return true;
    }
    index += 4;
  }
  return false;
}

async function readDirectory(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function collect(directory, segments, warnings) {
  const entries = await readDirectory(directory);
  const children = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    const entrySegments = [...segments, entry.name];

    if (entry.isDirectory()) {
      const folder = await collect(entryPath, entrySegments, warnings);
      if (folder.children.length > 0) {
        children.push(folder);
      } else {
        warnings.push(`Ordner ohne Videos wird übersprungen: ${entrySegments.join('/')}`);
      }
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTENSIONS.has(extension)) {
      warnings.push(`Keine unterstützte Videodatei, wird übersprungen: ${entrySegments.join('/')}`);
      continue;
    }

    const content = await readFile(entryPath);
    children.push({
      name: displayName(entry.name),
      isVideo: true,
      file: entrySegments.join('/'),
      src: `Videos/${encodePath(entrySegments)}?v=${createHash('sha256').update(content).digest('hex').slice(0, 8)}`,
      bytes: content.length,
      hasAudio: hasAudioTrack(content, extension)
    });
  }

  children.sort((left, right) => left.name.localeCompare(right.name, 'de', { numeric: true }));
  return { name: segments.at(-1) ?? 'Leitbilder', isVideo: false, children };
}

/**
 * Ein Ordner mit genau einem Video und ohne Unterordner wird durch dieses Video
 * ersetzt. Geprüft wird der ursprüngliche Inhalt, damit sich die Vereinfachung
 * nicht über mehrere Ebenen fortsetzt und Sportarten erhalten bleiben.
 */
export function collapse(node) {
  if (node.isVideo) {
    return node;
  }
  const children = node.children.map(collapse);
  if (node.children.length === 1 && node.children[0].isVideo) {
    return children[0];
  }
  return { ...node, children };
}

function assignPaths(node, segments = []) {
  const nodePath = encodePath(segments);
  if (node.isVideo) {
    return { ...node, path: nodePath };
  }
  return {
    name: node.name,
    path: nodePath,
    children: node.children.map((child) => assignPaths(child, [...segments, child.name]))
  };
}

export function flattenVideos(node, collected = []) {
  if (node.src) {
    collected.push(node);
    return collected;
  }
  node.children.forEach((child) => flattenVideos(child, collected));
  return collected;
}

function renderTree(node, indent) {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);
  if (node.src) {
    return [
      `${pad}{`,
      `${inner}name: ${JSON.stringify(node.name)},`,
      `${inner}path: ${JSON.stringify(node.path)},`,
      `${inner}src: ${JSON.stringify(node.src)},`,
      `${inner}bytes: ${node.bytes}`,
      `${pad}}`
    ].join('\n');
  }
  const children = node.children.length === 0
    ? '[]'
    : `[\n${node.children.map((child) => renderTree(child, indent + 4)).join(',\n')}\n${inner}]`;
  return [
    `${pad}{`,
    `${inner}name: ${JSON.stringify(node.name)},`,
    `${inner}path: ${JSON.stringify(node.path)},`,
    `${inner}children: ${children}`,
    `${pad}}`
  ].join('\n');
}

function renderModule(tree, videos) {
  return `// Automatisch erzeugt von tools/build-leitbilder.mjs – nicht von Hand ändern.
// Neu erzeugen mit: npm run leitbilder
export const GUIDE_TREE = Object.freeze(
${renderTree(tree, 2)}
);

export const GUIDE_VIDEO_COUNT = ${videos.length};
`;
}

export function renderWorkerList(videos) {
  if (videos.length === 0) {
    return 'const GUIDE_VIDEOS = Object.freeze([]);';
  }
  return `const GUIDE_VIDEOS = Object.freeze([\n${videos.map((video) => `  './${video.src}'`).join(',\n')}\n]);`;
}

const WORKER_PATTERN = /const GUIDE_VIDEOS = Object\.freeze\(\[[\s\S]*?\]\);/u;

/** Liest den Videoordner und liefert Baum, Videoliste und die zu schreibenden Dateiinhalte. */
export async function buildLeitbilderIndex() {
  const warnings = [];
  const tree = assignPaths(collapse(await collect(videoRoot, [], warnings)));
  const videos = flattenVideos(tree);

  const workerSource = await readFile(workerFile, 'utf8');
  if (!WORKER_PATTERN.test(workerSource)) {
    throw new Error('In sw.js wurde keine GUIDE_VIDEOS-Liste gefunden.');
  }
  const lineEnding = workerSource.includes('\r\n') ? '\r\n' : '\n';

  const moduleOut = renderModule(tree, videos).replace(/\n/gu, lineEnding);
  const workerOut = workerSource.replace(WORKER_PATTERN, () => renderWorkerList(videos));
  const currentModule = await readFile(treeFile, 'utf8').catch(() => '');

  return {
    tree,
    videos,
    warnings,
    moduleOut,
    workerOut,
    stale: currentModule !== moduleOut || workerSource !== workerOut
  };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const { videos, warnings, moduleOut, workerOut, stale } = await buildLeitbilderIndex();

  warnings.forEach((warning) => console.warn(`Hinweis: ${warning}`));
  videos
    .filter((video) => video.hasAudio)
    .forEach((video) => console.warn(`Warnung: "${video.name}" enthält eine Tonspur. Leitbilder sollen ohne Ton vorliegen.`));

  if (checkOnly) {
    if (stale) {
      console.error('Der Leitbild-Index ist veraltet. Bitte "npm run leitbilder" ausführen und die Änderung committen.');
      process.exitCode = 1;
      return;
    }
    console.log(`Leitbild-Index ist aktuell: ${videos.length} Video(s).`);
    return;
  }

  if (stale) {
    await writeFile(treeFile, moduleOut);
    await writeFile(workerFile, workerOut);
    console.log(`Leitbild-Index erzeugt: ${videos.length} Video(s).`);
  } else {
    console.log(`Leitbild-Index war bereits aktuell: ${videos.length} Video(s).`);
  }
  videos.forEach((video) => console.log(`  ${video.path.split('/').map(decodeURIComponent).join(' › ')}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
