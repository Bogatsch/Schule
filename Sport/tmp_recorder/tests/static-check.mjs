import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [html, app, worker, manifestText, annotation] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('sw.js'),
  read('manifest.webmanifest'),
  read('annotation.js')
]);
const manifest = JSON.parse(manifestText);

assert.match(html, /data-start-mode="photo"/, 'Fotoaufnahme fehlt');
assert.match(html, /data-start-mode="video"/, 'Videoaufnahme fehlt');
assert.match(html, /id="preview-view"/, 'Vorschau fehlt');
assert.match(html, /id="comparison-button"/, 'Leitbildvergleich fehlt');
assert.match(html, /id="video-annotation-button"/, 'Annotation der eigenen Aufnahme fehlt');
assert.match(html, /controlslist="nodownload noplaybackrate noremoteplayback"/i, 'Native Videodownloads sind nicht eingeschränkt');

const removedUi = /(?:gallery|account|settings|video-name|save-button|mp4-conversion|download-selected|delete-selected)/i;
assert.doesNotMatch(html, removedUi, 'Oberfläche enthält noch Galerie-, Anmelde-, Speicher- oder Downloadfunktionen');
assert.doesNotMatch(html, /\b(?:Login|Anmelden|Zurücksetzen|Galerie|Download|Herunterladen|Speichern)\b/i, 'Entfernte Funktion wird noch in der Oberfläche angeboten');

const removedRuntime = /(?:media-store|teacher-auth|video-converter|zip-utils|saveMedia|listMedia|getMedia|deleteMedia|createZip|convertWebMToMp4|authenticateWithPlatform|resetAuthentication|link\.download)/;
assert.doesNotMatch(app, removedRuntime, 'App-Code bindet noch Speicher-, Galerie-, Auth- oder Downloadlogik ein');
assert.doesNotMatch(app, /\b(?:localStorage|sessionStorage|indexedDB)\b/, 'App verwendet noch dauerhafte Browserspeicher');
assert.match(app, /audio:\s*false/, 'Mikrofon muss ausdrücklich deaktiviert sein');
assert.match(app, /URL\.revokeObjectURL/, 'Flüchtige Object URLs werden nicht freigegeben');
assert.match(app, /mediaChunks\.splice/, 'Recorder-Fragmente werden nicht zentral geleert');
assert.match(app, /pagehide/, 'Bereinigung bei pagehide fehlt');
assert.match(app, /beforeunload/, 'Bereinigung beim Verlassen fehlt');
assert.match(app, /visibilitychange/, 'Bereinigung beim Wechsel in den Hintergrund fehlt');
assert.match(app, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/, 'Kameratracks werden nicht beendet');
assert.match(app, /annotation\.open\(elements\.videoPreview/, 'Annotation der eigenen Aufnahme ist nicht verbunden');
assert.match(annotation, /frameCanvas\.width = 0/, 'Annotationsframe wird beim Schließen nicht verworfen');

assert.match(worker, /CACHE_VERSION\s*=\s*'v40'/, 'Cache-Version v40 fehlt');
assert.match(worker, /\.\/app\.js\?v=40/, 'Aktuelle App-Logik fehlt in der App-Shell');
assert.match(worker, /\.\/styles\.css\?v=40/, 'Aktuelles Stylesheet fehlt in der App-Shell');
assert.doesNotMatch(worker, /(?:media-store|teacher-auth|video-converter|zip-utils|mediabunny)/, 'Service Worker cached entfernte Download-/Speicherkomponenten');
assert.doesNotMatch(worker, /\.put\s*\(/, 'Service Worker darf Laufzeitdaten nicht dynamisch cachen');
assert.match(worker, /const GUIDE_VIDEOS/, 'Offline-Liste der Leitbild-Videos fehlt');

assert.equal(manifest.display, 'standalone');
assert.match(manifest.description, /ohne Speichern, Download oder Upload/i, 'Manifest beschreibt die flüchtige Nutzung nicht');

console.log('Statische Abnahme erfolgreich: Speicher-, Download-, Galerie- und Anmeldefunktionen sind nicht mehr verbunden.');
