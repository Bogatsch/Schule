# Sportkamera

Eine installierbare, datensparsame Progressive Web App für direktes Foto- und Video-Feedback im Sportunterricht. Die Anwendung besteht nur aus lokalem HTML, CSS und JavaScript, benötigt keinen Build-Schritt und ist für GitHub Pages vorbereitet.

## Datenschutz und lokale Speicherung

Neue Aufnahmen liegen zunächst nur vorübergehend im Arbeitsspeicher. Erst ein ausdrückliches Tippen auf das Speichern-Symbol übernimmt die aktuelle Aufnahme in die lokale geschützte Galerie. Videos können dabei benannt werden; der Name bleibt zusammen mit der Aufnahme erhalten und wird später in der Galerie sowie als Download-Dateiname verwendet. Die App verwendet bevorzugt das Origin Private File System (OPFS). Safari-/iPadOS-Versionen ohne schreibbaren OPFS-Zugriff erhalten automatisch einen lokalen IndexedDB-Fallback. Bild- und Videodaten werden weder hochgeladen noch synchronisiert.

- Die App fordert ausschließlich die Kameraberechtigung an. Videos werden ohne Ton aufgenommen; eine Mikrofonberechtigung wird weder angefragt noch benötigt.
- Fotos werden kurzzeitig in einem Canvas verarbeitet. Videos entstehen aus den vorübergehenden Fragmenten des `MediaRecorder`.
- Nur ausdrücklich gespeicherte Aufnahmen bleiben nach dem Schließen oder Neuladen der App erhalten. Nicht gespeicherte Aufnahmen werden beim Verwerfen, bei einer neuen Aufnahme sowie beim Verlassen oder Wechseln in den Hintergrund aus der App entfernt.
- Gespeicherte Medien liegen ausschließlich im privaten Speicherbereich des jeweiligen Browsers beziehungsweise der installierten Web-App. Safari und eine über den Home-Bildschirm installierte PWA verwenden auf iPadOS getrennte Speicherbereiche; ihre Galerien werden nicht automatisch geteilt.
- OPFS und IndexedDB sind beständig, aber kein Ersatz für ein Backup. Das Löschen der Websitedaten, eine Speicherbereinigung durch das Betriebssystem oder das Entfernen der Web-App kann die Galerie löschen. Die App bittet den Browser nach Möglichkeit um dauerhafte Speicherung und zeigt an, wenn der Browser sie nicht zugesichert hat.
- Die Löschfunktion entfernt ausgewählte Medien nach einer Sicherheitsabfrage aus dem lokalen App-Speicher. Dieser Vorgang kann nicht rückgängig gemacht werden.
- Eine Datei wird nur über den Download-Button in der geschützten Galerie an die Downloadfunktion des Browsers übergeben. WebM-Videos werden dabei vollständig auf dem Gerät in eine echte H.264-MP4-Datei umgewandelt; das gespeicherte WebM-Original bleibt unverändert. In der Aufnahmeansicht gibt es keinen Download mehr.
- Es gibt keine Upload- oder Teilen-Funktion, keine Analyse-Skripte, keine externen Ressourcen und keine Netzwerkaufrufe für Nutzermedien. Der Service Worker lädt und speichert ausschließlich den statischen App-Rahmen für den Offline-Start; Nutzermedien gelangen nie in Cache Storage.
- Beim Bereinigen stoppt die App die Kamera, leert Recorder-Fragmente, widerruft Object URLs und entfernt eigene Referenzen. Die endgültige Freigabe des Arbeitsspeichers übernimmt der Browser.

Beim Hosting finden normale technische Webseitenaufrufe zu GitHub Pages statt, etwa zum Abruf von HTML, CSS, JavaScript und Symbolen. GitHub beziehungsweise beteiligte Netzbetreiber können dabei übliche Verbindungsdaten wie IP-Adresse, Zeitpunkt und User-Agent verarbeiten. Bild- oder Videodaten werden bei diesen Aufrufen nicht übertragen.

Screenshots und Bildschirmaufnahmen durch iPadOS, andere Betriebssystemfunktionen oder Personen mit Zugriff auf das Gerät kann eine Web-App nicht verhindern.

## Anmeldung und selbst vergebenes Passwort

