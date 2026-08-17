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
  'pages/leitbilder/volleyball/index.html',
  'pages/leitbilder/volleyball/angriffsschlag/index.html',
  'pages/leitbilder/volleyball/angriffsschlag/app.js',
  'pages/leitbilder/volleyball/pritschen-seitlich/index.html',
  'Videos/Spielsportarten/Volleyball/Angriffsschlag/Angriffschlag.mp4',
  'Videos/Spielsportarten/Volleyball/Pritschen/Pritschen seitlich.mp4',
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

const [html, app, worker, styles, manifestText, guidesHtml, guidesStyles, guidesApp, volleyballHtml, playerHtml, playerApp, pritschenHtml] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('sw.js'),
  read('styles.css'),
  read('manifest.webmanifest'),
  read('pages/leitbilder/index.html'),
  read('pages/leitbilder/styles.css'),
  read('pages/leitbilder/app.js'),
  read('pages/leitbilder/volleyball/index.html'),
  read('pages/leitbilder/volleyball/angriffsschlag/index.html'),
  read('pages/leitbilder/volleyball/angriffsschlag/app.js'),
  read('pages/leitbilder/volleyball/pritschen-seitlich/index.html')
]);
const manifest = JSON.parse(manifestText);

assert.match(html, /Content-Security-Policy/i, 'CSP fehlt');
assert.match(html, /connect-src 'none'/, 'CSP muss externe Verbindungen sperren');
assert.match(html, /media-src 'self' blob:/, 'CSP muss nur lokale Blob-Medien erlauben');
assert.match(html, /apple-mobile-web-app-capable/, 'Apple-PWA-Metadaten fehlen');
assert.doesNotMatch(html, /Bewegung sehen|Deine Aufnahme bleibt hier|Aufnahmen bleiben nur vorübergehend/, 'entfernter Einleitungstext ist noch vorhanden');
assert.doesNotMatch(html, /Vorschau|preview-label|preview-kicker/, 'entfernte Vorschau-Beschriftung ist noch vorhanden');
assert.doesNotMatch(app, /Foto aufgenommen|Video aufgenommen/, 'entfernter Aufnahmestatus ist noch vorhanden');
assert.doesNotMatch(html + app, /Bereit für dein Video|Bereit für dein Foto|Tippe auf den Kreis|Kamera wird vorbereitet/, 'entfernte Kamera-Hinweise sind noch vorhanden');
assert.doesNotMatch(html + app, /capture-hint|captureHint/, 'entferntes Hinweis-Element ist noch vorhanden');
assert.doesNotMatch(html, /<video[^>]*\scontrols(?:\s|=|>)/i, 'native Videosteuerung ist verboten');
assert.doesNotMatch(html, /https?:\/\//i, 'HTML enthält eine externe Ressource');
assert.match(html, /pages\/leitbilder\/index\.html/, 'Link zur Leitbilder-Seite fehlt');
assert.match(html, /id="comparison-button"/, 'Button für den Leitbildvergleich fehlt');
assert.match(html, /data-comparison-src="\.\/Videos\/Spielsportarten\/Volleyball\/Angriffsschlag\/Angriffschlag\.mp4"/, 'Leitbildauswahl für den Vergleich fehlt');
assert.match(html, /data-comparison-src="\.\/Videos\/Spielsportarten\/Volleyball\/Pritschen\/Pritschen%20seitlich\.mp4"/, 'Pritschen fehlt in der Leitbildauswahl für den Vergleich');
assert.match(html, /id="comparison-play-button"/, 'eigene Start-/Pause-Taste des Leitbilds fehlt');
assert.match(html, /id="comparison-timeline"/, 'eigene Zeitleiste des Leitbilds fehlt');
assert.match(html, /<video id="comparison-video"[^>]*\smuted(?:\s|=|>)/i, 'Leitbildvergleich muss stummgeschaltet sein');
assert.match(html, /<dialog id="comparison-picker"/, 'modale Leitbildauswahl fehlt');
assert.match(html, /data-comparison-category="individualsportarten"/, 'Individualsport-Schritt der Vergleichsauswahl fehlt');
assert.match(html, /data-comparison-category="spielsportarten"/, 'Spielsport-Schritt der Vergleichsauswahl fehlt');
assert.match(html, /data-comparison-sport="volleyball"/, 'Sportart-Schritt der Vergleichsauswahl fehlt');
assert.match(html, /id="speed-menu"/, 'kompakte Tempoauswahl der eigenen Aufnahme fehlt');
assert.match(html, /id="comparison-speed-menu"/, 'kompakte Tempoauswahl des Leitbilds fehlt');
assert.match(html, /id="video-download-button"/, 'Download-Button für Videos fehlt');
assert.match(html, /id="photo-download-button"/, 'Download-Button für Bilder fehlt');
assert.match(html, /<dialog id="download-dialog"/, 'Namensdialog für den Download fehlt');
assert.match(html, />Download<\/button>/, 'Download-Bestätigung fehlt');
assert.match(html, />Abbruch<\/button>/, 'Download-Abbruch fehlt');
assert.match(html, /styles\.css\?v=24/, 'Versionskennung gegen veraltetes Player-CSS fehlt');
assert.match(html, /app\.js\?v=25/, 'Versionskennung gegen veraltete Player-Logik fehlt');
assert.match(app, /toggleComparisonPlayback/, 'unabhängige Wiedergabesteuerung des Leitbilds fehlt');
assert.match(app, /showModal/, 'modales Öffnen der Leitbildauswahl fehlt');
assert.match(app, /comparisonTimeline\.addEventListener/, 'unabhängige Zeitleistensteuerung des Leitbilds fehlt');
assert.match(app, /dataset\.comparisonSpeed/, 'unabhängige Temporegelung des Leitbilds fehlt');
assert.match(app, /link\.download\s*=/, 'lokaler Download der Aufnahme fehlt');
assert.match(app, /sanitizeDownloadName/, 'sichere Dateinamensverarbeitung fehlt');
assert.match(app, /downloadMediaKind === 'photo' \? 'jpg' : 'mp4'/, 'Video-Download ist nicht fest auf MP4 eingestellt');
assert.doesNotMatch(app, /syncComparisonPosition|hasActiveComparison/, 'veraltete Synchronsteuerung ist noch vorhanden');

[html, guidesHtml, volleyballHtml, playerHtml, pritschenHtml].forEach((pageHtml) => {
  assert.doesNotMatch(pageHtml, /class="step-label"><span>\d+<\/span>/, 'Nummerierung der Ablaufschritte ist noch vorhanden');
});

assert.match(guidesHtml, /Content-Security-Policy/i, 'CSP der Leitbilder-Seite fehlt');
assert.match(guidesHtml, /Individualsportarten/, 'Auswahl für Individualsportarten fehlt');
assert.match(guidesHtml, /Spielsportarten/, 'Auswahl für Spielsportarten fehlt');
assert.match(guidesHtml, /data-sport="volleyball"/, 'Volleyball-Auswahl fehlt');
assert.match(guidesHtml, /href="\.\/volleyball\/index\.html"/, 'Volleyball-Link zur Leitbilderliste fehlt');
assert.doesNotMatch(guidesHtml, /https?:\/\//i, 'Leitbilder-Seite enthält eine externe Ressource');
assert.doesNotMatch(guidesApp, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/, 'Leitbilder-Code enthält eine Netzwerk- oder Speicher-API');
assert.match(guidesStyles, /prefers-reduced-motion/, 'Bewegungsreduktion der Leitbilder-Seite fehlt');

assert.match(volleyballHtml, /Content-Security-Policy/i, 'CSP der Volleyball-Seite fehlt');
assert.match(volleyballHtml, /data-guide="angriffsschlag"/, 'Angriffsschlag fehlt in der Leitbilderliste');
assert.match(volleyballHtml, /href="\.\/angriffsschlag\/index\.html"/, 'Link zum Angriffsschlag-Player fehlt');
assert.match(volleyballHtml, /data-guide="pritschen-seitlich"/, 'Pritschen fehlt in der Leitbilderliste');
assert.match(volleyballHtml, /href="\.\/pritschen-seitlich\/index\.html"/, 'Link zum Pritschen-Player fehlt');
assert.doesNotMatch(volleyballHtml, /https?:\/\//i, 'Volleyball-Seite enthält eine externe Ressource');

assert.match(playerHtml, /Content-Security-Policy/i, 'CSP der Player-Seite fehlt');
assert.match(playerHtml, /Videos\/Spielsportarten\/Volleyball\/Angriffsschlag\/Angriffschlag\.mp4/, 'Volleyball-Leitbild fehlt');
assert.match(playerHtml, /data-guide-speed="0\.25"/, 'langsame Leitbild-Wiedergabe fehlt');
assert.match(playerHtml, /data-guide-speed="0\.5"/, 'mittlere Leitbild-Wiedergabe fehlt');
assert.match(playerHtml, /data-guide-speed="1"/, 'normale Leitbild-Wiedergabe fehlt');
assert.doesNotMatch(playerHtml, /<video[^>]*\scontrols(?:\s|=|>)/i, 'Leitbild verwendet native Videosteuerung');
assert.match(playerHtml, /<video id="guide-video"[^>]*\smuted(?:\s|=|>)/i, 'Angriffsschlag muss stummgeschaltet sein');
assert.doesNotMatch(playerHtml, /https?:\/\//i, 'Player-Seite enthält eine externe Ressource');
assert.doesNotMatch(playerApp, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/, 'Player-Code enthält eine Netzwerk- oder Speicher-API');
assert.match(playerApp, /playbackRate/, 'Geschwindigkeitssteuerung für Leitbilder fehlt');

assert.match(pritschenHtml, /Content-Security-Policy/i, 'CSP der Pritschen-Seite fehlt');
assert.match(pritschenHtml, /Videos\/Spielsportarten\/Volleyball\/Pritschen\/Pritschen%20seitlich\.mp4/, 'Pritschen-Leitbild fehlt');
assert.match(pritschenHtml, /data-guide-speed="0\.25"/, 'langsame Pritschen-Wiedergabe fehlt');
assert.match(pritschenHtml, /data-guide-speed="0\.5"/, 'mittlere Pritschen-Wiedergabe fehlt');
assert.match(pritschenHtml, /data-guide-speed="1"/, 'normale Pritschen-Wiedergabe fehlt');
assert.doesNotMatch(pritschenHtml, /<video[^>]*\scontrols(?:\s|=|>)/i, 'Pritschen-Player verwendet native Videosteuerung');
assert.match(pritschenHtml, /<video id="guide-video"[^>]*\smuted(?:\s|=|>)/i, 'Pritschen muss stummgeschaltet sein');
assert.doesNotMatch(pritschenHtml, /https?:\/\//i, 'Pritschen-Seite enthält eine externe Ressource');

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
