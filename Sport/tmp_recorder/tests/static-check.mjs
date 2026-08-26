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
  'video-converter.js',
  'annotation.js',
  'media-store.js',
  'teacher-auth.js',
  'media-utils.js',
  'zip-utils.js',
  'manifest.webmanifest',
  'package.json',
  'sw.js',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'vendor/mediabunny/mediabunny-1.55.2.min.js',
  'vendor/mediabunny/LICENSE',
  'tests/static-check.mjs',
  'tests/media-store.test.mjs',
  'tests/auth.test.mjs',
  'tests/browser-smoke.mjs',
  'tests/video-converter.test.mjs',
  'tests/zip-utils.test.mjs',
  'tests/service-worker.test.mjs',
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

const [html, app, videoConverter, zipUtils, annotationApp, mediaStore, teacherAuth, worker, styles, manifestText, guidesHtml, guidesStyles, guidesApp, volleyballHtml, playerHtml, playerApp, pritschenHtml, thirdPartyNotices, mediabunnyBundle] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('video-converter.js'),
  read('zip-utils.js'),
  read('annotation.js'),
  read('media-store.js'),
  read('teacher-auth.js'),
  read('sw.js'),
  read('styles.css'),
  read('manifest.webmanifest'),
  read('pages/leitbilder/index.html'),
  read('pages/leitbilder/styles.css'),
  read('pages/leitbilder/app.js'),
  read('pages/leitbilder/volleyball/index.html'),
  read('pages/leitbilder/volleyball/angriffsschlag/index.html'),
  read('pages/leitbilder/volleyball/angriffsschlag/app.js'),
  read('pages/leitbilder/volleyball/pritschen-seitlich/index.html'),
  read('THIRD_PARTY_NOTICES.md'),
  read('vendor/mediabunny/mediabunny-1.55.2.min.js')
]);
const manifest = JSON.parse(manifestText);