Das Zahnrad oben rechts öffnet ein Pop-up mit den Bereichen **Anmelden** und **Zurücksetzen**. Beim ersten Anmelden wird ein eigenes Passwort mit mindestens sechs Zeichen festgelegt und bestätigt. Danach öffnet dieses Passwort die geschützte Galerie. Das Passwort gilt nur für das jeweilige Browserprofil beziehungsweise die installierte Web-App. Beim Wechsel in den Hintergrund oder beim Schließen wird der Zugang automatisch wieder gesperrt; über das Zahnrad kann er auch direkt abgemeldet werden.

Beim Update von der früheren Version mit festem Passwort bleiben bereits gespeicherte Medien erhalten. Beim ersten Anmelden nach dem Update wird ein neues eigenes Passwort verlangt; eine zuvor eingerichtete Gerätebestätigung muss anschließend einmal neu eingerichtet werden.

Wenn auf dem Gerät eingerichtet und vom Browser unterstützt, kann nach einer erfolgreichen Passwortanmeldung zusätzlich WebAuthn mit dem Plattform-Authentifikator aktiviert werden. iPadOS entscheidet dabei selbst zwischen Touch ID, Face ID und Gerätecode; eine Website kann nicht ausschließlich einen Fingerabdruck verlangen. Die Aktivierung erfolgt lokal und gilt nur für den jeweiligen Browser beziehungsweise die installierte Web-App.

Das Passwort steht weder im Repository noch im ausgelieferten JavaScript. Beim Einrichten erzeugt der Browser einen zufälligen Salt und speichert lokal nur einen mit PBKDF2 abgeleiteten Prüfwert. Da die statische App und ihre lokalen Daten von technisch versierten Personen untersucht oder verändert werden können, bleibt die Anmeldung eine praktische Bedienhürde für ein beaufsichtigtes Gerät und keine belastbare serverseitige Zugriffskontrolle. Auch OPFS und IndexedDB sind nach Web-Origin, nicht nach dem Unterordner dieser App, getrennt. Für echten Schutz gegen gezielte Angriffe wären eine eigene Origin, ein Server, individuelle Konten und eine serverseitige Autorisierung erforderlich.

Unter **Zurücksetzen** muss zur Bestätigung exakt `Zurücksetzen` eingegeben werden. Danach löscht die App unwiderruflich das lokale Passwort, die lokale Referenz auf die Gerätebestätigung und sämtliche gespeicherten Fotos und Videos aus OPFS und IndexedDB. Dieser destruktive Rückfall ist bewusst auch ohne Kenntnis des alten Passworts möglich. Der vom Betriebssystem verwaltete Passkey selbst kann gegebenenfalls zusätzlich in den iPadOS-Einstellungen entfernt werden.

## Lokal testen

Ein Doppelklick auf `index.html` reicht nicht aus: Kamera, WebAuthn, lokaler App-Speicher und Service Worker sind nur in einem sicheren Kontext zuverlässig verfügbar. Browser behandeln `http://localhost` für die Entwicklung als sicheren Kontext; im Internet ist HTTPS erforderlich.

Im Ordner `Sport/tmp_recorder` einen lokalen Server starten:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Dann `http://127.0.0.1:8080/` im Browser öffnen. Alternativ kann der Server im Repository-Stamm gestartet und `http://127.0.0.1:8080/Sport/tmp_recorder/` geöffnet werden.

Automatisierte Prüfungen benötigen nur eine aktuelle Node.js-Version und keine Installation externer Pakete:

```powershell
npm test
```

Die Tests prüfen JavaScript-Syntax, Formatauswahl, Zeitbegrenzung und -formatierung, die lokale H.264-MP4-Konvertierung, relative Pfade, PWA-Metadaten, die feste Cache-Positivliste, zentrale Bereinigungsereignisse, OPFS- und IndexedDB-Speicherung, erstmalige Passwortvergabe, lokale Anmeldung, Komplett-Reset sowie das Fehlen eines statischen Passworts und von Uploadfunktionen.

## GitHub Pages aktivieren

Da alle Pfade relativ sind, kann die App direkt aus diesem Repository-Unterordner bereitgestellt werden:

1. Das Repository zu GitHub übertragen und den gewünschten Hauptbranch öffnen (meist `main`).
2. In GitHub **Settings → Pages** öffnen.
3. Unter **Build and deployment** als Quelle **Deploy from a branch** wählen.
4. Den Hauptbranch und den Ordner **/(root)** auswählen, dann **Save** wählen.
5. Nach der Bereitstellung `https://BENUTZERNAME.github.io/REPOSITORY/Sport/tmp_recorder/` öffnen.

