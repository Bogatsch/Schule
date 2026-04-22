# Binär-ASCII-Visualizer

Eine interaktive Webanwendung zur Visualisierung von Binärzahlen und deren Interpretation als ASCII-Zeichen, entwickelt für den Einsatz am Smartboard im Informatikunterricht.

## 🎯 Zielsetzung

Diese App unterstützt Lehrende dabei, Schülerinnen und Schülern die Konzepte von Bits, Bytes und deren verschiedene Interpretationen zu vermitteln. Sie zeigt anschaulich, wie dieselben 8 Bits je nach Kontext als ASCII-Zeichen, Dezimalzahl oder Graustufe interpretiert werden können.

## ✨ Features

### Hauptfunktionen
- **8 interaktive Bit-Schalter** mit visueller LED-Anzeige
- **Große ASCII-Zeichen-Anzeige** für optimale Sichtbarkeit am Smartboard
- **Modulare Anzeigen** die einzeln ein-/ausgeschaltet werden können:
  - Dezimalwerte unter den Schaltern (128, 64, 32, 16, 8, 4, 2, 1)
  - Zweierpotenzen-Anzeige (2⁷, 2⁶, 2⁵, ...)
  - Binärzahl-String-Darstellung
  - Dezimalwert-Ausgabe
  - Graustufen-Visualisierung

### Bedienkomfort
- **Preset-Buttons** für häufige Beispiele (A, Z, H, Reset, Maximum)
- **Schnell-Eingabe** für Dezimalwerte und ASCII-Zeichen
- **Touch-optimierte Bedienung** für Smartboards
- **Responsive Design** für verschiedene Bildschirmgrößen

### Erweiterte Features
- **Tastenkürzel** für Demonstrationen:
  - `Strg+1`: Buchstaben A-Z durchlaufen
  - `Strg+2`: Zweierpotenzen zeigen
  - `Strg+3`: Von 0 bis 255 zählen
  - `Strg+0`: Reset auf 0
- **Console-API** für erweiterte Nutzung durch Lehrende
- **Animationen** bei Wertänderungen für bessere Sichtbarkeit

## 🚀 Installation und Nutzung

### GitHub Pages Deployment

1. **Repository klonen oder herunterladen**
   ```bash
   git clone https://github.com/HansTydecks/binary-ascii-visualizer.git
   ```

2. **GitHub Pages aktivieren**
   - Gehen Sie zu den Repository-Einstellungen auf GitHub
   - Scrollen Sie zu "Pages" 
   - Wählen Sie "Deploy from a branch"
   - Wählen Sie "main" branch und "/ (root)"
   - Klicken Sie auf "Save"

3. **App aufrufen**
   - Die App ist dann verfügbar unter: `https://hanstydecks.github.io/binary-ascii-visualizer/`

### Lokale Nutzung

Öffnen Sie einfach die `index.html` Datei in einem modernen Webbrowser. Keine weiteren Installationen erforderlich.

## 📚 Pädagogischer Einsatz

### Unterrichtsphase 3: Transistor/Schalter-Demonstration

Die App ist speziell für Phase 3 des Unterrichtskonzepts entwickelt:

**Lernziel**: Verdeutlichen, dass gleiche Bits unterschiedliche Bedeutungen haben können

**Einsatz-Szenario**:
1. Lehrer setzt Byte `01000001` an der App
2. Zeigt verschiedene Interpretationen:
   - Als ASCII: Buchstabe 'A'
   - Als Dezimalzahl: 65
   - Als Graustufe: heller Wert
3. Schüler erkennen: Bits haben keine eigenständige Bedeutung
4. Bedeutung entsteht durch Vereinbarung/Interpretation

### Modularer Aufbau für progressive Komplexität

- **Einstieg**: Nur Schalter und ASCII-Anzeige aktiv
- **Stufe 1**: Dezimalwerte unter Schaltern einblenden
- **Stufe 2**: Zweierpotenzen hinzufügen
- **Stufe 3**: Binär- und Dezimalausgabe aktivieren
- **Stufe 4**: Graustufen-Visualisierung für erweiterte Interpretation

## 🛠️ Technische Details

### Technologie-Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties
- **Kompatibilität**: Moderne Browser (Chrome, Firefox, Safari, Edge)
- **Responsive**: Mobile-first Design mit Touch-Optimierung

