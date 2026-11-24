# Sportkamera · Videoabgabe

1. Die Lehrkraft öffnet in der Hauptapp den WebDAV-Reiter. Sobald WebDAV verbunden ist, erscheinen der QR-Code und darunter ein vierstelliger Zahlencode.
2. Die Schülerinnen und Schüler scannen den QR-Code im Client, geben den Zahlencode ein und tippen auf **Verbinden**. [Schüler-Client auf GitHub Pages](https://bogatsch.github.io/Schule/Sport/tmp_recorder_client/)
3. Die Aufnahme lässt sich in Zeitlupe und in Einzelbildern prüfen. Mit **Speichern & abgeben** sendet der Browser das Video direkt per WebDAV an den Zielordner. Die Bestätigung erscheint, sobald der Server das Video angenommen hat.
4. **Abmelden** bricht eine laufende Übertragung ab, schließt die Kamera und verwirft die Zugangsdaten und Aufnahmen im Arbeitsspeicher. Bereits bestätigte Uploads bleiben im WebDAV-Ordner.

## WebDAV vorbereiten

Der QR-Code enthält den verschlüsselten WebDAV-Zugang der Hauptapp. Der Zahlencode entschlüsselt den Zugang lokal. Dann prüft der Client die WebDAV-Verbindung. Der Client speichert Zugangsdaten und Videos nur im Arbeitsspeicher. Ein kopierter QR-Code kann durch Ausprobieren der vierstelligen PIN entschlüsselt werden. [Hinweise zum Abgabekonto](../tmp_recorder/README.md#qr-code-zur-videoabgabe)

Der WebDAV-Server braucht HTTPS, HTTP Basic Auth und eine CORS-Freigabe für `https://bogatsch.github.io`. Die Vorabprüfung per `OPTIONS` muss ohne Anmeldung funktionieren. Erlaube `PROPFIND` und `PUT` und die Header `Authorization`, `Content-Type` und `Depth`. Bei einem Konto ohne Leserechte kann der Server `PROPFIND` verweigern. Die eigentliche Schreibberechtigung zeigt sich bei der Abgabe. [WebDAV und CORS in der Hauptapp](../tmp_recorder/README.md#qr-code-zur-videoabgabe)

## Lokal starten und testen

Ein statischer Webserver im Stammverzeichnis des Repositories stellt beide Apps bereit.

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Zum lokalen Kameratest den [Client auf localhost](http://127.0.0.1:8080/Sport/tmp_recorder_client/) öffnen. Die Hauptapp erzeugt QR-Codes für die feste öffentliche Adresse.

Die automatisierten Tests laufen im Verzeichnis `Sport/tmp_recorder_client` mit `npm.cmd test`. Der QR-Scanner verwendet [jsQR 1.4.0](https://github.com/cozmo/jsQR) unter Apache-2.0. Die Lizenz liegt in `vendor/jsqr/LICENSE`.
