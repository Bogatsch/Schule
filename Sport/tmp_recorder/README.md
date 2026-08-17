# Sportkamera

Eine installierbare, datensparsame Progressive Web App für direktes Foto- und Video-Feedback im Sportunterricht. Die Anwendung besteht nur aus lokalem HTML, CSS und JavaScript, benötigt keinen Build-Schritt und ist für GitHub Pages vorbereitet.

## Datenschutz in Kürze

Aufnahmen bleiben nur vorübergehend in der App. Sie werden nicht hochgeladen oder automatisch dauerhaft gespeichert. Nur wenn **Download** ausdrücklich gewählt wird, speichert der Browser eine benannte Kopie auf dem Gerät. Beim Verwerfen, bei einer neuen Aufnahme oder beim Verlassen der App wird die aktuelle Aufnahme aus der App entfernt; bereits heruntergeladene Dateien bleiben davon unberührt.

- Die App fordert ausschließlich die Kameraberechtigung an. Videos werden ohne Ton aufgenommen; eine Mikrofonberechtigung wird weder angefragt noch benötigt.
- Fotos werden kurzzeitig in einem Canvas verarbeitet und als Blob im Arbeitsspeicher gehalten.
- Videos entstehen aus den vorübergehenden Fragmenten des `MediaRecorder` und liegen ebenfalls nur als Blob im Arbeitsspeicher.
- Es gibt keine Upload- oder Teilen-Funktion und keine externen Ressourcen, Analysen oder API-Aufrufe. Ein Download findet ausschließlich nach einem ausdrücklichen Tippen auf **Download** statt.
- Medien werden von der App nicht in `localStorage`, `sessionStorage`, IndexedDB oder Cache Storage gespeichert. Nur ein bewusst gestarteter Download legt über die Browserfunktion eine Datei im Download-Ordner ab.
- Der Service Worker speichert ausschließlich den statischen App-Rahmen (HTML, CSS, JavaScript, Manifest und Symbole) für den Offline-Start.
- Beim Bereinigen stoppt die App die Kamera, leert ihre Fragmente, widerruft Object URLs und entfernt alle eigenen Referenzen. Die endgültige Freigabe des Arbeitsspeichers übernimmt der Browser; die App behauptet nicht, Speicherbereiche sofort physisch zu überschreiben.

Beim Hosting finden normale technische Webseitenaufrufe zu GitHub Pages statt, etwa zum Abruf von HTML, CSS, JavaScript und Symbolen. GitHub beziehungsweise beteiligte Netzbetreiber können dabei übliche technische Verbindungsdaten wie IP-Adresse, Zeitpunkt und User-Agent verarbeiten. Bild- oder Videodaten werden von der App bei diesen Aufrufen nicht übertragen.

Screenshots und Bildschirmaufnahmen durch iPadOS, andere Betriebssystemfunktionen oder Personen mit Zugriff auf das Gerät kann eine Web-App nicht verhindern.

## Lokal testen

Ein Doppelklick auf `index.html` reicht nicht aus: Kamerazugriff und Service Worker sind aus Sicherheitsgründen nur in einem sicheren Kontext verfügbar. Browser behandeln `http://localhost` für die Entwicklung als sicheren Kontext; im Internet ist HTTPS erforderlich.

Im Ordner `Random/tmp_recorder` einen lokalen Server starten:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Dann `http://127.0.0.1:8080/` im Browser öffnen. Alternativ kann der Server im Repository-Stamm gestartet und `http://127.0.0.1:8080/Random/tmp_recorder/` geöffnet werden.

Automatisierte Prüfungen benötigen nur eine aktuelle Node.js-Version und keine Installation externer Pakete:

```powershell
npm test
```

Die Tests prüfen JavaScript-Syntax, Formatauswahl, Zeitbegrenzung und -formatierung, relative Pfade, PWA-Metadaten, die feste Cache-Positivliste, zentrale Bereinigungsereignisse sowie die lokale Download-Funktion ohne Upload.

## GitHub Pages aktivieren

Da alle Pfade relativ sind, kann die App direkt aus diesem Repository-Unterordner bereitgestellt werden:

1. Das Repository zu GitHub übertragen und den gewünschten Hauptbranch öffnen (meist `main`).
2. In GitHub **Settings → Pages** öffnen.
3. Unter **Build and deployment** als Quelle **Deploy from a branch** wählen.
4. Den Hauptbranch und den Ordner **/(root)** auswählen, dann **Save** wählen.
5. Nach der Bereitstellung die Adresse `https://BENUTZERNAME.github.io/REPOSITORY/Random/tmp_recorder/` öffnen. Bei einem anderen Repository-Namen ändert sich nur dieser Teil der Adresse.

Diese Variante verändert die bestehende Repository-Struktur nicht. GitHub Pages liefert die App automatisch per HTTPS aus. Bei einem privaten Repository hängt die Pages-Verfügbarkeit vom verwendeten GitHub-Tarif ab.

## Auf dem iPad öffnen und installieren

1. Die oben genannte HTTPS-Adresse in **Safari** auf dem iPad öffnen.
2. **Foto** oder **Video** wählen.
3. Die Safari-Abfrage für den Kamerazugriff mit **Erlauben** bestätigen. Für Video wird ausdrücklich kein Mikrofonzugriff benötigt.
4. Zum Installieren in Safari die **Teilen**-Schaltfläche öffnen und **Zum Home-Bildschirm** wählen.
5. Falls iPadOS die Option anbietet, **Als Web-App öffnen** aktiviert lassen und mit **Hinzufügen** bestätigen.
6. Die Sportkamera anschließend über ihr Symbol auf dem Home-Bildschirm starten. Nach einem ersten erfolgreichen Online-Start steht der statische App-Rahmen auch offline bereit; die Kamera selbst arbeitet lokal.