GitHub Pages liefert die App automatisch per HTTPS aus. Bei einem privaten Repository hängt die Pages-Verfügbarkeit vom verwendeten GitHub-Tarif ab.

## Auf dem iPad öffnen und installieren

1. Die HTTPS-Adresse in **Safari** auf dem iPad öffnen.
2. **Foto** oder **Video** wählen und die Kameraabfrage mit **Erlauben** bestätigen. Für Video ist kein Mikrofonzugriff nötig.
3. Zum Installieren die Safari-Schaltfläche **Teilen** und anschließend **Zum Home-Bildschirm** wählen.
4. Falls iPadOS die Option anbietet, **Als Web-App öffnen** aktiviert lassen und mit **Hinzufügen** bestätigen.
5. Die Sportkamera über ihr Symbol starten. Nach einem vollständigen Online-Start steht der statische App-Rahmen auch offline bereit.

Falls die Kameraberechtigung zuvor verweigert wurde, in Safari über die Seiteneinstellungen links in der Adressleiste **Website-Einstellungen → Kamera → Erlauben** wählen und die Seite neu laden.

## Bedienung

- **Foto** erstellt einen Schnappschuss über Canvas.
- **Video** zeichnet maximal drei Minuten ohne Ton auf und beendet die Aufnahme automatisch. Erneutes Tippen auf die Aufnahmetaste beendet sie früher. Die App bevorzugt WebM und verwendet MP4 als Fallback, wenn der Browser WebM nicht aufnehmen kann.
- **Kamera wechseln** schaltet zwischen Front- und Rückkamera um und verwirft dabei vorhandene, nicht gespeicherte Aufnahmedaten.
- Das Speichern-Symbol in der Vorschau legt die aktuelle Aufnahme in der lokalen Galerie ab. Bei Videos öffnet es zuvor ein Benennungsfenster; Fotos werden direkt gespeichert. Es öffnet keine Downloadseite.
- In Videovorschauen stehen eigene Start-/Pause-Steuerung, Zeitleiste sowie 0,25×, 0,5× und 1× zur Verfügung. Native Videosteuerungen sind deaktiviert.
- Über den Stift-Button lässt sich der aktuelle Videoframe in einem temporären Annotationsfenster öffnen. Dort gibt es Freihandstift, fünf Farben und einen Radierer; beim Schließen wird die Annotation verworfen.
- Mit **Leitbild daneben** lässt sich ein Leitbild neben die eigene Aufnahme schalten. Beide Videos besitzen unabhängige Bedienelemente.
- Unter **Leitbilder ansehen → Spielsportarten → Volleyball** stehen die Leitbilder **Angriffsschlag** und **Pritschen seitlich** bereit. Alle Leitbild-Videos werden ohne Ton wiedergegeben.
- **Aufnahme verwerfen**, **Neue Aufnahme** und **Zurück** entfernen die aktuelle, nicht gespeicherte Aufnahme vor dem Ansichtswechsel.

Nach der Anmeldung zeigt die geschützte Galerie gespeicherte Fotos und benannte Videos nach Datum sortiert, die neuesten zuerst. Einzelne Medien lassen sich öffnen, Videos abspielen und annotieren. Der Download-Button exportiert ein einzelnes Medium über den Browser und übernimmt bei Videos den zuvor vergebenen Namen. WebM-Aufnahmen werden dafür lokal mit bevorzugter Hardwarebeschleunigung in H.264-MP4 umgewandelt. Ein Fortschrittsfenster bleibt währenddessen in der App; danach startet die Lehrkraft den fertigen MP4-Download mit einem zweiten Tippen. Je nach Videolänge und iPad kann die Umwandlung Zeit und zusätzlichen Arbeitsspeicher benötigen, daher sollte die App im Vordergrund bleiben. Unterstützt der Browser die lokale Konvertierung nicht, bietet die App das unveränderte WebM-Original an. Bereits als MP4 gespeicherte Videos und Fotos werden direkt heruntergeladen. Über Kontrollfelder können mehrere Einträge ausgewählt und gemeinsam gelöscht werden. Sowohl Einzel- als auch Mehrfachlöschungen erfordern eine Bestätigung.

## Manuelle Abnahme auf einem physischen iPad

Eine echte iPad-Kamera, Safari-Berechtigungsdialoge und Plattform-Authentifikatoren lassen sich in automatisierten Desktop-Tests nicht vollständig nachbilden. Vor dem Unterrichtseinsatz sollten diese Punkte auf dem Zielgerät geprüft werden:

