# Sportkamera

Eine installierbare, datensparsame Progressive Web App für direktes Foto- und Video-Feedback im Sportunterricht. Die Anwendung besteht nur aus lokalem HTML, CSS und JavaScript, benötigt keinen Build-Schritt und ist für GitHub Pages vorbereitet.

## Funktionen

Der Startbildschirm führt in drei Funktionen: **Foto** und **Video** nehmen auf und lassen die Aufnahme anschließend analysieren, speichern und mit einem Leitbild vergleichen. **Verzögerte Wiedergabe** zeigt das Kamerabild stattdessen fortlaufend zeitversetzt an. Die geschützte Galerie erscheint zusätzlich, sobald eine Anmeldung erfolgt ist.

## Verzögerte Wiedergabe

Die Ansicht startet sofort mit der Kamera und puffert das Bild im Arbeitsspeicher. Bis der eingestellte Vorlauf erreicht ist, zeigt die Bühne ausschließlich einen Countdown der verbleibenden Sekunden; das Livebild bleibt verdeckt. Erst danach erscheint das zugehörige, zeitversetzte Bild und läuft fortlaufend weiter. So kann eine Übung ausgeführt und unmittelbar danach am Gerät angesehen werden, ohne die Aufnahme zu bedienen.

Das Zahnrad in der Ansicht öffnet einen Drehregler im Stil eines Backofenknopfs. Er deckt 1 bis 60 Sekunden auf einem 270-Grad-Bogen ab und lässt sich mit Finger, Stift oder Maus drehen; über die Tastatur ändern Pfeiltasten den Wert um eine, Bild auf/ab um fünf Sekunden, Pos1 und Ende springen an die Enden. Voreingestellt sind 15 Sekunden. Jede Änderung verwirft den Puffer und startet Countdown und Wiedergabe neu.

Die Einzelbilder werden dafür verkleinert als JPEG im Arbeitsspeicher gehalten, nicht als Video aufgezeichnet. Der Puffer fasst rund 900 Bilder und damit etwa 30 MB. Kurze Vorläufe nutzen dieses Budget mit 30 Bildern pro Sekunde aus, längere dünnen die Bildrate gleitend bis auf 15 Bilder pro Sekunde bei 60 Sekunden Vorlauf aus. Nichts davon wird gespeichert, heruntergeladen oder übertragen: Beim Verlassen der Ansicht, beim Wechsel in den Hintergrund und beim Schließen der App wird der Puffer zusammen mit der Kamera verworfen. Auf langsameren Geräten sinkt die Bildrate der Wiedergabe, der zeitliche Abstand bleibt davon unberührt.

## Leitbilder hinzufügen

Leitbilder werden nicht von Hand eingetragen. Maßgeblich ist allein der Ordner `Videos/`:

1. Video an die passende Stelle in `Videos/` legen, zum Beispiel `Videos/Spielsportarten/Volleyball/Aufschlag/Aufschlag von oben.mp4`.
2. Committen und pushen.

Den Rest erledigt `tools/build-leitbilder.mjs`. Der GitHub-Workflow *Leitbild-Index* startet bei jeder Änderung unter `Videos/`, erzeugt den Index neu und committet ihn. Lokal geht dasselbe mit `npm run leitbilder`; `npm test` schlägt fehl, solange der Index nicht zum Ordner passt.

Erzeugt werden dabei `pages/leitbilder/guide-tree.js` und die Videoliste in `sw.js`. Beide Dateien sind Maschinenerzeugnisse und sollten nicht von Hand geändert werden. Aus ihnen speisen sich sowohl die Leitbilder-Seite als auch die Auswahl hinter **Leitbild daneben**.

Zusätzlich setzt der Generator die Versionskennung hinter `guide-tree.js` neu — sie ist eine Prüfsumme des Index — und hebt `CACHE_VERSION` in `sw.js` an. Beides ist nötig, weil ein installierter Service Worker die App-Dateien zuerst aus seinem Cache beantwortet: Ohne neue Kennung zeigt ein Gerät nach einem Videotausch weiter den alten Index und damit einen toten Videolink. Die statische Abnahme prüft, dass jede versionierte Adresse aus den Seiten auch in der App-Shell des Service Workers steht.

Regeln für die Anzeige:

