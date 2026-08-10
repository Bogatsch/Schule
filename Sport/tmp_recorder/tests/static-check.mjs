import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'media-utils.js',
  'manifest.webmanifest',
  'sw.js',
  'README.md',
  'pages/leitbilder/index.html',
  'pages/leitbilder/styles.css',
  'pages/leitbilder/app.js',
  'pages/leitbilder/basketball/index.html',
  'pages/leitbilder/basketball/angriffsschlag/index.html',
  'pages/leitbilder/basketball/angriffsschlag/app.js',
  'Videos/Spielsportarten/Basketball/Angriffsschlag/Angriffschlag.mp4',
  'icons/favicon-64.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

await Promise.all(requiredFiles.map(async (file) => {
  const info = await stat(path.join(root, file));
  assert.ok(info.isFile() && info.size > 0, `${file} fehlt oder ist leer`);
}));

const expectedIconSizes = new Map([
  ['icons/favicon-64.png', 64],
  ['icons/apple-touch-icon.png', 180],
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
  ['icons/icon-maskable-512.png', 512]
]);
await Promise.all([...expectedIconSizes].map(async ([file, expectedSize]) => {
  const png = await readFile(path.join(root, file));
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `${file} ist keine PNG-Datei`);
  assert.equal(png.readUInt32BE(16), expectedSize, `${file} hat die falsche Breite`);
  assert.equal(png.readUInt32BE(20), expectedSize, `${file} hat die falsche Höhe`);
}));

const [html, app, worker, styles, manifestText, guidesHtml, guidesStyles, guidesApp, basketballHtml, playerHtml, playerApp] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('sw.js'),
  read('styles.css'),
  read('manifest.webmanifest'),
  read('pages/leitbilder/index.html'),
  read('pages/leitbilder/styles.css'),
  read('pages/leitbilder/app.js'),
  read('pages/leitbilder/basketball/index.html'),
  read('pages/leitbilder/basketball/angriffsschlag/index.html'),
  read('pages/leitbilder/basketball/angriffsschlag/app.js')
]);
const manifest = JSON.parse(manifestText);

