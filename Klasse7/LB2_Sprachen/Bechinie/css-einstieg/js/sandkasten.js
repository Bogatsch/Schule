/* ============================================================
   sandkasten.js – Sandbox-Logik: Aufgaben, Editor, Preview, Prüfung
   ============================================================ */

(function () {
  "use strict";

  // ============================================================
  // AUFGABEN-DEFINITIONEN
  // ============================================================

  const aufgaben = [
    {
      id: 1,
      title: "Textfarbe ändern",
      description:
        'Färbe alle Absätze (<code>&lt;p&gt;</code>) in der Farbe <strong>blue</strong>.',
      tipp: 'Verwende die Eigenschaft <code>color</code>.',
      html: `<h1>Willkommen!</h1>
<p>Das ist der erste Absatz.</p>
<p>Das ist der zweite Absatz.</p>
<p>Und hier kommt der dritte.</p>`,
      starterCss: "",
      checks: [
        {
          selector: "p",
          property: "color",
          expected: "rgb(0, 0, 255)",
          hint: 'Setze die Textfarbe der Absätze auf blue: p { color: blue; }',
        },
      ],
    },
    {
      id: 2,
      title: "Hintergrund gestalten",
      description:
        'Gib dem <code>&lt;body&gt;</code> eine Hintergrundfarbe deiner Wahl.',
      tipp: 'Verwende <code>background-color</code>. Probiere z.\u00a0B. <code>lightyellow</code> oder <code>lightblue</code>.',
      html: `<h1>Hintergrundfarbe</h1>
<p>Diese Seite soll farbig werden!</p>
<p>Versuche verschiedene Farben.</p>`,
      starterCss: "",
      checks: [
        {
          selector: "body",
          property: "backgroundColor",
          notExpected: "rgba(0, 0, 0, 0)",
          hint: "Gib dem body eine Hintergrundfarbe, z.\u00a0B.: body { background-color: lightyellow; }",
        },
      ],
    },
    {
      id: 3,
      title: "Schriftgröße anpassen",
      description:
        'Mache die Überschrift (<code>&lt;h1&gt;</code>) mindestens <strong>36px</strong> groß.',
      tipp: 'Verwende die Eigenschaft <code>font-size</code>.',
      html: `<h1>Große Überschrift</h1>
<p>Normal großer Text darunter.</p>`,
      starterCss: "",
      checks: [
        {
          selector: "h1",
          property: "fontSize",
          minValue: 36,
          hint: "Setze die Schriftgröße der Überschrift auf mindestens 36px: h1 { font-size: 36px; }",
        },
      ],
    },
    {
      id: 4,
      title: "Text zentrieren",
      description:
        'Richte alle Absätze (<code>&lt;p&gt;</code>) mittig aus.',
      tipp: 'Verwende <code>text-align</code>.',
      html: `<h1>Mein Tagebuch</h1>
<p>Heute war ein schöner Tag.</p>
<p>Ich habe viel gelernt.</p>
<p>Informatik macht Spaß!</p>`,
      starterCss: "",
      checks: [
        {
          selector: "p",
          property: "textAlign",
          expected: "center",
          hint: "Zentriere die Absätze: p { text-align: center; }",
        },
      ],
    },
    {
      id: 5,
      title: "Rahmen hinzufügen",
      description:
        'Gib dem <code>&lt;div&gt;</code>-Element einen sichtbaren Rahmen.',
      tipp: 'Verwende die Eigenschaft <code>border</code>, z.\u00a0B. <code>2px solid black</code>.',
      html: `<h1>Rahmen-Übung</h1>
<div>
  <p>Dieser Bereich braucht einen Rahmen!</p>
  <p>Kannst du ihm einen geben?</p>
</div>`,
      starterCss: "",
      checks: [
        {
          selector: "div",
          property: "borderStyle",
          notExpected: "none",
          hint: 'Gib dem div einen Rahmen: div { border: 2px solid black; }',
        },
      ],
    },
    {
      id: 6,
      title: "Klassen-Selektor nutzen",
      description:
        'Färbe nur die Elemente mit der Klasse <code>wichtig</code> in der Farbe <strong>red</strong>.',
      tipp: 'Im CSS wählst du Klassen mit einem <strong>Punkt</strong> aus: <code>.wichtig</code>.',
      html: `<h1>Nachrichten</h1>
<p>Das Wetter wird schön.</p>
<p class="wichtig">Morgen ist Mathe-Test!</p>
<p>Die Mensa hat heute Pizza.</p>
<p class="wichtig">Hausaufgaben nicht vergessen!</p>`,
      starterCss: "",
      checks: [
        {
          selector: ".wichtig",
          property: "color",
          expected: "rgb(255, 0, 0)",
          hint: "Verwende den Klassen-Selektor: .wichtig { color: red; }",
        },
      ],
    },
    {
      id: 7,
      title: "Mehrere Elemente stylen",
      description:
        'Gestalte alle Listeneinträge (<code>&lt;li&gt;</code>): Setze die Textfarbe auf <strong>darkgreen</strong> und die Schriftgröße auf <strong>18px</strong>.',
      tipp: 'Verwende <code>color</code> und <code>font-size</code> in einer Regel für <code>li</code>.',
      html: `<h1>Meine Hobbys</h1>
<ul>
  <li>Fußball spielen</li>
  <li>Bücher lesen</li>
  <li>Programmieren</li>
  <li>Musik hören</li>
</ul>`,
      starterCss: "",
      checks: [
        {
          selector: "li",
          property: "color",
          expected: "rgb(0, 100, 0)",
          hint: "Setze die Textfarbe der Listeneinträge: li { color: darkgreen; }",
        },
        {
          selector: "li",
          property: "fontSize",
          expected: "18px",
          hint: "Setze die Schriftgröße der Listeneinträge: li { font-size: 18px; }",
        },
      ],
    },
    {
      id: 8,
      title: "Kombinationsaufgabe",
      description:
        "Gestalte die Seite mit mehreren CSS-Regeln:<br>" +
        "1. Die Überschrift (<code>h1</code>) soll <strong>blau</strong> sein.<br>" +
        "2. Die Absätze (<code>p</code>) sollen <strong>zentriert</strong> sein.<br>" +
        "3. Der <code>body</code> soll die Hintergrundfarbe <strong>lightyellow</strong> haben.",
      tipp: 'Schreibe für jeden Punkt eine eigene CSS-Regel mit dem passenden Selektor.',
      html: `<h1>Meine Schule</h1>
<p>Wir lernen gerade CSS.</p>
<p>Das macht richtig Spaß!</p>`,
      starterCss: "",
      checks: [
        {
          selector: "h1",
          property: "color",
          expected: "rgb(0, 0, 255)",
          hint: "Färbe die Überschrift blau: h1 { color: blue; }",
        },
        {
          selector: "p",
          property: "textAlign",
          expected: "center",
          hint: "Zentriere die Absätze: p { text-align: center; }",
        },
        {
          selector: "body",
          property: "backgroundColor",
          expected: "rgb(255, 255, 224)",
          hint: "Setze die Hintergrundfarbe: body { background-color: lightyellow; }",
        },
      ],
    },
    {
      id: 9,
      title: "Kreativ-Aufgabe",
      description:
        "Jetzt bist du dran! Gestalte die Seite frei nach deinen Wünschen.<br>" +
        "Verwende <strong>mindestens drei verschiedene CSS-Regeln</strong> mit unterschiedlichen Selektoren oder Eigenschaften.",
      tipp: 'Probiere <code>color</code>, <code>background-color</code>, <code>font-size</code>, <code>text-align</code> und <code>border</code> aus!',
      html: `<h1>Meine eigene Webseite</h1>
<p>Willkommen auf meiner Seite!</p>
<p class="wichtig">Das hier ist besonders wichtig.</p>
<ul>
  <li>Punkt eins</li>
  <li>Punkt zwei</li>
  <li>Punkt drei</li>
</ul>
<div>
  <p>Ein Bereich mit Rahmen?</p>
</div>`,
      starterCss: "/* Schreibe hier mindestens 3 CSS-Regeln! */\n\n",
      checks: [
        {
          type: "minRules",
          count: 3,
          hint: "Schreibe mindestens drei CSS-Regeln. Jede Regel hat einen Selektor und geschweifte Klammern { }.",
        },
      ],
    },
  ];

  // ============================================================
  // STATE
  // ============================================================

  let currentAufgabe = 0;
  const userCss = {}; // { aufgabeId: cssText }
  const solvedSet = new Set(); // Set of solved aufgabe IDs

  // ============================================================
  // DOM REFERENCES
  // ============================================================

  const aufgabenBtns = document.getElementById("aufgabenBtns");
  const aufgabeTitle = document.getElementById("aufgabeTitle");
  const aufgabeDesc = document.getElementById("aufgabeDesc");
  const htmlDisplay = document.getElementById("htmlDisplay");
  const cssEditor = document.getElementById("cssEditor");
  const previewFrame = document.getElementById("previewFrame");
  const checkBtn = document.getElementById("checkBtn");
  const resetBtn = document.getElementById("resetBtn");
  const feedbackArea = document.getElementById("feedbackArea");

  if (!aufgabenBtns || !cssEditor || !previewFrame) return;

  // ============================================================
  // AUFGABEN-NAVIGATION RENDERN
  // ============================================================

  function renderNavButtons() {
    aufgabenBtns.innerHTML = "";
    aufgaben.forEach((aufgabe, idx) => {
      const btn = document.createElement("button");
      btn.className = "aufgabe-btn";
      btn.textContent = aufgabe.id;
      btn.setAttribute("aria-label", "Aufgabe " + aufgabe.id + ": " + aufgabe.title);
      if (idx === currentAufgabe) btn.classList.add("active");
      if (solvedSet.has(aufgabe.id)) btn.classList.add("solved");
      btn.addEventListener("click", () => switchAufgabe(idx));
      aufgabenBtns.appendChild(btn);
    });
  }

  // ============================================================
  // AUFGABE LADEN
  // ============================================================

  function loadAufgabe(idx) {
    const aufgabe = aufgaben[idx];
    if (!aufgabe) return;

    aufgabeTitle.textContent = "Aufgabe " + aufgabe.id + ": " + aufgabe.title;
    aufgabeDesc.innerHTML = aufgabe.description;

    // Render tipp as clickable details element
    const existingTipp = document.querySelector(".aufgabe-tipp");
    if (existingTipp) existingTipp.remove();
    if (aufgabe.tipp) {
      const details = document.createElement("details");
      details.className = "aufgabe-tipp";
      const summary = document.createElement("summary");
      summary.textContent = "\uD83D\uDCA1 Tipp anzeigen";
      details.appendChild(summary);
      const content = document.createElement("p");
      content.innerHTML = aufgabe.tipp;
      details.appendChild(content);
      aufgabeDesc.insertAdjacentElement("afterend", details);
    }

    // HTML display (escaped)
    const codeEl = htmlDisplay.querySelector("code");
    if (codeEl) {
      codeEl.textContent = aufgabe.html;
    } else {
      htmlDisplay.textContent = aufgabe.html;
    }

    // CSS editor: restore saved CSS or use starter
    const saved = userCss[aufgabe.id];
    cssEditor.value = saved !== undefined ? saved : aufgabe.starterCss;

    // Clear feedback
    feedbackArea.innerHTML = "";

    // Update preview
    updatePreview();
  }

  function switchAufgabe(idx) {
    // Save current CSS
    const current = aufgaben[currentAufgabe];
    if (current) {
      userCss[current.id] = cssEditor.value;
    }

    currentAufgabe = idx;
    loadAufgabe(idx);
    renderNavButtons();
  }

  // ============================================================
  // LIVE PREVIEW (iframe)
  // ============================================================

  let previewTimeout = null;

  function updatePreview() {
    const aufgabe = aufgaben[currentAufgabe];
    if (!aufgabe) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>${cssEditor.value}</style>
</head>
<body>
${aufgabe.html}
</body>
</html>`;

    // Use srcdoc for safe, sandboxed preview
    previewFrame.srcdoc = htmlContent;
  }

  function debouncedPreview() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updatePreview, 300);
  }

  cssEditor.addEventListener("input", () => {
    const current = aufgaben[currentAufgabe];
    if (current) {
      userCss[current.id] = cssEditor.value;
    }
    debouncedPreview();
  });

  // ============================================================
  // PRÜF-LOGIK
  // ============================================================

  checkBtn.addEventListener("click", () => {
    const aufgabe = aufgaben[currentAufgabe];
    if (!aufgabe) return;

    // Update preview and wait for iframe to finish loading before checking
    updatePreview();
    previewFrame.addEventListener(
      "load",
      () => runChecks(aufgabe),
      { once: true }
    );
  });

  function runChecks(aufgabe) {
    feedbackArea.innerHTML = "";

    const iframeDoc =
      previewFrame.contentDocument || previewFrame.contentWindow.document;

    let allPassed = true;
    const results = [];

    for (const check of aufgabe.checks) {
      // Special check: minimum number of CSS rules
      if (check.type === "minRules") {
        const ruleCount = countCssRules(cssEditor.value);
        const passed = ruleCount >= check.count;
        if (!passed) allPassed = false;
        results.push({
          passed,
          message: passed
            ? "Du hast " + ruleCount + " CSS-Regeln geschrieben – super!"
            : check.hint,
        });
        continue;
      }

      // Standard property check
      let elements;
      try {
        elements = iframeDoc.querySelectorAll(check.selector);
      } catch {
        results.push({ passed: false, message: check.hint });
        allPassed = false;
        continue;
      }

      if (elements.length === 0) {
        results.push({ passed: false, message: check.hint });
        allPassed = false;
        continue;
      }

      // Check first matching element
      const el = elements[0];
      const computed = previewFrame.contentWindow.getComputedStyle(el);
      const actualValue = computed[check.property];

      let passed = false;

      if (check.expected) {
        passed = normalizeValue(actualValue) === normalizeValue(check.expected);
      } else if (check.notExpected) {
        // Value must be different from notExpected (and not empty/transparent)
        passed =
          normalizeValue(actualValue) !== normalizeValue(check.notExpected) &&
          actualValue !== "" &&
          actualValue !== "transparent";
      } else if (check.minValue !== undefined) {
        const numVal = parseFloat(actualValue);
        passed = !isNaN(numVal) && numVal >= check.minValue;
      }

      if (!passed) allPassed = false;
      results.push({
        passed,
        message: passed
          ? selectorLabel(check.selector) +
            " → " +
            check.property +
            " ist korrekt!"
          : check.hint,
      });
    }

    // Render feedback
    for (const result of results) {
      const div = document.createElement("div");
      div.className = "feedback-item " + (result.passed ? "success" : "error");
      div.innerHTML =
        '<span class="feedback-icon">' +
        (result.passed ? "✅" : "❌") +
        "</span><span>" +
        escapeHtml(result.message) +
        "</span>";
      feedbackArea.appendChild(div);
    }

    // Summary
    const summary = document.createElement("div");
    summary.className = "feedback-summary";
    const correctCount = results.filter((r) => r.passed).length;
    if (allPassed) {
      summary.classList.add("all-correct");
      summary.textContent =
        "🎉 Alles richtig! Aufgabe " + aufgabe.id + " gelöst!";
      solvedSet.add(aufgabe.id);
      renderNavButtons();
    } else {
      summary.classList.add("has-errors");
      summary.textContent =
        correctCount +
        " von " +
        results.length +
        " richtig – versuche es nochmal!";
    }
    feedbackArea.appendChild(summary);
  }

  // ============================================================
  // RESET-LOGIK
  // ============================================================

  resetBtn.addEventListener("click", () => {
    const aufgabe = aufgaben[currentAufgabe];
    if (!aufgabe) return;

    cssEditor.value = aufgabe.starterCss;
    userCss[aufgabe.id] = aufgabe.starterCss;
    feedbackArea.innerHTML = "";
    updatePreview();
  });

  // ============================================================
  // HILFSFUNKTIONEN
  // ============================================================

  function normalizeValue(val) {
    if (!val) return "";
    return val.toString().trim().toLowerCase().replace(/\s+/g, " ");
  }

  function selectorLabel(sel) {
    if (sel.startsWith(".")) return 'Klasse "' + sel.slice(1) + '"';
    return "Element <" + sel + ">";
  }

  function countCssRules(cssText) {
    // Count occurrences of { ... } blocks (simple method)
    const matches = cssText.match(/[^{}]+\{[^}]*\}/g);
    return matches ? matches.length : 0;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================
  // INIT
  // ============================================================

  renderNavButtons();
  loadAufgabe(0);
})();