- **Ordner werden zu Ebenen, Dateinamen zu Titeln** – ohne Endung. Aus `Aufschlag von oben.mp4` wird der Eintrag *Aufschlag von oben*. Sortiert wird alphabetisch.
- **Ein Ordner mit genau einem Video und ohne Unterordner** wird direkt als dieses Video angezeigt. Der Zwischenklick entfällt. Kommt ein zweites Video dazu, wird der Ordner wieder zur Ebene.
- **Unterstützt sind `.mp4`, `.m4v` und `.webm`.** Andere Dateien und leere Ordner werden übersprungen und beim Erzeugen als Hinweis gemeldet.
- **Leitbilder müssen ohne Tonspur vorliegen.** Der Generator warnt bei einer Tonspur, und `npm test` schlägt fehl. Die App schaltet Leitbilder zusätzlich zur Laufzeit stumm.
- **Umbenennen oder Verschieben** ändert nur den Index; es sind keine weiteren Anpassungen nötig.

Da die App statisch auf GitHub Pages liegt, kann sie zur Laufzeit kein Verzeichnis auflisten. Deshalb entsteht der Index vorab beim Committen statt im Browser.

## Datenschutz und lokale Speicherung

Neue Aufnahmen liegen zunächst nur vorübergehend im Arbeitsspeicher. Erst ein ausdrückliches Tippen auf das Speichern-Symbol übernimmt die aktuelle Aufnahme in die lokale geschützte Galerie. Videos können dabei benannt werden; der Name bleibt zusammen mit der Aufnahme erhalten und wird später in der Galerie sowie als Download-Dateiname verwendet. Die App verwendet bevorzugt das Origin Private File System (OPFS). Safari-/iPadOS-Versionen ohne schreibbaren OPFS-Zugriff erhalten automatisch einen lokalen IndexedDB-Fallback. Bild- und Videodaten werden weder hochgeladen noch synchronisiert.

- Die App fordert ausschließlich die Kameraberechtigung an. Videos werden ohne Ton aufgenommen; eine Mikrofonberechtigung wird weder angefragt noch benötigt.
- Fotos werden kurzzeitig in einem Canvas verarbeitet. Videos entstehen aus den vorübergehenden Fragmenten des `MediaRecorder`.
- Nur ausdrücklich gespeicherte Aufnahmen bleiben nach dem Schließen oder Neuladen der App erhalten. Nicht gespeicherte Aufnahmen werden beim Verwerfen, bei einer neuen Aufnahme sowie beim Verlassen oder Wechseln in den Hintergrund aus der App entfernt.
- Gespeicherte Medien liegen ausschließlich im privaten Speicherbereich des jeweiligen Browsers beziehungsweise der installierten Web-App. Safari und eine über den Home-Bildschirm installierte PWA verwenden auf iPadOS getrennte Speicherbereiche; ihre Galerien werden nicht automatisch geteilt.
- OPFS und IndexedDB sind beständig, aber kein Ersatz für ein Backup. Das Löschen der Websitedaten, eine Speicherbereinigung durch das Betriebssystem oder das Entfernen der Web-App kann die Galerie löschen. Die App bittet den Browser nach Möglichkeit um dauerhafte Speicherung und zeigt an, wenn der Browser sie nicht zugesichert hat.
- Die Löschfunktion entfernt ausgewählte Medien nach einer Sicherheitsabfrage aus dem lokalen App-Speicher. Dieser Vorgang kann nicht rückgängig gemacht werden.
- Dateien werden nur über die Downloadfunktionen in der geschützten Galerie an den Browser übergeben. Beim Einzeldownload versucht die App WebM-Videos vollständig auf dem Gerät in H.264-MP4-Dateien umzuwandeln; der bewährte hardwarebeschleunigte Safari-/iPad-Pfad hat dabei Vorrang. Chrome und Firefox erhalten bei Bedarf einen zweiten H.264-Versuch ohne erzwungenen Hardware-Encoder. Ist dort kein H.264-Encoder verfügbar, werden die vorhandenen VP8-/VP9-Videodaten ohne Qualitätsverlust in einen MP4-Container umgepackt. Das gespeicherte WebM-Original bleibt immer unverändert. Mehrere ausgewählte Medien bündelt die App lokal in einem ZIP mit den unveränderten Originaldateien. In der Aufnahmeansicht gibt es keinen Download.
- Es gibt keine Upload- oder Teilen-Funktion, keine Analyse-Skripte, keine externen Ressourcen und keine Netzwerkaufrufe für Nutzermedien. Der Service Worker lädt und speichert ausschließlich den statischen App-Rahmen für den Offline-Start; Nutzermedien gelangen nie in Cache Storage.
- Die verzögerte Wiedergabe puffert Einzelbilder ausschließlich im Arbeitsspeicher. Sie werden weder gespeichert noch heruntergeladen und beim Verlassen der Ansicht sowie beim Wechsel in den Hintergrund verworfen.
- Beim Bereinigen stoppt die App die Kamera, leert Recorder-Fragmente und den Bildpuffer der verzögerten Wiedergabe, widerruft Object URLs und entfernt eigene Referenzen. Die endgültige Freigabe des Arbeitsspeichers übernimmt der Browser.
- Leitbilder werden erst beim Ansehen in den Offline-Cache gelegt, nicht mehr vorab vollständig geladen. Der Erstaufruf bleibt dadurch unabhängig von der Größe der Sammlung; offline stehen die zuvor angesehenen Leitbilder bereit. Nicht mehr im Index gelistete Videos entfernt der Service Worker beim nächsten Start aus dem Cache.

