class CSSExplorer {
  constructor() {
    this.currentMission = 0;
    this.completedMissions = new Set();
    this.missionState = {};
    this._missionAbort = null;

    // ---- GLOSSARY HTML ----
    this.glossaryHtml = [
      { term: 'HTML', definition: 'HTML steht fuer HyperText Markup Language. Damit bestimmst du den Inhalt und die Struktur deiner Webseite.', example: '<h1>Ueberschrift</h1>' },
      { term: 'DOCTYPE', definition: 'Die DOCTYPE-Deklaration sagt dem Browser, welche HTML-Version verwendet wird. Steht immer ganz oben.', example: '<!DOCTYPE html>' },
      { term: 'Grundgeruest', definition: 'Jede HTML-Datei besteht aus <html>, <head> und <body>. Das ist das Grundgeruest.', example: '<html>\n  <head>...</head>\n  <body>...</body>\n</html>' },
      { term: 'Ueberschrift', definition: 'Mit <h1> bis <h6> erstellst du Ueberschriften. h1 ist die wichtigste, h6 die kleinste.', example: '<h1>Groesste</h1>  <h6>Kleinste</h6>' },
      { term: 'Absatz (p)', definition: 'Mit <p> erstellst du einen Absatz (Paragraph). Text in einem p-Element bekommt automatisch Abstand.', example: '<p>Das ist ein Absatz.</p>' },
      { term: 'Liste', definition: 'Mit <ul> (ungeordnet) oder <ol> (geordnet) erstellst du Listen. Jeder Eintrag steht in einem <li>.', example: '<ul>\n  <li>Apfel</li>\n  <li>Banane</li>\n</ul>\n\n<ol>\n  <li>Aufwaermen</li>\n  <li>Spielen</li>\n</ol>' },
      { term: 'Link (a)', definition: 'Mit <a href="..."> erstellst du einen Link zu einer anderen Seite. href gibt das Ziel an.', example: '<a href="https://example.com">Klick mich</a>' },
      { term: 'Bild (img)', definition: 'Mit <img> fuegst du ein Bild ein. src gibt die Bildquelle an, width bestimmt die Breite.', example: '<img src="bild.jpg" width="200">' }
    ];

    // ---- GLOSSARY CSS ----
    this.glossaryCss = [
      { term: 'CSS', definition: 'CSS steht fuer Cascading Style Sheets. Es ist die Sprache, mit der du das Aussehen deiner Webseite bestimmst.', example: 'p { color: red; }' },
      { term: 'Selektor', definition: 'Der Selektor bestimmt, welches HTML-Element gestaltet werden soll. Er steht vor den geschweiften Klammern.', example: 'h1 { ... }' },
      { term: 'Eigenschaft', definition: 'Die Eigenschaft sagt, WAS veraendert werden soll (z.B. Farbe, Groesse, Schriftart).', example: 'color, font-size, background' },
      { term: 'Wert', definition: 'Der Wert sagt, WIE die Eigenschaft aussehen soll (z.B. rot, 16px, fett).', example: 'color: blue;  (blue ist der Wert)' },
      { term: 'ID', definition: 'Eine ID ist ein einzigartiger Name fuer genau ein Element. Jede ID darf nur einmal auf der Seite vorkommen.', example: '#titel { font-size: 2em; }' },
      { term: 'Inline CSS', definition: 'CSS-Regeln direkt im style-Attribut eines HTML-Elements. Nur fuer Notfaelle!', example: '<p style="color:red">Text</p>' },
      { term: 'Internes CSS', definition: 'CSS-Regeln im style-Element im head-Bereich der HTML-Datei.', example: '<style> p { color: red; } </style>' },
      { term: 'Externes CSS', definition: 'CSS-Regeln in einer eigenen .css-Datei, die per link eingebunden wird. Die beste Methode!', example: '<link rel="stylesheet" href="style.css">' },
      { term: 'Kaskade', definition: 'Die Kaskade bestimmt, welche CSS-Regel gewinnt, wenn mehrere Regeln dasselbe Element betreffen.', example: 'Inline > ID > Element' },
      { term: 'Farbe (color)', definition: 'Mit color bestimmst du die Textfarbe. Mit background-color die Hintergrundfarbe.', example: 'color: #ff6600; background-color: yellow;' }
    ];

    // ---- HTML REFERENCES (for badges) ----
    this.htmlReferences = {
      typo: 'In HTML legst du mit <h1> bis <h6> und <p> die Textstruktur fest. Die Ueberschriften-Tags bestimmen die Wichtigkeit, CSS bestimmt dann das Aussehen.'
    };

    // ---- HTML FLIP CARDS ----
    this.htmlFlipCards = [
      { icon: '📄', title: 'HTML-Dokument', definition: 'Jede Webseite ist eine HTML-Datei. Sie beginnt mit <!DOCTYPE html> und hat die Bereiche <html>, <head> und <body>.', example: '<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>' },
      { icon: '📌', title: 'Ueberschriften', definition: 'Es gibt 6 Ueberschriften-Stufen: <h1> (wichtigste) bis <h6> (kleinste). Pro Seite sollte es nur eine <h1> geben.', example: '<h1>Haupttitel</h1>\n<h2>Untertitel</h2>' },
      { icon: '📝', title: 'Absatz (p)', definition: 'Mit dem <p>-Tag erstellst du Textabsaetze. Der Browser fuegt automatisch Abstand darueber und darunter ein.', example: '<p>Ein Absatz mit Text.</p>' },
      { icon: '📋', title: 'Listen', definition: 'Ungeordnete Listen (<ul>) zeigen Aufzaehlungspunkte. Geordnete Listen (<ol>) zeigen Nummern. Eintraege stehen in <li>.', example: '<ul>\n  <li>Apfel</li>\n  <li>Banane</li>\n</ul>\n\n<ol>\n  <li>Aufwaermen</li>\n  <li>Spielen</li>\n</ol>' },
      { icon: '🔗', title: 'Links (a)', definition: 'Mit <a href="URL"> erstellst du einen klickbaren Link. Das href-Attribut gibt an, wohin der Link fuehrt.', example: '<a href="https://example.com">\n  Klick mich!\n</a>' },
      { icon: '🖼️', title: 'Bilder (img)', definition: 'Mit <img> fuegst du Bilder ein. src gibt die Bilddatei an, width bestimmt die Breite des Bildes.', example: '<img src="foto.jpg"\n     width="200">' }
    ];

    // ---- HTML STRUCTURE PARTS ----
    this.htmlStructureParts = [
      { label: '<!DOCTYPE html>', desc: 'Sagt dem Browser: "Das ist eine HTML5-Seite!" Steht immer in der allerersten Zeile.' },
      { label: '<html>', desc: 'Das Wurzelelement – alles andere steht darin. Es umschliesst die gesamte Seite.' },
      { label: '<head>', desc: 'Der Kopf der Seite. Hier stehen unsichtbare Infos wie der Seitentitel und die CSS-Einbindung.' },
      { label: '<title>', desc: 'Der Seitentitel – erscheint oben im Browser-Tab. Steht im <head>.' },
      { label: '<link>', desc: 'Verbindet die HTML-Datei mit einer CSS-Datei. Steht im <head>.' },
      { label: '<body>', desc: 'Der Koerper der Seite. Hier steht alles, was der Benutzer sieht: Texte, Bilder, Links usw.' }
    ];

    // ---- HTML ELEMENT EXAMPLES ----
    this.htmlElementExamples = [
      {
        title: 'Ueberschriften',
        code: '<h1>Hauptueberschrift</h1>\n<h2>Unterueberschrift</h2>\n<h3>Noch kleiner</h3>',
        preview: '<h1 style="margin:4px 0">Hauptueberschrift</h1><h2 style="margin:4px 0">Unterueberschrift</h2><h3 style="margin:4px 0">Noch kleiner</h3>',
        explanation: 'h1 ist die wichtigste Ueberschrift, h6 die kleinste. Verwende h1 nur einmal pro Seite!'
      },
      {
        title: 'Absaetze',
        code: '<p>Das ist der erste Absatz.</p>\n<p>Das ist der zweite Absatz.</p>',
        preview: '<p>Das ist der erste Absatz.</p><p>Das ist der zweite Absatz.</p>',
        explanation: 'Jeder Absatz bekommt automatisch Abstand. Benutze <p> fuer laengere Texte.'
      },
      {
        title: 'Ungeordnete Liste',
        code: '<ul>\n  <li>Apfel</li>\n  <li>Banane</li>\n  <li>Kirsche</li>\n</ul>',
        preview: '<ul><li>Apfel</li><li>Banane</li><li>Kirsche</li></ul>',
        explanation: 'Eine ungeordnete Liste (<ul>) zeigt Aufzaehlungspunkte. Jeder Eintrag steht in <li>.'
      },
      {
        title: 'Geordnete Liste',
        code: '<ol>\n  <li>Erster Schritt</li>\n  <li>Zweiter Schritt</li>\n  <li>Dritter Schritt</li>\n</ol>',
        preview: '<ol><li>Erster Schritt</li><li>Zweiter Schritt</li><li>Dritter Schritt</li></ol>',
        explanation: 'Eine geordnete Liste (<ol>) zeigt Nummern. Perfekt fuer Anleitungen oder Ranglisten.'
      },
      {
        title: 'Links',
        code: '<a href="https://example.com">\n  Zur Beispielseite\n</a>',
        preview: '<a href="https://example.com" style="color:#8b5cf6;">Zur Beispielseite</a>',
        explanation: 'Das href-Attribut gibt an, wohin der Link fuehrt. Der Text dazwischen wird klickbar.'
      },
      {
        title: 'Bilder',
        code: '<img src="manos_logo.gif"\n     width="200">',
        preview: '<img src="manos_logo.gif" width="200">',
        explanation: 'src gibt die Bilddatei an (z.B. "manos_logo.gif"). Mit width steuerst du die Breite des Bildes, z.B. width="200".'
      }
    ];

    // ---- CSS FLIP CARDS ----
    this.flipCards = [
      { icon: '📝', title: 'CSS-Regel', definition: 'Eine CSS-Regel besteht aus einem Selektor und einem Deklarationsblock mit Eigenschaften und Werten.', example: 'h1 { color: blue; }', htmlRef: 'Der Selektor h1 waehlt alle <h1>-Ueberschriften aus dem HTML.' },
      { icon: '🎯', title: 'Selektor', definition: 'Der Selektor bestimmt, welches HTML-Element gestylt wird. Es gibt Element- und ID-Selektoren.', example: 'p { }  h1 { }  #titel { }', htmlRef: 'Selektoren beziehen sich immer auf HTML-Elemente oder deren Attribute.' },
      { icon: '🔧', title: 'Eigenschaft', definition: 'Die Eigenschaft sagt, WAS veraendert wird: Farbe, Groesse, Abstand und vieles mehr.', example: 'color  font-size  margin', htmlRef: 'Jedes HTML-Element hat viele CSS-Eigenschaften, die du veraendern kannst.' },
      { icon: '🎨', title: 'Wert', definition: 'Der Wert bestimmt, WIE die Eigenschaft aussieht: z.B. welche Farbe, wie gross, wie weit.', example: 'red  16px  bold  center', htmlRef: 'Werte passen zum jeweiligen HTML-Element und dessen Eigenschaft.' },
      { icon: '🆔', title: 'ID (#)', definition: 'Eine ID ist ein einzigartiger Name fuer genau ein Element. Im CSS nutzt du das #-Zeichen.', example: '#haupttitel { font-size: 2em; }', htmlRef: 'Im HTML: <h1 id="haupttitel">Titel</h1>' }
    ];

    // ---- WORKSHOP: CSS EINBINDEN ----
    this.workshopSteps = [
      {
        title: 'Inline-Style',
        htmlCode: '<p style="color: blue; font-size: 20px;">\n  Dieser Text ist blau und gross!\n</p>\n<p>Dieser Text hat keinen Style.</p>',
        highlightText: 'style="color: blue; font-size: 20px;"',
        cssCode: null,
        preview: '<p style="color: blue; font-size: 20px;">Dieser Text ist blau und gross!</p><p>Dieser Text hat keinen Style.</p>',
        explanation: 'Inline-CSS schreibst du direkt ins HTML-Element mit dem style-Attribut. Hier brauchst du keine extra style.css – alles steht in der index.html. Praktisch zum Ausprobieren, aber nicht fuer grosse Seiten geeignet!'
      },
      {
        title: 'Interner Style',
        htmlCode: '<head>\n  <style>\n    p {\n      color: green;\n      font-size: 18px;\n    }\n  </style>\n</head>\n<body>\n  <p>Alle Absaetze sind gruen!</p>\n  <p>Dieser auch!</p>\n</body>',
        highlightText: '  <style>\n    p {\n      color: green;\n      font-size: 18px;\n    }\n  </style>',
        cssCode: null,
        preview: '<style>p { color: green; font-size: 18px; }</style><p>Alle Absaetze sind gruen!</p><p>Dieser auch!</p>',
        explanation: 'Internes CSS schreibst du in einen <style>-Block im <head>. Auch hier brauchst du keine extra style.css – alles steht in der index.html. Gut fuer einzelne Seiten, aber besser ist ein externes Stylesheet!'
      },
      {
        title: 'Externes Stylesheet',
        htmlCode: '<head>\n  <link rel="stylesheet"\n        href="style.css">\n</head>\n<body>\n  <p>CSS aus einer eigenen Datei!</p>\n  <p>So machen es die Profis.</p>\n</body>',
        highlightText: '  <link rel="stylesheet"\n        href="style.css">',
        cssCode: 'p {\n  color: purple;\n  font-size: 18px;\n}',
        preview: '<style>p { color: purple; font-size: 18px; }</style><p>CSS aus einer eigenen Datei!</p><p>So machen es die Profis.</p>',
        explanation: 'Hier brauchst du zwei Dateien: In der index.html bindest du die style.css mit <link> ein. Das CSS schreibst du in die style.css. Das ist die beste Methode! Du kannst dieselbe style.css fuer viele HTML-Seiten nutzen.'
      }
    ];

    // ---- SELECTOR PLAYGROUND ----
    this.selectorPlayground = {
      html: [
        { tag: 'h1', text: 'Willkommen!', attrs: '', id: '', cls: '' },
        { tag: 'p', text: 'Erster Absatz', attrs: '', id: '', cls: '' },
        { tag: 'p', text: 'Zweiter Absatz', attrs: '', id: '', cls: '' },
        { tag: 'h2', text: 'Unterueberschrift', attrs: ' id="sub"', id: 'sub', cls: '' },
        { tag: 'p', text: 'Dritter Absatz', attrs: '', id: '', cls: '' },
        { tag: 'img', text: '', attrs: ' src="manos_logo.gif" width="200"', id: '', cls: '', selfClosing: true }
      ],
      selectors: [
        { selector: 'h1', label: 'h1', desc: 'Waehlt alle h1-Ueberschriften aus.', matchFn: el => el.tag === 'h1' },
        { selector: 'p', label: 'p', desc: 'Waehlt alle Absaetze (p-Elemente) aus.', matchFn: el => el.tag === 'p' },
        { selector: '#sub', label: '#sub', desc: 'Waehlt genau das Element mit id="sub" aus.', matchFn: el => el.id === 'sub' },
        { selector: 'img', label: 'img', desc: 'Waehlt alle Bilder aus.', matchFn: el => el.tag === 'img' }
      ]
    };

    // ---- MISSIONS ----
    this.missions = [
      // ==== HTML MISSIONEN ====
      {
        title: 'HTML-Grundgeruest',
        section: 'HTML-Grundlagen',
        text: 'Erstelle das Grundgeruest einer HTML-Seite! Du brauchst: <!DOCTYPE html>, dann <html> mit <head> (inkl. <title>) und <body>. Schreibe in den body eine h1-Ueberschrift.',
        format: 'html-write',
        data: {
          starterHtml: '',
          checks: [
            { type: 'text', pattern: '<!DOCTYPE html>', desc: '<!DOCTYPE html> ist vorhanden' },
            { type: 'text', pattern: '<html', desc: '<html>-Tag ist vorhanden' },
            { type: 'text', pattern: '<head', desc: '<head>-Tag ist vorhanden' },
            { type: 'text', pattern: '<title', desc: '<title>-Tag ist vorhanden' },
            { type: 'text', pattern: '<body', desc: '<body>-Tag ist vorhanden' },
            { type: 'dom', selector: 'h1', minCount: 1, desc: 'Eine <h1>-Ueberschrift ist vorhanden' }
          ]
        },
        success: 'Super! Du kennst das HTML-Grundgeruest!'
      },
      {
        title: 'Ueberschriften & Absaetze',
        text: 'Erstelle eine Seite mit einer h1-Ueberschrift, einer h2-Unterueberschrift und mindestens 2 Absaetzen (p).',
        format: 'html-write',
        data: {
          starterHtml: '',
          checks: [
            { type: 'dom', selector: 'h1', minCount: 1, desc: '<h1>-Ueberschrift vorhanden' },
            { type: 'dom', selector: 'h2', minCount: 1, desc: '<h2>-Ueberschrift vorhanden' },
            { type: 'dom', selector: 'p', minCount: 2, desc: 'Mindestens 2 Absaetze (<p>) vorhanden' },
            { type: 'content', selector: 'h1', desc: '<h1> hat Text-Inhalt' },
            { type: 'content', selector: 'p', desc: '<p> hat Text-Inhalt' }
          ]
        },
        success: 'Perfekt! Ueberschriften und Absaetze beherrschst du!'
      },
      {
        title: 'Listen erstellen',
        text: 'Ergaenze die Listen! Fuer jede Liste ist ein Beispiel vorgegeben. Fuege jeweils mindestens 2 weitere Eintraege (<li>) hinzu.',
        format: 'html-write',
        data: {
          starterHtml: '<h1>Meine Listen</h1>\n\n<h2>Baeume die ich kenne</h2>\n<ul>\n  <li>Eiche</li>\n  <!-- Ergaenze 2 weitere Baeume! -->\n</ul>\n\n<h2>Mein Lieblingsfaecher-Ranking</h2>\n<ol>\n  <li>Informatik</li>\n  <!-- Ergaenze 2 weitere Faecher! -->\n</ol>',
          checks: [
            { type: 'dom', selector: 'h1', minCount: 1, desc: '<h1>-Ueberschrift vorhanden' },
            { type: 'dom', selector: 'ul', minCount: 1, desc: 'Ungeordnete Liste (<ul>) vorhanden' },
            { type: 'dom', selector: 'ol', minCount: 1, desc: 'Geordnete Liste (<ol>) vorhanden' },
            { type: 'dom', selector: 'ul > li', minCount: 3, desc: 'Mindestens 3 Eintraege in <ul>' },
            { type: 'dom', selector: 'ol > li', minCount: 3, desc: 'Mindestens 3 Eintraege in <ol>' }
          ]
        },
        success: 'Klasse! Du kannst Listen in HTML erstellen!'
      },
      {
        title: 'Links & Bilder',
        text: 'Schau dir den Code an: Der Link fuehrt zur MANOS-Schulhomepage. Finde selbst einen passenden Text fuer die h1-Ueberschrift und fuege das Bild manos_logo.gif mit width="200" ein.',
        format: 'html-write',
        data: {
          starterHtml: '<h1></h1>\n\n<p>Besuche <a href="https://manos-dresden.de/">die MANOS-Homepage</a>!</p>',
          checks: [
            { type: 'dom', selector: 'h1', minCount: 1, desc: '<h1>-Ueberschrift vorhanden' },
            { type: 'content', selector: 'h1', desc: '<h1> hat einen passenden Text' },
            { type: 'dom', selector: 'a[href]', minCount: 1, desc: 'Link (<a>) mit href vorhanden' },
            { type: 'attr', selector: 'a', attr: 'href', notEmpty: true, desc: 'Link hat ein nicht-leeres href' },
            { type: 'dom', selector: 'img[src="manos_logo.gif"][width="200"]', minCount: 1, desc: 'Bild manos_logo.gif mit width="200" ist eingefuegt' }
          ]
        },
        success: 'Toll! Du kannst Links und Bilder in HTML einbauen!'
      },
      // ==== CSS GRUNDLAGEN ====
      {
        title: 'CSS-Begriffe zuordnen',
        section: 'CSS-Grundlagen',
        text: 'Ordne jeden CSS-Begriff der richtigen Beschreibung zu.',
        format: 'matching',
        data: {
          pairs: [
            { left: 'Selektor', right: 'Bestimmt, welches Element gestylt wird' },
            { left: 'Eigenschaft', right: 'Sagt, WAS veraendert wird' },
            { left: 'Wert', right: 'Sagt, WIE es aussehen soll' },
            { left: 'ID (#)', right: 'Einzigartiger Name fuer ein Element' }
          ]
        },
        success: 'Perfekt! Du kennst jetzt die wichtigsten CSS-Begriffe!'
      },
      {
        title: 'Einbindungsarten sortieren',
        text: 'Sortiere die drei Arten, CSS einzubinden, von der einfachsten zur besten Methode.',
        format: 'sorting',
        data: {
          items: ['Externes Stylesheet', 'Inline-Style', 'Internes CSS'],
          correct: ['Inline-Style', 'Internes CSS', 'Externes Stylesheet']
        },
        success: 'Richtig! Inline ist am einfachsten, aber externes CSS ist die beste Methode fuer grosse Projekte!'
      },
      {
        title: 'Selektoren-Quiz',
        text: 'Waehle die richtige Antwort zu CSS-Selektoren.',
        format: 'single-choice',
        data: {
          questions: [
            { q: 'Welcher Selektor waehlt alle Absaetze aus?', options: ['#p', 'absatz', 'p', 'paragraph'], correct: 2 },
            { q: 'Wie selektierst du ein Element mit id="logo"?', options: ['logo', '@logo', '#logo', '*logo'], correct: 2 },
            { q: 'Was bedeutet h1 { color: red; }?', options: ['Nur die erste h1 wird rot', 'Alle h1-Elemente werden rot', 'Die Seite wird rot', 'Nichts, das ist falsch'], correct: 1 },
            { q: 'Was macht der Selektor img?', options: ['Waehlt nur das erste Bild', 'Waehlt alle Bilder aus', 'Erstellt ein Bild', 'Loescht Bilder'], correct: 1 }
          ]
        },
        success: 'Super! Du verstehst, wie Selektoren HTML-Elemente ansprechen!'
      },
      {
        title: 'CSS-Aussagen bewerten',
        text: 'Entscheide: Stimmt die Aussage oder nicht?',
        format: 'true-false',
        data: {
          statements: [
            { text: 'CSS steht fuer "Cascading Style Sheets".', correct: true, explanation: 'Richtig! CSS = Cascading Style Sheets.' },
            { text: 'Mit CSS kann man den Inhalt einer Webseite aendern.', correct: false, explanation: 'Falsch! CSS aendert nur das Aussehen. Den Inhalt aenderst du mit HTML.' },
            { text: 'Eine ID darf auf einer Seite nur einmal vorkommen.', correct: true, explanation: 'Richtig! IDs sind einzigartig.' },
            { text: 'Externes CSS ist besser als Inline-CSS fuer grosse Webseiten.', correct: true, explanation: 'Richtig! Externes CSS ist uebersichtlicher und wiederverwendbar.' },
            { text: 'Der Selektor #name waehlt ein Element mit id="name".', correct: true, explanation: 'Richtig! Das Raute-Zeichen (#) steht fuer IDs.' }
          ]
        },
        success: 'Sehr gut! Du kannst wahre und falsche CSS-Aussagen unterscheiden!'
      },
      {
        title: 'CSS selbst schreiben',
        text: 'Schreibe CSS-Code, um die Ueberschrift blau und 24 Pixel gross zu machen. Verwende den Selektor h1.',
        format: 'code-write',
        data: {
          starterCode: 'h1 {\n  \n}',
          htmlTemplate: '<h1>Meine Ueberschrift</h1>\n<p>Ein normaler Absatz.</p>',
          checks: [
            { property: 'color', value: 'blue', element: 'h1', desc: 'h1 soll blaue Textfarbe haben' },
            { property: 'font-size', value: '24px', element: 'h1', desc: 'h1 soll 24px gross sein' }
          ]
        },
        success: 'Fantastisch! Du hast dein erstes CSS selbst geschrieben!'
      },
      // ==== FARBEN & TYPOGRAFIE ====
      {
        title: 'Farb-Challenge',
        section: 'Farben & Typografie',
        text: 'Ordne die Farbwerte den richtigen Formaten zu. Klicke einen Wert an und dann auf die passende Kategorie. Zum Zuruecknehmen klicke auf einen platzierten Wert.',
        format: 'assignment',
        data: {
          tags: ['red', '#ff0000', 'rgb(255,0,0)', 'blue', '#00f', 'rgb(0,0,255)'],
          categories: [
            { name: 'Farbname', correct: ['red', 'blue'] },
            { name: 'Hex-Code', correct: ['#ff0000', '#00f'] },
            { name: 'RGB-Wert', correct: ['rgb(255,0,0)', 'rgb(0,0,255)'] }
          ]
        },
        success: 'Klasse! Du kennst die drei wichtigsten Farbformate in CSS!'
      },
      {
        title: 'Hintergrund & Hex-Farben',
        text: 'Gib dem <body> eine dunkle Hintergrundfarbe (#1a1a2e) und weisse Schriftfarbe (#ffffff).',
        format: 'code-write',
        data: {
          starterCode: 'body {\n  \n}',
          htmlTemplate: '<h1>Dark Mode</h1>\n<p>Diese Seite soll dunkel sein.</p>',
          checks: [
            { property: 'background-color', value: 'rgb(26, 26, 46)', element: 'body', desc: 'body soll Hintergrundfarbe #1a1a2e haben' },
            { property: 'color', value: 'rgb(255, 255, 255)', element: 'body', desc: 'body soll weisse Schriftfarbe haben' }
          ]
        },
        success: 'Super! Du beherrschst Hex-Farbcodes!'
      },
      {
        title: 'Text-Gestaltung',
        text: 'Style h2: zentriert (center), 20px Schriftgroesse und Schriftart Arial, sans-serif.',
        format: 'code-write',
        data: {
          starterCode: 'h2 {\n  \n}',
          htmlTemplate: '<h2>Eine Unterueberschrift</h2>\n<p>Etwas Text darunter.</p>',
          checks: [
            { property: 'text-align', value: 'center', element: 'h2', desc: 'h2 soll zentriert sein' },
            { property: 'font-size', value: '20px', element: 'h2', desc: 'h2 soll 20px gross sein' },
            { property: 'font-family', value: 'arial', element: 'h2', desc: 'h2 soll Schriftart Arial haben' }
          ]
        },
        success: 'Perfekt! Typografie ist kein Problem fuer dich!'
      },
      // ==== ALLES KOMBINIERT ====
      {
        title: 'Alles kombiniert',
        section: 'Alles kombiniert',
        text: 'Style die h1: weisser Text auf dunklem Hintergrund (#2d2d44), 24px Schrift, zentriert, 20px Innenabstand (padding).',
        format: 'code-write',
        data: {
          starterCode: 'h1 {\n  \n}',
          htmlTemplate: '<h1>Meine Webseite</h1>\n<p>Willkommen auf meiner Seite!</p>',
          checks: [
            { property: 'color', value: 'rgb(255, 255, 255)', element: 'h1', desc: 'h1 soll weisse Schrift haben' },
            { property: 'background-color', value: 'rgb(45, 45, 68)', element: 'h1', desc: 'h1 soll Hintergrund #2d2d44 haben' },
            { property: 'font-size', value: '24px', element: 'h1', desc: 'h1 soll 24px gross sein' },
            { property: 'text-align', value: 'center', element: 'h1', desc: 'h1 soll zentriert sein' },
            { property: 'padding', value: '20px', element: 'h1', desc: 'h1 soll 20px padding haben' }
          ]
        },
        success: 'Meisterhaft! Du hast alle CSS-Grundlagen kombiniert!'
      },
      {
        title: 'Mein Steckbrief',
        text: 'Erstelle einen Steckbrief! Schreibe HTML links und CSS rechts. Du brauchst eine h1-Ueberschrift und mindestens 2 Absaetze (p). Die Ueberschrift soll lila (#8b5cf6) sein.',
        format: 'html-css-write',
        data: {
          starterHtml: '<h1>Max Mustermann</h1>\n<p>Ich bin 12 Jahre alt.</p>\n<p>Mein Hobby ist Programmieren!</p>',
          starterCss: 'h1 {\n  \n}\n\np {\n  \n}',
          htmlChecks: [
            { selector: 'h1', minCount: 1, desc: 'Eine h1-Ueberschrift ist vorhanden' },
            { selector: 'p', minCount: 2, desc: 'Mindestens 2 Absaetze vorhanden' }
          ],
          cssChecks: [
            { property: 'color', value: 'rgb(139, 92, 246)', element: 'h1', desc: 'h1 soll lila (#8b5cf6) sein' }
          ]
        },
        success: 'Toll! Dein Steckbrief sieht super aus!'
      },
      {
        title: 'Bunte Seite gestalten',
        text: 'Baue eine kleine Webseite mit h1, h2 und einem Absatz (p). Die h1 soll rot sein, die h2 blau und der Text soll Schriftgroesse 18px haben.',
        format: 'html-css-write',
        data: {
          starterHtml: '<h1>Willkommen</h1>\n<h2>Untertitel</h2>\n<p>Hier steht mein Text.</p>',
          starterCss: 'h1 {\n  \n}\n\nh2 {\n  \n}\n\np {\n  \n}',
          htmlChecks: [
            { selector: 'h1', minCount: 1, desc: 'h1-Ueberschrift vorhanden' },
            { selector: 'h2', minCount: 1, desc: 'h2-Ueberschrift vorhanden' },
            { selector: 'p', minCount: 1, desc: 'Absatz vorhanden' }
          ],
          cssChecks: [
            { property: 'color', value: 'red', element: 'h1', desc: 'h1 soll rot sein' },
            { property: 'color', value: 'blue', element: 'h2', desc: 'h2 soll blau sein' },
            { property: 'font-size', value: '18px', element: 'p', desc: 'p soll 18px gross sein' }
          ]
        },
        success: 'Wunderbar! Deine bunte Seite sieht klasse aus!'
      },
      {
        title: 'Meine Hobbys als Liste',
        text: 'Erstelle eine Seite mit einer h1-Ueberschrift und einer Liste (ul mit mindestens 3 li-Eintraegen). Die h1 soll zentriert und gruen sein.',
        format: 'html-css-write',
        data: {
          starterHtml: '<h1>Meine Hobbys</h1>\n<ul>\n  <li>Hobby 1</li>\n  <li>Hobby 2</li>\n  <li>Hobby 3</li>\n</ul>',
          starterCss: 'h1 {\n  \n}\n\nul {\n  \n}',
          htmlChecks: [
            { selector: 'h1', minCount: 1, desc: 'h1 vorhanden' },
            { selector: 'ul', minCount: 1, desc: 'Liste (ul) vorhanden' },
            { selector: 'li', minCount: 3, desc: 'Mindestens 3 Listeneintraege' }
          ],
          cssChecks: [
            { property: 'text-align', value: 'center', element: 'h1', desc: 'h1 soll zentriert sein' },
            { property: 'color', value: 'green', element: 'h1', desc: 'h1 soll gruen sein' }
          ]
        },
        success: 'Super! Deine Hobby-Liste ist perfekt!'
      },
      // ==== PROFI-MISSIONEN ====
      {
        title: 'Dark-Mode Seite',
        section: 'Profi',
        text: 'Baue eine coole Dark-Mode Webseite! body: Hintergrund #1a1a2e, Schrift #e0e0e0. Die h1 soll die Farbe #a78bfa haben. Erstelle h1, h2 und mindestens einen Absatz.',
        format: 'html-css-write',
        profi: true,
        data: {
          starterHtml: '<h1>Meine Dark-Mode Seite</h1>\n<h2>Ueber mich</h2>\n<p>Schreibe hier etwas ueber dich...</p>',
          starterCss: 'body {\n  \n}\n\nh1 {\n  \n}',
          htmlChecks: [
            { selector: 'h1', minCount: 1, desc: 'h1 vorhanden' },
            { selector: 'h2', minCount: 1, desc: 'h2 vorhanden' },
            { selector: 'p', minCount: 1, desc: 'Absatz vorhanden' }
          ],
          cssChecks: [
            { property: 'background-color', value: 'rgb(26, 26, 46)', element: 'body', desc: 'body Hintergrund #1a1a2e' },
            { property: 'color', value: 'rgb(224, 224, 224)', element: 'body', desc: 'body Schriftfarbe #e0e0e0' },
            { property: 'color', value: 'rgb(167, 139, 250)', element: 'h1', desc: 'h1 Farbe #a78bfa' }
          ]
        },
        success: 'Wow! Deine Dark-Mode Seite sieht professionell aus!'
      },
      {
        title: 'Rezept-Seite',
        text: 'Baue eine Rezeptseite! Du brauchst: h1 (orange) fuer den Namen, 2x h2 (gruen) fuer "Zutaten" und "Zubereitung", eine Liste und einen Absatz. body soll Schriftart Arial haben.',
        format: 'html-css-write',
        profi: true,
        data: {
          starterHtml: '<h1>Mein Lieblingsrezept</h1>\n<h2>Zutaten</h2>\n<ul>\n  <li>Zutat 1</li>\n  <li>Zutat 2</li>\n</ul>\n<h2>Zubereitung</h2>\n<p>Beschreibe die Schritte...</p>',
          starterCss: 'body {\n  \n}\n\nh1 {\n  \n}\n\nh2 {\n  \n}',
          htmlChecks: [
            { selector: 'h1', minCount: 1, desc: 'h1 vorhanden' },
            { selector: 'h2', minCount: 2, desc: 'Mindestens 2x h2 vorhanden' },
            { selector: 'ul', minCount: 1, desc: 'Liste (ul) vorhanden' },
            { selector: 'li', minCount: 2, desc: 'Mindestens 2 Listeneintraege' },
            { selector: 'p', minCount: 1, desc: 'Absatz vorhanden' }
          ],
          cssChecks: [
            { property: 'color', value: 'orange', element: 'h1', desc: 'h1 soll orange sein' },
            { property: 'color', value: 'green', element: 'h2', desc: 'h2 soll gruen sein' },
            { property: 'font-family', value: 'arial', element: 'body', desc: 'body soll Schriftart Arial haben' }
          ]
        },
        success: 'Lecker! Deine Rezeptseite ist ein Meisterwerk!'
      },
      {
        title: 'Kreativ-Challenge',
        text: 'Zeig was du kannst! Baue eine Mini-Webseite: h1 (zentriert), h2, mindestens 3 Absaetze. body: Hintergrund #222233, Schrift #eeeeee. Mach sie so cool wie moeglich!',
        format: 'html-css-write',
        profi: true,
        data: {
          starterHtml: '<h1>Meine Webseite</h1>\n<h2>Abschnitt 1</h2>\n<p>Text...</p>\n<p>Mehr Text...</p>\n<p>Noch mehr...</p>',
          starterCss: 'body {\n  \n}\n\nh1 {\n  \n}\n\nh2 {\n  \n}\n\np {\n  \n}',
          htmlChecks: [
            { selector: 'h1', minCount: 1, desc: 'h1 vorhanden' },
            { selector: 'h2', minCount: 1, desc: 'h2 vorhanden' },
            { selector: 'p', minCount: 3, desc: 'Mindestens 3 Absaetze' }
          ],
          cssChecks: [
            { property: 'text-align', value: 'center', element: 'h1', desc: 'h1 soll zentriert sein' },
            { property: 'background-color', value: 'rgb(34, 34, 51)', element: 'body', desc: 'body Hintergrund #222233' },
            { property: 'color', value: 'rgb(238, 238, 238)', element: 'body', desc: 'body Schrift #eeeeee' }
          ]
        },
        success: 'Unglaublich! Du bist ein echter Web-Profi!'
      }
    ];

    // ---- BRIDGE QUIZ ----
    this.bridgeQuiz = [
      { question: 'Was macht das HTML-Element <strong>&lt;h1&gt;</strong>?', options: ['Einen Link erstellen', 'Eine Hauptueberschrift erstellen', 'Ein Bild einfuegen'], correct: 1 },
      { question: 'Worin steht der sichtbare Inhalt einer HTML-Seite?', options: ['Im <head>', 'Im <body>', 'Im <style>'], correct: 1 },
      { question: 'Was veraendert CSS an einer Webseite?', options: ['Den Inhalt (Text, Bilder)', 'Das Aussehen (Farben, Groessen)', 'Die Internetadresse'], correct: 1 }
    ];

    // ---- COLOR DATA ----
    this.cssColors = [
      { name: 'red', hex: '#ff0000', textColor: '#fff' },
      { name: 'blue', hex: '#0000ff', textColor: '#fff' },
      { name: 'green', hex: '#008000', textColor: '#fff' },
      { name: 'yellow', hex: '#ffff00', textColor: '#000' },
      { name: 'orange', hex: '#ffa500', textColor: '#000' },
      { name: 'purple', hex: '#800080', textColor: '#fff' },
      { name: 'pink', hex: '#ffc0cb', textColor: '#000' },
      { name: 'black', hex: '#000000', textColor: '#fff' },
      { name: 'white', hex: '#ffffff', textColor: '#000' },
      { name: 'gray', hex: '#808080', textColor: '#fff' },
      { name: 'cyan', hex: '#00ffff', textColor: '#000' },
      { name: 'magenta', hex: '#ff00ff', textColor: '#fff' }
    ];

    this.hexPalette = [
      { name: 'violett', hex: '#8b5cf6', textColor: '#fff' },
      { name: 'orange', hex: '#f59e0b', textColor: '#000' },
      { name: 'rot', hex: '#ef4444', textColor: '#fff' },
      { name: 'gruen', hex: '#22c55e', textColor: '#000' },
      { name: 'blau', hex: '#3b82f6', textColor: '#fff' },
      { name: 'tuerkis', hex: '#06b6d4', textColor: '#000' },
      { name: 'pink', hex: '#ec4899', textColor: '#fff' },
      { name: 'gelb', hex: '#eab308', textColor: '#000' },
      { name: 'schwarz', hex: '#111827', textColor: '#fff' },
      { name: 'weiss', hex: '#ffffff', textColor: '#000' }
    ];
  }