### Browser-Anforderungen
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Performance
- Keine externen Abhängigkeiten
- Kleine Dateigröße (~50KB total)
- Offline-fähig nach dem ersten Laden
- Optimiert für Smartboard-Performance

## 🎮 Erweiterte Nutzung

### Console-API für Lehrende

Öffnen Sie die Browser-Entwicklertools (F12) für erweiterte Funktionen:

```javascript
// Wert direkt setzen
binaryVisualizer.setValue(72); // Setzt 'H'

// Binärzahl setzen
setBinary('01001000'); // Setzt Binärzahl direkt

// Zeichen setzen
setCharacter('H'); // Setzt ASCII-Zeichen

// Aktuelle Bit-Darstellung anzeigen
binaryVisualizer.getBitRepresentation();

// Demonstrationen starten
binaryVisualizer.showExample('letters'); // A-Z durchlaufen
binaryVisualizer.showExample('powers');  // Zweierpotenzen
binaryVisualizer.showExample('count');   // 0-255 zählen
```

### Tastenkürzel

- `Strg+1`: Alphabet A-Z demonstration
- `Strg+2`: Zweierpotenzen-Demonstration  
- `Strg+3`: Vollständiger Zählvorgang 0-255
- `Strg+0`: Schneller Reset auf 0

## 🔧 Anpassung und Erweiterung

### Dateistruktur
```
binary-ascii-visualizer/
├── index.html          # Hauptstruktur
├── style.css           # Styling und Layout
├── script.js           # Funktionalität und Interaktion
├── README.md           # Diese Dokumentation
└── app-prompt.md       # Entwicklungs-Prompt
```

### CSS-Variablen für einfache Anpassung
```css
:root {
    --primary-color: #2563eb;     /* Hauptfarbe */
    --secondary-color: #10b981;   /* Schalter/LEDs */
    --accent-color: #f59e0b;      /* Akzente */
    --switch-on: #10b981;         /* Schalter AN */
    --led-on: #10b981;            /* LED AN */
}
```

## 📖 Unterrichtsmaterial

### Arbeitsblatt-Ideen

1. **Bit-Muster erkunden**
   - Welche ASCII-Zeichen ergeben sich bei verschiedenen Bit-Mustern?
   - Welche Dezimalwerte entsprechen den Buchstaben A-Z?

2. **Zweierpotenzen verstehen**
   - Welche Einzelbits müssen gesetzt sein für bestimmte Dezimalwerte?
   - Wie verändert sich der Wert beim Ein-/Ausschalten einzelner Bits?

3. **Interpretation vergleichen**
   - Gleiches Bit-Muster als ASCII, Dezimal und Graustufe interpretieren
   - Wann ist welche Interpretation sinnvoll?

### Diskussionsfragen

- "Warum kann der Computer nur 0 und 1 speichern?"
- "Haben Bits eine eigene Bedeutung?"
- "Wie entsteht aus Bits ein Buchstabe?"
- "Warum gibt es verschiedene Zeichensätze?"

## 🐛 Fehlerbehebung

### Häufige Probleme

**App lädt nicht richtig:**
- Browser-Cache leeren (Strg+F5)
- JavaScript in Browser-Einstellungen aktiviert?
- Console (F12) auf Fehlermeldungen prüfen

**Touch-Bedienung funktioniert nicht:**
- Moderne Browser verwenden
- Zoom-Level des Browsers prüfen
- Smartboard-Kalibrierung überprüfen

**Module werden nicht angezeigt:**
- Checkboxes in der Kopfzeile überprüfen
- Browser-Fenster groß genug für Layout?

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz und kann frei für Bildungszwecke verwendet und angepasst werden.

## 🤝 Beitragen

Verbesserungsvorschläge und Erweiterungen sind willkommen! Erstellen Sie gerne Issues oder Pull Requests.

## 📞 Support

Bei Fragen oder Problemen wenden Sie sich an:
- GitHub Issues: [Repository Issues](https://github.com/HansTydecks/binary-ascii-visualizer/issues)
- Entwickler: [@HansTydecks](https://github.com/HansTydecks)

---

**Entwickelt für den Informatikunterricht - Von Lehrenden für Lehrende** 🎓
