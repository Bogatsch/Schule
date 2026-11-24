# Sportkamera · Videoabgabe

Der Client öffnet direkt die Kamera für den QR-Scan. Mit dem Code der Lehrkraft wechselt er zur stummen Videoaufnahme mit Vorschau, Zeitlupe und Einzelbildschritten. **Speichern & abgeben** überträgt das Video in den eingerichteten WebDAV-Ordner und bestätigt die Abgabe nach erfolgreichem Schreiben. **Abmelden** bricht eine laufende Übertragung ab, schließt Kamera und Sitzung und verwirft lokale Aufnahmen und Vorschaudaten.

## Lokal starten

Benötigt wird Node.js ab Version 22. Das Projekt verwendet die Video-Hilfsfunktionen und den QR-Generator aus dem benachbarten Ordner `tmp_recorder`. Starte es im gemeinsamen Repository.

```powershell
$env:WEBDAV_URL = 'https://webdav.example.org/sport/videos/'
$dav = Get-Credential -Message 'WebDAV-Konto für die Videoabgabe'
$env:WEBDAV_USERNAME = $dav.UserName
$env:WEBDAV_PASSWORD = $dav.GetNetworkCredential().Password
$env:PAIRING_ADMIN_KEY = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
$env:PAIRING_ADMIN_KEY | Set-Clipboard
npm.cmd start
```

1. `http://localhost:8080/lehrkraft/` öffnen, den Freigabeschlüssel einfügen und **QR-Code erstellen** wählen.
2. Für einen lokalen Test `http://localhost:8080/` auf demselben Rechner öffnen. Auf Schülergeräten führt die öffentliche HTTPS-Adresse zum Client. Den QR-Code innerhalb der Anwendung scannen.
3. Ein Video aufnehmen, benennen und **Speichern & abgeben** wählen. Für weitere Abgaben kann dieselbe Sitzung genutzt werden.
4. Zum Beenden auf dem Schülergerät **Abmelden** wählen. Die Lehrkraft kann die gesamte Freigabe über **Abgabe schließen** beenden.

Die Seite `/lehrkraft/` erzeugt den QR-Code für den konfigurierten Zielordner und kann den zugehörigen Link kopieren. Eine Freigabe läuft nach 60 Minuten aus. Die Lehrkraft kann denselben QR-Code mehreren Geräten zeigen. Jedes Gerät erhält beim Scannen eine eigene Upload-Sitzung.

## Auf iPads im Netz verwenden

Die Client-Oberfläche liegt fest unter [Schüler-Client auf GitHub Pages](https://bogatsch.github.io/Schule/Sport/tmp_recorder_client/). Den Node-Dienst separat am Stammverzeichnis einer HTTPS-Adresse bereitstellen, etwa `https://video.example.org/`, und nur diese öffentliche Adresse in `../tmp_recorder/client-hosting.js` unter `UPLOAD_SERVICE_URL` eintragen. Dieselbe Einstellung lesen Hauptapp, Schüler-Client und Node-Dienst. Die WebDAV-Zugangsdaten und `PAIRING_ADMIN_KEY` bleiben als Umgebungsvariablen beim Node-Dienst. Für lokale Tests mit einer bereits gesetzten öffentlichen Dienstadresse überschreibt `APP_URL=http://localhost:8080/` die Adresse beim Node-Start. `HOST` und `PORT` steuern die Bind-Adresse und den Port. Bei einem HTTPS-Reverse-Proxy müssen Uploads bis 200 MiB und die für die Übertragung nötigen Zeitlimits zugelassen werden.

### QR-Code in der Hauptapp erzeugen

Verwende in `WEBDAV_URL` denselben Zielordner wie in der Hauptapp. Im WebDAV-Reiter der Hauptapp den **Freigabeschlüssel** aus `PAIRING_ADMIN_KEY` eingeben und den QR-Code erzeugen. Bei einer abweichenden Hauptapp-Origin lässt sich `TEACHER_ORIGIN` am Upload-Dienst setzen. Für die bestehenden GitHub-Pages-Adressen verwendet der Dienst `https://bogatsch.github.io`. Ein neuer Code im selben Reiter beendet die vorherige Freigabe.

Der Browser sendet das Video an den konfigurierten Upload-Dienst. Der Dienst erlaubt der Client-Origin den Zugriff auf die Sitzungs- und Upload-Endpunkte und überträgt das Video per WebDAV `PUT`. Er prüft beim Erstellen einer Freigabe den Zielordner mit `PROPFIND`. Der QR-Code enthält eine zufällige Einladung, die nur zur Upload-Abgabe berechtigt. Weder der Client noch der Upload-Dienst legen lokale Videodateien an. Die Sitzungsdaten werden im Arbeitsspeicher gehalten. Beim Abmelden bleibt der Upload bereits bestätigter Videos im WebDAV-Ordner erhalten.

## Tests und Komponenten

```powershell
npm.cmd test
```

Die Tests verwenden einen lokalen WebDAV-Testserver. Für den QR-Scan wird [jsQR 1.4.0](https://github.com/cozmo/jsQR) unter Apache-2.0 lokal ausgeliefert. Die Lizenz liegt in `vendor/jsqr/LICENSE`. Der QR-Generator wird aus dem bestehenden Hauptprojekt eingebunden.