  // ==========================
  // INITIALIZATION
  // ==========================
  init() {
    this.bindGlossary();
    this.renderGlossary();
    this.renderHtmlFlipCards();
    this.renderHtmlStructure();
    this.renderHtmlElementPlayground();
    this.renderHtmlPlayground();
    this.renderFlipCards();
    this.renderWorkshop();
    this.renderSelectorPlayground();
    this.renderColorExplorer();
    this.renderTypoWorkshop();
    this.renderHtmlCssPlayground();
    this.createMissionButtons();
    this.updateMission();
    this.bindHtmlRefBadges();
    this.bindMissionSuccessModal();
    this.bindLerninselToggle();
    this.bindProgressButtons();
  }

  // ==========================
  // LERNINSEL TOGGLE
  // ==========================
  bindLerninselToggle() {
    document.querySelectorAll('.lerninsel-header').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('.lerninsel').classList.toggle('collapsed');
      });
    });
  }

  // ==========================
  // SAVE / LOAD PROGRESS
  // ==========================
  bindProgressButtons() {
    const saveBtn = document.getElementById('progress-save');
    const loadBtn = document.getElementById('progress-load-btn');
    const loadInput = document.getElementById('progress-load-input');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveProgress());
    if (loadBtn) loadBtn.addEventListener('click', () => loadInput && loadInput.click());
    if (loadInput) loadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.loadProgress(data);
        } catch {
          alert('Fehler: Die Datei konnte nicht gelesen werden. Bitte waehle eine gueltige Fortschrittsdatei.');
        }
        loadInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  saveProgress() {
    const state = {
      version: 1,
      savedAt: new Date().toISOString(),
      currentMission: this.currentMission,
      completedMissions: [...this.completedMissions],
      missionState: JSON.parse(JSON.stringify(this.missionState, (key, val) => val instanceof Set ? [...val] : val)),
      playgrounds: {
        html: document.getElementById('html-playground-input')?.value ?? '',
        htmlcssHtml: document.getElementById('htmlcss-playground-html')?.value ?? '',
        htmlcssCss: document.getElementById('htmlcss-playground-css')?.value ?? ''
      },
      typo: {
        font: document.getElementById('typo-font')?.value ?? '',
        size: document.getElementById('typo-size')?.value ?? '18',
        weight: document.getElementById('typo-weight')?.value ?? 'normal',
        align: document.getElementById('typo-align')?.value ?? 'left',
        colorFormat: document.getElementById('typo-color-format')?.value ?? 'name',
        colorName: document.getElementById('typo-color-name')?.value ?? 'black',
        colorHex: document.getElementById('typo-color-hex')?.value ?? '#000000',
        colorR: document.getElementById('typo-color-r')?.value ?? '0',
        colorG: document.getElementById('typo-color-g')?.value ?? '0',
        colorB: document.getElementById('typo-color-b')?.value ?? '0',
        bgFormat: document.getElementById('typo-bg-format')?.value ?? 'name',
        bgName: document.getElementById('typo-bg-name')?.value ?? 'white',
        bgHex: document.getElementById('typo-bg-hex')?.value ?? '#ffffff',
        bgR: document.getElementById('typo-bg-r')?.value ?? '255',
        bgG: document.getElementById('typo-bg-g')?.value ?? '255',
        bgB: document.getElementById('typo-bg-b')?.value ?? '255'
      },
      lerninselCollapsed: {}
    };
    document.querySelectorAll('.lerninsel[id]').forEach(s => {
      state.lerninselCollapsed[s.id] = s.classList.contains('collapsed');
    });

    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mein-fortschritt.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadProgress(data) {
    if (!data || data.version !== 1) {
      alert('Diese Datei passt nicht zur Webseite (falsche Version).');
      return;
    }
    // Missions
    if (typeof data.currentMission === 'number') this.currentMission = data.currentMission;
    if (Array.isArray(data.completedMissions)) this.completedMissions = new Set(data.completedMissions);
    if (data.missionState) this.missionState = data.missionState;

    // Lerninsel collapsed state
    if (data.lerninselCollapsed) {
      Object.entries(data.lerninselCollapsed).forEach(([id, collapsed]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('collapsed', !!collapsed);
      });
    }

    // Playgrounds - restore textarea values if they exist
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) { el.value = val; el.dispatchEvent(new Event('input')); } };
    if (data.playgrounds) {
      setVal('html-playground-input', data.playgrounds.html);
      setVal('htmlcss-playground-html', data.playgrounds.htmlcssHtml);
      setVal('htmlcss-playground-css', data.playgrounds.htmlcssCss);
    }

    // Typography
    if (data.typo) {
      const t = data.typo;
      setVal('typo-font', t.font);
      setVal('typo-size', t.size);
      setVal('typo-weight', t.weight);
      setVal('typo-align', t.align);
      // Color format + sub-inputs
      const colorFmt = document.getElementById('typo-color-format');
      if (colorFmt && t.colorFormat) {
        colorFmt.value = t.colorFormat;
        colorFmt.dispatchEvent(new Event('change'));
      }
      setVal('typo-color-name', t.colorName);
      setVal('typo-color-hex', t.colorHex);
      if (document.getElementById('typo-color-hex-val') && t.colorHex) document.getElementById('typo-color-hex-val').textContent = t.colorHex;
      setVal('typo-color-r', t.colorR); setVal('typo-color-g', t.colorG); setVal('typo-color-b', t.colorB);
      if (t.colorR) document.getElementById('typo-color-r-val') && (document.getElementById('typo-color-r-val').textContent = t.colorR);
      if (t.colorG) document.getElementById('typo-color-g-val') && (document.getElementById('typo-color-g-val').textContent = t.colorG);
      if (t.colorB) document.getElementById('typo-color-b-val') && (document.getElementById('typo-color-b-val').textContent = t.colorB);
      // BG format + sub-inputs
      const bgFmt = document.getElementById('typo-bg-format');
      if (bgFmt && t.bgFormat) {
        bgFmt.value = t.bgFormat;
        bgFmt.dispatchEvent(new Event('change'));
      }
      setVal('typo-bg-name', t.bgName);
      setVal('typo-bg-hex', t.bgHex);
      if (document.getElementById('typo-bg-hex-val') && t.bgHex) document.getElementById('typo-bg-hex-val').textContent = t.bgHex;
      setVal('typo-bg-r', t.bgR); setVal('typo-bg-g', t.bgG); setVal('typo-bg-b', t.bgB);
      if (t.bgR) document.getElementById('typo-bg-r-val') && (document.getElementById('typo-bg-r-val').textContent = t.bgR);
      if (t.bgG) document.getElementById('typo-bg-g-val') && (document.getElementById('typo-bg-g-val').textContent = t.bgG);
      if (t.bgB) document.getElementById('typo-bg-b-val') && (document.getElementById('typo-bg-b-val').textContent = t.bgB);
      this.updateTypoPreview();
    }

    // Refresh mission UI
    this.updateMissionNav();
    this.updateMission();
    alert('Fortschritt erfolgreich geladen! ✓');
  }

  // ==========================
  // GLOSSARY
  // ==========================
  bindGlossary() {
    ['html', 'css'].forEach(type => {
      const openBtn = document.getElementById('open-glossary-' + type);
      const modal = document.getElementById('glossary-modal-' + type);
      const closeBtn = document.getElementById('close-glossary-' + type);
      if (openBtn && modal) {
        openBtn.addEventListener('click', () => modal.classList.add('active'));
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
      }
    });
  }

  renderGlossary() {
    this._renderGlossaryList('glossary-list-html', this.glossaryHtml);
    this._renderGlossaryList('glossary-list-css', this.glossaryCss);
  }

  _renderGlossaryList(containerId, entries) {
    const list = document.getElementById(containerId);
    if (!list || !entries) return;
    list.innerHTML = entries.map(g => `
      <div class="glossary-entry">
        <h3>${this.esc(g.term)}</h3>
        <p class="glossary-definition">${this.esc(g.definition)}</p>
        <div class="glossary-example">${this.esc(g.example)}</div>
      </div>
    `).join('');
  }

  // ==========================
  // HTML FLIP CARDS
  // ==========================
  renderHtmlFlipCards() {
    const container = document.getElementById('html-flip-cards-container');
    if (!container) return;
    container.className = 'html-accordion-list';
    container.innerHTML = this.htmlFlipCards.map((card, i) => `
      <div class="html-accordion-item" data-index="${i}">
        <button class="html-accordion-header" type="button" aria-expanded="false">
          <span class="accordion-icon">${card.icon}</span>
          <span class="accordion-title">${this.esc(card.title)}</span>
          <span class="accordion-chevron">&#9662;</span>
        </button>
        <div class="html-accordion-body">
          <p class="accordion-definition">${this.esc(card.definition)}</p>
          <pre class="accordion-example">${this.colorizeHtml(card.example)}</pre>
        </div>
      </div>
    `).join('');
    container.addEventListener('click', (e) => {
      const header = e.target.closest('.html-accordion-header');
      if (!header) return;
      const item = header.closest('.html-accordion-item');
      const isOpen = item.classList.contains('open');
      container.querySelectorAll('.html-accordion-item').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.html-accordion-header')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // ==========================
  // HTML STRUCTURE EXPLORER
  // ==========================
  renderHtmlStructure() {
    const container = document.getElementById('html-structure-explorer');
    if (!container) return;

    container.innerHTML = `
      <div class="html-structure-diagram">
        <pre class="html-structure-code" id="html-structure-code"><span class="structure-part" data-part="0">&lt;!DOCTYPE html&gt;</span>
<span class="structure-part" data-part="1">&lt;html&gt;</span>
  <span class="structure-part" data-part="2">&lt;head&gt;</span>
    <span class="structure-part" data-part="3">&lt;title&gt;</span>Meine Seite<span class="structure-part" data-part="3">&lt;/title&gt;</span>
    <span class="structure-part" data-part="4">&lt;link rel="stylesheet" href="style.css"&gt;</span>
  <span class="structure-part" data-part="2">&lt;/head&gt;</span>
  <span class="structure-part" data-part="5">&lt;body&gt;</span>
    &lt;h1&gt;Hallo Welt!&lt;/h1&gt;
    &lt;p&gt;Mein erster Text.&lt;/p&gt;
  <span class="structure-part" data-part="5">&lt;/body&gt;</span>
<span class="structure-part" data-part="1">&lt;/html&gt;</span></pre>
        <div class="html-structure-parts-list" id="html-structure-parts-list">
          ${this.htmlStructureParts.map((part, i) => `
            <div class="structure-part-item" data-part="${i}">
              <h4 class="structure-part-heading">${this.esc(part.label)}</h4>
              <p class="structure-part-desc">${this.esc(part.desc)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.addEventListener('click', (e) => {
      const span = e.target.closest('.structure-part');
      const listItem = e.target.closest('.structure-part-item');
      let idx = -1;
      if (span) idx = parseInt(span.dataset.part, 10);
      else if (listItem) idx = parseInt(listItem.dataset.part, 10);
      if (idx < 0) return;
      container.querySelectorAll('.structure-part').forEach(s => s.classList.remove('active'));
      container.querySelectorAll(`.structure-part[data-part="${idx}"]`).forEach(s => s.classList.add('active'));
      container.querySelectorAll('.structure-part-item').forEach(el => el.classList.remove('active'));
      const item = container.querySelector(`.structure-part-item[data-part="${idx}"]`);
      if (item) item.classList.add('active');
    });
  }

  // ==========================
  // HTML ELEMENT PLAYGROUND
  // ==========================
  renderHtmlElementPlayground() {
    const container = document.getElementById('html-element-playground');
    if (!container) return;

    const examples = this.htmlElementExamples;
    container.innerHTML = `
      <div class="html-elem-tabs">
        ${examples.map((ex, i) => `<button class="html-elem-tab${i === 0 ? ' active' : ''}" data-idx="${i}" type="button">${this.esc(ex.title)}</button>`).join('')}
      </div>
      <div class="html-elem-content" id="html-elem-content"></div>
    `;

    this.renderHtmlElementExample(0, container);

    container.querySelector('.html-elem-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.html-elem-tab');
      if (!btn) return;
      container.querySelectorAll('.html-elem-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.renderHtmlElementExample(parseInt(btn.dataset.idx, 10), container);
    });
  }

  renderHtmlElementExample(idx, container) {
    const ex = this.htmlElementExamples[idx];
    if (!ex) return;
    const content = container.querySelector('#html-elem-content');
    if (!content) return;
    content.innerHTML = `
      <div class="html-elem-split">
        <div class="html-elem-code-panel">
          <div class="editor-label html-label">index.html</div>
          <div class="code-editor-wrapper">
            <pre class="code-editor-highlight" aria-hidden="true">${this.colorizeHtml(ex.code)}\n</pre>
            <textarea class="html-elem-editor code-editor-input" spellcheck="false">${this.esc(ex.code)}</textarea>
          </div>
        </div>
        <div class="html-elem-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe class="html-elem-preview" sandbox="allow-same-origin" title="Element Vorschau"></iframe>
        </div>
      </div>
      <div class="html-elem-explanation">${this.esc(ex.explanation)}</div>
    `;
    const textarea = content.querySelector('.html-elem-editor');
    const highlight = content.querySelector('.code-editor-highlight');
    const iframe = content.querySelector('iframe');
    const updatePreview = () => {
      if (iframe && textarea) iframe.srcdoc = '<body style="font-family:sans-serif;padding:8px;">' + textarea.value + '</body>';
      if (highlight && textarea) highlight.innerHTML = this.colorizeHtml(textarea.value) + '\n';
    };
    if (textarea) {
      textarea.addEventListener('input', updatePreview);
      textarea.addEventListener('scroll', () => {
        if (highlight) { highlight.scrollTop = textarea.scrollTop; highlight.scrollLeft = textarea.scrollLeft; }
      });
      updatePreview();
    }
  }

  // ==========================
  // HTML PLAYGROUND (free coding)
  // ==========================
  renderHtmlPlayground() {
    const container = document.getElementById('html-playground');
    if (!container) return;
    const defaultCode = '<h1>Hallo Welt!</h1>\n<p>Mein erster Text.</p>\n<ul>\n  <li>Punkt 1</li>\n  <li>Punkt 2</li>\n</ul>';
    container.innerHTML = `
      <div class="playground-area">
        <div class="playground-editor-panel">
          <div class="editor-label html-label">index.html</div>
          <div class="code-editor-wrapper">
            <pre class="code-editor-highlight" aria-hidden="true">${this.colorizeHtml(defaultCode)}\n</pre>
            <textarea id="html-playground-input" class="playground-textarea code-editor-input" spellcheck="false" placeholder="Schreibe hier dein HTML...">${this.esc(defaultCode)}</textarea>
          </div>
        </div>
        <div class="playground-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe id="html-playground-frame" sandbox="allow-same-origin" title="HTML Vorschau"></iframe>
        </div>
      </div>
    `;
    const textarea = document.getElementById('html-playground-input');
    const highlight = container.querySelector('.code-editor-highlight');
    const iframe = document.getElementById('html-playground-frame');
    const update = () => {
      if (textarea && iframe) iframe.srcdoc = '<body style="font-family:sans-serif;padding:8px;">' + textarea.value + '</body>';
      if (highlight && textarea) highlight.innerHTML = this.colorizeHtml(textarea.value) + '\n';
    };
    if (textarea) {
      textarea.addEventListener('input', update);
      textarea.addEventListener('scroll', () => {
        if (highlight) { highlight.scrollTop = textarea.scrollTop; highlight.scrollLeft = textarea.scrollLeft; }
      });
      update();
    }
  }

  // ==========================
  // HTML+CSS PLAYGROUND (free coding)
  // ==========================
  renderHtmlCssPlayground() {
    const container = document.getElementById('html-css-playground');
    if (!container) return;
    const defaultHtml = '<h1>Meine Seite</h1>\n<p>Willkommen!</p>';
    const defaultCss = 'h1 {\n  color: purple;\n}\n\np {\n  font-size: 18px;\n}';
    container.innerHTML = `
      <div class="playground-area playground-area-dual">
        <div class="playground-editors">
          <div class="playground-editor-panel">
            <div class="editor-label html-label">index.html</div>
            <div class="code-editor-wrapper">
              <pre class="code-editor-highlight" aria-hidden="true">${this.colorizeHtml(defaultHtml)}\n</pre>
              <textarea id="htmlcss-playground-html" class="playground-textarea code-editor-input" spellcheck="false" placeholder="HTML hier...">${this.esc(defaultHtml)}</textarea>
            </div>
          </div>
          <div class="playground-editor-panel">
            <div class="editor-label css-label">style.css</div>
            <textarea id="htmlcss-playground-css" class="playground-textarea" spellcheck="false" placeholder="CSS hier...">${this.esc(defaultCss)}</textarea>
          </div>
        </div>
        <div class="playground-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe id="htmlcss-playground-frame" sandbox="allow-same-origin" title="HTML &amp; CSS Vorschau"></iframe>
        </div>
      </div>
    `;
    const htmlInput = document.getElementById('htmlcss-playground-html');
    const htmlHighlight = container.querySelector('.code-editor-highlight');
    const cssInput = document.getElementById('htmlcss-playground-css');
    const iframe = document.getElementById('htmlcss-playground-frame');
    const update = () => {
      if (htmlInput && cssInput && iframe) {
        iframe.srcdoc = '<style>' + cssInput.value + '</style><body style="font-family:sans-serif;padding:8px;">' + htmlInput.value + '</body>';
      }
      if (htmlHighlight && htmlInput) htmlHighlight.innerHTML = this.colorizeHtml(htmlInput.value) + '\n';
    };
    if (htmlInput) {
      htmlInput.addEventListener('input', update);
      htmlInput.addEventListener('scroll', () => {
        if (htmlHighlight) { htmlHighlight.scrollTop = htmlInput.scrollTop; htmlHighlight.scrollLeft = htmlInput.scrollLeft; }
      });
    }
    if (cssInput) cssInput.addEventListener('input', update);
    update();
  }

  // ==========================
  // BRIDGE (Vorher/Nachher + Quiz)
  // ==========================
  renderBridge() {
    this.renderBridgePreview(false);
    this.bindBridgeToggle();
    this.renderBridgeQuiz();
  }

  renderBridgePreview(withCSS) {
    const iframe = document.getElementById('bridge-preview');
    if (!iframe) return;
    const htmlContent = `<h1>Willkommen auf meiner Seite</h1>
<p>Das ist ein Absatz mit normalem Text.</p>
<h2>Mein Hobby</h2>
<p>Ich programmiere gerne Webseiten!</p>
<ul>
  <li>HTML lernen</li>
  <li>CSS lernen</li>
  <li>Webseiten bauen</li>
</ul>`;
    const css = withCSS ? `<style>
body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; padding: 24px; }
h1 { color: #a78bfa; border-bottom: 2px solid #a78bfa; padding-bottom: 8px; }
h2 { color: #ec4899; }
p { line-height: 1.6; font-size: 15px; }
ul { background: #16213e; padding: 16px 32px; border-radius: 8px; border-left: 3px solid #a78bfa; }
li { margin: 6px 0; color: #e2e8f0; }
</style>` : '';
    iframe.srcdoc = css + htmlContent;
  }

  bindBridgeToggle() {
    const btn = document.getElementById('bridge-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      this.renderBridgePreview(!pressed);
    });
  }

  renderBridgeQuiz() {
    const area = document.getElementById('bridge-quiz-area');
    if (!area) return;
    area.innerHTML = this.bridgeQuiz.map((q, qi) => `
      <div class="quiz-question" data-qi="${qi}">
        <p>${q.question}</p>
        <div class="quiz-options">
          ${q.options.map((opt, oi) => `
            <button class="quiz-option" data-qi="${qi}" data-oi="${oi}" type="button">${this.esc(opt)}</button>
          `).join('')}
        </div>
        <div class="quiz-feedback" id="quiz-fb-${qi}"></div>
      </div>
    `).join('');
    area.addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-option');
      if (!btn || btn.classList.contains('disabled')) return;
      const qi = parseInt(btn.dataset.qi, 10);
      const oi = parseInt(btn.dataset.oi, 10);
      const q = this.bridgeQuiz[qi];
      const fb = document.getElementById('quiz-fb-' + qi);
      const allOpts = area.querySelectorAll('.quiz-option[data-qi="' + qi + '"]');
      allOpts.forEach(o => {
        o.classList.add('disabled');
        if (parseInt(o.dataset.oi, 10) === q.correct) o.classList.add('correct');
      });
      if (oi === q.correct) {
        btn.classList.add('correct');
        if (fb) { fb.textContent = 'Richtig!'; fb.className = 'quiz-feedback correct'; }
      } else {
        btn.classList.add('wrong');
        if (fb) { fb.textContent = 'Leider falsch.'; fb.className = 'quiz-feedback wrong'; }
      }
    });
  }

  // ==========================
  // CSS FLIP CARDS
  // ==========================
  renderFlipCards() {
    const container = document.getElementById('flip-cards-container');
    if (!container) return;
    container.innerHTML = this.flipCards.map((card, i) => `
      <div class="flip-card" role="listitem" tabindex="0" data-index="${i}">
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <span class="flip-icon">${card.icon}</span>
            <span class="flip-title">${this.esc(card.title)}</span>
            <span class="flip-hint">Klicke zum Umdrehen</span>
          </div>
          <div class="flip-card-back">
            <p class="flip-definition">${this.esc(card.definition)}</p>
            <div class="flip-example">${this.esc(card.example)}</div>
            <p class="flip-html-ref">HTML-Bezug: ${this.esc(card.htmlRef)}</p>
          </div>
        </div>
      </div>
    `).join('');
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.flip-card');
      if (card) card.classList.toggle('flipped');
    });
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.flip-card');
        if (card) { e.preventDefault(); card.classList.toggle('flipped'); }
      }
    });
  }

  // ==========================
  // WORKSHOP: CSS EINBINDEN
  // ==========================
  renderWorkshop() {
    const stepsContainer = document.getElementById('workshop-steps-einbinden');
    const contentContainer = document.getElementById('workshop-content-einbinden');
    if (!stepsContainer || !contentContainer) return;

    stepsContainer.innerHTML = this.workshopSteps.map((step, i) => `
      <button class="workshop-step-btn${i === 0 ? ' active' : ''}" data-step="${i}" type="button">${this.esc(step.title)}</button>
    `).join('');

    this.renderWorkshopStep(0, contentContainer);

    stepsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.workshop-step-btn');
      if (!btn) return;
      stepsContainer.querySelectorAll('.workshop-step-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.renderWorkshopStep(parseInt(btn.dataset.step, 10), contentContainer);
    });
  }

  renderWorkshopStep(index, container) {
    const step = this.workshopSteps[index];
    if (!step || !container) return;
    const hasCss = !!step.cssCode;
    const gridStyle = hasCss ? '' : ' style="grid-template-columns:1fr;"';

    const cssPanel = hasCss ? `
          <div class="html-css-editor-panel">
            <div class="editor-label css-label">style.css</div>
            <pre class="workshop-code-readonly workshop-css-code">${this.esc(step.cssCode)}</pre>
          </div>` : '';

    let htmlDisplay = this.colorizeHtml(step.htmlCode);
    if (step.highlightText) {
      const hlEscaped = this.esc(step.highlightText);
      const hlColorized = this.colorizeHtml(step.highlightText);
      htmlDisplay = htmlDisplay.replace(hlColorized, '<span class="workshop-highlight">' + hlColorized + '</span>');
    }

    container.innerHTML = `
      <div class="html-css-write-area">
        <div class="html-css-editors"${gridStyle}>
          <div class="html-css-editor-panel">
            <div class="editor-label html-label">index.html</div>
            <pre class="workshop-code-readonly">${htmlDisplay}</pre>
          </div>${cssPanel}
        </div>
        <div class="html-css-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe sandbox="allow-same-origin" title="Workshop Vorschau"></iframe>
        </div>
      </div>
      <div class="workshop-explanation">${this.esc(step.explanation)}</div>
    `;
    const iframe = container.querySelector('iframe');
    if (iframe) iframe.srcdoc = step.preview;
  }

  // ==========================
  // SELECTOR PLAYGROUND
  // ==========================
  renderSelectorPlayground() {
    const container = document.getElementById('selector-playground');
    if (!container) return;
    const sp = this.selectorPlayground;

    const htmlDisplay = sp.html.map((el, i) => {
      const indent = '  ';
      if (el.selfClosing) {
        return `<span data-idx="${i}">${indent}&lt;${this.esc(el.tag)}${this.esc(el.attrs)} /&gt;</span>`;
      }
      return `<span data-idx="${i}">${indent}&lt;${this.esc(el.tag)}${this.esc(el.attrs)}&gt;${this.esc(el.text)}&lt;/${this.esc(el.tag)}&gt;</span>`;
    }).join('\n');

    container.innerHTML = `
      <div class="selector-buttons">
        ${sp.selectors.map((s, i) => `<button class="selector-btn" data-si="${i}" type="button">${this.esc(s.label)}</button>`).join('')}
      </div>
      <pre class="selector-html-display" id="selector-html-display">&lt;body&gt;\n${htmlDisplay}\n&lt;/body&gt;</pre>
      <div class="selector-info" id="selector-info">Klicke auf einen Selektor links!</div>
    `;

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.selector-btn');
      if (!btn) return;
      const si = parseInt(btn.dataset.si, 10);
      const sel = sp.selectors[si];
      container.querySelectorAll('.selector-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const display = document.getElementById('selector-html-display');
      const info = document.getElementById('selector-info');
      if (display) {
        display.querySelectorAll('span').forEach((span) => {
          const idx = parseInt(span.dataset.idx, 10);
          if (sel.matchFn(sp.html[idx])) {
            span.classList.add('highlighted');
          } else {
            span.classList.remove('highlighted');
          }
        });
      }
      if (info) info.textContent = sel.desc;
    });
  }

  // ==========================
  // COLOR EXPLORER
  // ==========================
  renderColorExplorer() {
    const container = document.getElementById('color-explorer');
    if (!container) return;

    container.innerHTML = `
      <div class="color-modes">
        <button class="color-mode-btn active" data-mode="names" type="button">Farbnamen</button>
        <button class="color-mode-btn" data-mode="hex" type="button">Hex-Code</button>
        <button class="color-mode-btn" data-mode="rgb" type="button">RGB</button>
      </div>
      <div id="color-mode-content"></div>
      <div class="color-picker-area" style="margin-top:16px;">
        <div class="color-controls" id="color-controls"></div>
        <div class="color-preview-box" id="color-preview-box" style="background: #8b5cf6; color: #fff;">
          <h4>Vorschau</h4>
          <span class="color-code" id="color-code-display">#8b5cf6</span>
        </div>
      </div>
    `;

    this.renderColorMode('names');

    container.querySelector('.color-modes').addEventListener('click', (e) => {
      const btn = e.target.closest('.color-mode-btn');
      if (!btn) return;
      container.querySelectorAll('.color-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.renderColorMode(btn.dataset.mode);
      // immediately show a default preview for the new mode
      const defaults = { names: ['red', 'rot'], hex: ['#ef4444', '#ef4444'], rgb: ['rgb(255, 0, 0)', 'rgb(255, 0, 0)'] };
      const d = defaults[btn.dataset.mode];
      if (d) this.updateColorPreview(d[0], d[1]);
    });
  }

  renderColorMode(mode) {
    const content = document.getElementById('color-mode-content');
    const controls = document.getElementById('color-controls');
    if (!content || !controls) return;

    if (mode === 'names') {
      content.innerHTML = `
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">Klicke auf eine Farbe, um sie in der Vorschau zu sehen:</p>
        <div class="color-names-grid">
          ${this.cssColors.map(c => `<div class="color-name-swatch" style="background:${c.hex}; color:${c.textColor}" data-hex="${c.hex}" data-name="${c.name}">${c.name}</div>`).join('')}
        </div>
      `;
      controls.innerHTML = '';
      content.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-name-swatch');
        if (!swatch) return;
        content.querySelectorAll('.color-name-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.updateColorPreview(swatch.dataset.hex, swatch.dataset.name);
      });
      // pre-select red
      const redSwatch = content.querySelector('.color-name-swatch[data-name="red"]');
      if (redSwatch) {
        redSwatch.classList.add('selected');
        this.updateColorPreview(redSwatch.dataset.hex, redSwatch.dataset.name);
      }
    } else if (mode === 'hex') {
      content.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Waehle eine Farbe aus der Palette oder tippe selbst einen Hex-Code ein:</p>';
      controls.innerHTML = `
        <div class="color-control-group">
          <label>Farb-Palette:</label>
          <div class="color-names-grid hex-palette-grid" id="hex-swatch-grid">
            ${this.hexPalette.map(c => `<div class="color-name-swatch hex-only-swatch" style="background:${c.hex}" data-hex="${c.hex}" data-name="${c.name}" title="${c.name} (${c.hex})"></div>`).join('')}
          </div>
        </div>
        <div class="color-control-group">
          <label for="hex-digits">Aktueller Hex-Code:</label>
          <div class="hex-input-wrapper">
            <span class="hex-prefix">#</span>
            <input type="text" id="hex-digits" value="8b5cf6" maxlength="6" class="hex-text-input hex-digits-input" spellcheck="false">
          </div>
        </div>
      `;
      const hexDigits = document.getElementById('hex-digits');
      const hexSwatchGrid = document.getElementById('hex-swatch-grid');
      const getHexColor = () => '#' + (hexDigits ? hexDigits.value.replace(/[^0-9a-fA-F]/g, '').padEnd(6, '0').slice(0, 6) : '8b5cf6');
      if (hexSwatchGrid && hexDigits) {
        hexSwatchGrid.addEventListener('click', (e) => {
          const swatch = e.target.closest('.color-name-swatch');
          if (!swatch) return;
          hexSwatchGrid.querySelectorAll('.color-name-swatch').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
          hexDigits.value = swatch.dataset.hex.slice(1);
          this.updateColorPreview(swatch.dataset.hex, swatch.dataset.hex);
        });
        // pre-select rot (#ef4444)
        const redHexSwatch = hexSwatchGrid.querySelector('.color-name-swatch[data-name="rot"]');
        const initSwatch = redHexSwatch || hexSwatchGrid.querySelector('.color-name-swatch');
        if (initSwatch) {
          initSwatch.classList.add('selected');
          hexDigits.value = initSwatch.dataset.hex.slice(1);
          this.updateColorPreview(initSwatch.dataset.hex, initSwatch.dataset.hex);
        }
      }
      if (hexDigits) {
        hexDigits.addEventListener('input', () => {
          // strip non-hex chars as user types
          const clean = hexDigits.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
          if (clean !== hexDigits.value) hexDigits.value = clean;
          if (clean.length === 6) {
            const hex = '#' + clean;
            if (hexSwatchGrid) hexSwatchGrid.querySelectorAll('.color-name-swatch').forEach(s => s.classList.remove('selected'));
            this.updateColorPreview(hex, hex);
          }
        });
        hexDigits.addEventListener('click', () => hexDigits.select());
      }
    } else if (mode === 'rgb') {
      content.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Stelle RGB-Werte mit den Reglern ein:</p>';
      controls.innerHTML = `
        <div class="color-control-group"><label>Rot: <span id="r-val">255</span></label><input type="range" id="r-range" min="0" max="255" value="255"></div>
        <div class="color-control-group"><label>Gruen: <span id="g-val">0</span></label><input type="range" id="g-range" min="0" max="255" value="0"></div>
        <div class="color-control-group"><label>Blau: <span id="b-val">0</span></label><input type="range" id="b-range" min="0" max="255" value="0"></div>
      `;
      const update = () => {
        const r = document.getElementById('r-range').value;
        const g = document.getElementById('g-range').value;
        const b = document.getElementById('b-range').value;
        document.getElementById('r-val').textContent = r;
        document.getElementById('g-val').textContent = g;
        document.getElementById('b-val').textContent = b;
        const rgb = `rgb(${r}, ${g}, ${b})`;
        this.updateColorPreview(rgb, rgb);
      };
      controls.querySelectorAll('input[type="range"]').forEach(inp => inp.addEventListener('input', update));
      update(); // show initial red preview
    }
  }

  updateColorPreview(color, label) {
    const box = document.getElementById('color-preview-box');
    const code = document.getElementById('color-code-display');
    if (box) {
      box.style.background = color;
      const brightness = this.getColorBrightness(color);
      box.style.color = brightness > 128 ? '#222' : '#fff';
    }
    if (code) code.textContent = label;
  }

  getColorBrightness(color) {
    const el = document.createElement('div');
    el.style.color = color;
    el.style.display = 'none';
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    const match = computed.match(/\d+/g);
    if (match && match.length >= 3) {
      return (parseInt(match[0]) * 299 + parseInt(match[1]) * 587 + parseInt(match[2]) * 114) / 1000;
    }
    return 128;
  }

  // ==========================
  // TYPOGRAFIE WORKSHOP
  // ==========================
  renderTypoWorkshop() {
    const container = document.getElementById('typo-workshop');
    if (!container) return;
    const colorNames = ['black','white','red','blue','green','yellow','orange','purple','pink','gray','cyan','magenta','darkblue','darkgreen','darkred','lightblue','lightgreen','lightyellow','navy','teal'];
    const colorNameOptions = colorNames.map(n => `<option value="${n}">${n}</option>`).join('');
    const hexOptions = this.hexPalette.map(c => `<option value="${c.hex}">${c.hex} (${c.name})</option>`).join('');
    container.innerHTML = `
      <div class="typo-controls">
        <div class="typo-control-group">
          <label for="typo-font">font-family:</label>
          <select id="typo-font">
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
          </select>
        </div>
        <div class="typo-control-group">
          <label for="typo-size">font-size: <span class="range-value" id="typo-size-val">18px</span></label>
          <input type="range" id="typo-size" min="10" max="48" value="18">
        </div>
        <div class="typo-control-group">
          <label for="typo-weight">font-weight:</label>
          <select id="typo-weight">
            <option value="normal">normal</option>
            <option value="bold">bold</option>
          </select>
        </div>
        <div class="typo-control-group">
          <label for="typo-align">text-align:</label>
          <select id="typo-align">
            <option value="left">left</option>
            <option value="center">center</option>
            <option value="right">right</option>
          </select>
        </div>
        <div class="typo-control-group typo-color-group">
          <label>color (Schriftfarbe):</label>
          <select id="typo-color-format" class="typo-format-select">
            <option value="name">Farbname</option>
            <option value="hex">Hex-Code</option>
            <option value="rgb">RGB</option>
          </select>
          <div id="typo-color-area-name" class="typo-color-input-area">
            <select id="typo-color-name">${colorNameOptions}</select>
          </div>
          <div id="typo-color-area-hex" class="typo-color-input-area" style="display:none">
            <select id="typo-color-hex">${hexOptions}</select>
          </div>
          <div id="typo-color-area-rgb" class="typo-color-input-area typo-rgb-inputs" style="display:none">
            <div class="typo-rgb-row"><span>R: <span class="range-value" id="typo-color-r-val">0</span></span><input type="range" id="typo-color-r" min="0" max="255" value="0"></div>
            <div class="typo-rgb-row"><span>G: <span class="range-value" id="typo-color-g-val">0</span></span><input type="range" id="typo-color-g" min="0" max="255" value="0"></div>
            <div class="typo-rgb-row"><span>B: <span class="range-value" id="typo-color-b-val">0</span></span><input type="range" id="typo-color-b" min="0" max="255" value="0"></div>
          </div>
        </div>
        <div class="typo-control-group typo-color-group">
          <label>background-color (Hintergrund):</label>
          <select id="typo-bg-format" class="typo-format-select">
            <option value="name">Farbname</option>
            <option value="hex">Hex-Code</option>
            <option value="rgb">RGB</option>
          </select>
          <div id="typo-bg-area-name" class="typo-color-input-area">
            <select id="typo-bg-name"><option value="white" selected>white</option>${colorNameOptions}</select>
          </div>
          <div id="typo-bg-area-hex" class="typo-color-input-area" style="display:none">
            <select id="typo-bg-hex">${hexOptions}</select>
          </div>
          <div id="typo-bg-area-rgb" class="typo-color-input-area typo-rgb-inputs" style="display:none">
            <div class="typo-rgb-row"><span>R: <span class="range-value" id="typo-bg-r-val">255</span></span><input type="range" id="typo-bg-r" min="0" max="255" value="255"></div>
            <div class="typo-rgb-row"><span>G: <span class="range-value" id="typo-bg-g-val">255</span></span><input type="range" id="typo-bg-g" min="0" max="255" value="255"></div>
            <div class="typo-rgb-row"><span>B: <span class="range-value" id="typo-bg-b-val">255</span></span><input type="range" id="typo-bg-b" min="0" max="255" value="255"></div>
          </div>
        </div>
      </div>
      <div class="typo-preview" id="typo-preview">
        <p>Das ist ein Beispieltext. Aendere die Einstellungen oben und sieh, wie sich die Schrift veraendert!</p>
      </div>
      <div class="typo-css-output" id="typo-css-output"></div>
    `;
    this._bindTypoColorFormat('color');
    this._bindTypoColorFormat('bg');
    const colorHex = document.getElementById('typo-color-hex');
    const bgHex = document.getElementById('typo-bg-hex');
    if (colorHex) colorHex.value = '#111827';
    if (bgHex) bgHex.value = '#ffffff';
    const colorHexVal = document.getElementById('typo-color-hex-val');
    const bgHexVal = document.getElementById('typo-bg-hex-val');
    // hex-val spans removed – select already shows the chosen value
    this.updateTypoPreview();
    container.querySelectorAll('select, input').forEach(el => el.addEventListener('input', () => this.updateTypoPreview()));
  }

  _bindTypoColorFormat(type) {
    const fmt = document.getElementById(`typo-${type}-format`);
    if (!fmt) return;
    fmt.addEventListener('change', () => {
      const val = fmt.value;
      ['name','hex','rgb'].forEach(f => {
        const area = document.getElementById(`typo-${type}-area-${f}`);
        if (area) area.style.display = f === val ? '' : 'none';
      });
      this.updateTypoPreview();
    });
    // sync hex text display
    const hexInput = document.getElementById(`typo-${type}-hex`);
    const hexVal = document.getElementById(`typo-${type}-hex-val`);
    // hex select: no separate label span needed – value visible in dropdown
    // sync rgb labels
    ['r','g','b'].forEach(ch => {
      const slider = document.getElementById(`typo-${type}-${ch}`);
      const label = document.getElementById(`typo-${type}-${ch}-val`);
      if (slider && label) slider.addEventListener('input', () => { label.textContent = slider.value; });
    });
  }

  _getTypoColorValue(type) {
    const format = document.getElementById(`typo-${type}-format`)?.value || 'name';
    if (format === 'name') return document.getElementById(`typo-${type}-name`)?.value || (type === 'bg' ? 'white' : 'black');
    if (format === 'hex') return document.getElementById(`typo-${type}-hex`)?.value || (type === 'bg' ? '#ffffff' : '#000000');
    if (format === 'rgb') {
      const r = document.getElementById(`typo-${type}-r`)?.value || '0';
      const g = document.getElementById(`typo-${type}-g`)?.value || '0';
      const b = document.getElementById(`typo-${type}-b`)?.value || (type === 'bg' ? '255' : '0');
      return `rgb(${r}, ${g}, ${b})`;
    }
    return type === 'bg' ? 'white' : 'black';
  }

  updateTypoPreview() {
    const font = document.getElementById('typo-font')?.value || 'Arial, sans-serif';
    const size = document.getElementById('typo-size')?.value || '18';
    const weight = document.getElementById('typo-weight')?.value || 'normal';
    const align = document.getElementById('typo-align')?.value || 'left';
    const color = this._getTypoColorValue('color');
    const bg = this._getTypoColorValue('bg');
    const preview = document.getElementById('typo-preview');
    const output = document.getElementById('typo-css-output');
    const sizeLabel = document.getElementById('typo-size-val');

    if (sizeLabel) sizeLabel.textContent = size + 'px';
    if (preview) {
      preview.style.fontFamily = font;
      preview.style.fontSize = size + 'px';
      preview.style.fontWeight = weight;
      preview.style.textAlign = align;
      preview.style.color = color;
      preview.style.backgroundColor = bg;
    }
    if (output) {
      output.textContent = `p {\n  font-family: ${font};\n  font-size: ${size}px;\n  font-weight: ${weight};\n  text-align: ${align};\n  color: ${color};\n  background-color: ${bg};\n}`;
    }
  }

  // ==========================
  // HTML REF BADGES
  // ==========================
  bindHtmlRefBadges() {
    const popup = document.getElementById('html-ref-popup');
    const popupText = document.getElementById('html-ref-popup-text');
    if (!popup || !popupText) return;

    document.querySelectorAll('.html-ref-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        const ref = badge.dataset.ref;
        const text = this.htmlReferences[ref];
        if (!text) return;
        popupText.textContent = text;
        const rect = badge.getBoundingClientRect();
        popup.style.top = (rect.bottom + 8) + 'px';
        popup.style.left = rect.left + 'px';
        popup.classList.add('visible');
        popup.setAttribute('aria-hidden', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.html-ref-badge') && !e.target.closest('.html-ref-popup')) {
        popup.classList.remove('visible');
        popup.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // ==========================
  // MISSIONS
  // ==========================
  createMissionButtons() {
    const nav = document.getElementById('mission-nav');
    if (!nav) return;
    let html = '';
    let lastSection = null;
    this.missions.forEach((m, i) => {
      if (m.section && m.section !== lastSection) {
        const dividerClass = m.profi ? ' profi-divider' : '';
        html += `<span class="mission-divider${dividerClass}">${this.esc(m.section)}</span>`;
        lastSection = m.section;
      }
      const profiClass = m.profi ? ' profi' : '';
      html += `<button class="mission-btn${i === 0 ? ' active' : ''}${profiClass}" data-mi="${i}" type="button" role="tab" aria-label="Mission ${i + 1}: ${this.esc(m.title)}">${i + 1}</button>`;
    });
    nav.innerHTML = html;
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.mission-btn');
      if (!btn) return;
      this.currentMission = parseInt(btn.dataset.mi, 10);
      this.updateMissionNav();
      this.updateMission();
    });
  }

  updateMissionNav() {
    const nav = document.getElementById('mission-nav');
    if (!nav) return;
    nav.querySelectorAll('.mission-btn').forEach(btn => {
      const mi = parseInt(btn.dataset.mi, 10);
      btn.classList.toggle('active', mi === this.currentMission);
      btn.classList.toggle('completed', this.completedMissions.has(mi));
    });
  }

  bindMissionSuccessModal() {
    const modal = document.getElementById('mission-success-modal');
    const closeBtn = document.getElementById('mission-success-close');
    if (modal && closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        if (this.currentMission < this.missions.length - 1) {
          this.currentMission++;
          this.updateMissionNav();
          this.updateMission();
        }
      });
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    }
  }

  showMissionSuccess(msg) {
    const mi = this.currentMission;
    this.completedMissions.add(mi);
    this.updateMissionNav();
    const modal = document.getElementById('mission-success-modal');
    const text = document.getElementById('mission-success-text');
    const mascot = document.getElementById('mission-success-byte');
    if (text) text.textContent = msg;
    if (mascot) {
      mascot.classList.remove('celebrating');
      void mascot.offsetWidth;
      mascot.classList.add('celebrating');
    }
    if (modal) modal.classList.add('active');
  }

  updateMission() {
    const area = document.getElementById('mission-area');
    if (!area) return;

    if (this._missionAbort) this._missionAbort.abort();
    this._missionAbort = new AbortController();

    const m = this.missions[this.currentMission];
    const mi = this.currentMission;

    const mascotImg = this.completedMissions.has(mi) ? 'Byte_mascot/Byte_Happy.png' : 'Byte_mascot/Byte_Thinking.png';
    const mascotAlt = this.completedMissions.has(mi) ? 'Byte ist gluecklich' : 'Byte denkt nach';

    let content = `
      <img src="${mascotImg}" alt="${mascotAlt}" class="mission-mascot">
      <h3>Mission ${mi + 1}: ${this.esc(m.title)}${m.profi ? ' ⭐' : ''}</h3>
      <p class="mission-text">${this.esc(m.text)}</p>
    `;

    switch (m.format) {
      case 'exploration': content += this.renderExplorationMission(m); break;
      case 'matching': content += this.renderMatchingMission(m, mi); break;
      case 'sorting': content += this.renderSortingMission(m, mi); break;
      case 'single-choice': content += this.renderSingleChoiceMission(m, mi); break;
      case 'assignment': content += this.renderAssignmentMission(m, mi); break;
      case 'true-false': content += this.renderTrueFalseMission(m, mi); break;
      case 'cloze': content += this.renderClozeMission(m, mi); break;
      case 'code-write': content += this.renderCodeWriteMission(m, mi); break;
      case 'html-css-write': content += this.renderHtmlCssWriteMission(m, mi); break;
      case 'html-write': content += this.renderHtmlWriteMission(m, mi); break;
    }

    area.innerHTML = content;
    this.bindMissionInteractions(m.format, mi);
  }

  // --- Mission Renderers ---
  renderExplorationMission() {
    return `<button class="mission-check-btn" id="mission-check" type="button">Erledigt!</button>`;
  }

  renderMatchingMission(m, mi) {
    if (!this.missionState[mi]) {
      this.missionState[mi] = { selected: null, matched: [] };
    }
    const state = this.missionState[mi];
    if (!state.shuffledRight) {
      state.shuffledRight = [...m.data.pairs.map(p => p.right)].sort(() => Math.random() - 0.5);
    }
    const matchedRightTexts = new Set(state.matched.map(li => m.data.pairs[li].right));
    return `
      <div class="matching-container">
        <div class="matching-left">
          ${m.data.pairs.map((p, i) => `<div class="matching-item matching-left-item${state.matched.includes(i) ? ' matched' : ''}" data-idx="${i}">${this.esc(p.left)}</div>`).join('')}
        </div>
        <div class="matching-right">
          ${state.shuffledRight.map((r, i) => `<div class="matching-item matching-right-item${matchedRightTexts.has(r) ? ' matched' : ''}" data-idx="${i}">${this.esc(r)}</div>`).join('')}
        </div>
      </div>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderSortingMission(m, mi) {
    if (!this.missionState[mi]) {
      this.missionState[mi] = { items: [...m.data.items].sort(() => Math.random() - 0.5) };
    }
    const items = this.missionState[mi].items;
    return `
      <div class="sorting-container" id="sorting-container">
        ${items.map((item, i) => `
          <div class="sorting-item" data-idx="${i}">
            <span>${this.esc(item)}</span>
            <div class="sort-buttons">
              <button class="sort-btn" data-dir="up" data-idx="${i}" type="button">▲</button>
              <button class="sort-btn" data-dir="down" data-idx="${i}" type="button">▼</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Ueberpruefen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderSingleChoiceMission(m, mi) {
    if (!this.missionState[mi]) this.missionState[mi] = { currentQ: 0, correct: 0, answers: {} };
    const state = this.missionState[mi];
    if (!state.answers) state.answers = {};

    if (state.currentQ >= m.data.questions.length) {
      // Show review of all questions with answers
      let html = '';
      m.data.questions.forEach((q, qi) => {
        const chosen = state.answers[qi];
        html += `
          <div class="choice-review">
            <p style="color:var(--text-muted);font-size:0.8rem;margin:0;">Frage ${qi + 1}</p>
            <p style="font-weight:600;margin:4px 0 8px;">${this.esc(q.q)}</p>
            <div class="choice-options reviewed">
              ${q.options.map((opt, i) => {
                let cls = '';
                if (i === q.correct) cls += ' correct';
                if (i === chosen && i !== q.correct) cls += ' wrong';
                if (i === chosen) cls += ' chosen';
                return `<div class="choice-option${cls} disabled"><span class="choice-marker"></span><span>${this.esc(opt)}</span></div>`;
              }).join('')}
            </div>
          </div>
        `;
      });
      html += `<p style="color:var(--accent-green);font-weight:700;margin-top:12px;">Alle Fragen beantwortet! (${state.correct}/${m.data.questions.length} richtig)</p>`;
      return html;
    }

    const q = m.data.questions[state.currentQ];
    return `
      <p style="color:var(--text-muted);font-size:0.85rem;">Frage ${state.currentQ + 1} von ${m.data.questions.length}</p>
      <p style="font-weight:600;margin:8px 0 12px;">${this.esc(q.q)}</p>
      <div class="choice-options" id="choice-options">
        ${q.options.map((opt, i) => `
          <div class="choice-option" data-oi="${i}">
            <span class="choice-marker"></span>
            <span>${this.esc(opt)}</span>
          </div>
        `).join('')}
      </div>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderAssignmentMission(m, mi) {
    if (!this.missionState[mi]) {
      this.missionState[mi] = { placed: {} };
      m.data.categories.forEach((_, i) => { this.missionState[mi].placed[i] = []; });
    }
    const state = this.missionState[mi];
    if (!state.shuffledTags) {
      state.shuffledTags = [...m.data.tags].sort(() => Math.random() - 0.5);
    }
    const tags = state.shuffledTags;
    const placedTags = new Set();
    Object.values(state.placed).forEach(arr => arr.forEach(t => placedTags.add(t)));

    return `
      <div class="assignment-container">
        <div class="assignment-pool" id="assignment-pool">
          ${tags.map(t => `<span class="assignment-tag${placedTags.has(t) ? ' placed' : ''}" data-tag="${this.esc(t)}">${this.esc(t)}</span>`).join('')}
        </div>
        ${m.data.categories.map((cat, i) => `
          <div class="assignment-category" data-ci="${i}">
            <h4>${this.esc(cat.name)}</h4>
            <div class="placed-items" data-ci="${i}">
              ${(state.placed[i] || []).map(t => `<span class="assignment-placed" data-tag="${this.esc(t)}" data-ci="${i}" title="Klicke zum Zuruecknehmen">${this.esc(t)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Ueberpruefen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderTrueFalseMission(m, mi) {
    const state = this.missionState[mi] || {};
    return `
      <div class="tf-statements">
        ${m.data.statements.map((s, i) => {
          const answered = state['answered_' + i];
          return `
          <div class="tf-statement" data-si="${i}">
            <p>${this.esc(s.text)}</p>
            <div class="tf-buttons">
              <button class="tf-btn${answered === 'true' ? (s.correct ? ' selected-true correct' : ' selected-true wrong') : ''}" data-si="${i}" data-answer="true" type="button" ${answered ? 'disabled' : ''}>Stimmt</button>
              <button class="tf-btn${answered === 'false' ? (!s.correct ? ' selected-false correct' : ' selected-false wrong') : ''}" data-si="${i}" data-answer="false" type="button" ${answered ? 'disabled' : ''}>Stimmt nicht</button>
            </div>
            <div class="tf-feedback" id="tf-fb-${i}" ${answered ? `style="color:${(answered === 'true') === s.correct ? 'var(--accent-green)' : 'var(--accent-red)'}"` : ''}>${answered ? this.esc(s.explanation) : ''}</div>
          </div>
        `}).join('')}
      </div>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderClozeMission(m, mi) {
    const state = this.missionState[mi] || {};
    let html = '<div class="cloze-text">';
    m.data.segments.forEach((seg, i) => {
      if (seg.type === 'text') {
        html += this.esc(seg.value);
      } else {
        const shuffled = [...seg.options].sort(() => Math.random() - 0.5);
        const savedVal = state['gap_' + i] || '';
        html += `<select data-gi="${i}" data-correct="${this.esc(seg.correct)}"><option value="">???</option>${shuffled.map(o => `<option value="${this.esc(o)}"${o === savedVal ? ' selected' : ''}>${this.esc(o)}</option>`).join('')}</select>`;
      }
    });
    html += '</div>';
    html += '<button class="mission-check-btn" id="mission-check" type="button">Ueberpruefen</button>';
    html += '<div class="mission-feedback" id="mission-feedback"></div>';
    return html;
  }

  renderCodeWriteMission(m, mi) {
    const savedCode = this.missionState[mi]?.code ?? m.data.starterCode;
    return `
      <div class="html-css-write-area">
        <div class="html-css-editors">
          <div class="html-css-editor-panel">
            <div class="editor-label html-label">index.html</div>
            <textarea id="code-write-html-display" spellcheck="false" readonly>${this.esc(m.data.htmlTemplate)}</textarea>
          </div>
          <div class="html-css-editor-panel">
            <div class="editor-label css-label">style.css</div>
            <textarea id="code-write-input" spellcheck="false">${this.esc(savedCode)}</textarea>
          </div>
        </div>
        <div class="html-css-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe id="code-write-preview-frame" sandbox="allow-same-origin" title="Code Vorschau"></iframe>
        </div>
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Testen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderHtmlCssWriteMission(m, mi) {
    const savedHtml = this.missionState[mi]?.html ?? m.data.starterHtml;
    const savedCss = this.missionState[mi]?.css ?? m.data.starterCss;
    return `
      <div class="html-css-write-area">
        <div class="html-css-editors">
          <div class="html-css-editor-panel">
            <div class="editor-label html-label">index.html</div>
            <textarea id="html-write-input" spellcheck="false">${this.esc(savedHtml)}</textarea>
          </div>
          <div class="html-css-editor-panel">
            <div class="editor-label css-label">style.css</div>
            <textarea id="css-write-input" spellcheck="false">${this.esc(savedCss)}</textarea>
          </div>
        </div>
        <div class="html-css-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe id="html-css-preview-frame" sandbox="allow-same-origin" title="Vorschau"></iframe>
        </div>
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Testen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderHtmlWriteMission(m, mi) {
    const savedHtml = this.missionState[mi]?.html ?? m.data.starterHtml;
    return `
      <div class="html-css-write-area">
        <div class="html-css-editors" style="grid-template-columns:1fr;">
          <div class="html-css-editor-panel">
            <div class="editor-label html-label">index.html</div>
            <textarea id="html-only-input" spellcheck="false">${this.esc(savedHtml)}</textarea>
          </div>
        </div>
        <div class="html-css-preview-panel">
          <div class="editor-label preview-label">Vorschau</div>
          <iframe id="html-only-preview-frame" sandbox="allow-same-origin" title="Vorschau"></iframe>
        </div>
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Testen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  // --- Mission Interaction Bindings ---
  bindMissionInteractions(format, mi) {
    const area = document.getElementById('mission-area');
    if (!area) return;
    const m = this.missions[mi];
    const signal = this._missionAbort.signal;

    switch (format) {
      case 'exploration':
        area.querySelector('#mission-check')?.addEventListener('click', () => this.showMissionSuccess(m.success), { signal });
        break;
      case 'matching':
        this.bindMatchingMission(area, m, mi, signal);
        break;
      case 'sorting':
        this.bindSortingMission(area, m, mi, signal);
        break;
      case 'single-choice':
        this.bindSingleChoiceMission(area, m, mi, signal);
        break;
      case 'assignment':
        this.bindAssignmentMission(area, m, mi, signal);
        break;
      case 'true-false':
        this.bindTrueFalseMission(area, m, mi, signal);
        break;
      case 'cloze':
        area.querySelector('#mission-check')?.addEventListener('click', () => this.checkClozeMission(area, m, mi), { signal });
        break;
      case 'code-write':
        this.bindCodeWriteMission(area, m, mi, signal);
        break;
      case 'html-css-write':
        this.bindHtmlCssWriteMission(area, m, mi, signal);
        break;
      case 'html-write':
        this.bindHtmlWriteMission(area, m, mi, signal);
        break;
    }
  }

  bindMatchingMission(area, m, mi, signal) {
    const state = this.missionState[mi];
    let selectedLeft = null;

    area.addEventListener('click', (e) => {
      const item = e.target.closest('.matching-item');
      if (!item || item.classList.contains('matched')) return;

      if (item.classList.contains('matching-left-item')) {
        area.querySelectorAll('.matching-left-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedLeft = parseInt(item.dataset.idx, 10);
      } else if (item.classList.contains('matching-right-item') && selectedLeft !== null) {
        const ri = parseInt(item.dataset.idx, 10);
        const correctRight = m.data.pairs[selectedLeft].right;
        const clickedRight = state.shuffledRight[ri];

        if (clickedRight === correctRight) {
          area.querySelectorAll('.matching-left-item')[selectedLeft].classList.add('matched');
          area.querySelectorAll('.matching-left-item')[selectedLeft].classList.remove('selected');
          item.classList.add('matched');
          state.matched.push(selectedLeft);
          selectedLeft = null;
          if (state.matched.length === m.data.pairs.length) {
            this.showMissionSuccess(m.success);
          }
        } else {
          item.classList.add('wrong');
          setTimeout(() => item.classList.remove('wrong'), 500);
          const fb = document.getElementById('mission-feedback');
          if (fb) { fb.textContent = 'Das passt nicht zusammen. Probiere es nochmal!'; fb.className = 'mission-feedback error'; }
        }
      }
    }, { signal });
  }

  bindSortingMission(area, m, mi, signal) {
    const state = this.missionState[mi];
    area.addEventListener('click', (e) => {
      const btn = e.target.closest('.sort-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const dir = btn.dataset.dir;
      if (dir === 'up' && idx > 0) {
        [state.items[idx - 1], state.items[idx]] = [state.items[idx], state.items[idx - 1]];
      } else if (dir === 'down' && idx < state.items.length - 1) {
        [state.items[idx], state.items[idx + 1]] = [state.items[idx + 1], state.items[idx]];
      }
      this.updateMission();
    }, { signal });
    area.querySelector('#mission-check')?.addEventListener('click', () => {
      const isCorrect = JSON.stringify(state.items) === JSON.stringify(m.data.correct);
      const fb = document.getElementById('mission-feedback');
      if (isCorrect) {
        this.showMissionSuccess(m.success);
      } else if (fb) {
        fb.textContent = 'Die Reihenfolge stimmt noch nicht. Verschiebe die Eintraege mit den Pfeilen!';
        fb.className = 'mission-feedback error';
      }
    }, { signal });
  }

  bindSingleChoiceMission(area, m, mi, signal) {
    const state = this.missionState[mi];
    if (!state.answers) state.answers = {};
    area.querySelector('#choice-options')?.addEventListener('click', (e) => {
      const opt = e.target.closest('.choice-option');
      if (!opt || opt.classList.contains('correct') || opt.classList.contains('wrong')) return;
      const oi = parseInt(opt.dataset.oi, 10);
      const q = m.data.questions[state.currentQ];
      const fb = document.getElementById('mission-feedback');
      const allOpts = area.querySelectorAll('.choice-option');

      allOpts.forEach(o => o.classList.add('disabled'));
      state.answers[state.currentQ] = oi;

      if (oi === q.correct) {
        opt.classList.add('correct');
        state.correct++;
        if (fb) { fb.textContent = 'Richtig!'; fb.className = 'mission-feedback success'; }
      } else {
        opt.classList.add('wrong');
        allOpts[q.correct].classList.add('correct');
        if (fb) { fb.textContent = 'Leider falsch.'; fb.className = 'mission-feedback error'; }
      }

      setTimeout(() => {
        state.currentQ++;
        if (state.currentQ < m.data.questions.length) {
          this.updateMission();
        } else {
          this.showMissionSuccess(m.success);
        }
      }, 1200);
    }, { signal });
  }

  bindAssignmentMission(area, m, mi, signal) {
    const state = this.missionState[mi];
    let selectedTag = null;

    area.addEventListener('click', (e) => {
      const placedItem = e.target.closest('.assignment-placed');
      if (placedItem) {
        const tag = placedItem.dataset.tag;
        const ci = parseInt(placedItem.dataset.ci, 10);
        const idx = state.placed[ci].indexOf(tag);
        if (idx !== -1) state.placed[ci].splice(idx, 1);
        placedItem.remove();
        const tagEl = area.querySelector(`.assignment-tag[data-tag="${CSS.escape(tag)}"]`);
        if (tagEl) tagEl.classList.remove('placed');
        const fb = document.getElementById('mission-feedback');
        if (fb) { fb.textContent = ''; fb.className = 'mission-feedback'; }
        return;
      }

      const tag = e.target.closest('.assignment-tag');
      const cat = e.target.closest('.assignment-category');

      if (tag && !tag.classList.contains('placed')) {
        area.querySelectorAll('.assignment-tag').forEach(t => t.classList.remove('selected-tag'));
        tag.classList.add('selected-tag');
        selectedTag = tag.dataset.tag;
      } else if (cat && selectedTag && !e.target.closest('.assignment-placed')) {
        const ci = parseInt(cat.dataset.ci, 10);
        state.placed[ci].push(selectedTag);
        const placedDiv = cat.querySelector('.placed-items');
        const span = document.createElement('span');
        span.className = 'assignment-placed';
        span.textContent = selectedTag;
        span.dataset.tag = selectedTag;
        span.dataset.ci = ci;
        span.title = 'Klicke zum Zuruecknehmen';
        placedDiv.appendChild(span);
        const tagEl = area.querySelector(`.assignment-tag[data-tag="${CSS.escape(selectedTag)}"]`);
        if (tagEl) {
          tagEl.classList.add('placed');
          tagEl.classList.remove('selected-tag');
        }
        selectedTag = null;
        area.querySelectorAll('.assignment-tag').forEach(t => t.classList.remove('selected-tag'));
      }
    }, { signal });

    area.querySelector('#mission-check')?.addEventListener('click', () => {
      let allCorrect = true;
      m.data.categories.forEach((cat, ci) => {
        const placed = state.placed[ci] || [];
        const isCorrect = cat.correct.length === placed.length && cat.correct.every(c => placed.includes(c));
        const placedItems = area.querySelectorAll(`.placed-items[data-ci="${ci}"] .assignment-placed`);
        placedItems.forEach(item => {
          if (cat.correct.includes(item.textContent)) {
            item.classList.remove('wrong');
            item.classList.add('correct-placed');
          } else {
            item.classList.add('wrong');
            item.classList.remove('correct-placed');
            allCorrect = false;
          }
        });
        if (!isCorrect) allCorrect = false;
      });

      const fb = document.getElementById('mission-feedback');
      if (allCorrect) {
        this.showMissionSuccess(m.success);
      } else if (fb) {
        fb.textContent = 'Einige sind noch falsch. Klicke auf falsche Zuordnungen, um sie zurueckzunehmen!';
        fb.className = 'mission-feedback error';
      }
    }, { signal });
  }

  bindTrueFalseMission(area, m, mi, signal) {
    if (!this.missionState[mi]) this.missionState[mi] = {};
    const state = this.missionState[mi];
    const total = m.data.statements.length;

    area.addEventListener('click', (e) => {
      const btn = e.target.closest('.tf-btn');
      if (!btn || btn.disabled) return;
      const si = parseInt(btn.dataset.si, 10);
      const answer = btn.dataset.answer === 'true';
      const statement = m.data.statements[si];
      const fb = document.getElementById('tf-fb-' + si);
      const allbtns = area.querySelectorAll(`.tf-btn[data-si="${si}"]`);
      allbtns.forEach(b => b.disabled = true);

      state['answered_' + si] = btn.dataset.answer;

      const correct = answer === statement.correct;
      btn.classList.add(answer ? 'selected-true' : 'selected-false');
      btn.classList.add(correct ? 'correct' : 'wrong');

      if (fb) {
        fb.textContent = statement.explanation;
        fb.style.color = correct ? 'var(--accent-green)' : 'var(--accent-red)';
      }

      const answeredCount = m.data.statements.filter((_, i) => state['answered_' + i] !== undefined).length;
      if (answeredCount === total) {
        setTimeout(() => this.showMissionSuccess(m.success), 800);
      }
    }, { signal });
  }

  checkClozeMission(area, m, mi) {
    if (!this.missionState[mi]) this.missionState[mi] = {};
    const state = this.missionState[mi];
    const selects = area.querySelectorAll('.cloze-text select');
    let allCorrect = true;
    selects.forEach(sel => {
      const correct = sel.dataset.correct;
      state['gap_' + sel.dataset.gi] = sel.value;
      if (sel.value === correct) {
        sel.classList.add('correct');
        sel.classList.remove('wrong');
      } else {
        sel.classList.add('wrong');
        sel.classList.remove('correct');
        allCorrect = false;
      }
    });
    const fb = document.getElementById('mission-feedback');
    if (allCorrect) {
      this.showMissionSuccess(m.success);
    } else if (fb) {
      fb.textContent = 'Einige Luecken sind noch falsch. Schau nochmal genau hin!';
      fb.className = 'mission-feedback error';
    }
  }

  bindCodeWriteMission(area, m, mi, signal) {
    const textarea = area.querySelector('#code-write-input');
    const iframe = area.querySelector('#code-write-preview-frame');
    const checkBtn = area.querySelector('#mission-check');

    if (!this.missionState[mi]) this.missionState[mi] = {};

    const updatePreview = () => {
      if (!textarea || !iframe) return;
      const css = textarea.value;
      iframe.srcdoc = '<style>' + css + '</style>' + m.data.htmlTemplate;
    };

    if (textarea) {
      textarea.addEventListener('input', () => {
        this.missionState[mi].code = textarea.value;
        updatePreview();
      }, { signal });
      updatePreview();
    }

    checkBtn?.addEventListener('click', () => {
      if (!iframe) return;
      const fb = document.getElementById('mission-feedback');
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        let allPass = true;
        const results = [];
        m.data.checks.forEach(check => {
          const el = doc.querySelector(check.element);
          if (!el) { allPass = false; results.push(check.desc + ' ✗'); return; }
          const computed = iframe.contentWindow.getComputedStyle(el);
          const val = computed.getPropertyValue(check.property);
          const expected = check.value.toLowerCase().trim();
          const actual = val.toLowerCase().trim();
          if (actual.includes(expected) || this.colorMatch(actual, expected) || this.fontWeightMatch(actual, expected)) {
            results.push(check.desc + ' ✓');
          } else {
            allPass = false;
            results.push(check.desc + ' ✗ (aktuell: ' + val + ')');
          }
        });
        if (fb) {
          if (allPass) {
            this.showMissionSuccess(m.success);
          } else {
            fb.innerHTML = results.map(r => '<div>' + this.esc(r) + '</div>').join('');
            fb.className = 'mission-feedback error';
          }
        }
      } catch (err) {
        if (fb) { fb.textContent = 'Fehler beim Pruefen. Ist dein CSS korrekt?'; fb.className = 'mission-feedback error'; }
      }
    }, { signal });
  }

  bindHtmlCssWriteMission(area, m, mi, signal) {
    const htmlInput = area.querySelector('#html-write-input');
    const cssInput = area.querySelector('#css-write-input');
    const iframe = area.querySelector('#html-css-preview-frame');
    const checkBtn = area.querySelector('#mission-check');

    if (!this.missionState[mi]) this.missionState[mi] = {};

    const updatePreview = () => {
      if (!htmlInput || !cssInput || !iframe) return;
      iframe.srcdoc = '<style>' + cssInput.value + '</style>' + htmlInput.value;
    };

    if (htmlInput) {
      htmlInput.addEventListener('input', () => {
        this.missionState[mi].html = htmlInput.value;
        updatePreview();
      }, { signal });
    }
    if (cssInput) {
      cssInput.addEventListener('input', () => {
        this.missionState[mi].css = cssInput.value;
        updatePreview();
      }, { signal });
    }
    updatePreview();

    checkBtn?.addEventListener('click', () => {
      if (!iframe) return;
      const fb = document.getElementById('mission-feedback');
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        let allPass = true;
        const results = [];

        if (m.data.htmlChecks) {
          m.data.htmlChecks.forEach(check => {
            const elements = doc.querySelectorAll(check.selector);
            if (check.minCount && elements.length < check.minCount) {
              allPass = false;
              results.push(check.desc + ' ✗ (gefunden: ' + elements.length + ')');
            } else if (elements.length > 0) {
              results.push(check.desc + ' ✓');
            } else {
              allPass = false;
              results.push(check.desc + ' ✗');
            }
          });
        }

        if (m.data.cssChecks) {
          m.data.cssChecks.forEach(check => {
            const el = doc.querySelector(check.element);
            if (!el) { allPass = false; results.push(check.desc + ' ✗ (Element nicht gefunden)'); return; }
            const computed = iframe.contentWindow.getComputedStyle(el);
            const val = computed.getPropertyValue(check.property);
            const expected = check.value.toLowerCase().trim();
            const actual = val.toLowerCase().trim();
            if (actual.includes(expected) || this.colorMatch(actual, expected) || this.fontWeightMatch(actual, expected)) {
              results.push(check.desc + ' ✓');
            } else {
              allPass = false;
              results.push(check.desc + ' ✗ (aktuell: ' + val + ')');
            }
          });
        }

        if (fb) {
          if (allPass) {
            this.showMissionSuccess(m.success);
          } else {
            fb.innerHTML = results.map(r => '<div>' + this.esc(r) + '</div>').join('');
            fb.className = 'mission-feedback error';
          }
        }
      } catch (err) {
        if (fb) { fb.textContent = 'Fehler beim Pruefen. Ist dein Code korrekt?'; fb.className = 'mission-feedback error'; }
      }
    }, { signal });
  }

  bindHtmlWriteMission(area, m, mi, signal) {
    const htmlInput = area.querySelector('#html-only-input');
    const iframe = area.querySelector('#html-only-preview-frame');
    const checkBtn = area.querySelector('#mission-check');

    if (!this.missionState[mi]) this.missionState[mi] = {};

    const updatePreview = () => {
      if (!htmlInput || !iframe) return;
      iframe.srcdoc = htmlInput.value;
    };

    if (htmlInput) {
      htmlInput.addEventListener('input', () => {
        this.missionState[mi].html = htmlInput.value;
        updatePreview();
      }, { signal });
      updatePreview();
    }

    checkBtn?.addEventListener('click', () => {
      if (!iframe) return;
      const fb = document.getElementById('mission-feedback');
      const htmlSrc = htmlInput ? htmlInput.value : '';
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        let allPass = true;
        const results = [];

        m.data.checks.forEach(check => {
          if (check.type === 'text') {
            if (htmlSrc.toLowerCase().includes(check.pattern.toLowerCase())) {
              results.push(check.desc + ' ✓');
            } else {
              allPass = false;
              results.push(check.desc + ' ✗');
            }
          } else if (check.type === 'dom') {
            const elements = doc.querySelectorAll(check.selector);
            if (check.minCount && elements.length < check.minCount) {
              allPass = false;
              results.push(check.desc + ' ✗ (gefunden: ' + elements.length + ')');
            } else if (elements.length > 0) {
              results.push(check.desc + ' ✓');
            } else {
              allPass = false;
              results.push(check.desc + ' ✗');
            }
          } else if (check.type === 'content') {
            const el = doc.querySelector(check.selector);
            if (el && el.textContent.trim().length > 0) {
              results.push(check.desc + ' ✓');
            } else {
              allPass = false;
              results.push(check.desc + ' ✗ (Element leer)');
            }
          } else if (check.type === 'attr') {
            const el = doc.querySelector(check.selector);
            if (!el) {
              allPass = false;
              results.push(check.desc + ' ✗ (Element nicht gefunden)');
            } else if (check.notEmpty) {
              const val = el.getAttribute(check.attr);
              if (val && val.trim().length > 0) {
                results.push(check.desc + ' ✓');
              } else {
                allPass = false;
                results.push(check.desc + ' ✗ (Attribut leer)');
              }
            } else if (check.exists) {
              if (el.hasAttribute(check.attr)) {
                results.push(check.desc + ' ✓');
              } else {
                allPass = false;
                results.push(check.desc + ' ✗ (Attribut fehlt)');
              }
            }
          }
        });

        if (fb) {
          if (allPass) {
            this.showMissionSuccess(m.success);
          } else {
            fb.innerHTML = results.map(r => '<div>' + this.esc(r) + '</div>').join('');
            fb.className = 'mission-feedback error';
          }
        }
      } catch (err) {
        if (fb) { fb.textContent = 'Fehler beim Pruefen. Ist dein HTML korrekt?'; fb.className = 'mission-feedback error'; }
      }
    }, { signal });
  }

  colorMatch(actual, expected) {
    const colorMap = {
      blue: 'rgb(0, 0, 255)',
      red: 'rgb(255, 0, 0)',
      white: 'rgb(255, 255, 255)',
      black: 'rgb(0, 0, 0)',
      yellow: 'rgb(255, 255, 0)',
      green: 'rgb(0, 128, 0)',
      orange: 'rgb(255, 165, 0)',
      purple: 'rgb(128, 0, 128)',
      cyan: 'rgb(0, 255, 255)',
      magenta: 'rgb(255, 0, 255)',
      pink: 'rgb(255, 192, 203)',
      gray: 'rgb(128, 128, 128)'
    };
    const rgb = colorMap[expected];
    if (rgb && (actual.includes(rgb) || actual === expected)) return true;
    return false;
  }

  fontWeightMatch(actual, expected) {
    const weightMap = { thin: '100', extralight: '200', light: '300', normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' };
    const numericExpected = weightMap[expected];
    if (numericExpected && actual === numericExpected) return true;
    return false;
  }

  // ==========================
  // UTILITY
  // ==========================
  esc(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  colorizeHtml(code) {
    let escaped = this.esc(code);
    return escaped.replace(/(&lt;\/?\w[\s\S]*?&gt;)/g, '<span class="hl-tag">$1</span>');
  }
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  const app = new CSSExplorer();
  app.init();
});