Falls die Kameraberechtigung zuvor verweigert wurde, in Safari über die Seiteneinstellungen (Symbol links in der Adressleiste) **Website-Einstellungen → Kamera → Erlauben** wählen und die Seite neu laden.

## Bedienung

- **Foto** erstellt einen einzelnen Schnappschuss über Canvas.
- **Video** zeichnet maximal 3 Minuten ohne Ton auf und beendet die Aufnahme automatisch. Erneutes Tippen auf die Aufnahmetaste beendet sie früher. Die App bevorzugt WebM und verwendet MP4 automatisch als Fallback, wenn der Browser WebM nicht aufnehmen kann.
- **Kamera wechseln** schaltet zwischen Front- und Rückkamera um und verwirft dabei sicher alle vorhandenen Aufnahmedaten.
- In der Videovorschau stehen eigene Start-/Pause-Steuerung, Zeitleiste sowie 0,25×, 0,5× und 1× zur Verfügung. Native Videosteuerungen sind deaktiviert.
- Der Download-Button speichert die eigene Fotoaufnahme als JPG und die Videoaufnahme im tatsächlich aufgenommenen Format (WebM oder MP4) unter einem frei wählbaren Namen. Vor dem Speichern kann der Vorgang mit **Abbruch** beendet werden.
- Mit **Leitbild daneben** lässt sich ein Leitbild direkt neben die eigene Aufnahme schalten. Die Auswahl öffnet sich als dreistufiges Fenster für Sportartengruppe, Sportart und Leitbild. Beide Videos haben eigene Bedienelemente für Start/Pause, Zeitleiste und Wiedergabegeschwindigkeit.
- Unter **Leitbilder ansehen → Spielsportarten → Volleyball** steht eine Liste der Leitbilder. **Angriffsschlag** und **Pritschen seitlich** öffnen jeweils einen eigenen Player mit Start/Pause, Zeitleiste sowie 0,25×, 0,5× und 1×.
- Alle Leitbild-Videos werden grundsätzlich ohne Ton wiedergegeben.
- **Aufnahme verwerfen**, **Neue Aufnahme** und **Zurück** entfernen die aktuelle Aufnahme vor dem Ansichtswechsel.
- Beim Wechsel in den Hintergrund, Neuladen oder Verlassen wird die aktuelle Aufnahme ebenfalls entfernt. Eine frühere Aufnahme wird nach dem Laden nie wiederhergestellt.

## Manuelle Abnahme auf einem physischen iPad

Eine echte iPad-Kamera und Safari-Berechtigungsdialoge lassen sich nicht zuverlässig in automatisierten Desktop-Tests nachbilden. Vor dem Einsatz im Unterricht sollten diese Punkte auf dem Zielgerät geprüft werden:

1. Erster Start, verständlicher Datenschutzhinweis und Kameraberechtigung; sicherstellen, dass keine Mikrofonabfrage erscheint.
2. Rück- und Frontkamera jeweils im Hoch- und Querformat; Frontbild und Fotoausrichtung vergleichen.
3. Foto aufnehmen, anzeigen, verwerfen und mehrere Fotos nacheinander erstellen.
4. Video manuell stoppen, abspielen, pausieren und mit 0,25×, 0,5× sowie 1× betrachten.
5. Eine Videoaufnahme laufen lassen und prüfen, dass sie bei 3 Minuten automatisch endet.
6. Während Livebild, laufender Aufnahme und Vorschau jeweils zum Home-Bildschirm wechseln; bei der Rückkehr muss die App sicher auf der Startansicht stehen und die Aufnahme entfernt sein.
7. Seite mit einer Vorschau neu laden; keine Aufnahme darf wieder erscheinen.
8. Nach einmaligem vollständigem Online-Start die Web-App schließen, die Netzwerkverbindung deaktivieren und den installierten App-Rahmen erneut öffnen.
9. In Safaris Web-Inspector kontrollieren, dass beim Aufnehmen keine Netzwerkrequests mit Bild- oder Videodaten entstehen und dass Application Storage nur den statischen App-Cache enthält.
10. Kamerazugriff in den Website-Einstellungen verweigern und die verständliche Fehlermeldung prüfen.

Die automatische Prüfung des nicht unterstützten Aufnahmeformats erfolgt über einen simulierten `MediaRecorder`. Der reale Formatmix muss zusätzlich auf der konkret eingesetzten Safari-/iPadOS-Version geprüft werden.

## Dateien

- `index.html` – semantische, barrierearme deutschsprachige Oberfläche
- `styles.css` – responsive Touch-Gestaltung für Hoch- und Querformat samt Safe Areas
- `app.js` – Kamera, Aufnahme, Wiedergabe und zentrale temporäre Medienbereinigung
- `media-utils.js` – getestete Formatauswahl und Zeitformatierung
- `pages/leitbilder/` – Auswahl und Wiedergabe der Leitbild-Videos
- `Videos/` – unveränderte Ordnerstruktur der lokalen Leitbild-Videos
- `manifest.webmanifest` und `icons/` – Installation als PWA und Apple-Touch-Icon
- `sw.js` – versionierter Offline-Cache ausschließlich für statische App-Dateien
- `tests/` – automatisierte Funktions-, Datenschutz- und PWA-Prüfungen
- `tools/generate-icons.ps1` – reproduzierbare, lokale Erzeugung der PNG-App-Symbole
