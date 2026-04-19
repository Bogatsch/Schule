class CSSExplorer {
  constructor() {
    this.currentMission = 0;
    this.completedMissions = new Set();
    this.missionState = {};

    // ---- GLOSSARY ----
    this.glossary = [
      { term: 'CSS', definition: 'CSS steht fuer Cascading Style Sheets. Es ist die Sprache, mit der du das Aussehen deiner Webseite bestimmst.', analogy: '', example: 'p { color: red; }' },
      { term: 'Selektor', definition: 'Der Selektor bestimmt, welches HTML-Element gestaltet werden soll. Er steht vor den geschweiften Klammern.', analogy: '', example: 'h1 { ... }' },
      { term: 'Eigenschaft', definition: 'Die Eigenschaft sagt, WAS veraendert werden soll (z.B. Farbe, Groesse, Schriftart).', analogy: '', example: 'color, font-size, background' },
      { term: 'Wert', definition: 'Der Wert sagt, WIE die Eigenschaft aussehen soll (z.B. rot, 16px, fett).', analogy: '', example: 'color: blue;  (blue ist der Wert)' },
      { term: 'Klasse', definition: 'Eine Klasse ist ein Name, den du HTML-Elementen gibst. Mehrere Elemente koennen dieselbe Klasse haben.', analogy: '', example: '.wichtig { font-weight: bold; }' },
      { term: 'ID', definition: 'Eine ID ist ein einzigartiger Name fuer genau ein Element. Jede ID darf nur einmal auf der Seite vorkommen.', analogy: '', example: '#titel { font-size: 2em; }' },
      { term: 'Box-Modell', definition: 'Jedes HTML-Element ist eine rechteckige Box. Das Box-Modell beschreibt Content, Padding, Border und Margin.', analogy: '', example: 'margin: 10px; padding: 5px;' },
      { term: 'Margin', definition: 'Margin ist der aeussere Abstand einer Box zu benachbarten Elementen.', analogy: '', example: 'margin: 20px;' },
      { term: 'Padding', definition: 'Padding ist der innere Abstand zwischen dem Inhalt und dem Rand (Border) einer Box.', analogy: '', example: 'padding: 15px;' },
      { term: 'Border', definition: 'Border ist der sichtbare Rand um ein Element herum.', analogy: '', example: 'border: 2px solid black;' },
      { term: 'Inline CSS', definition: 'CSS-Regeln direkt im style-Attribut eines HTML-Elements. Nur fuer Notfaelle!', analogy: '', example: '<p style="color:red">Text</p>' },
      { term: 'Internes CSS', definition: 'CSS-Regeln im style-Element im head-Bereich der HTML-Datei.', analogy: '', example: '<style> p { color: red; } </style>' },
      { term: 'Externes CSS', definition: 'CSS-Regeln in einer eigenen .css-Datei, die per link eingebunden wird. Die beste Methode!', analogy: '', example: '<link rel="stylesheet" href="style.css">' },
      { term: 'Kaskade', definition: 'Die Kaskade bestimmt, welche CSS-Regel gewinnt, wenn mehrere Regeln dasselbe Element betreffen.', analogy: '', example: 'Inline > ID > Klasse > Element' },
      { term: 'Farbe (color)', definition: 'Mit color bestimmst du die Textfarbe. Mit background-color die Hintergrundfarbe.', analogy: '', example: 'color: #ff6600; background-color: yellow;' }
    ];

    // ---- HTML REFERENCES (for badges) ----
    this.htmlReferences = {
      typo: 'In HTML legst du mit <h1> bis <h6> und <p> die Textstruktur fest. Die Ueberschriften-Tags bestimmen die Wichtigkeit, CSS bestimmt dann das Aussehen.',
      box: 'In HTML sind alle Elemente (div, p, h1, img...) rechteckige Bloecke. HTML legt fest, WELCHE Elemente da sind – CSS bestimmt, wie gross sie sind und wie viel Platz sie haben.'
    };

    // ---- FLIP CARDS ----
    this.flipCards = [
      { icon: '📝', title: 'CSS-Regel', definition: 'Eine CSS-Regel besteht aus einem Selektor und einem Deklarationsblock mit Eigenschaften und Werten.', example: 'h1 { color: blue; }', htmlRef: 'Der Selektor h1 waehlt alle <h1>-Ueberschriften aus dem HTML.' },
      { icon: '🎯', title: 'Selektor', definition: 'Der Selektor bestimmt, welches HTML-Element gestylt wird. Es gibt Element-, Klassen- und ID-Selektoren.', example: 'p { }  .info { }  #titel { }', htmlRef: 'Selektoren beziehen sich immer auf HTML-Elemente oder deren Attribute.' },
      { icon: '🔧', title: 'Eigenschaft', definition: 'Die Eigenschaft sagt, WAS veraendert wird: Farbe, Groesse, Abstand und vieles mehr.', example: 'color  font-size  margin', htmlRef: 'Jedes HTML-Element hat viele CSS-Eigenschaften, die du veraendern kannst.' },
      { icon: '🎨', title: 'Wert', definition: 'Der Wert bestimmt, WIE die Eigenschaft aussieht: z.B. welche Farbe, wie gross, wie weit.', example: 'red  16px  bold  center', htmlRef: 'Werte passen zum jeweiligen HTML-Element und dessen Eigenschaft.' },
      { icon: '👥', title: 'Klasse (.)', definition: 'Eine Klasse ist ein Name, den du mit class="..." im HTML vergibst. Mehrere Elemente koennen die gleiche Klasse haben.', example: '.wichtig { font-weight: bold; }', htmlRef: 'Im HTML: <p class="wichtig">Text</p>' },
      { icon: '🆔', title: 'ID (#)', definition: 'Eine ID ist ein einzigartiger Name fuer genau ein Element. Im CSS nutzt du das #-Zeichen.', example: '#haupttitel { font-size: 2em; }', htmlRef: 'Im HTML: <h1 id="haupttitel">Titel</h1>' }
    ];

    // ---- WORKSHOP: CSS EINBINDEN ----
    this.workshopSteps = [
      {
        title: 'Inline-Style',
        code: '<code>&lt;p <span class="highlight-css">style="color: blue; font-size: 20px;"</span>&gt;</code>\n  Dieser Text ist blau und gross!\n<code>&lt;/p&gt;</code>',
        preview: '<p style="color: blue; font-size: 20px;">Dieser Text ist blau und gross!</p><p>Dieser Text hat keinen Style.</p>',
        explanation: 'Inline-CSS schreibst du direkt ins HTML-Element mit dem style-Attribut. Praktisch zum Ausprobieren, aber nicht fuer grosse Seiten geeignet – es wird schnell unuebersichtlich!'
      },
      {
        title: 'Interner Style',
        code: '<code>&lt;head&gt;</code>\n  <code>&lt;style&gt;</code>\n    <span class="highlight-css">p { color: green; font-size: 18px; }</span>\n  <code>&lt;/style&gt;</code>\n<code>&lt;/head&gt;</code>\n<code>&lt;body&gt;</code>\n  <code>&lt;p&gt;</code>Alle Absaetze sind gruen!<code>&lt;/p&gt;</code>\n<code>&lt;/body&gt;</code>',
        preview: '<style>p { color: green; font-size: 18px; }</style><p>Alle Absaetze sind gruen!</p><p>Dieser auch!</p>',
        explanation: 'Internes CSS schreibst du in einen <style>-Block im <head> deines HTML-Dokuments. Gut fuer einzelne Seiten, aber besser ist ein externes Stylesheet!'
      },
      {
        title: 'Externes Stylesheet',
        code: '<span class="highlight-html">&lt;!-- In der HTML-Datei: --&gt;</span>\n<code>&lt;head&gt;</code>\n  <code>&lt;link rel="stylesheet" <span class="highlight-css">href="style.css"</span>&gt;</code>\n<code>&lt;/head&gt;</code>\n\n<span class="highlight-css">/* In style.css: */</span>\n<span class="highlight-css">p { color: purple; font-size: 18px; }</span>',
        preview: '<style>p { color: purple; font-size: 18px; }</style><p>CSS aus einer eigenen Datei!</p><p>So machen es die Profis.</p>',
        explanation: 'Bei einem externen Stylesheet schreibst du dein CSS in eine eigene .css-Datei und bindest sie mit <link> ein. Das ist die beste Methode! Du kannst dieselbe CSS-Datei fuer viele HTML-Seiten nutzen.'
      }
    ];

    // ---- SELECTOR PLAYGROUND ----
    this.selectorPlayground = {
      html: [
        { tag: 'h1', text: 'Willkommen!', attrs: '', id: '', cls: '' },
        { tag: 'p', text: 'Erster Absatz', attrs: ' class="info"', id: '', cls: 'info' },
        { tag: 'p', text: 'Zweiter Absatz', attrs: '', id: '', cls: '' },
        { tag: 'h2', text: 'Unterueberschrift', attrs: ' id="sub"', id: 'sub', cls: '' },
        { tag: 'p', text: 'Dritter Absatz', attrs: ' class="info"', id: '', cls: 'info' },
        { tag: 'img', text: '', attrs: ' src="bild.jpg" alt="Bild"', id: '', cls: '', selfClosing: true }
      ],
      selectors: [
        { selector: 'h1', label: 'h1', desc: 'Waehlt alle h1-Ueberschriften aus.', matchFn: el => el.tag === 'h1' },
        { selector: 'p', label: 'p', desc: 'Waehlt alle Absaetze (p-Elemente) aus.', matchFn: el => el.tag === 'p' },
        { selector: '.info', label: '.info', desc: 'Waehlt alle Elemente mit class="info" aus.', matchFn: el => el.cls === 'info' },
        { selector: '#sub', label: '#sub', desc: 'Waehlt genau das Element mit id="sub" aus.', matchFn: el => el.id === 'sub' },
        { selector: 'img', label: 'img', desc: 'Waehlt alle Bilder aus.', matchFn: el => el.tag === 'img' }
      ]
    };

    // ---- BOX MODEL ----
    this.boxLayers = [
      { name: 'Margin', cssClass: 'box-layer-margin', color: '#ef4444', analogy: 'Der Abstand zum naechsten Paket im Regal.', desc: 'Margin ist der aeussere Abstand. Er schafft Platz zwischen deinem Element und seinen Nachbarn.', code: 'margin: 20px;' },
      { name: 'Border', cssClass: 'box-layer-border', color: '#fb8500', analogy: 'Der Karton um dein Paket.', desc: 'Border ist der sichtbare Rand um dein Element. Du kannst Dicke, Stil und Farbe bestimmen.', code: 'border: 3px solid orange;' },
      { name: 'Padding', cssClass: 'box-layer-padding', color: '#22c55e', analogy: 'Die Polsterung im Paket, die den Inhalt schuetzt.', desc: 'Padding ist der innere Abstand zwischen dem Inhalt und dem Rand (Border).', code: 'padding: 15px;' },
      { name: 'Content', cssClass: 'box-layer-content', color: '#8b5cf6', analogy: 'Der eigentliche Inhalt im Paket.', desc: 'Content ist der Bereich, in dem Text, Bilder oder andere Elemente stehen.', code: 'width: 200px; height: 100px;' }
    ];

    // ---- MISSIONS ----
    this.missions = [
      {
        title: 'CSS-Begriffe zuordnen',
        text: 'Ordne jeden CSS-Begriff der richtigen Beschreibung zu.',
        format: 'matching',
        data: {
          pairs: [
            { left: 'Selektor', right: 'Bestimmt, welches Element gestylt wird' },
            { left: 'Eigenschaft', right: 'Sagt, WAS veraendert wird' },
            { left: 'Wert', right: 'Sagt, WIE es aussehen soll' },
            { left: 'Klasse (.)', right: 'Name fuer mehrere Elemente' },
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
            { q: 'Welcher Selektor waehlt alle Absaetze aus?', options: ['#p', '.p', 'p', 'absatz'], correct: 2 },
            { q: 'Wie selektierst du ein Element mit class="highlight"?', options: ['#highlight', '.highlight', 'highlight', '*highlight'], correct: 1 },
            { q: 'Wie selektierst du ein Element mit id="logo"?', options: ['.logo', 'logo', '#logo', '@logo'], correct: 2 },
            { q: 'Was bedeutet h1 { color: red; }?', options: ['Nur die erste h1 wird rot', 'Alle h1-Elemente werden rot', 'Die Seite wird rot', 'Nichts, das ist falsch'], correct: 1 }
          ]
        },
        success: 'Super! Du verstehst, wie Selektoren HTML-Elemente ansprechen!'
      },
      {
        title: 'Farb-Challenge',
        text: 'Ordne die Farbwerte den richtigen Formaten zu.',
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
        title: 'CSS-Aussagen bewerten',
        text: 'Entscheide: Stimmt die Aussage oder nicht?',
        format: 'true-false',
        data: {
          statements: [
            { text: 'CSS steht fuer "Cascading Style Sheets".', correct: true, explanation: 'Richtig! CSS = Cascading Style Sheets.' },
            { text: 'Mit CSS kann man den Inhalt einer Webseite aendern.', correct: false, explanation: 'Falsch! CSS aendert nur das Aussehen. Den Inhalt aenderst du mit HTML.' },
            { text: 'Eine ID darf auf einer Seite nur einmal vorkommen.', correct: true, explanation: 'Richtig! IDs sind einzigartig.' },
            { text: 'Padding ist der aeussere Abstand eines Elements.', correct: false, explanation: 'Falsch! Padding ist der INNERE Abstand. Der aeussere heisst Margin.' },
            { text: 'Externes CSS ist besser als Inline-CSS fuer grosse Webseiten.', correct: true, explanation: 'Richtig! Externes CSS ist uebersichtlicher und wiederverwendbar.' },
            { text: 'Der Selektor .name waehlt ein Element mit id="name".', correct: false, explanation: 'Falsch! Der Punkt (.) steht fuer Klassen. Fuer IDs nutzt man das Raute-Zeichen (#).' }
          ]
        },
        success: 'Sehr gut! Du kannst wahre und falsche CSS-Aussagen unterscheiden!'
      },
      {
        title: 'Box-Modell Lueckentext',
        text: 'Fuelle die Luecken mit den richtigen Box-Modell-Begriffen.',
        format: 'cloze',
        data: {
          segments: [
            { type: 'text', value: 'Jedes HTML-Element ist eine Box. Ganz aussen ist der ' },
            { type: 'gap', correct: 'Margin', options: ['Margin', 'Border', 'Padding', 'Content'] },
            { type: 'text', value: ' – der aeussere Abstand. Dann kommt der ' },
            { type: 'gap', correct: 'Border', options: ['Margin', 'Border', 'Padding', 'Content'] },
            { type: 'text', value: ' – der sichtbare Rand. Danach folgt das ' },
            { type: 'gap', correct: 'Padding', options: ['Margin', 'Border', 'Padding', 'Content'] },
            { type: 'text', value: ' – der innere Abstand. Und ganz innen ist der ' },
            { type: 'gap', correct: 'Content', options: ['Margin', 'Border', 'Padding', 'Content'] },
            { type: 'text', value: ' – der eigentliche Inhalt.' }
          ]
        },
        success: 'Perfekt! Du kennst alle vier Schichten des Box-Modells!'
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
        title: 'Klassen stylen',
        text: 'Style die Klasse .highlight: Hintergrundfarbe gelb (yellow), Schrift fett (bold).',
        format: 'code-write',
        data: {
          starterCode: '.highlight {\n  \n}',
          htmlTemplate: '<p>Normaler Text.</p>\n<p class="highlight">Wichtiger Text!</p>\n<p>Noch mehr Text.</p>',
          checks: [
            { property: 'background-color', value: 'yellow', element: '.highlight', desc: '.highlight soll gelben Hintergrund haben' },
            { property: 'font-weight', value: 'bold', element: '.highlight', desc: '.highlight soll fett sein' }
          ]
        },
        success: 'Klasse! Du kannst Klassen-Selektoren einsetzen!'
      },
      {
        title: 'Rahmen & Abstaende',
        text: 'Gib dem Element .card einen 2px solid schwarzen Rahmen, 16px Innenabstand (padding) und 20px Aussenabstand (margin).',
        format: 'code-write',
        data: {
          starterCode: '.card {\n  \n}',
          htmlTemplate: '<div class="card">Ich bin eine Karte mit Rahmen und Abstaenden.</div>\n<div class="card">Noch eine Karte.</div>',
          checks: [
            { property: 'border', value: '2px solid', element: '.card', desc: '.card soll einen 2px solid Rahmen haben' },
            { property: 'padding', value: '16px', element: '.card', desc: '.card soll 16px padding haben' },
            { property: 'margin', value: '20px', element: '.card', desc: '.card soll 20px margin haben' }
          ]
        },
        success: 'Toll! Das Box-Modell sitzt!'
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
      {
        title: 'Alles kombiniert',
        text: 'Style #header: weisser Text auf dunklem Hintergrund (#2d2d44), 24px Schrift, zentriert, 20px Innenabstand.',
        format: 'code-write',
        data: {
          starterCode: '#header {\n  \n}',
          htmlTemplate: '<div id="header">Meine Webseite</div>\n<p>Willkommen auf meiner Seite!</p>',
          checks: [
            { property: 'color', value: 'rgb(255, 255, 255)', element: '#header', desc: '#header soll weisse Schrift haben' },
            { property: 'background-color', value: 'rgb(45, 45, 68)', element: '#header', desc: '#header soll Hintergrund #2d2d44 haben' },
            { property: 'font-size', value: '24px', element: '#header', desc: '#header soll 24px gross sein' },
            { property: 'text-align', value: 'center', element: '#header', desc: '#header soll zentriert sein' },
            { property: 'padding', value: '20px', element: '#header', desc: '#header soll 20px padding haben' }
          ]
        },
        success: 'Meisterhaft! Du hast alle CSS-Grundlagen kombiniert!'
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
  }

  // ==========================
  // INITIALIZATION
  // ==========================
  init() {
    this.bindGlossary();
    this.renderGlossary();
    this.renderFlipCards();
    this.renderWorkshop();
    this.renderSelectorPlayground();
    this.renderColorExplorer();
    this.renderTypoWorkshop();
    this.renderBoxModel();
    this.renderBoxWorkshop();
    this.createMissionButtons();
    this.updateMission();
    this.bindHtmlRefBadges();
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

    /* const htmlDisplay = sp.html.map((el, i) => {
      if (el.selfClosing) {
        return `<span data-idx="${i}">&lt;${this.esc(el.tag)}${this.esc(el.attrs)} /&gt;</span>`;
      }
      return `<span data-idx="${i}">&lt;${this.esc(el.tag)}${this.esc(el.attrs)}&gt;${this.esc(el.text)}&lt;/${this.esc(el.tag)}&gt;</span>`;
    }).join('\n');

    container.innerHTML = `
      <div class="selector-buttons">
        ${sp.selectors.map((s, i) => `<button class="selector-btn" data-si="${i}" type="button">${this.esc(s.label)}</button>`).join('')}
      </div>
      <div class="selector-html-display" id="selector-html-display">${htmlDisplay}</div>
      <div class="selector-info" id="selector-info">Klicke auf einen Selektor links!</div>
    `; */

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
    } else if (mode === 'hex') {
      content.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Gib einen Hex-Farbcode ein (z.B. #ff6600):</p>';
      controls.innerHTML = `
        <div class="color-control-group">
          <label for="hex-input">Hex-Code:</label>
          <input type="text" id="hex-input" value="#8b5cf6" maxlength="7" placeholder="#rrggbb">
        </div>
        <div class="color-control-group">
          <label for="color-wheel">Oder waehle:</label>
          <input type="color" id="color-wheel" value="#8b5cf6">
        </div>
      `;
      const hexInput = document.getElementById('hex-input');
      const colorWheel = document.getElementById('color-wheel');
      hexInput.addEventListener('input', () => {
        const v = hexInput.value;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          colorWheel.value = v;
          this.updateColorPreview(v, v);
        }
      });
      colorWheel.addEventListener('input', () => {
        hexInput.value = colorWheel.value;
        this.updateColorPreview(colorWheel.value, colorWheel.value);
      });
    } else if (mode === 'rgb') {
      content.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Stelle RGB-Werte mit den Reglern ein:</p>';
      controls.innerHTML = `
        <div class="color-control-group"><label>Rot: <span id="r-val">139</span></label><input type="range" id="r-range" min="0" max="255" value="139"></div>
        <div class="color-control-group"><label>Gruen: <span id="g-val">92</span></label><input type="range" id="g-range" min="0" max="255" value="92"></div>
        <div class="color-control-group"><label>Blau: <span id="b-val">246</span></label><input type="range" id="b-range" min="0" max="255" value="246"></div>
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
      </div>
      <div class="typo-preview" id="typo-preview">
        <p>Das ist ein Beispieltext. Aendere die Einstellungen oben und sieh, wie sich die Schrift veraendert!</p>
      </div>
      <div class="typo-css-output" id="typo-css-output"></div>
    `;
    this.updateTypoPreview();
    container.querySelectorAll('select, input').forEach(el => el.addEventListener('input', () => this.updateTypoPreview()));
  }

  updateTypoPreview() {
    const font = document.getElementById('typo-font')?.value || 'Arial, sans-serif';
    const size = document.getElementById('typo-size')?.value || '18';
    const weight = document.getElementById('typo-weight')?.value || 'normal';
    const align = document.getElementById('typo-align')?.value || 'left';
    const preview = document.getElementById('typo-preview');
    const output = document.getElementById('typo-css-output');
    const sizeLabel = document.getElementById('typo-size-val');

    if (sizeLabel) sizeLabel.textContent = size + 'px';
    if (preview) {
      preview.style.fontFamily = font;
      preview.style.fontSize = size + 'px';
      preview.style.fontWeight = weight;
      preview.style.textAlign = align;
    }
    if (output) {
      output.textContent = `p {\n  font-family: ${font};\n  font-size: ${size}px;\n  font-weight: ${weight};\n  text-align: ${align};\n}`;
    }
  }

  // ==========================
  // BOX MODEL
  // ==========================
  renderBoxModel() {
    const container = document.getElementById('box-model-visual');
    if (!container) return;
    container.innerHTML = `
      <div class="box-model-diagram">
        <div class="box-layer box-layer-margin" data-layer="0">
          <span class="box-layer-label">Margin</span>
          <div class="box-layer box-layer-border" data-layer="1">
            <span class="box-layer-label">Border</span>
            <div class="box-layer box-layer-padding" data-layer="2">
              <span class="box-layer-label">Padding</span>
              <div class="box-layer box-layer-content" data-layer="3">
                <span class="box-layer-label">Content</span>
                Inhalt
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.addEventListener('click', (e) => {
      const layer = e.target.closest('.box-layer');
      if (!layer) return;
      e.stopPropagation();
      const idx = parseInt(layer.dataset.layer, 10);
      container.querySelectorAll('.box-layer').forEach(l => l.classList.remove('active'));
      layer.classList.add('active');
      this.showBoxDetail(idx);
    });
    this.showBoxDetail(null);
  }

  showBoxDetail(idx) {
    const detail = document.getElementById('box-model-detail');
    if (!detail) return;
    if (idx === null || idx === undefined) {
      detail.innerHTML = '<em>Klicke auf eine Schicht im Box-Modell!</em>';
      return;
    }
    const layer = this.boxLayers[idx];
    detail.innerHTML = `
      <div class="detail-title">${this.esc(layer.name)}</div>
      <div class="detail-analogy">${this.esc(layer.analogy)}</div>
      <p>${this.esc(layer.desc)}</p>
      <div class="detail-code">${this.esc(layer.code)}</div>
    `;
  }

  // ==========================
  // BOX WORKSHOP (Sliders)
  // ==========================
  renderBoxWorkshop() {
    const container = document.getElementById('box-workshop');
    if (!container) return;
    container.innerHTML = `
      <div class="box-sliders">
        <div class="box-slider-group">
          <label class="margin-label">Margin: <span class="slider-value" id="bw-margin-val">20px</span></label>
          <input type="range" id="bw-margin" min="0" max="60" value="20" style="accent-color:var(--box-margin)">
        </div>
        <div class="box-slider-group">
          <label class="border-label">Border: <span class="slider-value" id="bw-border-val">3px</span></label>
          <input type="range" id="bw-border" min="0" max="20" value="3" style="accent-color:var(--box-border)">
        </div>
        <div class="box-slider-group">
          <label class="padding-label">Padding: <span class="slider-value" id="bw-padding-val">15px</span></label>
          <input type="range" id="bw-padding" min="0" max="60" value="15" style="accent-color:var(--box-padding)">
        </div>
      </div>
      <div class="box-live-preview" id="bw-preview">
        <div class="box-preview-element" id="bw-element">Mein Element</div>
      </div>
      <div class="box-css-output" id="bw-css-output"></div>
    `;
    this.updateBoxWorkshop();
    container.querySelectorAll('input[type="range"]').forEach(inp => inp.addEventListener('input', () => this.updateBoxWorkshop()));
  }

  updateBoxWorkshop() {
    const margin = document.getElementById('bw-margin')?.value || '20';
    const border = document.getElementById('bw-border')?.value || '3';
    const padding = document.getElementById('bw-padding')?.value || '15';
    const el = document.getElementById('bw-element');
    const output = document.getElementById('bw-css-output');

    document.getElementById('bw-margin-val').textContent = margin + 'px';
    document.getElementById('bw-border-val').textContent = border + 'px';
    document.getElementById('bw-padding-val').textContent = padding + 'px';

    if (el) {
      el.style.margin = margin + 'px';
      el.style.border = border + 'px solid #fb8500';
      el.style.padding = padding + 'px';
    }
    if (output) {
      output.textContent = `.element {\n  margin: ${margin}px;\n  border: ${border}px solid orange;\n  padding: ${padding}px;\n}`;
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
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:4px;">Schreibe dein CSS hier:</p>
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
        const leftText = m.data.pairs[selectedLeft].left;
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
          this.showMissionSuccess(m.success);
        }
      }, 1200);
    });
  }

  bindAssignmentMission(area, m, mi) {
    const state = this.missionState[mi];
    let selectedTag = null;

    area.addEventListener('click', (e) => {
      const tag = e.target.closest('.assignment-tag');
      const cat = e.target.closest('.assignment-category');

      if (tag && !tag.classList.contains('placed')) {
        area.querySelectorAll('.assignment-tag').forEach(t => t.style.outline = 'none');
        tag.style.outline = '2px solid white';
        selectedTag = tag.dataset.tag;
      } else if (cat && selectedTag) {
        const ci = parseInt(cat.dataset.ci, 10);
        state.placed[ci].push(selectedTag);
        const placedDiv = cat.querySelector('.placed-items');
        const span = document.createElement('span');
        span.className = 'assignment-placed';
        span.textContent = selectedTag;
        placedDiv.appendChild(span);
        const tagEl = area.querySelector(`.assignment-tag[data-tag="${CSS.escape(selectedTag)}"]`);
        if (tagEl) tagEl.classList.add('placed');
        selectedTag = null;
        area.querySelectorAll('.assignment-tag').forEach(t => t.style.outline = 'none');
      }
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
      if (allCorrect) {
        this.showMissionSuccess(m.success);
      } else if (fb) {
        fb.textContent = 'Einige sind noch falsch markiert. Probiere es nochmal!';
        fb.className = 'mission-feedback error';
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
      const css = textarea.value;
      iframe.srcdoc = '<style>' + css + '</style>' + m.data.htmlTemplate;
    };

    if (textarea) {
      textarea.addEventListener('input', updatePreview);
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
          if (!el) { allPass = false; results.push('Element ' + check.element + ' nicht gefunden.'); return; }
          const computed = iframe.contentWindow.getComputedStyle(el);
          const val = computed.getPropertyValue(check.property);
          // Loose check
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
    });
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
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  const app = new CSSExplorer();
  app.init();
});