Beim Hosting finden normale technische Webseitenaufrufe zu GitHub Pages statt, etwa zum Abruf von HTML, CSS, JavaScript und Symbolen. GitHub beziehungsweise beteiligte Netzbetreiber können dabei übliche Verbindungsdaten wie IP-Adresse, Zeitpunkt und User-Agent verarbeiten. Bild- oder Videodaten werden bei diesen Aufrufen nicht übertragen.

Screenshots und Bildschirmaufnahmen durch iPadOS, andere Betriebssystemfunktionen oder Personen mit Zugriff auf das Gerät kann eine Web-App nicht verhindern.

## Anmeldung mit festem Passwort

Das Zahnrad oben rechts öffnet ein Pop-up mit den Bereichen **Anmelden** und **Zurücksetzen**. Die geschützte Galerie öffnet ein fest hinterlegtes Passwort, das für alle Geräte gleich ist und nicht in der App geändert oder neu vergeben werden kann. Beim Wechsel in den Hintergrund oder beim Schließen wird der Zugang automatisch wieder gesperrt; über das Zahnrad kann er auch direkt abgemeldet werden.

Beim Update von der Version mit selbst vergebenem Passwort bleiben bereits gespeicherte Medien erhalten. Ein zuvor lokal abgelegter Passwortdatensatz wird nicht mehr verwendet und beim nächsten Zurücksetzen entfernt; eine eingerichtete Gerätebestätigung bleibt gültig.

Wenn auf dem Gerät eingerichtet und vom Browser unterstützt, kann nach einer erfolgreichen Passwortanmeldung zusätzlich WebAuthn mit dem Plattform-Authentifikator aktiviert werden. iPadOS entscheidet dabei selbst zwischen Touch ID, Face ID und Gerätecode; eine Website kann nicht ausschließlich einen Fingerabdruck verlangen. Die Aktivierung erfolgt lokal und gilt nur für den jeweiligen Browser beziehungsweise die installierte Web-App.

Das Passwort steht weder im Repository noch im ausgelieferten JavaScript im Klartext. Hinterlegt sind nur ein fester Zufalls-Salt und der daraus mit PBKDF2-SHA-256 über 600.000 Runden abgeleitete Prüfwert; die Eingabe wird beim Anmelden genauso abgeleitet und mit diesem Wert verglichen. Da ein solcher Prüfwert öffentlich einsehbar ist, schützt er nur gegen einfaches Auslesen, nicht gegen einen gezielten Rateangriff auf ein schwaches Passwort. Da die statische App und ihre lokalen Daten von technisch versierten Personen untersucht oder verändert werden können, bleibt die Anmeldung eine praktische Bedienhürde für ein beaufsichtigtes Gerät und keine belastbare serverseitige Zugriffskontrolle. Auch OPFS und IndexedDB sind nach Web-Origin, nicht nach dem Unterordner dieser App, getrennt. Für echten Schutz gegen gezielte Angriffe wären eine eigene Origin, ein Server, individuelle Konten und eine serverseitige Autorisierung erforderlich.

