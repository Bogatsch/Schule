class HTMLExplorer {
  constructor() {
    this.currentMission = 0;
    this.completedMissions = new Set();
    this.missionState = {};

    // ---- GLOSSARY ----
    this.glossary = [
      { term: 'HTML', definition: 'HTML steht fuer HyperText Markup Language. Es ist die Sprache, mit der du den Aufbau und Inhalt einer Webseite bestimmst.', analogy: 'HTML ist der Bauplan eines Hauses – es legt fest, welche Raeume (Elemente) es gibt.', example: '<h1>Hallo Welt!</h1>' },
      { term: 'Tag', definition: 'Ein Tag ist eine Markierung in spitzen Klammern. Es gibt oeffnende Tags <...> und schliessende Tags </...>.', analogy: 'Wie Klammern in der Mathematik: sie markieren Anfang und Ende.', example: '<p>...Text...</p>' },
      { term: 'Element', definition: 'Ein Element besteht aus dem oeffnenden Tag, dem Inhalt und dem schliessenden Tag zusammen.', analogy: 'Wie ein Paket: Deckel auf, Inhalt rein, Deckel zu.', example: '<h1>Titel</h1>' },
      { term: 'Attribut', definition: 'Attribute sind Zusatzinformationen in einem oeffnenden Tag, z.B. src, href, alt, class.', analogy: 'Wie ein Namensschild am Paket mit Extra-Infos.', example: '<img src="bild.jpg" alt="Foto">' },
      { term: 'DOCTYPE', definition: '<!DOCTYPE html> steht ganz oben und sagt dem Browser, dass es sich um ein HTML5-Dokument handelt.', analogy: 'Wie der Titel auf einem Buchcover – er sagt, was fuer ein Buch es ist.', example: '<!DOCTYPE html>' },
      { term: '<html>', definition: 'Das html-Element umschliesst die gesamte Webseite. Es ist das Wurzelelement.', analogy: 'Wie die Aussenmauern eines Hauses – alles ist darin.', example: '<html lang="de">...</html>' },
      { term: '<head>', definition: 'Im head stehen unsichtbare Infos fuer den Browser: Titel, Zeichensatz, Links zu CSS-Dateien.', analogy: 'Wie das Gehirn: wichtig, aber man sieht es nicht.', example: '<head><title>Meine Seite</title></head>' },
      { term: '<body>', definition: 'Im body steht alles, was auf der Webseite sichtbar ist: Texte, Bilder, Links.', analogy: 'Wie das Schaufenster eines Ladens – das sieht jeder.', example: '<body><h1>Hallo!</h1></body>' },
      { term: '<title>', definition: 'Der Titel wird im Browser-Tab angezeigt. Er steht im head-Bereich.', analogy: 'Wie der Name auf dem Tuerschild.', example: '<title>Meine Webseite</title>' },
      { term: 'Ueberschriften', definition: 'HTML hat 6 Ueberschriften-Ebenen: <h1> (wichtigste) bis <h6> (kleinste). Sie gliedern den Text.', analogy: 'Wie Kapitel und Unterkapitel in einem Buch.', example: '<h1>Haupttitel</h1> <h2>Untertitel</h2>' },
      { term: '<p>', definition: 'Das p-Element erzeugt einen Textabsatz. Jeder Absatz bekommt automatisch Abstand.', analogy: 'Wie ein neuer Absatz in einem Aufsatz.', example: '<p>Das ist ein Absatz.</p>' },
      { term: '<a>', definition: 'Mit dem a-Element (Anker) erstellst du Links. Das href-Attribut gibt das Ziel an.', analogy: 'Wie ein Wegweiser, der zu einem anderen Ort zeigt.', example: '<a href="https://example.com">Klick</a>' },
      { term: '<img>', definition: 'Das img-Element bindet ein Bild ein. Es braucht src (Quelle) und alt (Beschreibung). Es hat kein schliessendes Tag.', analogy: 'Wie ein Bilderrahmen an der Wand.', example: '<img src="foto.jpg" alt="Ein Foto">' },
      { term: 'Listen', definition: 'Geordnete Listen (<ol>) haben Nummern, ungeordnete (<ul>) haben Punkte. Eintraege stehen in <li>.', analogy: 'Wie eine Einkaufsliste (ul) oder eine Rangliste (ol).', example: '<ul><li>Punkt 1</li></ul>' },
      { term: 'Verschachtelung', definition: 'HTML-Elemente koennen ineinander stehen. Die inneren muessen zuerst geschlossen werden.', analogy: 'Wie Schachteln in Schachteln: die innere muss zuerst zu.', example: '<p><strong>Fett</strong> Text</p>' }
    ];

    // ---- FLIP CARDS ----
    this.flipCards = [
      { icon: '\ud83d\udcc4', title: '<!DOCTYPE html>', definition: 'Die erste Zeile jeder HTML-Datei. Sie sagt dem Browser: Das ist ein HTML5-Dokument!', example: '<!DOCTYPE html>', detail: 'Steht immer ganz oben – vor allem anderen.' },
      { icon: '\ud83c\udf10', title: '<html>', definition: 'Das Wurzelelement. Es umschliesst die gesamte Webseite.', example: '<html>...</html>', detail: 'Alles andere steht innerhalb von <html>.' },
      { icon: '\ud83e\udde0', title: '<head>', definition: 'Enthaelt unsichtbare Informationen: Seitentitel, Zeichensatz und mehr.', example: '<head>...</head>', detail: 'Der Browser liest es, aber der Besucher sieht es nicht direkt.' },
      { icon: '\ud83d\udc41\ufe0f', title: '<body>', definition: 'Alles, was im Browser sichtbar ist, steht im body: Texte, Bilder, Links, Listen.', example: '<body>...</body>', detail: 'Das Schaufenster deiner Webseite.' },
    ];

    // ---- WORKSHOP: HTML-Grundgeruest aufbauen ----
    this.workshopSteps = [
      {
        title: 'Schritt 1: Grundgeruest',
        code: '<span class="highlight-html">&lt;!DOCTYPE html&gt;</span>\n<code>&lt;html lang="de"&gt;</code>\n\n<code>&lt;/html&gt;</code>',
        preview: '<!DOCTYPE html><html lang="de"><body><p style="font-family:sans-serif;padding:12px;">Schritt 1: Das Grundgeruest steht!<br>DOCTYPE sagt dem Browser: HTML5.<br>Das html-Element umschliesst alles.</p></body></html>',
        explanation: 'Jede HTML-Seite beginnt mit <!DOCTYPE html> und dem <html>-Element. Das Attribut lang="de" sagt dem Browser, dass die Seite auf Deutsch ist. Es kann aber auch weggelassen werden.'
      },
      {
        title: 'Schritt 2: Head-Bereich',
        code: '<span class="highlight-html">&lt;!DOCTYPE html&gt;</span>\n<code>&lt;html lang="de"&gt;</code>\n  <code>&lt;head&gt;</code>\n    <span class="highlight-html">&lt;meta charset="UTF-8"&gt;</span>\n    <span class="highlight-html">&lt;title&gt;Meine Seite&lt;/title&gt;</span>\n  <code>&lt;/head&gt;</code>\n<code>&lt;/html&gt;</code>',
        preview: '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Meine Seite</title></head><body><p style="font-family:sans-serif;padding:12px;">Schritt 2: Head ist da!<br>Der Titel erscheint im Browser-Tab.<br>charset sorgt fuer richtige Umlaute.</p></body></html>',
        explanation: 'Im <head> stehen unsichtbare Informationen: <meta charset="UTF-8"> fuer den Zeichensatz, damit z.B. Umlaute korrekt dargestellt werden, und <title> fuer den Tab-Titel.'
      },
      {
        title: 'Schritt 3: Body-Bereich',
        code: '<span class="highlight-html">&lt;!DOCTYPE html&gt;</span>\n<code>&lt;html lang="de"&gt;</code>\n  <code>&lt;head&gt;</code>\n    <code>&lt;meta charset="UTF-8"&gt;</code>\n    <code>&lt;title&gt;</code>Meine Seite<code>&lt;/title&gt;</code>\n  <code>&lt;/head&gt;</code>\n  <code>&lt;body&gt;</code>\n    <span class="highlight-html">&lt;h1&gt;Hallo Welt!&lt;/h1&gt;</span>\n    <span class="highlight-html">&lt;p&gt;Meine erste Webseite.&lt;/p&gt;</span>\n  <code>&lt;/body&gt;</code>\n<code>&lt;/html&gt;</code>',
        preview: '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Meine Seite</title></head><body style="font-family:sans-serif;padding:12px;"><h1>Hallo Welt!</h1><p>Meine erste Webseite.</p></body></html>',
        explanation: 'Im <body> steht alles Sichtbare. Hier haben wir eine Ueberschrift <h1> und einen Absatz <p> eingefuegt. Fertig ist die erste Webseite!'
      }
    ];

    // ---- HTML STRUCTURE PLAYGROUND ----
    this.structureParts = [
      { name: '&lt;!DOCTYPE html&gt;', desc: 'Dokumenttyp-Deklaration: Sagt dem Browser, dass es eine HTML5-Seite ist. Steht immer ganz oben.', color: '#ef4444', indent: 0 },
      { name: '&lt;html lang="de"&gt;', desc: 'Wurzelelement: Alles andere steht darin. lang="de" bedeutet Deutsch.', color: '#fb8500', indent: 0 },
      { name: '&lt;head&gt;', desc: 'Head-Bereich: Unsichtbare Infos wie Titel und Zeichensatz.', color: '#8b5cf6', indent: 1 },
      { name: '&lt;meta charset="UTF-8"&gt;', desc: 'Zeichensatz: UTF-8 unterstuetzt Umlaute und Sonderzeichen.', color: '#06b6d4', indent: 2 },
      { name: '&lt;title&gt;Meine Seite&lt;/title&gt;', desc: 'Seitentitel: Erscheint im Browser-Tab oben.', color: '#06b6d4', indent: 2 },
      { name: '&lt;/head&gt;', desc: 'Schliesst den Head-Bereich.', color: '#8b5cf6', indent: 1 },
      { name: '&lt;body&gt;', desc: 'Body-Bereich: Alles Sichtbare steht hier drin.', color: '#22c55e', indent: 1 },
      { name: '&lt;h1&gt;Hallo Welt!&lt;/h1&gt;', desc: 'Hauptueberschrift: Die wichtigste Ueberschrift der Seite.', color: '#22c55e', indent: 2 },
      { name: '&lt;p&gt;Mein erster Absatz.&lt;/p&gt;', desc: 'Textabsatz: Erzeugt einen Absatz mit automatischem Abstand.', color: '#22c55e', indent: 2 },
      { name: '&lt;/body&gt;', desc: 'Schliesst den Body-Bereich.', color: '#22c55e', indent: 1 },
      { name: '&lt;/html&gt;', desc: 'Schliesst das HTML-Dokument.', color: '#fb8500', indent: 0 }
    ];

    // ---- MEDIA ELEMENTS ----
    this.mediaElements = [
      { name: 'Link &lt;a&gt;', icon: '\ud83d\udd17', desc: 'Links verbinden Seiten miteinander. Das href-Attribut gibt an, wohin der Link fuehrt. Zwischen den <a>-Tags steht der Text, der auf der Webseite angezeigt wird.', code: '<a href="https://example.com">Beispiel-Link</a>', color: '#fb8500' },
      { name: 'Bild &lt;img&gt;', icon: '\ud83d\uddbc\ufe0f', desc: 'Bilder werden mit dem img-Tag eingebunden. src gibt die Bildquelle an (das kann auch ein Link aus dem Internet sein), alt eine Beschreibung, falls das Bild nicht korrekt angezeigt oder gesehen werden kann.', code: '<img src="foto.jpg" alt="Ein Foto">', color: '#8b5cf6' },
      { name: 'Liste &lt;ul&gt;/&lt;ol&gt;', icon: '\ud83d\udccb', desc: '<ul> erzeugt Punkte (ungeordnet), <ol> Nummern (geordnet). Eintraege stehen in <li>.', code: '<ul>\n  <li>Erster Punkt</li>\n  <li>Zweiter Punkt</li>\n</ul>', color: '#22c55e' },
      { name: 'Zeilenumbruch &lt;br&gt;', icon: '\u21b5', desc: 'Die Enter-Taste alleine erzeugt in HTML keine neue Zeile. Dafür brauchst du den <br>-Tag. <br> erzeugt einen Zeilenumbruch. Es hat kein schliessendes Tag.', code: 'Zeile 1<br>\nZeile 2', color: '#06b6d4' }
    ];

    // ---- MISSIONS ----
    this.missions = [
      {
        title: 'Vorher & Nachher erkunden',
        text: 'Schalte oben den HTML-Schalter um und beobachte, wie sich die Ansicht veraendert. Scrolle danach hierher zurueck und klicke auf "Erledigt".',
        format: 'exploration',
        success: 'Toll! Du siehst, wie HTML dem Text Struktur gibt!'
      },
      {
        title: 'HTML-Begriffe zuordnen',
        text: 'Ordne jeden HTML-Begriff der richtigen Beschreibung zu.',
        format: 'matching',
        data: {
          pairs: [
            { left: 'Tag', right: 'Markierung in spitzen Klammern' },
            { left: 'Element', right: 'Tag + Inhalt + schliessendes Tag' },
            { left: 'Attribut', right: 'Zusatzinfo im oeffnenden Tag' },
            { left: '<head>', right: 'Unsichtbare Informationen' },
            { left: '<body>', right: 'Sichtbarer Inhalt der Seite' }
          ]
        },
        success: 'Perfekt! Du kennst die wichtigsten HTML-Begriffe!'
      },
      {
        title: 'HTML-Grundgeruest sortieren',
        text: 'Sortiere die Teile des HTML-Grundgeruests in die richtige Reihenfolge (von oben nach unten).',
        format: 'sorting',
        data: {
          items: ['<body>...</body>', '<!DOCTYPE html>', '<head>...</head>', '<html>'],
          correct: ['<!DOCTYPE html>', '<html>', '<head>...</head>', '<body>...</body>']
        },
        success: 'Richtig! DOCTYPE \u2192 html \u2192 head \u2192 body \u2013 so ist das HTML-Grundgeruest aufgebaut!'
      },
      {
        title: 'HTML-Tags Quiz',
        text: 'Waehle die richtige Antwort zu HTML-Tags.',
        format: 'single-choice',
        data: {
          questions: [
            { q: 'Welches Tag erzeugt die wichtigste Ueberschrift?', options: ['<h6>', '<title>', '<h1>', '<p>'], correct: 2 },
            { q: 'Wo steht der Seitentitel (<title>)?', options: ['Im <body>', 'Im <head>', 'Vor <!DOCTYPE>', 'Nach </html>'], correct: 1 },
            { q: 'Welches Tag erstellt einen Textabsatz?', options: ['<br>', '<text>', '<p>', '<abs>'], correct: 2 },
            { q: 'Was macht <!DOCTYPE html>?', options: ['Erstellt eine Ueberschrift', 'Sagt dem Browser: HTML5', 'Macht Text fett', 'Bindet ein Bild ein'], correct: 1 }
          ]
        },
        success: 'Super! Du weisst genau, welcher Tag wofuer da ist!'
      },
      {
        title: 'head oder body?',
        text: 'Ordne die HTML-Elemente der richtigen Kategorie zu: Gehoeren sie in den head oder in den body?',
        format: 'assignment',
        data: {
          tags: ['<title>', '<h1>', '<meta charset>', '<p>', '<img>', '<link stylesheet>'],
          categories: [
            { name: 'head', correct: ['<title>', '<meta charset>', '<link stylesheet>'] },
            { name: 'body', correct: ['<h1>', '<p>', '<img>'] }
          ]
        },
        success: 'Klasse! Du weisst, was in den head und was in den body gehoert!'
      },
      {
        title: 'HTML-Aussagen bewerten',
        text: 'Entscheide: Stimmt die Aussage oder nicht?',
        format: 'true-false',
        data: {
          statements: [
            { text: 'HTML steht fuer HyperText Markup Language.', correct: true, explanation: 'Richtig! HTML = HyperText Markup Language.' },
            { text: 'Das <p>-Tag erzeugt eine Ueberschrift.', correct: false, explanation: 'Falsch! <p> erzeugt einen Absatz. Fuer Ueberschriften gibt es <h1> bis <h6>.' },
            { text: 'Jede HTML-Seite braucht ein <html>, <head> und <body> Element.', correct: true, explanation: 'Richtig! Das ist das HTML-Grundgeruest.' },
            { text: 'Das <img>-Tag hat ein schliessendes Tag </img>.', correct: false, explanation: 'Falsch! <img> ist ein selbstschliessendes Tag ohne </img>.' },
            { text: '<h1> ist die wichtigste Ueberschrift, <h6> die kleinste.', correct: true, explanation: 'Richtig! h1 = wichtigste, h6 = kleinste.' },
            { text: 'Das alt-Attribut bei <img> beschreibt die Bildquelle.', correct: false, explanation: 'Falsch! alt beschreibt den Bildinhalt. Die Quelle steht im src-Attribut.' }
          ]
        },
        success: 'Sehr gut! Du kannst wahre und falsche HTML-Aussagen unterscheiden!'
      },
      {
        title: 'HTML-Grundgeruest Lueckentext',
        text: 'Fuelle die Luecken im HTML-Grundgeruest mit den richtigen Begriffen.',
        format: 'cloze',
        data: {
          segments: [
            { type: 'text', value: 'Ganz oben steht ' },
            { type: 'gap', correct: '<!DOCTYPE html>', options: ['<!DOCTYPE html>', '<html>', '<head>', '<body>'] },
            { type: 'text', value: '. Dann kommt das ' },
            { type: 'gap', correct: '<html>', options: ['<!DOCTYPE html>', '<html>', '<head>', '<body>'] },
            { type: 'text', value: '-Element. Unsichtbare Infos stehen im ' },
            { type: 'gap', correct: '<head>', options: ['<!DOCTYPE html>', '<html>', '<head>', '<body>'] },
            { type: 'text', value: '. Der sichtbare Inhalt steht im ' },
            { type: 'gap', correct: '<body>', options: ['<!DOCTYPE html>', '<html>', '<head>', '<body>'] },
            { type: 'text', value: '.' }
          ]
        },
        success: 'Perfekt! Du kennst das HTML-Grundgeruest auswendig!'
      },
      {
        title: 'Ueberschriften erstellen',
        text: 'Der folgende Code steht im <body>, du musst also nicht das HTML-Grundgerüst notieren. Schreibe HTML-Code mit einer Hauptueberschrift (<h1>) "Mein Blog" und einer Unterueberschrift (<h2>) "Erster Beitrag".',
        format: 'code-write',
        data: {
          starterCode: '',
          htmlTemplate: '',
          checks: [
            { tag: 'h1', text: 'Mein Blog', desc: 'Eine h1 mit dem Text "Mein Blog"' },
            { tag: 'h2', text: 'Erster Beitrag', desc: 'Eine h2 mit dem Text "Erster Beitrag"' }
          ]
        },
        success: 'Fantastisch! Du kannst Ueberschriften richtig einsetzen!'
      },
      {
        title: 'Absatz mit Formatierung',
        text: 'Der folgende Code steht im <body>, du musst also nicht das HTML-Grundgerüst notieren. Erstelle einen Absatz (<p>) mit dem Text "HTML ist toll und wichtig". Mache "toll" fett (<b>) und "wichtig" kursiv (<i>).',
        format: 'code-write',
        data: {
          starterCode: '',
          htmlTemplate: '',
          checks: [
            { tag: 'p', desc: 'Ein Absatz (<p>)' },
            { tag: 'b', text: 'toll', desc: '"toll" ist fett (<b>)' },
            { tag: 'i', text: 'wichtig', desc: '"wichtig" ist kursiv (<i>)' }
          ]
        },
        success: 'Super! Du beherrschst Textformatierung!'
      },
      {
        title: 'Einen Link erstellen',
        text: 'Der folgende Code steht im <body>, du musst also nicht das HTML-Grundgerüst notieren. Erstelle einen Link (<a>) mit dem Text "Zur Startseite", der auf "https://example.com" verweist.',
        format: 'code-write',
        data: {
          starterCode: '',
          htmlTemplate: '',
          checks: [
            { tag: 'a', text: 'Zur Startseite', desc: 'Ein Link mit Text "Zur Startseite"' },
            { attr: 'href', value: 'https://example.com', tag: 'a', desc: 'href zeigt auf "https://example.com"' }
          ]
        },
        success: 'Toll! Du kannst Links erstellen!'
      },
      {
        title: 'Ein Bild einbinden',
        text: 'Der folgende Code steht im <body>, du musst also nicht das HTML-Grundgerüst notieren. Binde ein Bild ein (<img>) mit der Quelle "katze.jpg" und dem Alternativtext "Eine suesse Katze".',
        format: 'code-write',
        data: {
          starterCode: '',
          htmlTemplate: '',
          checks: [
            { tag: 'img', desc: 'Ein Bild-Element (<img>)' },
            { attr: 'src', value: 'katze.jpg', tag: 'img', desc: 'src ist "katze.jpg"' },
            { attr: 'alt', value: 'Eine suesse Katze', tag: 'img', desc: 'alt ist "Eine suesse Katze"' }
          ]
        },
        success: 'Klasse! Du kannst Bilder richtig einbinden!'
      },
      {
        title: 'Eine Liste erstellen',
        text: 'Der folgende Code steht im <body>, du musst also nicht das HTML-Grundgerüst notieren. Erstelle eine ungeordnete Liste (<ul>) mit drei Eintraegen: "Apfel", "Banane" und "Kirsche".',
        format: 'code-write',
        data: {
          starterCode: '',
          htmlTemplate: '',
          checks: [
            { tag: 'ul', desc: 'Eine ungeordnete Liste (<ul>)' },
            { tag: 'li', count: 3, desc: 'Drei Listeneintraege (<li>)' },
            { tag: 'li', text: 'Apfel', desc: 'Ein Eintrag "Apfel"' },
            { tag: 'li', text: 'Banane', desc: 'Ein Eintrag "Banane"' },
            { tag: 'li', text: 'Kirsche', desc: 'Ein Eintrag "Kirsche"' }
          ]
        },
        success: 'Super! Du kannst Listen erstellen!'
      },
      {
        title: 'Komplette HTML-Seite',
        text: 'Baue eine vollstaendige HTML-Seite mit: DOCTYPE, html, head (mit title "Meine Seite"), body (mit h1 "Willkommen" und p "Das ist meine Seite.").',
        format: 'code-write',
        data: {
          starterCode: '',
          htmlTemplate: '',
          checks: [
            { doctype: true, desc: 'Beginnt mit <!DOCTYPE html>' },
            { tag: 'html', desc: 'Ein <html>-Element' },
            { tag: 'head', desc: 'Ein <head>-Bereich' },
            { tag: 'title', text: 'Meine Seite', desc: '<title> mit "Meine Seite"' },
            { tag: 'body', desc: 'Ein <body>-Bereich' },
            { tag: 'h1', text: 'Willkommen', desc: '<h1> mit "Willkommen"' },
            { tag: 'p', text: 'Das ist meine Seite.', desc: '<p> mit "Das ist meine Seite."' }
          ]
        },
        success: 'Meisterhaft! Du hast eine komplette HTML-Seite gebaut!'
      }
    ];

    // ---- BRIDGE QUIZ ----
    this.bridgeQuiz = [
      { question: 'Wofuer steht <strong>HTML</strong>?', options: ['Hyper Turbo Markup Language', 'HyperText Markup Language', 'High Tech Modern Language'], correct: 1 },
      { question: 'Was beschreibt HTML auf einer Webseite?', options: ['Die Farben und Schriften', 'Den Aufbau und Inhalt', 'Die Animationen'], correct: 1 },
      { question: 'Was ist ein HTML-<strong>Tag</strong>?', options: ['Ein Bild im Internet', 'Eine Markierung in spitzen Klammern', 'Ein Computerprogramm'], correct: 1 }
    ];
  }

  // ==========================
  // INITIALIZATION
  // ==========================
  init() {
    this.bindGlossary();
    this.renderGlossary();
    this.renderBridge();
    this.renderFlipCards();
    this.renderWorkshop();
    this.renderStructurePlayground();
    this.renderHeadingExplorer();
    this.renderTextWorkshop();
    this.renderMediaExplorer();
    this.renderMediaWorkshop();
    this.createMissionButtons();
    this.updateMission();
    this.bindMissionSuccessModal();
  }

  // ==========================
  // GLOSSARY
  // ==========================
  bindGlossary() {
    const openBtn = document.getElementById('open-glossary');
    const modal = document.getElementById('glossary-modal');
    const closeBtn = document.getElementById('close-glossary');
    if (openBtn && modal) {
      openBtn.addEventListener('click', () => modal.classList.add('active'));
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    }
  }

  renderGlossary() {
    const list = document.getElementById('glossary-list');
    if (!list) return;
    list.innerHTML = this.glossary.map(g => `
      <div class="glossary-entry">
        <h3>${this.esc(g.term)}</h3>
        <p class="glossary-definition">${this.esc(g.definition)}</p>
        <p class="glossary-analogy">${this.esc(g.analogy)}</p>
        <div class="glossary-example">${this.esc(g.example)}</div>
      </div>
    `).join('');
  }

  // ==========================
  // BRIDGE (Vorher/Nachher + Quiz)
  // ==========================
  renderBridge() {
    this.renderBridgePreview(false);
    this.bindBridgeToggle();
    this.renderBridgeQuiz();
  }

  renderBridgePreview(withHTML) {
    const iframe = document.getElementById('bridge-preview');
    if (!iframe) return;
    if (withHTML) {
      iframe.srcdoc = '<html><body>' +
        '<h1>Willkommen auf meiner Seite</h1>' +
        '<p>Das ist ein <strong>Absatz</strong> mit <em>formatiertem</em> Text.</p>' +
        '<h2>Mein Hobby</h2>' +
        '<p>Ich programmiere gerne Webseiten!</p>' +
        '<ul>' +
        '<li>HTML lernen</li>' +
        '<li>Webseiten bauen</li>' +
        '<li>Projekte erstellen</li>' +
        '</ul>' +
        '<p>Besuche <a href="#">meine andere Seite</a>!</p>' +
        '</body></html>';
    } else {
      iframe.srcdoc = '<html><body style="font-family:monospace;padding:20px;background:#f8f9fa;color:#333;">' +
        '<pre style="white-space:pre-wrap;font-size:14px;line-height:1.8;">Willkommen auf meiner Seite\n\nDas ist ein Absatz mit formatiertem Text.\n\nMein Hobby\n\nIch programmiere gerne Webseiten!\n\nHTML lernen\nWebseiten bauen\nProjekte erstellen\n\nBesuche meine andere Seite!</pre>' +
        '</body></html>';
    }
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
  // FLIP CARDS
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
            <p class="flip-html-ref">${this.esc(card.detail)}</p>
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
  // WORKSHOP: HTML-Grundgeruest
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
    container.innerHTML = `
      <div class="workshop-split">
        <div class="workshop-code-panel">${step.code}</div>
        <div class="workshop-preview-panel">
          <iframe sandbox="allow-same-origin" title="Workshop Vorschau"></iframe>
        </div>
      </div>
      <div class="workshop-explanation">${this.esc(step.explanation)}</div>
    `;
    const iframe = container.querySelector('iframe');
    if (iframe) iframe.srcdoc = step.preview;
  }

  // ==========================
  // HTML STRUCTURE PLAYGROUND
  // ==========================
  renderStructurePlayground() {
    const container = document.getElementById('selector-playground');
    if (!container) return;
    const parts = this.structureParts;

    container.innerHTML = `
      <div class="structure-code-display">
        ${parts.map((p, i) => `<div class="structure-line" data-idx="${i}" style="padding-left:${p.indent * 24}px; border-left: 3px solid ${p.color}; cursor:pointer;">
          <code style="color:${p.color}">${p.name}</code>
        </div>`).join('')}
      </div>
      <div class="selector-info" id="selector-info">Klicke auf eine Zeile, um mehr zu erfahren!</div>
    `;

    container.addEventListener('click', (e) => {
      const line = e.target.closest('.structure-line');
      if (!line) return;
      const idx = parseInt(line.dataset.idx, 10);
      const part = parts[idx];
      container.querySelectorAll('.structure-line').forEach(l => l.classList.remove('highlighted'));
      line.classList.add('highlighted');
      const info = document.getElementById('selector-info');
      if (info) info.textContent = part.desc;
    });
  }

  // ==========================
  // HEADING EXPLORER (replaces Color Explorer)
  // ==========================
  renderHeadingExplorer() {
    const container = document.getElementById('color-explorer');
    if (!container) return;

    container.innerHTML = `
      <div class="heading-buttons">
        ${this.headingLevels.map((h, i) => `<button class="heading-btn${i === 0 ? ' active' : ''}" data-idx="${i}" type="button">&lt;${h.tag}&gt;</button>`).join('')}
      </div>
      <div class="heading-preview" id="heading-preview">
        <div class="heading-preview-box" id="heading-preview-box"></div>
      </div>
      <div class="heading-info" id="heading-info"></div>
    `;

    this.showHeadingLevel(0);

    container.querySelector('.heading-buttons').addEventListener('click', (e) => {
      const btn = e.target.closest('.heading-btn');
      if (!btn) return;
      container.querySelectorAll('.heading-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.showHeadingLevel(parseInt(btn.dataset.idx, 10));
    });
  }

  showHeadingLevel(idx) {
    const h = this.headingLevels[idx];
    const preview = document.getElementById('heading-preview-box');
    const info = document.getElementById('heading-info');
    if (preview) {
      preview.innerHTML = `<${h.tag} style="margin:0;">Beispiel-Ueberschrift</${h.tag}>`;
    }
    if (info) {
      info.innerHTML = `<strong>&lt;${h.tag}&gt;</strong> \u2013 ${this.esc(h.desc)} (Standardgroesse: ${h.size})`;
    }
  }

  // ==========================
  // TEXT FORMATTING WORKSHOP (replaces Typo Workshop)
  // ==========================
  renderTextWorkshop() {
    const container = document.getElementById('typo-workshop');
    if (!container) return;
    container.innerHTML = `
      <div class="text-format-controls">
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px;">Mit HTML kannst du den Text wie mit einem Textverarbeitungsprogramm anpassen. Teste es! Schreibe HTML-Code mit Formatierungen und sieh das Ergebnis live:</p>
        <textarea id="text-format-input" class="text-format-textarea" rows="6"><h2>Meine Ueberschrift</h2>
<p>Das ist ein <b>fetter</b> und <i>kursiver</i> Text.</p>
<p>Hier kommt ein <br> Zeilenumbruch.</p></textarea>
      </div>
      <div class="text-format-preview">
        <h4 style="color:var(--text-secondary);margin-bottom:8px;font-size:0.85rem;">Vorschau:</h4>
        <iframe id="text-format-preview-frame" sandbox="allow-same-origin" title="Text Vorschau"></iframe>
      </div>
      <div class="text-format-tags" style="margin-top:12px;">
        <span style="color:var(--text-secondary);font-size:0.85rem;">Verfuegbare Tags:</span>
        <code>&lt;h1&gt;...&lt;/h1&gt;</code>
        <code>&lt;p&gt;...&lt;/p&gt;</code>
        <code>&lt;b&gt;...&lt;/b&gt;</code>
        <code>&lt;i&gt;...&lt;/i&gt;</code>
        <code>&lt;br&gt;</code>
      </div>
    `;
    const textarea = document.getElementById('text-format-input');
    const iframe = document.getElementById('text-format-preview-frame');
    const update = () => {
      if (textarea && iframe) {
        iframe.srcdoc = '<html><body style="font-family:sans-serif;padding:12px;">' + textarea.value + '</body></html>';
      }
    };
    if (textarea) {
      textarea.addEventListener('input', update);
      update();
    }
  }

  // ==========================
  // MEDIA EXPLORER (replaces Box Model)
  // ==========================
  renderMediaExplorer() {
    const container = document.getElementById('box-model-visual');
    if (!container) return;
    container.innerHTML = `
      <div class="media-cards-grid">
        ${this.mediaElements.map((el, i) => `
          <div class="media-card" data-idx="${i}" style="border-left: 4px solid ${el.color}; cursor:pointer;">
            <span class="media-card-icon">${el.icon}</span>
            <span class="media-card-name">${el.name}</span>
          </div>
        `).join('')}
      </div>
    `;
    const detail = document.getElementById('box-model-detail');
    if (detail) detail.innerHTML = '<em>Klicke auf ein Element, um mehr zu erfahren!</em>';

    container.addEventListener('click', (e) => {
      const card = e.target.closest('.media-card');
      if (!card) return;
      const idx = parseInt(card.dataset.idx, 10);
      const el = this.mediaElements[idx];
      container.querySelectorAll('.media-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      if (detail) {
        detail.innerHTML = `
          <div class="detail-title">${el.name}</div>
          <p>${this.esc(el.desc)}</p>
          <div class="detail-code"><pre>${this.esc(el.code)}</pre></div>
        `;
      }
    });
  }

  // ==========================
  // MEDIA WORKSHOP (replaces Box Workshop)
  // ==========================
  renderMediaWorkshop() {
    const container = document.getElementById('box-workshop');
    if (!container) return;
    container.innerHTML = `
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px;">Probiere Links, Bilder und Listen aus! Schreibe HTML-Code und sieh das Ergebnis:</p>
      <div class="media-workshop-split">
        <textarea id="media-workshop-input" class="text-format-textarea" rows="8"><h2>Meine Lieblingsseiten</h2>
<p>Hier ist ein Link: <a href="https://de.wikipedia.org/wiki/Martin-Andersen-Nex%C3%B6-Gymnasium">MANOS</a></p>
<p>Und ein Bild:</p>
<img src="https://www.schulbilder.org/bild-katze-s21091.jpg" alt="Katze">
<h3>Meine Hobbys:</h3>
<ul>
  <li>Programmieren</li>
  <li>Sport</li>
  <li>Musik</li>
</ul></textarea>
        <div class="media-workshop-preview">
          <iframe id="media-workshop-preview-frame" sandbox="allow-same-origin" title="Media Vorschau"></iframe>
        </div>
      </div>
    `;
    const textarea = document.getElementById('media-workshop-input');
    const iframe = document.getElementById('media-workshop-preview-frame');
    const update = () => {
      if (textarea && iframe) {
        iframe.srcdoc = '<html><body style="font-family:sans-serif;padding:12px;">' + textarea.value + '</body></html>';
      }
    };
    if (textarea) {
      textarea.addEventListener('input', update);
      update();
    }
  }

  // ==========================
  // MISSIONS
  // ==========================
  createMissionButtons() {
    const nav = document.getElementById('mission-nav');
    if (!nav) return;
    nav.innerHTML = this.missions.map((m, i) => `
      <button class="mission-btn${i === 0 ? ' active' : ''}" data-mi="${i}" type="button" role="tab" aria-label="Mission ${i + 1}: ${this.esc(m.title)}">${i + 1}</button>
    `).join('');
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
    const m = this.missions[this.currentMission];
    const mi = this.currentMission;

    let content = `
      <img src="Byte_mascot/Byte_Thinking.png" alt="Byte denkt nach" class="mission-mascot">
      <h3>Mission ${mi + 1}: ${this.esc(m.title)}</h3>
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
    }

    area.innerHTML = content;
    this.bindMissionInteractions(m.format, mi);
  }

  // --- Mission Renderers ---
  renderExplorationMission() {
    return `<button class="mission-check-btn" id="mission-check" type="button">Erledigt!</button>`;
  }

  renderMatchingMission(m, mi) {
    const state = this.missionState[mi] || { selected: null, matched: [] };
    this.missionState[mi] = state;
    const shuffledRight = m.data.pairs.map(p => p.right).sort(() => Math.random() - 0.5);
    this.missionState[mi].shuffledRight = shuffledRight;
    return `
      <div class="matching-container">
        <div class="matching-left">
          ${m.data.pairs.map((p, i) => `<div class="matching-item matching-left-item" data-idx="${i}">${this.esc(p.left)}</div>`).join('')}
        </div>
        <div class="matching-right">
          ${shuffledRight.map((r, i) => `<div class="matching-item matching-right-item" data-idx="${i}">${this.esc(r)}</div>`).join('')}
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
              <button class="sort-btn" data-dir="up" data-idx="${i}" type="button">\u25b2</button>
              <button class="sort-btn" data-dir="down" data-idx="${i}" type="button">\u25bc</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Ueberpruefen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderSingleChoiceMission(m, mi) {
    if (!this.missionState[mi]) this.missionState[mi] = { currentQ: 0, correct: 0 };
    const state = this.missionState[mi];
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
      this.missionState[mi] = { placed: {}, selectedTag: null };
      m.data.categories.forEach((_, i) => { this.missionState[mi].placed[i] = []; });
    }
    const tags = m.data.tags.sort(() => Math.random() - 0.5);
    this.missionState[mi].shuffledTags = tags;
    return `
      <div class="assignment-container">
        <div class="assignment-pool" id="assignment-pool">
          ${tags.map(t => `<span class="assignment-tag" data-tag="${this.esc(t)}">${this.esc(t)}</span>`).join('')}
        </div>
        ${m.data.categories.map((cat, i) => `
          <div class="assignment-category" data-ci="${i}">
            <h4>${this.esc(cat.name)}</h4>
            <div class="placed-items" data-ci="${i}"></div>
          </div>
        `).join('')}
      </div>
      <button class="mission-check-btn" id="mission-check" type="button">Ueberpruefen</button>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderTrueFalseMission(m) {
    return `
      <div class="tf-statements">
        ${m.data.statements.map((s, i) => `
          <div class="tf-statement" data-si="${i}">
            <p>${this.esc(s.text)}</p>
            <div class="tf-buttons">
              <button class="tf-btn" data-si="${i}" data-answer="true" type="button">Stimmt</button>
              <button class="tf-btn" data-si="${i}" data-answer="false" type="button">Stimmt nicht</button>
            </div>
            <div class="tf-feedback" id="tf-fb-${i}"></div>
          </div>
        `).join('')}
      </div>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  renderClozeMission(m) {
    let html = '<div class="cloze-text">';
    m.data.segments.forEach((seg, i) => {
      if (seg.type === 'text') {
        html += this.esc(seg.value);
      } else {
        const shuffled = [...seg.options].sort(() => Math.random() - 0.5);
        html += `<select data-gi="${i}" data-correct="${this.esc(seg.correct)}"><option value="">???</option>${shuffled.map(o => `<option value="${this.esc(o)}">${this.esc(o)}</option>`).join('')}</select>`;
      }
    });
    html += '</div>';
    html += '<button class="mission-check-btn" id="mission-check" type="button">Ueberpruefen</button>';
    html += '<div class="mission-feedback" id="mission-feedback"></div>';
    return html;
  }

  renderCodeWriteMission(m) {
    return `
      <div class="code-write-area">
        <div class="code-write-editor">
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:4px;">Schreibe deinen HTML-Code hier:</p>
          <textarea id="code-write-input">${this.esc(m.data.starterCode)}</textarea>
          <button class="mission-check-btn" id="mission-check" type="button">Testen</button>
        </div>
        <div class="code-write-preview">
          <iframe id="code-write-preview-frame" sandbox="allow-same-origin" title="Code Vorschau"></iframe>
        </div>
      </div>
      <div class="mission-feedback" id="mission-feedback"></div>
    `;
  }

  // --- Mission Interaction Bindings ---
  bindMissionInteractions(format, mi) {
    const area = document.getElementById('mission-area');
    if (!area) return;
    const m = this.missions[mi];

    switch (format) {
      case 'exploration':
        area.querySelector('#mission-check')?.addEventListener('click', () => this.showMissionSuccess(m.success));
        break;
      case 'matching':
        this.bindMatchingMission(area, m, mi);
        break;
      case 'sorting':
        this.bindSortingMission(area, m, mi);
        break;
      case 'single-choice':
        this.bindSingleChoiceMission(area, m, mi);
        break;
      case 'assignment':
        this.bindAssignmentMission(area, m, mi);
        break;
      case 'true-false':
        this.bindTrueFalseMission(area, m, mi);
        break;
      case 'cloze':
        area.querySelector('#mission-check')?.addEventListener('click', () => this.checkClozeMission(area, m, mi));
        break;
      case 'code-write':
        this.bindCodeWriteMission(area, m, mi);
        break;
    }
  }

  bindMatchingMission(area, m, mi) {
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
    });
  }

  bindSortingMission(area, m, mi) {
    const state = this.missionState[mi];
    const container = area.querySelector('#sorting-container');

    const refreshSortingUI = () => {
      if (!container) return;
      container.innerHTML = state.items.map((item, i) => `
        <div class="sorting-item" data-idx="${i}">
          <span>${this.esc(item)}</span>
          <div class="sort-buttons">
            <button class="sort-btn" data-dir="up" data-idx="${i}" type="button">\u25b2</button>
            <button class="sort-btn" data-dir="down" data-idx="${i}" type="button">\u25bc</button>
          </div>
        </div>
      `).join('');
    };

    container?.addEventListener('click', (e) => {
      const btn = e.target.closest('.sort-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const dir = btn.dataset.dir;
      if (dir === 'up' && idx > 0) {
        [state.items[idx - 1], state.items[idx]] = [state.items[idx], state.items[idx - 1]];
      } else if (dir === 'down' && idx < state.items.length - 1) {
        [state.items[idx], state.items[idx + 1]] = [state.items[idx + 1], state.items[idx]];
      }
      refreshSortingUI();
    });
    area.querySelector('#mission-check')?.addEventListener('click', () => {
      const isCorrect = JSON.stringify(state.items) === JSON.stringify(m.data.correct);
      const fb = document.getElementById('mission-feedback');
      if (isCorrect) {
        this.showMissionSuccess(m.success);
      } else if (fb) {
        fb.textContent = 'Die Reihenfolge stimmt noch nicht. Verschiebe die Eintraege mit den Pfeilen!';
        fb.className = 'mission-feedback error';
      }
    });
  }

  bindSingleChoiceMission(area, m, mi) {
    const state = this.missionState[mi];
    area.querySelector('#choice-options')?.addEventListener('click', (e) => {
      const opt = e.target.closest('.choice-option');
      if (!opt || opt.classList.contains('correct') || opt.classList.contains('wrong')) return;
      const oi = parseInt(opt.dataset.oi, 10);
      const q = m.data.questions[state.currentQ];
      const fb = document.getElementById('mission-feedback');
      const allOpts = area.querySelectorAll('.choice-option');

      allOpts.forEach(o => o.classList.add('disabled'));
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
          const total = m.data.questions.length;
          const needed = total - 1; // mindestens 3 von 4
          if (state.correct >= needed) {
            this.showMissionSuccess(m.success);
          } else {
            const fb = document.getElementById('mission-feedback');
            if (fb) {
              fb.innerHTML = `Du hattest ${state.correct} von ${total} richtig. Du brauchst mindestens ${needed}. <button class="mission-check-btn" id="retry-quiz" type="button" style="margin-top:8px;">Nochmal versuchen</button>`;
              fb.className = 'mission-feedback error';
            }
            const retryBtn = document.getElementById('retry-quiz');
            if (retryBtn) {
              retryBtn.addEventListener('click', () => {
                this.missionState[mi] = { currentQ: 0, correct: 0 };
                this.updateMission();
              });
            }
          }
        }
      }, 1200);
    });
  }

  bindAssignmentMission(area, m, mi) {
    const state = this.missionState[mi];
    let selectedTag = null;
    const pool = area.querySelector('#assignment-pool');
    const container = area.querySelector('.assignment-container');

    pool?.addEventListener('click', (e) => {
      const tag = e.target.closest('.assignment-tag');
      if (!tag || tag.classList.contains('placed')) return;
      pool.querySelectorAll('.assignment-tag').forEach(t => t.style.outline = 'none');
      tag.style.outline = '2px solid white';
      selectedTag = tag.dataset.tag;
    });

    container?.addEventListener('click', (e) => {
      const cat = e.target.closest('.assignment-category');
      if (!cat || !selectedTag) return;
      const ci = parseInt(cat.dataset.ci, 10);
      state.placed[ci].push(selectedTag);
      const placedDiv = cat.querySelector('.placed-items');
      const span = document.createElement('span');
      span.className = 'assignment-placed';
      span.textContent = selectedTag;
      placedDiv.appendChild(span);
      const tagEl = pool.querySelector(`.assignment-tag[data-tag="${CSS.escape(selectedTag)}"]`);
      if (tagEl) tagEl.classList.add('placed');
      selectedTag = null;
      pool.querySelectorAll('.assignment-tag').forEach(t => t.style.outline = 'none');
    });

    area.querySelector('#mission-check')?.addEventListener('click', () => {
      let allCorrect = true;
      m.data.categories.forEach((cat, ci) => {
        const placed = state.placed[ci] || [];
        const isCorrect = cat.correct.length === placed.length && cat.correct.every(c => placed.includes(c));
        const placedItems = area.querySelectorAll(`.placed-items[data-ci="${ci}"] .assignment-placed`);
        placedItems.forEach(item => {
          if (cat.correct.includes(item.textContent)) {
            item.classList.remove('wrong');
          } else {
            item.classList.add('wrong');
            allCorrect = false;
          }
        });
        if (!isCorrect) allCorrect = false;
      });

      const fb = document.getElementById('mission-feedback');
      const checkBtn = area.querySelector('#mission-check');
      if (allCorrect) {
        this.showMissionSuccess(m.success);
      } else if (fb) {
        if (checkBtn) checkBtn.style.display = 'none';
        fb.innerHTML = 'Einige sind noch falsch. <button class="mission-check-btn" id="retry-assignment" type="button" style="margin-top:8px;">Nochmal versuchen</button>';
        fb.className = 'mission-feedback error';
        document.getElementById('retry-assignment')?.addEventListener('click', () => {
          this.missionState[mi] = null;
          this.updateMission();
        });
      }
    });
  }

  bindTrueFalseMission(area, m, mi) {
    let answered = 0;
    const total = m.data.statements.length;

    area.addEventListener('click', (e) => {
      const btn = e.target.closest('.tf-btn');
      if (!btn || btn.classList.contains('selected-true') || btn.classList.contains('selected-false')) return;
      const si = parseInt(btn.dataset.si, 10);
      const answer = btn.dataset.answer === 'true';
      const statement = m.data.statements[si];
      const fb = document.getElementById('tf-fb-' + si);
      const allbtns = area.querySelectorAll(`.tf-btn[data-si="${si}"]`);
      allbtns.forEach(b => b.disabled = true);

      const correct = answer === statement.correct;
      btn.classList.add(answer ? 'selected-true' : 'selected-false');
      btn.classList.add(correct ? 'correct' : 'wrong');

      if (fb) {
        fb.textContent = statement.explanation;
        fb.style.color = correct ? 'var(--accent-green)' : 'var(--accent-red)';
      }

      answered++;
      if (answered === total) {
        setTimeout(() => this.showMissionSuccess(m.success), 800);
      }
    });
  }

  checkClozeMission(area, m) {
    const selects = area.querySelectorAll('.cloze-text select');
    let allCorrect = true;
    selects.forEach(sel => {
      const correct = sel.dataset.correct;
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

  bindCodeWriteMission(area, m, mi) {
    const textarea = area.querySelector('#code-write-input');
    const iframe = area.querySelector('#code-write-preview-frame');
    const checkBtn = area.querySelector('#mission-check');

    const updatePreview = () => {
      if (!textarea || !iframe) return;
      const html = textarea.value;
      iframe.srcdoc = '<html><body style="font-family:sans-serif;padding:12px;">' + html + '</body></html>';
    };

    if (textarea) {
      textarea.addEventListener('input', updatePreview);
      updatePreview();
    }

    checkBtn?.addEventListener('click', () => {
      const fb = document.getElementById('mission-feedback');
      const userCode = textarea ? textarea.value : '';
      const results = [];
      let allPass = true;

      // Parse user HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(userCode, 'text/html');

      m.data.checks.forEach(check => {
        if (check.doctype) {
          // Check for <!DOCTYPE html>
          const hasDoctype = userCode.trim().toLowerCase().startsWith('<!doctype html>');
          if (hasDoctype) {
            results.push(check.desc + ' \u2713');
          } else {
            allPass = false;
            results.push(check.desc + ' \u2717');
          }
        } else if (check.attr) {
          // Check for attribute on element
          const el = doc.querySelector(check.tag);
          if (!el) {
            allPass = false;
            results.push(check.desc + ' \u2717 (Element ' + check.tag + ' nicht gefunden)');
          } else {
            const attrVal = el.getAttribute(check.attr);
            if (attrVal && attrVal.trim().toLowerCase() === check.value.toLowerCase()) {
              results.push(check.desc + ' \u2713');
            } else {
              allPass = false;
              results.push(check.desc + ' \u2717 (aktuell: ' + (attrVal || 'fehlt') + ')');
            }
          }
        } else if (check.tag) {
          const elements = doc.querySelectorAll(check.tag);
          if (check.count) {
            // Check count
            if (elements.length >= check.count) {
              results.push(check.desc + ' \u2713');
            } else {
              allPass = false;
              results.push(check.desc + ' \u2717 (gefunden: ' + elements.length + ')');
            }
          } else if (check.text) {
            // Check for element with specific text
            let found = false;
            elements.forEach(el => {
              if (el.textContent.trim().toLowerCase().includes(check.text.toLowerCase())) found = true;
            });
            if (found) {
              results.push(check.desc + ' \u2713');
            } else {
              allPass = false;
              results.push(check.desc + ' \u2717');
            }
          } else {
            // Just check existence
            if (elements.length > 0) {
              results.push(check.desc + ' \u2713');
            } else {
              allPass = false;
              results.push(check.desc + ' \u2717');
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
    });
  }

  // ==========================
  // UTILITY
  // ==========================
  esc(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  const app = new HTMLExplorer();
  app.init();
});
