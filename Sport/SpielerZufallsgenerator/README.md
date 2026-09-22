# Spieler-Auslosung

Kleine Webanwendung für den Sportunterricht: Sie lost aus, welche Spieler aus
jedem Team die nächste Runde bestreiten – und achtet dabei darauf, dass alle
gleich oft drankommen.

Keine Abhängigkeiten, kein Build, keine Netzwerkzugriffe. Drei Dateien
(`index.html`, `styles.css`, `app.js`), die direkt über GitHub Pages
ausgeliefert werden können.

## Ablauf

1. Anzahl der Teams wählen (2 bis 12).
2. Für jedes Team einzeln die Spielerzahl festlegen (1 bis 30). Die Teams dürfen
   unterschiedlich groß sein, Namen lassen sich überschreiben.
3. **Start** – die Session beginnt.
4. **Start / Neue Gegner würfeln** – lost eine neue Runde aus.
5. **Session beenden** – setzt die Einsatzzählung zurück, die Teameinstellung
   bleibt erhalten.

Die Leertaste würfelt ebenfalls eine neue Runde, solange kein Eingabefeld den
Fokus hat.

## Wie viele Spieler pro Team?

Gespielt wird immer in gleich großen Mannschaften, deshalb begrenzt das
kleinste Team die Aufstellung: Bei 4 gegen 3 Spielern sind höchstens 3 gegen 3
möglich.

Standardmäßig würfelt die App die Größe jeder Runde neu aus (1 bis zum
Maximum). Über die Chips **Spieler pro Team** lässt sich stattdessen eine feste
Größe vorgeben, etwa dauerhaft 2 gegen 2.

## Faire Verteilung

Innerhalb einer Session zählt die App für jeden Spieler mit, wie oft er dran
war. Gezogen wird gewichtet ohne Zurücklegen (Verfahren nach
Efraimidis/Spirakis): Der Schlüssel eines Spielers ist `zufall^(1/gewicht)`, die
höchsten Schlüssel kommen zum Zug. Das Gewicht steigt pro Einsatz Rückstand auf
den Vielspieler des Teams um den Faktor `FAIRNESS_BASE` (25), gedeckelt bei
`FAIRNESS_CAP` (4) Einsätzen Rückstand.

Praktisch heißt das: Wer eine Runde aussetzen musste, ist mit großer
Wahrscheinlichkeit als Nächstes dabei, ohne dass die Auslosung vorhersagbar
wird. In der Simulation liegt die Spanne zwischen Viel- und Wenigspieler eines
Teams meist bei 0 bis 1 Einsatz.

Die Zählung läuft im Hintergrund und gilt pro Session – „Session beenden“
startet sie von vorn.

## Technisches

* Zufall kommt aus `crypto.getRandomValues()`, mit `Math.random()` als Rückfall.
* Teamaufstellung und laufende Session liegen im `localStorage`; ein
  versehentlicher Reload verliert die Einsatzzählung also nicht. Ist der
  Speicher gesperrt (privates Fenster), läuft die App trotzdem weiter.
* Eine strikte Content-Security-Policy im `<head>` verbietet jeden externen
  Zugriff (`connect-src 'none'`). Es werden keine Daten übertragen.
* Die Roll-Animation der Nummern respektiert `prefers-reduced-motion`.