1. Erster Start, Datenschutzhinweis und Kameraberechtigung; sicherstellen, dass keine Mikrofonabfrage erscheint.
2. Rück- und Frontkamera im Hoch- und Querformat testen; Frontbild und Fotoausrichtung vergleichen.
3. Foto und Video aufnehmen, beim Video einen eigenen Namen vergeben, beide mit dem Symbol speichern, die App vollständig schließen und beide Medien nach dem Neustart in der Galerie wiederfinden.
4. Eine nicht gespeicherte Aufnahme schließen beziehungsweise die App in den Hintergrund schicken; sie darf nach der Rückkehr nicht wieder erscheinen.
5. Video manuell und automatisch nach drei Minuten stoppen sowie Wiedergabe, Zeitleiste, Tempostufen und Annotation prüfen.
6. Über das Zahnrad beim ersten Anmelden ein eigenes Passwort festlegen. Abmelden und prüfen, dass die Galerie erst nach erneuter Anmeldung wieder erscheint. Dasselbe nach einem Wechsel in den Hintergrund prüfen.
7. Falls verfügbar, Plattform-Authentifikator einrichten und Anmeldung mit Touch ID, Face ID oder Gerätecode sowie den Passwort-Rückfall testen.
8. Gespeicherte Fotos und Videos in der Galerie öffnen und einzeln herunterladen. Bei einer WebM-Aufnahme die Fortschrittsanzeige abwarten, anschließend **MP4 herunterladen** tippen und prüfen, dass eine abspielbare `.mp4`-Datei mit dem vergebenen Namen entsteht. Sicherstellen, dass in der Aufnahmeansicht kein Download-Button erscheint.
9. Einzelne und mehrere Medien auswählen und löschen; jeweils Abbruch und Bestätigung prüfen. Nach dem Neustart dürfen bestätigte Löschungen nicht wieder erscheinen.
10. Safari und die installierte PWA getrennt öffnen und prüfen, dass ihre Galerien erwartungsgemäß nicht geteilt werden.
11. Nach einem vollständigen Online-Start die Netzwerkverbindung deaktivieren und den installierten App-Rahmen erneut öffnen.
12. Im Web-Inspector kontrollieren, dass beim Aufnehmen und Speichern keine Requests mit Bild- oder Videodaten entstehen und Cache Storage nur statische App-Dateien enthält.
13. Unter **Zurücksetzen** zuerst eine falsche Eingabe testen. Danach exakt `Zurücksetzen` eingeben und prüfen, dass Passwort, Galerie und Geräteanmeldung entfernt sind und beim nächsten Anmelden wieder die Passwortvergabe erscheint.
14. Kamerazugriff in den Website-Einstellungen verweigern und die Fehlermeldung prüfen.

Die automatische Prüfung des Aufnahmeformats verwendet einen simulierten `MediaRecorder`. Der reale Formatmix muss zusätzlich auf der eingesetzten Safari-/iPadOS-Version geprüft werden.

## Dateien

- `index.html` – semantische, barrierearme deutschsprachige Oberfläche
- `styles.css` – responsive Touch-Gestaltung für Hoch- und Querformat samt Safe Areas
- `app.js` – Kamera, Aufnahme, Galerie und zentrale temporäre Medienbereinigung
- `video-converter.js` – lokale WebM-zu-H.264-MP4-Konvertierung für Galeriedownloads
- `annotation.js` – lokale Annotation eines aktuellen Videoframes
- `media-store.js` – explizite, persistente Medienspeicherung in OPFS oder IndexedDB
- `teacher-auth.js` – lokale Passwortvergabe, PBKDF2-Prüfung, Reset und optionale WebAuthn-Anmeldung
- `media-utils.js` – getestete Formatauswahl und Zeitformatierung
- `pages/leitbilder/` – Auswahl und Wiedergabe der Leitbild-Videos
- `Videos/` – unveränderte Ordnerstruktur der lokalen Leitbild-Videos
- `manifest.webmanifest` und `icons/` – Installation als PWA und Apple-Touch-Icon
- `sw.js` – versionierter Offline-Cache ausschließlich für statische App-Dateien
- `vendor/mediabunny/` und `THIRD_PARTY_NOTICES.md` – lokal gebündelter Videokonverter samt Lizenz- und Prüfsummenhinweis
- `tests/` – automatisierte Funktions-, Datenschutz- und PWA-Prüfungen
- `tools/generate-icons.ps1` – reproduzierbare lokale Erzeugung der PNG-App-Symbole