Unter **Zurücksetzen** muss zur Bestätigung exakt `Zurücksetzen` eingegeben werden. Danach löscht die App unwiderruflich die lokale Referenz auf die Gerätebestätigung, verbliebene Passwortdatensätze älterer Versionen und sämtliche gespeicherten Fotos und Videos aus OPFS und IndexedDB. Das feste Zugangspasswort selbst bleibt davon unberührt. Dieser destruktive Rückfall ist bewusst auch ohne Anmeldung möglich. Der vom Betriebssystem verwaltete Passkey selbst kann gegebenenfalls zusätzlich in den iPadOS-Einstellungen entfernt werden.

## Lokal testen

Der lokale Server sollte Byte-Ranges beherrschen (HTTP 206). `python3 -m http.server` tut das nicht: Videos spielen zwar, lassen sich aber nicht durchsuchen — Zeitstrahl und Sprungtasten bleiben bei Leitbildern ohne Wirkung. Eigene Aufnahmen sind davon nicht betroffen, sie laufen über Blob-Adressen.

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

Die Tests prüfen JavaScript-Syntax, Formatauswahl, Zeitbegrenzung und -formatierung, die lokale H.264-MP4-Konvertierung, die ZIP-Erstellung für Mehrfachdownloads, relative Pfade, PWA-Metadaten, die feste Cache-Positivliste, zentrale Bereinigungsereignisse, OPFS- und IndexedDB-Speicherung, den Leitbild-Index samt Tonspurprüfung, die Reglerarithmetik und den Countdown der verzögerten Wiedergabe, die Anmeldung mit dem festen Passwort, den Komplett-Reset sowie das Fehlen eines Klartextpassworts und von Uploadfunktionen. Wird `SPORTKAMERA_TEST_PASSWORD` gesetzt, prüfen die Tests zusätzlich, dass dieses Passwort akzeptiert wird und in keiner ausgelieferten Datei im Klartext steht.

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
- **Video** zeichnet maximal drei Minuten ohne Ton auf und beendet die Aufnahme automatisch. Erneutes Tippen auf die Aufnahmetaste beendet sie früher. Die App bevorzugt WebM und verwendet MP4 als Fallback, wenn der Browser WebM nicht aufnehmen kann Die Kamera wird mit 1280 × 720 Bildpunkten und 60 Bildern pro Sekunde angefragt; liefert das Gerät weniger, nimmt die App mit dessen höchster Bildrate auf. Die Datenrate folgt der tatsächlichen Bildrate und liegt zwischen 4 Mbit/s bei 30 und 8 Mbit/s bei 60 Bildern pro Sekunde. Eine höhere Bildrate zahlt sich vor allem in der Zeitlupe aus: Bei 0,25× zeigt eine 60er-Aufnahme doppelt so viele echte Bilder wie eine 30er.
- **Kamera wechseln** schaltet zwischen Front- und Rückkamera um und verwirft dabei vorhandene, nicht gespeicherte Aufnahmedaten.
- Das Speichern-Symbol in der Vorschau legt die aktuelle Aufnahme in der lokalen Galerie ab. Bei Videos öffnet es zuvor ein Benennungsfenster; Fotos werden direkt gespeichert. Es öffnet keine Downloadseite.
- In Videovorschauen stehen eigene Start-/Pause-Steuerung, Zeitleiste sowie 0,25×, 0,5× und 1× zur Verfügung. Native Videosteuerungen sind deaktiviert.
- Links und rechts vom Zeitstrahl springt je eine Taste um 0,1 Sekunden vor oder zurück; die Wiedergabe hält dabei an. Am Anfang und am Ende des Videos läuft der Sprung gegen die jeweilige Grenze und bleibt dort stehen.
- Über den Stift-Button lässt sich der aktuelle Videoframe in einem temporären Annotationsfenster öffnen. Dort gibt es Freihandstift, fünf Farben und einen Radierer; beim Schließen wird die Annotation verworfen.
- Mit **Leitbild daneben** lässt sich ein Leitbild neben die eigene Aufnahme schalten. Beide Videos besitzen unabhängige Bedienelemente.
- Unter **Leitbilder ansehen** führt dieselbe Ordnerstruktur wie im Ordner `Videos/` zum gewünschten Leitbild. Alle Leitbild-Videos werden ohne Ton wiedergegeben.
- **Aufnahme verwerfen**, **Neue Aufnahme** und **Zurück** entfernen die aktuelle, nicht gespeicherte Aufnahme vor dem Ansichtswechsel.

