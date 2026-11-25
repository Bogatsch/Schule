# Sportkamera · Videoabgabe

1. Die Lehrkraft öffnet in der Hauptapp den WebDAV-Reiter. Sobald WebDAV verbunden ist, erscheinen der QR-Code und darunter ein vierstelliger Zahlencode.
2. Die Schülerinnen und Schüler scannen den QR-Code im Client, geben den Zahlencode ein und tippen auf **Verbinden**. [Schüler-Client auf GitHub Pages](https://bogatsch.github.io/Schule/Sport/tmp_recorder_client/)
3. Nach der Verbindung den eigenen Namen oder die Namen der Gruppe eingeben. Die Namen stehen anschließend oben links.
4. Unter **Kamera** ein Video aufnehmen, in der Vorschau prüfen und **Speichern** wählen. Die Aufnahme liegt in der **Galerie**. Anhand von Uhrzeit und Dauer lassen sich die Videos unterscheiden und einzeln ansehen.
5. In der **Galerie** ein Video öffnen, **Hochladen** wählen und mit **Video abgeben** bestätigen. Der Client prüft vor der Übertragung, ob der WebDAV-Ordner erreichbar ist. Bei einem Fehler bleiben die Aufnahmen erhalten. Ein begonnener Upload kann mit derselben Datei erneut versucht werden. Der Dateiname enthält die eingegebenen Namen und eine eindeutige Kennung.
6. Nach einem bestätigten Upload oder bei **Abmelden** wird die gesamte lokale Sitzung geleert. Bereits bestätigte Uploads bleiben im WebDAV-Ordner.

## Dauer der Abgabesitzung

Die Sitzung läuft 90 Minuten ab der ersten WebDAV-Verbindung. Gespeicherte Videos und Namen bleiben beim Tabwechsel, Neuladen oder Schließen im selben Browserprofil erhalten. Bei erneuter Verbindung verlängert sich die Frist nicht. Ist die App beim Ablauf geschlossen, entfernt sie die Sitzung beim nächsten Öffnen.

## WebDAV vorbereiten

Der QR-Code enthält den verschlüsselten WebDAV-Zugang der Hauptapp. Der Zahlencode entschlüsselt den Zugang beim ersten Verbinden. Videos, Gruppennamen und der WebDAV-Zugang werden bis zum Ende der Sitzung in IndexedDB gespeichert. Der Zugang wird dafür lokal mit einem nicht exportierbaren Schlüssel verschlüsselt. Beim erneuten Öffnen läuft die Sitzung ohne erneute PIN-Eingabe weiter. Bei Sitzungen aus der vorherigen Version kann zur Übernahme einmalig die PIN nötig sein. Ein kopierter QR-Code kann durch Ausprobieren der vierstelligen PIN entschlüsselt werden. [Hinweise zum Abgabekonto](../tmp_recorder/README.md#qr-code-zur-videoabgabe)

Der WebDAV-Server braucht HTTPS, HTTP Basic Auth und eine CORS-Freigabe für `https://bogatsch.github.io`. Die Vorabprüfung per `OPTIONS` muss ohne Anmeldung funktionieren. Erlaube `PROPFIND` und `PUT` und die Header `Authorization`, `Content-Type` und `Depth`. Bei einem Konto ohne Leserechte kann der Server `PROPFIND` verweigern. Die eigentliche Schreibberechtigung zeigt sich bei der Abgabe. [WebDAV und CORS in der Hauptapp](../tmp_recorder/README.md#qr-code-zur-videoabgabe)

## Lokal starten und testen

Ein statischer Webserver im Stammverzeichnis des Repositories stellt beide Apps bereit.

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Zum lokalen Kameratest den [Client auf localhost](http://127.0.0.1:8080/Sport/tmp_recorder_client/) öffnen. Die Hauptapp erzeugt QR-Codes für die feste öffentliche Adresse.

Die automatisierten Tests laufen im Verzeichnis `Sport/tmp_recorder_client` mit `npm.cmd test`. Der QR-Scanner verwendet [jsQR 1.4.0](https://github.com/cozmo/jsQR) unter Apache-2.0. Die Lizenz liegt in `vendor/jsqr/LICENSE`.
