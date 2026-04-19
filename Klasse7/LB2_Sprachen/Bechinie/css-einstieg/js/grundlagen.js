/* ============================================================
   grundlagen.js – Interaktive Demos für den Grundlagen-Bereich
   ============================================================ */

(function () {
  "use strict";

  // --- Tab-Navigation ---
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      tabBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      tabContents.forEach((tc) => {
        tc.classList.toggle("active", tc.id === target);
      });
    });
  });

  // --- Abschnitt 1: CSS ein-/ausschalten ---
  const toggleCssBtn = document.getElementById("toggleCssBtn");
  const cssToggleContent = document.getElementById("cssToggleContent");
  let cssOn = false;

  if (toggleCssBtn && cssToggleContent) {
    toggleCssBtn.addEventListener("click", () => {
      cssOn = !cssOn;
      if (cssOn) {
        cssToggleContent.classList.remove("demo-html-unstyled");
        cssToggleContent.classList.add("demo-html-styled");
        toggleCssBtn.textContent = "CSS ausschalten";
        toggleCssBtn.classList.add("active");
      } else {
        cssToggleContent.classList.remove("demo-html-styled");
        cssToggleContent.classList.add("demo-html-unstyled");
        toggleCssBtn.textContent = "CSS einschalten";
        toggleCssBtn.classList.remove("active");
      }
    });
  }

  // --- Abschnitt 2: Mini-Editor (CSS-Regel ausprobieren) ---
  const regelEditor = document.getElementById("regelEditor");
  const regelPreview = document.getElementById("regelPreview");

  function applyMiniCss(textarea, previewEl) {
    if (!textarea || !previewEl) return;
    // Remove any existing injected style
    const existingStyle = previewEl.querySelector("style[data-demo]");
    if (existingStyle) existingStyle.remove();

    const style = document.createElement("style");
    style.setAttribute("data-demo", "true");
    // Scope CSS rules to the preview container
    const cssText = textarea.value;
    // Simple scoping: prefix every rule with the preview's selector
    const scoped = scopeCss(cssText, previewEl);
    style.textContent = scoped;
    previewEl.appendChild(style);
  }

  /**
   * Naively scopes CSS by prefixing each selector with a container selector.
   * Works for simple selectors used in the lesson context.
   */
  function scopeCss(cssText, containerEl) {
    const containerId =
      containerEl.id || "preview-" + Math.random().toString(36).slice(2, 8);
    if (!containerEl.id) containerEl.id = containerId;
    const containerSel = "#" + containerId;

    // Split on } and reconstruct
    const parts = cssText.split("}");
    let result = "";
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const braceIdx = trimmed.indexOf("{");
      if (braceIdx === -1) continue;
      const selector = trimmed.slice(0, braceIdx).trim();
      const declarations = trimmed.slice(braceIdx + 1).trim();
      // Prefix each selector part
      const scopedSelectors = selector
        .split(",")
        .map((s) => containerSel + " " + s.trim())
        .join(", ");
      result += scopedSelectors + " { " + declarations + " }\n";
    }
    return result;
  }

  if (regelEditor && regelPreview) {
    applyMiniCss(regelEditor, regelPreview);
    regelEditor.addEventListener("input", () => {
      applyMiniCss(regelEditor, regelPreview);
    });
  }

  // --- Abschnitt 3: Selektor-Demo ---
  const selectorBtns = document.querySelectorAll("[data-selector-demo]");
  const selectorPreview = document.getElementById("selectorPreview");
  const selectorCode = document.getElementById("selectorCode");
  const codeLines = selectorCode
    ? selectorCode.querySelectorAll("span[data-line-tag]")
    : [];

  selectorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active button
      selectorBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const sel = btn.dataset.selectorDemo;

      // Remove all highlights (preview + code)
      if (selectorPreview) {
        selectorPreview
          .querySelectorAll(".selector-highlight")
          .forEach((el) => el.classList.remove("selector-highlight"));
      }
      codeLines.forEach((line) => line.classList.remove("code-highlight"));

      if (sel !== "none") {
        // Highlight preview elements
        if (selectorPreview) {
          try {
            selectorPreview
              .querySelectorAll(sel)
              .forEach((el) => el.classList.add("selector-highlight"));
          } catch {
            // Invalid selector, ignore
          }
        }

        // Highlight matching code lines
        const isClass = sel.startsWith(".");
        const className = isClass ? sel.slice(1) : null;

        codeLines.forEach((line) => {
          const tag = line.dataset.lineTag;
          const cls = line.dataset.lineClass || null;
          const match = isClass
            ? cls === className
            : tag === sel;
          if (match) line.classList.add("code-highlight");
        });
      }
    });
  });

  // --- Abschnitt 4: Mehrere Elemente gleichzeitig ---
  const multiBtn = document.getElementById("multiBtn");
  const multiPreview = document.getElementById("multiPreview");
  let multiActive = false;

  if (multiBtn && multiPreview) {
    multiBtn.addEventListener("click", () => {
      multiActive = !multiActive;
      multiPreview.classList.toggle("colored", multiActive);
      multiBtn.textContent = multiActive
        ? "Farbe zurücksetzen"
        : "Alle Absätze einfärben";
      multiBtn.classList.toggle("active", multiActive);
    });
  }

  // --- Abschnitt 5: Eigenschaften-Editor ---
  const propEditor = document.getElementById("propEditor");
  const propPreview = document.getElementById("propPreview");

  if (propEditor && propPreview) {
    applyMiniCss(propEditor, propPreview);
    propEditor.addEventListener("input", () => {
      applyMiniCss(propEditor, propPreview);
    });
  }

  // --- Abschnitt 5: Farbmixer ---
  const sliderR = document.getElementById("sliderR");
  const sliderG = document.getElementById("sliderG");
  const sliderB = document.getElementById("sliderB");
  const valR = document.getElementById("valR");
  const valG = document.getElementById("valG");
  const valB = document.getElementById("valB");
  const colorPreviewBox = document.getElementById("colorPreviewBox");
  const colorHexValue = document.getElementById("colorHexValue");
  const colorCopyBtn = document.getElementById("colorCopyBtn");

  function toHex(n) {
    return n.toString(16).padStart(2, "0");
  }

  function updateColorMixer() {
    if (!sliderR || !colorPreviewBox) return;
    const r = parseInt(sliderR.value, 10);
    const g = parseInt(sliderG.value, 10);
    const b = parseInt(sliderB.value, 10);

    valR.textContent = r;
    valG.textContent = g;
    valB.textContent = b;

    const hex = "#" + toHex(r) + toHex(g) + toHex(b);
    colorPreviewBox.style.backgroundColor = hex;
    colorHexValue.textContent = hex;
  }

  if (sliderR && sliderG && sliderB) {
    [sliderR, sliderG, sliderB].forEach((s) =>
      s.addEventListener("input", updateColorMixer)
    );
    updateColorMixer();
  }

  if (colorCopyBtn && colorHexValue) {
    colorCopyBtn.addEventListener("click", () => {
      const text = colorHexValue.textContent;
      navigator.clipboard.writeText(text).then(() => {
        colorCopyBtn.textContent = "✅";
        setTimeout(() => { colorCopyBtn.textContent = "📋"; }, 1500);
      });
    });
  }

  // --- Abschnitt 6: Stil-Umschalter (Trennung Inhalt/Darstellung) ---
  const styleBtns = document.querySelectorAll("[data-style-demo]");
  const styleContent = document.getElementById("styleContent");

  if (styleContent) {
    styleContent.classList.add("style-a");
  }

  styleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      styleBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const variant = btn.dataset.styleDemo;
      if (styleContent) {
        styleContent.classList.remove("style-a", "style-b");
        styleContent.classList.add("style-" + variant);
      }
    });
  });

  // --- Footer Year ---
  const yearEl = document.getElementById("currentYear");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