Nach der Anmeldung zeigt die geschützte Galerie gespeicherte Fotos und benannte Videos nach Datum sortiert, die neuesten zuerst. Einzelne Medien lassen sich öffnen, Videos abspielen und annotieren. Das Download-Symbol exportiert bei genau einer markierten Aufnahme diese einzelne Datei und übernimmt bei Videos den zuvor vergebenen Namen. WebM-Aufnahmen werden dafür nach Möglichkeit lokal mit bevorzugter Hardwarebeschleunigung in H.264-MP4 umgewandelt. Scheitert der Hardwarepfad, versucht die App H.264 erneut mit den allgemeinen Browsereinstellungen. Ohne verfügbaren H.264-Encoder verpackt sie die vorhandene VP8-/VP9-Spur direkt als MP4; dieser schnelle Fallback benötigt kein WebCodecs. Ein Fortschrittsfenster bleibt währenddessen in der App; danach startet die Lehrkraft den fertigen MP4-Download mit einem zweiten Tippen. Je nach Videolänge und Gerät kann eine H.264-Umwandlung Zeit und zusätzlichen Arbeitsspeicher benötigen, daher sollte die App im Vordergrund bleiben. Sind auch die MP4-Fallbacks nicht möglich, bietet die App das unveränderte WebM-Original an. Bereits als MP4 gespeicherte Videos und Fotos werden direkt heruntergeladen. Sind mehrere Einträge markiert, bündelt dasselbe Download-Symbol ihre unveränderten Originaldateien vollständig lokal in einem ZIP. Über das Papierkorb-Symbol lässt sich dieselbe Auswahl gemeinsam löschen. Sowohl Einzel- als auch Mehrfachlöschungen erfordern eine Bestätigung.

## Manuelle Abnahme auf einem physischen iPad

Eine echte iPad-Kamera, Safari-Berechtigungsdialoge und Plattform-Authentifikatoren lassen sich in automatisierten Desktop-Tests nicht vollständig nachbilden. Vor dem Unterrichtseinsatz sollten diese Punkte auf dem Zielgerät geprüft werden:

