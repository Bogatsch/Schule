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

Den Node-Dienst unter einer HTTPS-Adresse bereitstellen und `APP_URL` auf diese Adresse am Stammverzeichnis setzen, etwa `https://video.example.org/`. Für lokale Tests nutzt der Dienst `localhost:8080`. `HOST` und `PORT` steuern die Bind-Adresse und den Port. Bei einem HTTPS-Reverse-Proxy müssen Uploads bis 200 MiB und die für die Übertragung nötigen Zeitlimits zugelassen werden.

### QR-Code in der Hauptapp erzeugen

Setze `TEACHER_ORIGIN` am Upload-Dienst auf die Origin der Hauptapp, beispielsweise `https://bogatsch.github.io`. Der Seitenpfad gehört nicht zur Einstellung. Verwende in `WEBDAV_URL` denselben Zielordner wie in der Hauptapp. Im WebDAV-Reiter der Hauptapp als **HTTPS-Adresse des Schüler-Clients** den Wert von `APP_URL` und als **Freigabeschlüssel** den Wert von `PAIRING_ADMIN_KEY` eingeben. Die Hauptapp erzeugt dann den Code über die Freigabe-API. Ein neuer Code im selben Reiter beendet die vorherige Freigabe.

Der Browser sendet das Video an den Dienst unter derselben Adresse wie die Client-Seite. Der Dienst überträgt es per WebDAV `PUT`. Die WebDAV-Zugangsdaten liegen im Serverprozess. Er prüft beim Erstellen einer Freigabe den Zielordner mit `PROPFIND`. Der QR-Code enthält eine zufällige Einladung, die nur zur Upload-Abgabe berechtigt. Weder der Client noch der Upload-Dienst legen lokale Videodateien an. Die Sitzungsdaten werden im Arbeitsspeicher gehalten. Beim Abmelden bleibt der Upload bereits bestätigter Videos im WebDAV-Ordner erhalten.

## Tests und Komponenten

```powershell
npm.cmd test
```

Die Tests verwenden einen lokalen WebDAV-Testserver. Für den QR-Scan wird [jsQR 1.4.0](https://github.com/cozmo/jsQR) unter Apache-2.0 lokal ausgeliefert. Die Lizenz liegt in `vendor/jsqr/LICENSE`. Der QR-Generator wird aus dem bestehenden Hauptprojekt eingebunden.
