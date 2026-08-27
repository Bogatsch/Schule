# Sportkamera

Eine installierbare, datensparsame Progressive Web App für direktes Foto- und Video-Feedback im Sportunterricht. Sie besteht aus lokalem HTML, CSS und JavaScript, benötigt keinen Build-Schritt und ist für GitHub Pages vorbereitet.

## Datenschutz und flüchtige Aufnahmen

Aufnahmen werden ausschließlich für die aktuelle Vorschau im Arbeitsspeicher des Browsers gehalten. Es gibt keine Galerie, keine Anmeldung, keine dauerhafte Speicherung und keine Download-, Export-, Upload- oder Teilen-Funktion.

- Die App fordert ausschließlich die Kameraberechtigung an. Videos werden ohne Ton aufgenommen; eine Mikrofonberechtigung wird nicht benötigt.
- Fotos werden vorübergehend in einem Canvas verarbeitet. Videos entstehen aus flüchtigen Fragmenten des `MediaRecorder`.
- **Aufnahme verwerfen**, **Neue Aufnahme**, **Zurück**, ein Wechsel in den Hintergrund und das Verlassen der Seite entfernen die aktuelle Aufnahme aus der App.
- Vorschauvideos verhindern über Browserattribute native Downloads, Bild-in-Bild und Remote-Wiedergabe soweit der Browser diese Einschränkungen unterstützt.
- Der aktuelle Videoframe kann temporär annotiert werden. Beim Schließen wird die Annotation verworfen.
- Es gibt keine Netzwerkaufrufe für Nutzermedien. Der Service Worker speichert nur den statischen App-Rahmen und die bereitgestellten Leitbild-Videos für den Offlinebetrieb.

Eine Web-App kann Screenshots, Bildschirmaufnahmen oder den Zugriff auf Browser-Entwicklerwerkzeuge nicht technisch verhindern.

## Lokal testen

Kamera und Service Worker benötigen einen sicheren Kontext. Browser behandeln `http://localhost` für die Entwicklung als sicheren Kontext; im Internet ist HTTPS erforderlich.

Im Ordner `Sport/tmp_recorder` einen lokalen Server starten:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Danach `http://127.0.0.1:8080/` öffnen. Die automatisierten Prüfungen laufen mit:

```powershell
npm test
```

## Bedienung

- **Foto** erstellt einen Schnappschuss über Canvas.
- **Video** zeichnet maximal drei Minuten ohne Ton auf und kann früher gestoppt werden.
- **Kamera wechseln** schaltet zwischen Front- und Rückkamera um.
- In der Videovorschau stehen Start/Pause, Zeitleiste und die Geschwindigkeiten 0,25×, 0,5× und 1× zur Verfügung.
- Über den Stift-Button lässt sich der aktuelle Videoframe vorübergehend annotieren.
- Mit **Leitbild daneben** kann ein Leitbild unabhängig neben der eigenen Aufnahme abgespielt werden.
- Unter **Leitbilder ansehen → Spielsportarten → Volleyball** stehen **Angriffsschlag** und **Pritschen seitlich** bereit.

## Manuelle Abnahme

1. Foto und Video aufnehmen und prüfen, dass keine Mikrofonabfrage erscheint.
2. Rück- und Frontkamera im Hoch- und Querformat testen.
3. Wiedergabe, Zeitleiste, Tempostufen, Vergleich und Annotation prüfen.
4. Prüfen, dass Startseite und Vorschau keine Galerie-, Anmelde-, Speicher-, Download- oder Exportelemente enthalten.
5. Eine Aufnahme verwerfen beziehungsweise die App in den Hintergrund schicken; nach der Rückkehr darf sie nicht mehr vorhanden sein.
6. Offline-Start und Leitbild-Wiedergabe nach einem vollständigen Online-Start prüfen.

## Wichtige Dateien

- `index.html` – Oberfläche für Aufnahme, Vorschau, Vergleich und Annotation
- `app.js` – Kamera, Aufnahme, Wiedergabe und zentrale flüchtige Medienbereinigung
- `annotation.js` – temporäre Frame-Annotation
- `media-utils.js` – Formatauswahl, Zeitlimit und Zeitformatierung
- `sw.js` – feste Offline-Positivliste für App-Rahmen und Leitbilder
- `pages/leitbilder/` – Leitbildauswahl und Videoplayer