assert.match(html, /Content-Security-Policy/i, 'CSP fehlt');
assert.match(html, /connect-src 'none'/, 'CSP muss externe Verbindungen sperren');
assert.match(html, /media-src 'self' blob:/, 'CSP muss nur lokale Blob-Medien erlauben');
assert.match(html, /worker-src 'self' blob:/, 'CSP muss den lokalen Blob-Worker des Videokonverters erlauben');
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
assert.doesNotMatch(html, /class="preview-pane-label"(?![^>]*\shidden)/, 'Beschriftung verdeckt die eigene Aufnahme');
assert.doesNotMatch(html, /id="comparison-pane-label"[^>]*(?<!\shidden)>/, 'Leitbildtitel verdeckt das Vergleichsvideo');
assert.match(html, /data-comparison-src="\.\/Videos\/Spielsportarten\/Volleyball\/Angriffsschlag\/Angriffschlag\.mp4"/, 'Leitbildauswahl für den Vergleich fehlt');
assert.match(html, /data-comparison-src="\.\/Videos\/Spielsportarten\/Volleyball\/Pritschen\/Pritschen%20seitlich\.mp4\?v=38"/, 'Pritschen fehlt in der Leitbildauswahl für den Vergleich');
assert.match(html, /id="comparison-play-button"/, 'eigene Start-/Pause-Taste des Leitbilds fehlt');
assert.match(html, /id="comparison-timeline"/, 'eigene Zeitleiste des Leitbilds fehlt');
assert.match(html, /<video id="comparison-video"[^>]*\smuted(?:\s|=|>)/i, 'Leitbildvergleich muss stummgeschaltet sein');
assert.match(html, /<dialog id="comparison-picker"/, 'modale Leitbildauswahl fehlt');
assert.match(html, /data-comparison-category="individualsportarten"/, 'Individualsport-Schritt der Vergleichsauswahl fehlt');
assert.match(html, /data-comparison-category="spielsportarten"/, 'Spielsport-Schritt der Vergleichsauswahl fehlt');
assert.match(html, /data-comparison-sport="volleyball"/, 'Sportart-Schritt der Vergleichsauswahl fehlt');
assert.match(html, /id="speed-menu"/, 'kompakte Tempoauswahl der eigenen Aufnahme fehlt');
assert.match(html, /id="comparison-speed-menu"/, 'kompakte Tempoauswahl des Leitbilds fehlt');
assert.match(html, /id="photo-save-controls"/, 'Speicherbereich für Fotos fehlt');
assert.match(html, /id="photo-save-button"/, 'Speichern-Button für Fotos fehlt');
assert.match(html, /id="video-save-button"/, 'Speichern-Button für Videos fehlt');
assert.match(html, /id="photo-save-button"[^>]*>\s*<span[^>]*aria-hidden="true"[^>]*><\/span>\s*<\/button>/, 'Foto-Speichern muss eine reine Symboltaste sein');
assert.match(html, /id="video-save-button"[^>]*>\s*<span[^>]*aria-hidden="true"[^>]*><\/span>\s*<\/button>/, 'Video-Speichern muss eine reine Symboltaste sein');
assert.match(html, /<dialog id="video-name-dialog"/, 'Benennungs-Pop-up für Videos fehlt');
assert.match(html, /id="video-name"[^>]*maxlength="80"[^>]*required/, 'Video-Name ist nicht als begrenztes Pflichtfeld umgesetzt');
assert.match(html, /id="video-name-submit"[^>]*>Speichern</, 'Speichern des benannten Videos fehlt');
assert.match(html, /id="video-name-cancel"[^>]*>Abbrechen</, 'Abbruch der Videobenennung fehlt');
assert.doesNotMatch(html, /id="(?:photo|video)-download-button"/, 'In der Aufnahmeansicht ist noch ein Download-Button vorhanden');
assert.doesNotMatch(html, /<dialog id="download-dialog"/, 'Alter Download-Namensdialog ist noch vorhanden');
assert.match(html, /id="settings-button"/, 'Zahnrad für Anmeldung und Einstellungen fehlt');
assert.match(html, /id="settings-button"[^>]*aria-label="Anmeldung und Einstellungen öffnen"/, 'Zahnrad ist nicht zugänglich beschriftet');
assert.match(html, /id="gallery-entry"[^>]*hidden/, 'Galerie-Einstieg muss außerhalb der Anmeldung verborgen sein');
assert.match(html, /id="gallery-view"[^>]*hidden/, 'Galerieansicht fehlt oder ist anfangs sichtbar');
assert.match(html, /id="gallery-back"/, 'Zurück-Taste der Galerie fehlt');
assert.match(html, /id="gallery-grid"/, 'Galerieraster fehlt');
assert.match(html, /id="gallery-empty"/, 'Leerer Zustand der Galerie fehlt');
assert.match(html, /id="gallery-storage-status"/, 'Speicherstatus der Galerie fehlt');
assert.match(html, /id="gallery-select-all"/, 'Alles-auswählen-Kontrollfeld fehlt');
assert.match(html, /id="gallery-selection-count"/, 'Auswahlzähler der Galerie fehlt');
assert.match(html, /id="gallery-delete-selected"[^>]*disabled/, 'Mehrfachlöschung muss ohne Auswahl deaktiviert sein');
assert.match(html, /id="gallery-download-selected"[^>]*disabled/, 'Auswahl-Download muss ohne Auswahl deaktiviert sein');
assert.match(html, /id="gallery-download-selected"[^>]*aria-label="Ausgewählte Aufnahmen herunterladen"[^>]*>[\s\S]*?class="download-action-icon"/, 'Auswahl-Download benötigt eine zugängliche Symboltaste');
assert.match(html, /id="gallery-delete-selected"[^>]*aria-label="Ausgewählte Aufnahmen löschen"[^>]*>[\s\S]*?class="delete-action-icon"/, 'Auswahl-Löschung benötigt eine zugängliche Symboltaste');
assert.match(html, /<dialog id="account-dialog"/, 'Pop-up für Anmeldung und Zurücksetzen fehlt');
assert.match(html, /id="account-login-tab"[^>]*>Anmelden</, 'Anmelden-Option im Zahnrad-Pop-up fehlt');
assert.match(html, /id="account-reset-tab"[^>]*>Zurücksetzen</, 'Zurücksetzen-Option im Zahnrad-Pop-up fehlt');
assert.match(html, /id="account-login-form"/, 'Allgemeines Anmeldeformular fehlt');
assert.match(html, /id="account-new-password"[^>]*type="password"/, 'Feld zur ersten Passwortvergabe fehlt');
assert.match(html, /id="account-confirm-password"[^>]*type="password"/, 'Passwortbestätigung fehlt');
assert.match(html, /id="account-password"[^>]*type="password"/, 'verdecktes Anmeldepasswort fehlt');
assert.match(html, /id="account-biometric-section"/, 'Bereich für die Gerätebestätigung fehlt');
assert.match(html, /id="account-biometric-button"/, 'Taste für die Gerätebestätigung fehlt');
assert.match(html, /id="account-enrollment-step"/, 'Einrichtungsschritt für die Gerätebestätigung fehlt');
assert.match(html, /id="account-enrollment-button"/, 'Taste zum Einrichten der Gerätebestätigung fehlt');
assert.match(html, /id="account-enrollment-skip"/, 'Überspringen der Gerätebestätigung fehlt');
assert.match(html, /id="account-reset-confirmation"/, 'Bestätigungsfeld für den Komplett-Reset fehlt');
assert.match(html, /id="account-reset-submit"[^>]*disabled/, 'Komplett-Reset muss zunächst deaktiviert sein');
assert.match(html, /Zum Bestätigen „Zurücksetzen“ eingeben/, 'Reset verlangt nicht das Bestätigungswort');
assert.match(html, /alle gespeicherten Fotos und Videos unwiderruflich gelöscht/, 'Reset warnt nicht vor der Medienlöschung');
assert.doesNotMatch(html, /Lehrermodus|teacher-login|teacher-mode/i, 'Oberfläche enthält noch einen Lehrerlogin');
assert.match(html, /<dialog id="gallery-viewer-dialog"/, 'Betrachter der Galerie fehlt');
assert.match(html, /id="gallery-viewer-photo"/, 'Fotobetrachter der Galerie fehlt');
assert.match(html, /id="gallery-viewer-video"[^>]*\smuted(?:\s|=|>)/, 'Videobetrachter der Galerie muss stumm sein');
assert.match(html, /id="gallery-play-button"/, 'Start-/Pause-Taste der Galerie fehlt');
assert.match(html, /id="gallery-timeline"/, 'Zeitleiste der Galerie fehlt');
assert.match(html, /id="gallery-speed-menu"/, 'Tempoauswahl der Galerie fehlt');
assert.match(html, /id="gallery-annotation-button"/, 'Annotations-Taste der Galerie fehlt');
assert.match(html, /id="gallery-download-button"/, 'Download ist nicht ausschließlich in der Galerie verfügbar');
assert.deepEqual(
  [...html.matchAll(/id="([^"]*download-button)"/g)].map((match) => match[1]),
  ['gallery-download-button'],
  'Ein Download-Button darf nur im Galeriebetrachter existieren'
);
assert.match(html, /<dialog id="mp4-conversion-dialog"/, 'Fortschrittsdialog für die MP4-Konvertierung fehlt');
assert.match(html, /id="mp4-conversion-progress"/, 'Fortschrittsanzeige für die MP4-Konvertierung fehlt');
assert.match(html, /id="mp4-conversion-download"[^>]*hidden/, 'Bestätigter MP4-Download nach der Konvertierung fehlt');
assert.match(html, /id="mp4-conversion-cancel"/, 'Abbruch der MP4-Konvertierung fehlt');
assert.match(html, /id="gallery-delete-button"/, 'Einzellöschung der Galerie fehlt');
assert.match(html, /id="gallery-viewer-status"/, 'Status des Galeriebetrachters fehlt');
assert.match(html, /<dialog id="gallery-delete-dialog"/, 'Bestätigungsdialog zum Löschen fehlt');
assert.match(html, /id="gallery-delete-confirm"/, 'Bestätigungstaste zum Löschen fehlt');
assert.match(html, /id="gallery-delete-cancel"/, 'Abbruch der Löschung fehlt');
assert.match(html, /id="video-annotation-button"/, 'Annotations-Button für die eigene Aufnahme fehlt');
assert.match(html, /id="comparison-annotation-button"/, 'Annotations-Button für das Leitbild fehlt');
assert.match(html, /<dialog id="annotation-dialog"/, 'Annotationsfenster fehlt');
assert.match(html, /data-annotation-tool="pen"/, 'Freihandstift fehlt');
assert.match(html, /data-annotation-tool="eraser"/, 'Radiergummi fehlt');
assert.match(html, /data-annotation-color="#ef4f3f"/, 'Farbauswahl für Annotationen fehlt');
assert.match(html, /styles\.css\?v=34/, 'Versionskennung gegen veraltetes Player-CSS fehlt');
assert.match(html, /app\.js\?v=35/, 'Versionskennung gegen veraltete Player-Logik fehlt');
assert.doesNotMatch(html, /speed-chevron|⌃/, 'Geschwindigkeitsknopf enthält noch ein Pfeilsymbol');
assert.doesNotMatch(html, /<button id="(?:play|comparison-play)-button"[^>]*>[\s\S]*?<span>(?:Start|Pause)<\/span>/, 'Player zeigt noch Start-/Pause-Text');
assert.match(app, /toggleComparisonPlayback/, 'unabhängige Wiedergabesteuerung des Leitbilds fehlt');
assert.match(app, /showModal/, 'modales Öffnen der Leitbildauswahl fehlt');
assert.match(app, /comparisonTimeline\.addEventListener/, 'unabhängige Zeitleistensteuerung des Leitbilds fehlt');
assert.match(app, /dataset\.comparisonSpeed/, 'unabhängige Temporegelung des Leitbilds fehlt');
assert.match(app, /link\.download\s*=/, 'lokaler Einzeldownload aus der Galerie fehlt');
assert.match(app, /convertWebMToMp4/, 'WebM-zu-MP4-Konvertierung ist nicht mit dem Galeriedownload verbunden');
assert.match(app, /isWebMVideo/, 'WebM-Erkennung vor dem Galeriedownload fehlt');
assert.match(app, /mp4DownloadName/, 'MP4-Dateiname übernimmt den vergebenen Videonamen nicht');
assert.doesNotMatch(app, /photoDownloadButton|videoDownloadButton|downloadDialog|openDownloadDialog/, 'veralteter Downloadablauf der Aufnahmeansicht ist noch verbunden');
assert.match(app, /saveMedia/, 'explizites Speichern der aktuellen Aufnahme fehlt');
assert.match(app, /saveCurrentMedia\('video',[\s\S]*\{ title \}/, 'Der vergebene Videoname wird beim Speichern nicht weitergegeben');
assert.match(app, /listMedia/, 'Laden der lokalen Galerie fehlt');
assert.match(app, /getMedia/, 'Öffnen eines Galerieeintrags fehlt');
assert.match(app, /deleteMedia/, 'Löschen aus der lokalen Galerie fehlt');
assert.match(app, /requestPersistentStorage/, 'Anfrage für bestmögliche dauerhafte Speicherung fehlt');
assert.match(app, /setInitialPassword/, 'Erstmalige lokale Passwortvergabe ist nicht verbunden');
assert.match(app, /verifyPassword/, 'Lokale Passwortprüfung ist nicht verbunden');
assert.match(app, /resetAuthentication/, 'Zurücksetzen der lokalen Anmeldung ist nicht verbunden');
assert.match(app, /resetMediaStore/, 'Komplettlöschung der Galerie ist nicht verbunden');
assert.match(app, /BroadcastChannel\('sportkamera-account-v1'\)/, 'Komplett-Reset wird nicht an weitere offene App-Fenster gemeldet');
assert.match(app, /authenticateWithPlatform/, 'Gerätebestätigung der Anmeldung ist nicht verbunden');
assert.match(app, /enrollPlatformCredential/, 'Einrichtung der Gerätebestätigung ist nicht verbunden');
assert.match(app, /gallerySelectedIds|selectedGalleryIds/, 'Mehrfachauswahl der Galerie fehlt');
assert.match(app, /createZip/, 'Gebündelter ZIP-Download der Galerie fehlt');
assert.match(app, /selectedItems\.length === 1[\s\S]*downloadGalleryItem/, 'Ein einzelner ausgewählter Eintrag wird nicht direkt heruntergeladen');
assert.match(zipUtils, /application\/zip/, 'ZIP-Erstellung verwendet nicht den passenden Dateityp');
assert.doesNotMatch(zipUtils, /\b(?:fetch|XMLHttpRequest|WebSocket|FormData|sendBeacon)\b/, 'ZIP-Erstellung darf keine Medien über das Netzwerk senden');
assert.match(app, /galleryDeleteDialog\.showModal|galleryDeleteDialog\?\.showModal/, 'Löschen verlangt keine modale Bestätigung');
assert.match(app, /annotation\.open\(elements\.galleryViewerVideo/, 'Annotation eines gespeicherten Videos ist nicht verbunden');
assert.match(app, /annotation\.open\(elements\.videoPreview/, 'Annotation der eigenen Aufnahme ist nicht verbunden');
assert.match(app, /elements\.comparisonVideo/, 'Annotation des Leitbilds ist nicht verbunden');
assert.match(annotationApp, /drawImage\(video/, 'Aktueller Videoframe wird nicht extrahiert');
assert.match(annotationApp, /pointerdown/, 'Freihandzeichnen per Stift oder Finger fehlt');
assert.match(annotationApp, /destination-out/, 'Radierer entfernt keine Zeichnung');
assert.match(annotationApp, /frameCanvas\.width = 0/, 'Frame wird beim Schließen nicht verworfen');
assert.doesNotMatch(app, /syncComparisonPosition|hasActiveComparison/, 'veraltete Synchronsteuerung ist noch vorhanden');

assert.match(videoConverter, /mediabunny-\$\{MEDIABUNNY_VERSION\}\.min\.js/, 'lokale Mediabunny-Bibliothek wird nicht geladen');
assert.match(videoConverter, /codec:\s*'avc'/, 'MP4-Konvertierung erzwingt keinen H.264-/AVC-Videocodec');
assert.match(videoConverter, /forceTranscode:\s*true/, 'WebM wird nicht tatsächlich transkodiert');
assert.match(videoConverter, /hardwareAcceleration,/, 'Gewählte Hardwarebeschleunigung wird nicht an den Konverter übergeben');
assert.match(videoConverter, /'prefer-hardware',\s*'no-preference'/, 'Browser-Fallback ohne erzwungene Hardwarebeschleunigung fehlt');
assert.match(videoConverter, /forceTranscode:\s*false/, 'MP4-Umpacken für Browser ohne H.264-Encoder fehlt');
assert.match(videoConverter, /audio:\s*\{ discard:\s*true \}/, 'Tonspur muss bei den stummen Sportkamera-Videos verworfen werden');
assert.match(videoConverter, /type:\s*'video\/mp4'/, 'Konverter gibt keinen echten MP4-Blob zurück');
assert.match(videoConverter, /signal\?\.aborted/, 'MP4-Konvertierung kann nicht sicher abgebrochen werden');
assert.doesNotMatch(videoConverter, /\b(?:fetch|XMLHttpRequest|WebSocket|FormData|sendBeacon)\b/, 'Videokonverter darf keine Medien über das Netzwerk senden');
assert.match(thirdPartyNotices, /Mediabunny 1\.55\.2/, 'Drittanbieterhinweis nennt nicht die gebündelte Mediabunny-Version');
assert.match(thirdPartyNotices, /Mozilla Public License 2\.0/, 'Mediabunny-Lizenzhinweis fehlt');
assert.match(thirdPartyNotices, /ADDD26C70765F44C93EDFA03331B6E6D6B17B2689F9E035A4F4085F17EA9578A/, 'Prüfsumme des Mediabunny-Bundles fehlt');
assert.match(mediabunnyBundle.slice(0, 1000), /Mozilla Public\s+\*?\s*License/, 'Lizenzkopf fehlt im Mediabunny-Bundle');

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
assert.match(playerHtml, /id="guide-annotation-button"/, 'Annotations-Button des Angriffsschlags fehlt');
assert.match(playerHtml, /<dialog id="annotation-dialog"/, 'Annotationsfenster des Angriffsschlags fehlt');
assert.doesNotMatch(playerHtml, /<video[^>]*\scontrols(?:\s|=|>)/i, 'Leitbild verwendet native Videosteuerung');
assert.match(playerHtml, /<video id="guide-video"[^>]*\smuted(?:\s|=|>)/i, 'Angriffsschlag muss stummgeschaltet sein');
assert.doesNotMatch(playerHtml, /https?:\/\//i, 'Player-Seite enthält eine externe Ressource');
assert.doesNotMatch(playerApp, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/, 'Player-Code enthält eine Netzwerk- oder Speicher-API');
assert.match(playerApp, /playbackRate/, 'Geschwindigkeitssteuerung für Leitbilder fehlt');
assert.match(playerApp, /annotation\.open/, 'Annotationsfunktion für Leitbilder fehlt');

assert.match(pritschenHtml, /Content-Security-Policy/i, 'CSP der Pritschen-Seite fehlt');
assert.match(pritschenHtml, /Videos\/Spielsportarten\/Volleyball\/Pritschen\/Pritschen%20seitlich\.mp4\?v=38/, 'Pritschen-Leitbild fehlt');
assert.match(pritschenHtml, /data-guide-speed="0\.25"/, 'langsame Pritschen-Wiedergabe fehlt');
assert.match(pritschenHtml, /data-guide-speed="0\.5"/, 'mittlere Pritschen-Wiedergabe fehlt');
assert.match(pritschenHtml, /data-guide-speed="1"/, 'normale Pritschen-Wiedergabe fehlt');
assert.match(pritschenHtml, /id="guide-annotation-button"/, 'Annotations-Button des Pritschen-Leitbilds fehlt');
assert.match(pritschenHtml, /<dialog id="annotation-dialog"/, 'Annotationsfenster des Pritschen-Leitbilds fehlt');
assert.doesNotMatch(pritschenHtml, /<video[^>]*\scontrols(?:\s|=|>)/i, 'Pritschen-Player verwendet native Videosteuerung');
assert.match(pritschenHtml, /<video id="guide-video"[^>]*\smuted(?:\s|=|>)/i, 'Pritschen muss stummgeschaltet sein');
assert.doesNotMatch(pritschenHtml, /https?:\/\//i, 'Pritschen-Seite enthält eine externe Ressource');

const forbiddenAppApis = /\b(?:fetch|XMLHttpRequest|WebSocket|FormData|localStorage|sessionStorage|indexedDB)\b/;
assert.doesNotMatch(app, forbiddenAppApis, 'App-Code enthält eine verbotene Übertragungs- oder Speicher-API');
assert.doesNotMatch(annotationApp, forbiddenAppApis, 'Annotations-Code enthält eine verbotene Übertragungs- oder Speicher-API');
const forbiddenNetworkApis = /\b(?:fetch|XMLHttpRequest|WebSocket|FormData)\b/;
assert.doesNotMatch(mediaStore, forbiddenNetworkApis, 'Medienspeicher darf keine Netzwerk-API verwenden');
assert.doesNotMatch(teacherAuth, forbiddenNetworkApis, 'Lehreranmeldung darf keine Netzwerk-API verwenden');
assert.match(mediaStore, /navigator\.storage\.getDirectory/, 'OPFS-Stammverzeichnis wird nicht verwendet');
assert.match(mediaStore, /createWritable/, 'OPFS-Dateien werden nicht schreibbar geöffnet');
assert.match(mediaStore, /removeEntry/, 'OPFS-Löschung fehlt');
assert.match(mediaStore, /indexedDB\.open/, 'IndexedDB-Fallback für ältere Safari-Versionen fehlt');
assert.match(mediaStore, /FileSystemFileHandle[\s\S]*createWritable/, 'OPFS-Unterstützung wird nicht auf Schreibfähigkeit geprüft');
assert.match(mediaStore, /export async function requestPersistentStorage/, 'Schnittstelle für bestmögliche dauerhafte Speicherung fehlt');
assert.match(mediaStore, /export async function resetMediaStore/, 'Schnittstelle für vollständige Medienlöschung fehlt');
assert.match(mediaStore, /IDB_METADATA_STORE[\s\S]*\.clear\(\)/, 'IndexedDB-Metadaten werden beim Reset nicht geleert');
assert.match(mediaStore, /removeEntry\(STORE_DIRECTORY, \{ recursive: true \}\)/, 'OPFS-Medien werden beim Reset nicht vollständig entfernt');
assert.match(mediaStore, /storage\.persist\(\)/, 'bestmögliche dauerhafte Speicherung wird nicht angefragt');
assert.match(mediaStore, /createdAt/, 'Zeitstempel für die Galeriesortierung fehlt');
assert.match(mediaStore, /titleDownloadStem[\s\S]*suggestedDownloadName/, 'Videoname wird nicht als Download-Dateiname verwendet');
assert.match(mediaStore, /records\.sort\([\s\S]*right\.createdAtMs\s*-\s*left\.createdAtMs/, 'Galerie wird nicht mit den neuesten Aufnahmen zuerst sortiert');
assert.doesNotMatch(mediaStore, /\bcaches\./, 'Nutzermedien dürfen nicht in Cache Storage gespeichert werden');
assert.match(teacherAuth, /PBKDF2/, 'PBKDF2-Passwortprüfung fehlt');
assert.match(teacherAuth, /crypto\.subtle/, 'Web-Crypto-Prüfung der Lehreranmeldung fehlt');
assert.match(teacherAuth, /navigator\.credentials\.create/, 'Einrichtung des Plattform-Authentifikators fehlt');
assert.match(teacherAuth, /navigator\.credentials\.get/, 'Anmeldung mit Plattform-Authentifikator fehlt');
assert.match(teacherAuth, /authenticatorAttachment:\s*['"]platform['"]/, 'WebAuthn muss den Plattform-Authentifikator anfordern');
assert.match(teacherAuth, /userVerification:\s*['"]required['"]/, 'WebAuthn muss eine Benutzerverifikation verlangen');
assert.match(teacherAuth, /crypto\.subtle\.verify/, 'WebAuthn-Signatur wird nicht lokal geprüft');
assert.match(teacherAuth, /indexedDB\.open/, 'IndexedDB-Fallback der Lehreranmeldung fehlt');
assert.match(teacherAuth, /FileSystemFileHandle[\s\S]*createWritable/, 'Auth-Speicher prüft OPFS nicht auf Schreibfähigkeit');
assert.match(teacherAuth, /authorization-required/, 'WebAuthn-Einrichtung ist nicht an eine Passwortprüfung gebunden');
assert.match(teacherAuth, /export async function setInitialPassword/, 'Erstmalige Passwortvergabe fehlt');
assert.match(teacherAuth, /randomBytes\(16\)/, 'Passwortvergabe verwendet keinen zufälligen Salt');
assert.match(teacherAuth, /export async function verifyPassword/, 'Prüfung des selbst vergebenen Passworts fehlt');
assert.match(teacherAuth, /export async function resetAuthentication/, 'Vollständiges Zurücksetzen der Anmeldung fehlt');
assert.doesNotMatch(teacherAuth, /PASSWORD_(?:SALT|DERIVED)_BASE64/, 'Ein statischer Passwortprüfwert ist noch vorhanden');

const passwordScanFiles = requiredFiles.filter((file) => /\.(?:html|css|js|mjs|json|md|webmanifest)$/.test(file));
const optionalPlaintextPassword = process.env.SPORTKAMERA_TEST_PASSWORD || '';
if (optionalPlaintextPassword) {
  await Promise.all(passwordScanFiles.map(async (file) => {
    assert.ok(!(await read(file)).includes(optionalPlaintextPassword), `${file} enthält das Klartextpasswort`);
  }));
}
assert.doesNotMatch(
  teacherAuth,
  /(?:plain|clear|raw)[_-]?password\s*=/i,
  'Lehreranmeldung enthält eine Klartextpasswort-Konstante'
);
assert.match(teacherAuth, /derivedKey/, 'lokal gespeicherter abgeleiteter Passwortprüfwert fehlt');
assert.match(app, /audio:\s*false/, 'Mikrofon muss ausdrücklich deaktiviert sein');
assert.match(app, /URL\.revokeObjectURL/, 'Object URLs werden nicht freigegeben');
assert.match(app, /mediaChunks\.splice/, 'Recorder-Fragmente werden nicht zentral geleert');
assert.match(app, /pagehide/, 'Bereinigung bei pagehide fehlt');
assert.match(app, /beforeunload/, 'Bereinigung beim Verlassen fehlt');
assert.match(app, /visibilitychange/, 'Bereinigung beim Wechsel in den Hintergrund fehlt');
assert.match(app, /teacherAuthOperationId/, 'Schutz gegen verspätete Anmeldevorgänge fehlt');
assert.match(app, /galleryViewerRequestId/, 'Schutz gegen überholte Galeriebetrachter fehlt');
assert.match(app, /galleryLoadId/, 'Schutz gegen überholte Galerieladevorgänge fehlt');
assert.match(app, /IntersectionObserver/, 'Speicherschonendes Nachladen der Galerievorschauen fehlt');
assert.match(app, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/, 'Kameratracks werden nicht beendet');
assert.match(app, /width:\s*\{ ideal: 1280 \}/, 'ideale 720p-Breite fehlt');
assert.match(app, /height:\s*\{ ideal: 720 \}/, 'ideale 720p-Höhe fehlt');
assert.match(app, /frameRate:\s*\{ ideal: 30 \}/, 'ideale Bildrate fehlt');

assert.match(worker, /const APP_SHELL/, 'statische App-Shell fehlt');
assert.match(worker, /const GUIDE_VIDEOS/, 'Offline-Liste der Leitbild-Videos fehlt');
assert.match(worker, /ALLOWED_URLS\.has/, 'Service Worker hat keine feste Positivliste');
assert.match(worker, /name\.startsWith\(CACHE_PREFIX\)/, 'alte App-Caches werden nicht bereinigt');
assert.match(worker, /CACHE_VERSION\s*=\s*'v39'/, 'Cache-Version v39 fehlt');
assert.match(worker, /\.\/app\.js\?v=35/, 'aktuelle App-Logik fehlt in der statischen App-Shell');
assert.match(worker, /\.\/styles\.css\?v=34/, 'aktuelles Stylesheet fehlt in der statischen App-Shell');
assert.match(worker, /\.\/video-converter\.js\?v=35/, 'Videokonverter fehlt in der statischen App-Shell');
assert.match(worker, /\.\/zip-utils\.js\?v=33/, 'ZIP-Erstellung fehlt in der statischen App-Shell');
assert.match(worker, /\.\/vendor\/mediabunny\/mediabunny-1\.55\.2\.min\.js\?v=1\.55\.2/, 'lokaler Mediabunny-Konverter fehlt im Offline-Cache');
assert.match(worker, /\.\/media-store\.js\?v=31/, 'versionierter Medienspeicher fehlt in der statischen App-Shell');
assert.match(worker, /\.\/teacher-auth\.js\?v=30/, 'versionierte lokale Anmeldung fehlt in der statischen App-Shell');
assert.match(worker, /Angriffsschlag\/Angriffschlag\.mp4/, 'Angriffsschlag fehlt im Offline-Leitbildcache');
assert.match(worker, /Pritschen\/Pritschen%20seitlich\.mp4/, 'Pritschen fehlt im Offline-Leitbildcache');
assert.match(worker, /status:\s*206/, 'Byte-Range-Antwort für Offline-Leitbilder fehlt');
assert.match(worker, /Content-Range/, 'Content-Range für Offline-Leitbilder fehlt');
assert.doesNotMatch(worker, /\.put\s*\(/, 'Service Worker darf Laufzeitdaten nicht dynamisch cachen');
assert.doesNotMatch(worker, /blob:/i, 'Service Worker darf keine Blob-Adresse enthalten');
assert.doesNotMatch(worker, /sportkamera-media-v1/, 'Service Worker darf das OPFS-Medienverzeichnis nicht cachen');

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.orientation, 'any');
assert.ok(manifest.start_url.startsWith('./') && manifest.scope.startsWith('./'), 'Manifest-Pfade müssen relativ sein');
assert.ok(manifest.icons.every((icon) => icon.src.startsWith('./')), 'Symbolpfade müssen relativ sein');
assert.match(manifest.description, /Galerie/i, 'Manifest beschreibt die lokale Galerie nicht');
assert.match(manifest.description, /ohne Upload/, 'Manifest muss den Verzicht auf Uploads nennen');
assert.doesNotMatch(manifest.description, /ohne (?:eine )?dauerhafte Speicherung/i, 'Manifest behauptet noch, dass es keine dauerhafte Speicherung gibt');

assert.match(styles, /env\(safe-area-inset-top\)/, 'sichere iPad-Bildschirmränder fehlen');
assert.match(styles, /orientation:\s*landscape/, 'Querformat-Anpassung fehlt');
assert.match(styles, /prefers-reduced-motion/, 'Bewegungsreduktion fehlt');
assert.match(styles, /\.save-icon-button/, 'Symboltaste zum lokalen Speichern ist nicht gestaltet');
assert.match(styles, /\.settings-button/, 'Zahnrad-Taste ist nicht gestaltet');
assert.match(styles, /\.account-tabs/, 'Anmelden-/Zurücksetzen-Auswahl ist nicht gestaltet');
assert.match(styles, /\.account-dialog/, 'Anmeldungs-Pop-up ist nicht gestaltet');
assert.match(styles, /\.video-name-dialog/, 'Benennungs-Pop-up ist nicht gestaltet');
assert.match(styles, /\.gallery-card/, 'Galeriekarten sind nicht gestaltet');
assert.match(styles, /\.gallery-card-selection/, 'Mehrfachauswahl der Galeriekarten ist nicht gestaltet');
assert.match(styles, /\.gallery-viewer-dialog/, 'Galeriebetrachter ist nicht gestaltet');
assert.match(styles, /\.mp4-conversion-dialog/, 'MP4-Konvertierungsdialog ist nicht gestaltet');

console.log(`Statische Abnahme erfolgreich: ${requiredFiles.length} Dateien und alle Datenschutz-/PWA-Regeln geprüft.`);