assert.match(html, /Content-Security-Policy/i, 'CSP fehlt');
assert.match(html, /connect-src 'none'/, 'CSP muss externe Verbindungen sperren');
assert.match(html, /media-src 'self' blob:/, 'CSP muss nur lokale Blob-Medien erlauben');
assert.match(html, /apple-mobile-web-app-capable/, 'Apple-PWA-Metadaten fehlen');
assert.doesNotMatch(html, /Bewegung sehen|Deine Aufnahme bleibt hier|Aufnahmen bleiben nur vorübergehend/, 'entfernter Einleitungstext ist noch vorhanden');
assert.doesNotMatch(html, /<video[^>]*\scontrols(?:\s|=|>)/i, 'native Videosteuerung ist verboten');
assert.doesNotMatch(html, /\sdownload(?:\s|=|>)/i, 'Download-Funktion ist verboten');
assert.doesNotMatch(html, /https?:\/\//i, 'HTML enthält eine externe Ressource');
assert.match(html, /pages\/leitbilder\/index\.html/, 'Link zur Leitbilder-Seite fehlt');

assert.match(guidesHtml, /Content-Security-Policy/i, 'CSP der Leitbilder-Seite fehlt');
assert.match(guidesHtml, /Individualsportarten/, 'Auswahl für Individualsportarten fehlt');
assert.match(guidesHtml, /Spielsportarten/, 'Auswahl für Spielsportarten fehlt');
assert.match(guidesHtml, /data-sport="basketball"/, 'Basketball-Auswahl fehlt');
assert.match(guidesHtml, /href="\.\/basketball\/index\.html"/, 'Basketball-Link zur Leitbilderliste fehlt');
assert.doesNotMatch(guidesHtml, /https?:\/\//i, 'Leitbilder-Seite enthält eine externe Ressource');
assert.doesNotMatch(guidesApp, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/, 'Leitbilder-Code enthält eine Netzwerk- oder Speicher-API');
assert.match(guidesStyles, /prefers-reduced-motion/, 'Bewegungsreduktion der Leitbilder-Seite fehlt');

assert.match(basketballHtml, /Content-Security-Policy/i, 'CSP der Basketball-Seite fehlt');
assert.match(basketballHtml, /data-guide="angriffsschlag"/, 'Angriffsschlag fehlt in der Leitbilderliste');
assert.match(basketballHtml, /href="\.\/angriffsschlag\/index\.html"/, 'Link zum Angriffsschlag-Player fehlt');
assert.doesNotMatch(basketballHtml, /https?:\/\//i, 'Basketball-Seite enthält eine externe Ressource');

assert.match(playerHtml, /Content-Security-Policy/i, 'CSP der Player-Seite fehlt');
assert.match(playerHtml, /Videos\/Spielsportarten\/Basketball\/Angriffsschlag\/Angriffschlag\.mp4/, 'Basketball-Leitbild fehlt');
assert.match(playerHtml, /data-guide-speed="0\.25"/, 'langsame Leitbild-Wiedergabe fehlt');
assert.match(playerHtml, /data-guide-speed="0\.5"/, 'mittlere Leitbild-Wiedergabe fehlt');
assert.match(playerHtml, /data-guide-speed="1"/, 'normale Leitbild-Wiedergabe fehlt');
assert.doesNotMatch(playerHtml, /<video[^>]*\scontrols(?:\s|=|>)/i, 'Leitbild verwendet native Videosteuerung');
assert.doesNotMatch(playerHtml, /https?:\/\//i, 'Player-Seite enthält eine externe Ressource');
assert.doesNotMatch(playerApp, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/, 'Player-Code enthält eine Netzwerk- oder Speicher-API');
assert.match(playerApp, /playbackRate/, 'Geschwindigkeitssteuerung für Leitbilder fehlt');

const forbiddenAppApis = /\b(?:fetch|XMLHttpRequest|WebSocket|FormData|localStorage|sessionStorage|indexedDB)\b/;
assert.doesNotMatch(app, forbiddenAppApis, 'App-Code enthält eine verbotene Übertragungs- oder Speicher-API');
assert.match(app, /audio:\s*false/, 'Mikrofon muss ausdrücklich deaktiviert sein');
assert.match(app, /URL\.revokeObjectURL/, 'Object URLs werden nicht freigegeben');
assert.match(app, /mediaChunks\.splice/, 'Recorder-Fragmente werden nicht zentral geleert');
assert.match(app, /pagehide/, 'Bereinigung bei pagehide fehlt');
assert.match(app, /beforeunload/, 'Bereinigung beim Verlassen fehlt');
assert.match(app, /visibilitychange/, 'Bereinigung beim Wechsel in den Hintergrund fehlt');
assert.match(app, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/, 'Kameratracks werden nicht beendet');
assert.match(app, /width:\s*\{ ideal: 1280 \}/, 'ideale 720p-Breite fehlt');
assert.match(app, /height:\s*\{ ideal: 720 \}/, 'ideale 720p-Höhe fehlt');
assert.match(app, /frameRate:\s*\{ ideal: 30 \}/, 'ideale Bildrate fehlt');

assert.match(worker, /const APP_SHELL/, 'statische App-Shell fehlt');
assert.match(worker, /ALLOWED_URLS\.has/, 'Service Worker hat keine feste Positivliste');
assert.match(worker, /name\.startsWith\(CACHE_PREFIX\)/, 'alte App-Caches werden nicht bereinigt');
assert.doesNotMatch(worker, /\.put\s*\(/, 'Service Worker darf Laufzeitdaten nicht dynamisch cachen');
assert.doesNotMatch(worker, /blob:/i, 'Service Worker darf keine Blob-Adresse enthalten');

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.orientation, 'any');
assert.ok(manifest.start_url.startsWith('./') && manifest.scope.startsWith('./'), 'Manifest-Pfade müssen relativ sein');
assert.ok(manifest.icons.every((icon) => icon.src.startsWith('./')), 'Symbolpfade müssen relativ sein');

assert.match(styles, /env\(safe-area-inset-top\)/, 'sichere iPad-Bildschirmränder fehlen');
assert.match(styles, /orientation:\s*landscape/, 'Querformat-Anpassung fehlt');
assert.match(styles, /prefers-reduced-motion/, 'Bewegungsreduktion fehlt');

console.log(`Statische Abnahme erfolgreich: ${requiredFiles.length} Dateien und alle Datenschutz-/PWA-Regeln geprüft.`);