1. Erster Start, Datenschutzhinweis und Kameraberechtigung; sicherstellen, dass keine Mikrofonabfrage erscheint.
2. Rück- und Frontkamera im Hoch- und Querformat testen; Frontbild und Fotoausrichtung vergleichen.
3. Foto und Video aufnehmen, beim Video einen eigenen Namen vergeben, beide mit dem Symbol speichern, die App vollständig schließen und beide Medien nach dem Neustart in der Galerie wiederfinden.
4. Eine nicht gespeicherte Aufnahme schließen beziehungsweise die App in den Hintergrund schicken; sie darf nach der Rückkehr nicht wieder erscheinen.
5. Video manuell und automatisch nach drei Minuten stoppen sowie Wiedergabe, Zeitleiste, Tempostufen und Annotation prüfen.
6. Ein zusätzliches Video in einen Unterordner von `Videos/` legen, `npm run leitbilder` ausführen und prüfen, dass es unter **Leitbilder ansehen** und hinter **Leitbild daneben** auftaucht und abspielbar ist.
7. **Verzögerte Wiedergabe** öffnen: Der Countdown startet bei 15 Sekunden, danach läuft das zeitversetzte Bild. Über das Zahnrad den Drehregler auf 1 und auf 60 Sekunden stellen und prüfen, dass jede Änderung den Countdown neu startet. Anschließend Kamera wechseln, in den Hintergrund wechseln und zurückkehren; die Ansicht darf kein altes Bild zeigen.
8. Über das Zahnrad mit dem festen Passwort anmelden und eine falsche Eingabe prüfen. Abmelden und prüfen, dass die Galerie erst nach erneuter Anmeldung wieder erscheint. Dasselbe nach einem Wechsel in den Hintergrund prüfen.
9. Falls verfügbar, Plattform-Authentifikator einrichten und Anmeldung mit Touch ID, Face ID oder Gerätecode sowie den Passwort-Rückfall testen.
10. In der Vorschau und beim Leitbild mehrfach auf die Tasten neben dem Zeitstrahl tippen und prüfen, dass jedes Tippen 0,1 Sekunden weiterspringt und die Zeitanzeige mitläuft. Am Anfang und am Ende des Videos darf der Sprung nicht darüber hinauslaufen.
11. Eine gespeicherte Aufnahme markieren und über das Download-Symbol einzeln herunterladen. Diesen Ablauf mindestens in Safari, Firefox und Chrome prüfen. Bei einer WebM-Aufnahme die Fortschrittsanzeige abwarten, anschließend **MP4 herunterladen** tippen und prüfen, dass eine abspielbare `.mp4`-Datei mit dem vergebenen Namen entsteht. Danach mehrere Medien markieren, dasselbe Download-Symbol tippen und Inhalt sowie Dateinamen des ZIP prüfen. Sicherstellen, dass in der Aufnahmeansicht kein Download-Button erscheint.
12. Einzelne und mehrere Medien auswählen und löschen; jeweils Abbruch und Bestätigung prüfen. Nach dem Neustart dürfen bestätigte Löschungen nicht wieder erscheinen.
13. Safari und die installierte PWA getrennt öffnen und prüfen, dass ihre Galerien erwartungsgemäß nicht geteilt werden.
14. Nach einem vollständigen Online-Start die Netzwerkverbindung deaktivieren und den installierten App-Rahmen erneut öffnen.
15. Im Web-Inspector kontrollieren, dass beim Aufnehmen und Speichern keine Requests mit Bild- oder Videodaten entstehen und Cache Storage nur statische App-Dateien enthält.
16. Unter **Zurücksetzen** zuerst eine falsche Eingabe testen. Danach exakt `Zurücksetzen` eingeben und prüfen, dass Galerie und Geräteanmeldung entfernt sind und beim nächsten Anmelden wieder das feste Passwort verlangt wird.
17. Kamerazugriff in den Website-Einstellungen verweigern und die Fehlermeldung prüfen.

Die automatische Prüfung des Aufnahmeformats verwendet einen simulierten `MediaRecorder`. Der reale Formatmix muss zusätzlich auf der eingesetzten Safari-/iPadOS-Version geprüft werden.

## Dateien

- `index.html` – semantische, barrierearme deutschsprachige Oberfläche
- `styles.css` – responsive Touch-Gestaltung für Hoch- und Querformat samt Safe Areas
- `app.js` – Kamera, Aufnahme, verzögerte Wiedergabe, Galerie, Mehrfachdownload und zentrale temporäre Medienbereinigung
- `zip-utils.js` – lokale, offlinefähige Bündelung ausgewählter Galerieaufnahmen als ZIP
- `video-converter.js` – lokale WebM-zu-H.264-MP4-Konvertierung für Galeriedownloads
- `annotation.js` – lokale Annotation eines aktuellen Videoframes
- `media-store.js` – explizite, persistente Medienspeicherung in OPFS oder IndexedDB
- `teacher-auth.js` – PBKDF2-Prüfung des festen Passworts, Reset und optionale WebAuthn-Anmeldung
- `media-utils.js` – getestete Formatauswahl, Zeitformatierung und Reglerarithmetik der verzögerten Wiedergabe
- `pages/leitbilder/` – Auswahl und Wiedergabe der Leitbild-Videos; `guide-tree.js` darin wird erzeugt
- `Videos/` – Ordnerstruktur der lokalen Leitbild-Videos; sie bestimmt die Navigation
- `manifest.webmanifest` und `icons/` – Installation als PWA und Apple-Touch-Icon
- `sw.js` – versionierter Offline-Cache ausschließlich für statische App-Dateien
- `vendor/mediabunny/` und `THIRD_PARTY_NOTICES.md` – lokal gebündelter Videokonverter samt Lizenz- und Prüfsummenhinweis
- `tests/` – automatisierte Funktions-, Datenschutz- und PWA-Prüfungen
- `tools/build-leitbilder.mjs` – erzeugt den Leitbild-Index aus dem Ordner `Videos/`
- `tools/generate-icons.ps1` – reproduzierbare lokale Erzeugung der PNG-App-Symbole
