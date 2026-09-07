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
  'pages/leitbilder/guide-tree.js',
  'tools/build-leitbilder.mjs',
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

const [html, app, videoConverter, zipUtils, annotationApp, mediaStore, teacherAuth, worker, styles, manifestText, guidesHtml, guidesStyles, guidesApp, guideTree, guideBuilder, thirdPartyNotices, mediabunnyBundle, mediaUtils] = await Promise.all([
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
  read('pages/leitbilder/guide-tree.js'),
  read('tools/build-leitbilder.mjs'),
  read('THIRD_PARTY_NOTICES.md'),
  read('vendor/mediabunny/mediabunny-1.55.2.min.js'),
  read('media-utils.js')
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
assert.match(html, /id="comparison-list"/, 'Leitbildauswahl für den Vergleich fehlt');
assert.doesNotMatch(html, /data-comparison-src=/, 'Die Leitbildauswahl ist noch fest verdrahtet statt erzeugt');
assert.match(app, /from '\.\/pages\/leitbilder\/guide-tree\.js/, 'Die Vergleichsauswahl nutzt den erzeugten Leitbild-Index nicht');
assert.match(html, /id="comparison-play-button"/, 'eigene Start-/Pause-Taste des Leitbilds fehlt');
assert.match(html, /id="comparison-timeline"/, 'eigene Zeitleiste des Leitbilds fehlt');
assert.match(html, /<video id="comparison-video"[^>]*\smuted(?:\s|=|>)/i, 'Leitbildvergleich muss stummgeschaltet sein');
assert.match(html, /<dialog id="comparison-picker"/, 'modale Leitbildauswahl fehlt');
assert.match(html, /id="comparison-up"/, 'Rückschritt der Vergleichsauswahl fehlt');
assert.match(html, /id="comparison-breadcrumb"/, 'Pfadanzeige der Vergleichsauswahl fehlt');
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
assert.doesNotMatch(html, /id="account-new-password"|id="account-confirm-password"|id="account-setup-step"/, 'Eigene Passwortvergabe ist noch im Anmeldedialog vorhanden');
assert.match(html, /id="account-password"[^>]*type="password"/, 'verdecktes Anmeldepasswort fehlt');
assert.match(html, /id="delay-entry"/, 'Startkarte für die verzögerte Wiedergabe fehlt');
assert.match(html, /id="delay-view"/, 'Ansicht für die verzögerte Wiedergabe fehlt');
assert.match(html, /id="delay-video"[^>]*playsinline/, 'Livebild der verzögerten Wiedergabe fehlt');
assert.match(html, /<canvas id="delay-canvas"/, 'Zeichenfläche der verzögerten Wiedergabe fehlt');
assert.match(html, /id="delay-countdown"[^>]*role="timer"/, 'Countdown der verzögerten Wiedergabe fehlt');
assert.match(html, /id="delay-settings"[^>]*aria-controls="delay-dialog"/, 'Zahnrad für die Verzögerung fehlt');
assert.match(
  html,
  /id="delay-knob"[^>]*role="slider"[^>]*aria-valuemin="1"[^>]*aria-valuemax="60"/,
  'Drehregler der Verzögerung fehlt oder deckt nicht 1 bis 60 Sekunden ab'
);
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
assert.match(guidesHtml, /styles\.css\?v=40/, 'Leitbilder-Seite lädt ein veraltetes Stylesheet');
assert.match(html, /styles\.css\?v=40/, 'Versionskennung gegen veraltetes Player-CSS fehlt');
assert.match(html, /app\.js\?v=42/, 'Versionskennung gegen veraltete Player-Logik fehlt');
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
assert.doesNotMatch(app, /setInitialPassword/, 'Eigene Passwortvergabe ist noch verbunden');
assert.match(app, /verifyPassword/, 'Prüfung des festen Passworts ist nicht verbunden');
assert.match(app, /resetAuthentication/, 'Zurücksetzen der lokalen Anmeldung ist nicht verbunden');
assert.match(app, /resetMediaStore/, 'Komplettlöschung der Galerie ist nicht verbunden');
assert.match(app, /BroadcastChannel\('sportkamera-account-v1'\)/, 'Komplett-Reset wird nicht an weitere offene App-Fenster gemeldet');
assert.match(app, /authenticateWithPlatform/, 'Gerätebestätigung der Anmeldung ist nicht verbunden');
assert.match(app, /enrollPlatformCredential/, 'Einrichtung der Gerätebestätigung ist nicht verbunden');
assert.match(app, /startDelayedPlayback/, 'Start der verzögerten Wiedergabe ist nicht verbunden');
assert.match(app, /restartDelaySession/, 'Neustart der verzögerten Wiedergabe fehlt');
assert.match(
  app,
  /function setDelaySeconds[\s\S]*?restartDelaySession\(\)/,
  'Eine geänderte Verzögerung startet die Wiedergabe nicht neu'
);
assert.match(app, /createImageBitmap/, 'Dekodierung der gepufferten Einzelbilder fehlt');
assert.match(app, /stopDelaySession\(\)/, 'Bildpuffer wird nicht zentral bereinigt');
assert.match(
  app,
  /function cleanupMedia\([\s\S]{0,120}stopDelaySession\(\)/,
  'Verzögerte Wiedergabe hängt nicht an der zentralen Bereinigung'
);
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

[html, guidesHtml].forEach((pageHtml) => {
  assert.doesNotMatch(pageHtml, /class="step-label"><span>\d+<\/span>/, 'Nummerierung der Ablaufschritte ist noch vorhanden');
});

assert.match(guidesHtml, /Content-Security-Policy/i, 'CSP der Leitbilder-Seite fehlt');
assert.match(guidesHtml, /id="guides-list"/, 'Liste der Leitbilder fehlt');
assert.match(guidesHtml, /id="guides-player"/, 'Player der Leitbilder-Seite fehlt');
assert.match(guidesHtml, /data-guide-speed="0\.25"/, 'langsame Leitbild-Wiedergabe fehlt');
assert.match(guidesHtml, /data-guide-speed="0\.5"/, 'mittlere Leitbild-Wiedergabe fehlt');
assert.match(guidesHtml, /data-guide-speed="1"/, 'normale Leitbild-Wiedergabe fehlt');
assert.match(guidesHtml, /id="guide-annotation-button"/, 'Annotations-Button der Leitbilder fehlt');
assert.match(guidesHtml, /<dialog id="annotation-dialog"/, 'Annotationsfenster der Leitbilder fehlt');
assert.doesNotMatch(guidesHtml, /<video[^>]*\scontrols(?:\s|=|>)/i, 'Leitbild verwendet native Videosteuerung');
assert.match(guidesHtml, /<video id="guide-video"[^>]*\smuted(?:\s|=|>)/i, 'Leitbild muss stummgeschaltet sein');
assert.doesNotMatch(guidesHtml, /https?:\/\//i, 'Leitbilder-Seite enthält eine externe Ressource');
assert.doesNotMatch(guidesHtml, /Videos\//, 'Die Leitbilder-Seite darf keine Videoadresse fest enthalten');
assert.doesNotMatch(guidesApp, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/, 'Leitbilder-Code enthält eine Netzwerk- oder Speicher-API');
assert.match(guidesApp, /from '\.\/guide-tree\.js/, 'Die Leitbilder-Seite nutzt den erzeugten Index nicht');
assert.match(guidesApp, /playbackRate/, 'Geschwindigkeitssteuerung für Leitbilder fehlt');
assert.match(guidesApp, /annotation\.open/, 'Annotationsfunktion für Leitbilder fehlt');
assert.match(guidesApp, /function enforceMuted[\s\S]*?muted = true/, 'Leitbilder erzwingen die Stummschaltung nicht');
assert.match(guidesApp, /addEventListener\('volumechange', enforceMuted\)/, 'Eine geänderte Lautstärke wird nicht zurückgesetzt');

// Der Index wird erzeugt, nicht von Hand gepflegt.
assert.match(guideTree, /Automatisch erzeugt von tools\/build-leitbilder\.mjs/, 'Der Leitbild-Index ist nicht als erzeugt gekennzeichnet');
assert.match(guideTree, /export const GUIDE_TREE = Object\.freeze\(/, 'Der Leitbild-Index exportiert keinen Baum');
assert.match(guideBuilder, /export function hasAudioTrack/, 'Prüfung auf Tonspuren im Generator fehlt');
assert.match(guideBuilder, /export function collapse/, 'Zusammenfassen einzelner Videoordner fehlt');
assert.match(guideBuilder, /VIDEO_EXTENSIONS/, 'Der Generator kennt keine Videoendungen');

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
assert.match(mediaUtils, /export const DELAY_MAX_SECONDS = 60;/, 'Obergrenze von 60 Sekunden Verzögerung fehlt');
assert.match(mediaUtils, /export function knobAngleToDelaySeconds/, 'Umrechnung des Drehreglers fehlt');
assert.match(mediaUtils, /export function formatDelayCountdown/, 'Countdown-Formatierung der Verzögerung fehlt');
assert.match(styles, /\.delay-knob/, 'Drehregler ist nicht gestaltet');
assert.match(
  styles,
  /\.delay-countdown \{[^}]*background:\s*#071d24;/,
  'Countdown der verzögerten Wiedergabe verdeckt das Livebild nicht vollständig'
);
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
assert.doesNotMatch(teacherAuth, /setInitialPassword/, 'Eigene Passwortvergabe ist noch vorhanden');
assert.match(teacherAuth, /export async function verifyPassword/, 'Prüfung des festen Passworts fehlt');
assert.match(teacherAuth, /export async function resetAuthentication/, 'Vollständiges Zurücksetzen der Anmeldung fehlt');
assert.match(teacherAuth, /const PASSWORD_SALT_BASE64URL = '[A-Za-z0-9_-]{22}';/, 'fester Salt des Zugangspassworts fehlt');
assert.match(teacherAuth, /const PASSWORD_DIGEST_BASE64URL = '[A-Za-z0-9_-]{43}';/, 'fester PBKDF2-Prüfwert des Zugangspassworts fehlt');

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
assert.match(
  teacherAuth,
  /decodeBase64\(PASSWORD_DIGEST_BASE64URL[\s\S]*bytesEqual\(derived, expected\)/,
  'Passwortprüfung vergleicht nicht den abgeleiteten Prüfwert'
);
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
assert.match(
  app,
  /frameRate:\s*\{ ideal: CAMERA_TARGET_FRAME_RATE \}/,
  'ideale Bildrate fehlt'
);
assert.match(
  mediaUtils,
  /CAMERA_TARGET_FRAME_RATE\s*=\s*60/,
  'Zielbildrate von 60 Bildern pro Sekunde fehlt'
);
assert.match(
  app,
  /videoBitsPerSecond:\s*videoBitrateForFrameRate\(activeFrameRate\(cameraStream\)\)/,
  'an die Bildrate gekoppelte Datenrate der Aufnahme fehlt'
);
assert.match(
  app,
  /delayCaptureIntervalMs\(delaySeconds\)/,
  'bildratenabhängiger Aufnahmetakt der verzögerten Wiedergabe fehlt'
);

assert.match(
  mediaUtils,
  /PLAYBACK_STEP_SECONDS\s*=\s*0\.1/,
  'fester Sprung von 0,1 Sekunden fehlt'
);
for (const [markup, name] of [[html, 'index.html'], [guidesHtml, 'Leitbilder-Seite']]) {
  assert.match(markup, /class="timeline-row"/, `Zeitstrahl-Zeile fehlt in ${name}`);
  assert.match(markup, /class="step-button"[^>]*aria-label="[^"]*0,1 Sekunden zurück"/, `Taste für 0,1 Sekunden zurück fehlt in ${name}`);
  assert.match(markup, /class="step-button"[^>]*aria-label="[^"]*0,1 Sekunden vor"/, `Taste für 0,1 Sekunden vor fehlt in ${name}`);
}
assert.match(app, /function stepPlayback\(video, direction\)/, 'Sprungfunktion der Player fehlt');
assert.match(app, /stepPlayback\(elements\.videoPreview, -1\)/, 'Sprung in der eigenen Aufnahme fehlt');
assert.match(app, /stepPlayback\(elements\.comparisonVideo, 1\)/, 'Sprung im Leitbild fehlt');
assert.match(app, /stepPlayback\(elements\.galleryViewerVideo, 1\)/, 'Sprung in der Galerie fehlt');
assert.match(guidesApp, /function stepPlayback\(direction\)/, 'Sprung auf der Leitbilder-Seite fehlt');
assert.match(styles, /\.step-button/, 'Tasten für den Sprung sind nicht gestaltet');

assert.match(worker, /const APP_SHELL/, 'statische App-Shell fehlt');
assert.match(worker, /const GUIDE_VIDEOS/, 'Offline-Liste der Leitbild-Videos fehlt');
assert.match(worker, /ALLOWED_URLS\.has/, 'Service Worker hat keine feste Positivliste');
assert.match(worker, /name\.startsWith\(CACHE_PREFIX\)/, 'alte App-Caches werden nicht bereinigt');
assert.match(worker, /CACHE_VERSION\s*=\s*'v47'/, 'Cache-Version v47 fehlt');
assert.match(worker, /\.\/app\.js\?v=42/, 'aktuelle App-Logik fehlt in der statischen App-Shell');
assert.match(worker, /\.\/styles\.css\?v=40/, 'aktuelles Stylesheet fehlt in der statischen App-Shell');
assert.match(worker, /\.\/media-utils\.js\?v=39/, 'versionierte Hilfsfunktionen fehlen in der statischen App-Shell');
assert.match(worker, /\.\/video-converter\.js\?v=35/, 'Videokonverter fehlt in der statischen App-Shell');
assert.match(worker, /\.\/zip-utils\.js\?v=33/, 'ZIP-Erstellung fehlt in der statischen App-Shell');
assert.match(worker, /\.\/vendor\/mediabunny\/mediabunny-1\.55\.2\.min\.js\?v=1\.55\.2/, 'lokaler Mediabunny-Konverter fehlt im Offline-Cache');
assert.match(worker, /\.\/media-store\.js\?v=31/, 'versionierter Medienspeicher fehlt in der statischen App-Shell');
assert.match(worker, /\.\/teacher-auth\.js\?v=31/, 'versionierte lokale Anmeldung fehlt in der statischen App-Shell');
assert.match(
  worker,
  /const GUIDE_VIDEOS = Object\.freeze\(\[\r?\n(?:\s*'\.\/Videos\/[^']+',?\r?\n)+\]\);/,
  'Die erzeugte Leitbildliste des Service Workers fehlt oder hat ein anderes Format'
);
assert.match(worker, /status:\s*206/, 'Byte-Range-Antwort für Offline-Leitbilder fehlt');
assert.match(worker, /Content-Range/, 'Content-Range für Offline-Leitbilder fehlt');
assert.equal(
  (worker.match(/\.put\s*\(/gu) || []).length,
  1,
  'Der Service Worker darf ausschließlich Leitbilder dynamisch cachen'
);
assert.match(
  worker,
  /async function cacheGuideVideo\(url\) \{[\s\S]*?GUIDE_VIDEO_URLS\.has\(url\)[\s\S]*?cache\.put\(url, response\)/,
  'Das nachträgliche Cachen ist nicht auf die Leitbild-Positivliste beschränkt'
);
assert.doesNotMatch(
  worker,
  /addAll\(GUIDE_VIDEOS\)/,
  'Leitbilder dürfen nicht mehr vorab vollständig geladen werden'
);
assert.match(worker, /async function pruneGuideCache/, 'Aufräumen entfernter Leitbilder fehlt');
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
