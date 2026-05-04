(function () {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const BOARD_MAX = 10;
    const stage1State = {
        visibleBlocks: 0
    };

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        bindStage1();
        bindRerenderInputs(stage2Ids(), renderStage2);
        bindRerenderInputs(stage3Ids(), renderStage3);
        bindRerenderInputs(stage4Ids(), renderStage4);
        bindRerenderInputs(stage5Ids(), renderStage5);

        renderStage1();
        renderStage2();
        renderStage3();
        renderStage4();
        renderStage5();
    }

    function bindStage1() {
        const addButtons = [
            document.getElementById("stage1-add-x"),
            document.getElementById("stage1-add-y"),
            document.getElementById("stage1-add-point")
        ];

        addButtons.forEach((button, index) => {
            button.addEventListener("click", () => {
                if (stage1State.visibleBlocks === index) {
                    stage1State.visibleBlocks += 1;
                    renderStage1();
                }
            });
        });

        document.getElementById("stage1-reset").addEventListener("click", () => {
            stage1State.visibleBlocks = 0;
            document.getElementById("stage1-x").value = "";
            document.getElementById("stage1-y").value = "";
            renderStage1();
        });

        ["stage1-x", "stage1-y"].forEach(id => {
            document.getElementById(id).addEventListener("input", renderStage1);
        });
    }

    function bindRerenderInputs(ids, renderFn) {
        ids.forEach(id => {
            document.getElementById(id).addEventListener("input", renderFn);
        });
    }

    function stage2Ids() {
        return [
            "stage2-param1", "stage2-param2",
            "stage2-call1-x", "stage2-call1-y",
            "stage2-call2-x", "stage2-call2-y",
            "stage2-call3-x", "stage2-call3-y"
        ];
    }

    function stage3Ids() {
        return ["stage3-param1", "stage3-param2", "stage3-param3", "stage3-start", "stage3-end", "stage3-y"];
    }

    function stage4Ids() {
        return ["stage4-param1", "stage4-param2", "stage4-param3", "stage4-x", "stage4-start", "stage4-end"];
    }

    function stage5Ids() {
        return [
            "stage5-param1", "stage5-param2", "stage5-param3", "stage5-param4",
            "stage5-x", "stage5-y", "stage5-height", "stage5-width"
        ];
    }

    function renderStage1() {
        const xInput = document.getElementById("stage1-x");
        const yInput = document.getElementById("stage1-y");
        const x = readNumber("stage1-x");
        const y = readNumber("stage1-y");

        syncStage1Controls();

        xInput.disabled = stage1State.visibleBlocks < 1;
        yInput.disabled = stage1State.visibleBlocks < 2;

        const blocks = [];
        if (stage1State.visibleBlocks >= 1) {
            blocks.push({ type: "statement", text: "x_Koordinate = " + formatValue(x, "____") });
        }
        if (stage1State.visibleBlocks >= 2) {
            blocks.push({ type: "statement", text: "y_Koordinate = " + formatValue(y, "____") });
        }
        if (stage1State.visibleBlocks >= 3) {
            blocks.push({ type: "statement", text: "Zeichne einen Punkt an die Stelle (x_Koordinate, y_Koordinate)" });
        }

        if (blocks.length === 0) {
            setDiagramPlaceholder("diagram-stage1", "Starte mit dem ersten Baustein. Danach wächst dein Struktogramm Schritt für Schritt.");
        } else {
            renderDiagram("diagram-stage1", blocks);
        }

        const scene = { points: [] };
        const summaryLines = [];

        if (stage1State.visibleBlocks < 3) {
            summaryLines.push("Füge zuerst alle drei Bausteine hinzu: x-Variable, y-Variable und den Zeichenbefehl.");
        } else if (x === null || y === null) {
            summaryLines.push("Jetzt fehlen noch Werte. Erst mit beiden Variablen weiß der Zeichenbefehl, an welcher Stelle der Punkt liegt.");
        } else {
            scene.points.push({ x, y, color: cssVar("--point"), radius: 7 });
            summaryLines.push("Die Variable x_Koordinate steuert die waagerechte Lage, y_Koordinate die senkrechte Lage.");
            summaryLines.push("Mit x = " + formatValue(x, "") + " und y = " + formatValue(y, "") + " landet der Punkt bei (" + formatValue(x, "") + ", " + formatValue(y, "") + ").");
        }

        renderBoard(document.getElementById("board-stage1"), scene);
        setSummary("summary-stage1", "Was passiert?", summaryLines, [{ text: "Ein einzelner Punkt", className: "token-point" }]);
    }

    function syncStage1Controls() {
        document.getElementById("stage1-add-x").disabled = stage1State.visibleBlocks !== 0;
        document.getElementById("stage1-add-y").disabled = stage1State.visibleBlocks !== 1;
        document.getElementById("stage1-add-point").disabled = stage1State.visibleBlocks !== 2;
    }

    function renderStage2() {
        const param1 = readParam("stage2-param1");
        const param2 = readParam("stage2-param2");
        const calls = [
            { x: readNumber("stage2-call1-x"), y: readNumber("stage2-call1-y"), tone: "a", label: "1", color: cssVar("--call-a") },
            { x: readNumber("stage2-call2-x"), y: readNumber("stage2-call2-y"), tone: "b", label: "2", color: cssVar("--call-b") },
            { x: readNumber("stage2-call3-x"), y: readNumber("stage2-call3-y"), tone: "c", label: "3", color: cssVar("--call-c") }
        ];

        const blocks = [
            {
                type: "function",
                signature: "funktion punkt_zeichnen(" + param1 + ", " + param2 + ") {",
                body: [
                    { type: "statement", text: "Zeichne einen Punkt an die Stelle (" + param1 + ", " + param2 + ")" }
                ]
            },
            { type: "call", text: "punkt_zeichnen(" + formatValue(calls[0].x, "____") + ", " + formatValue(calls[0].y, "____") + ")", tone: "a", label: "Aufruf 1" },
            { type: "call", text: "punkt_zeichnen(" + formatValue(calls[1].x, "____") + ", " + formatValue(calls[1].y, "____") + ")", tone: "b", label: "Aufruf 2" },
            { type: "call", text: "punkt_zeichnen(" + formatValue(calls[2].x, "____") + ", " + formatValue(calls[2].y, "____") + ")", tone: "c", label: "Aufruf 3" }
        ];
        renderDiagram("diagram-stage2", blocks);

        const scene = { points: [] };
        calls.forEach(call => {
            if (call.x !== null && call.y !== null) {
                scene.points.push({ x: call.x, y: call.y, color: call.color, radius: 7, label: call.label });
            }
        });

        const summaryLines = [
            "Ein Funktionsblock reicht aus. Die drei Aufrufe darunter setzen nur unterschiedliche Werte in dieselben Übergabeparameter ein.",
            (hasRealParamNames([param1, param2])
                ? "Deine aktuellen Parameternamen sind " + param1 + " und " + param2 + "."
                : "Trage eigene Parameternamen ein. Im Struktogramm siehst du sofort, wie sie im Funktionskopf und in der Anweisung auftauchen.")
        ];

        setSummary("summary-stage2", "Warum ist die Funktion praktisch?", summaryLines, [
            { text: "Aufruf 1", className: "token-a" },
            { text: "Aufruf 2", className: "token-b" },
            { text: "Aufruf 3", className: "token-c" }
        ]);
        renderBoard(document.getElementById("board-stage2"), scene);
    }

    function renderStage3() {
        const param1 = readParam("stage3-param1");
        const param2 = readParam("stage3-param2");
        const param3 = readParam("stage3-param3");
        const start = readNumber("stage3-start");
        const end = readNumber("stage3-end");
        const y = readNumber("stage3-y");
        const points = generateHorizontalPoints(start, end, y);

        renderDiagram("diagram-stage3", [
            {
                type: "function",
                signature: "funktion waagerechte_strecke_zeichnen(" + param1 + ", " + param2 + ", " + param3 + ") {",
                body: [
                    { type: "statement", text: "x_Aktuell = " + param1 },
                    {
                        type: "loop",
                        condition: "x_Aktuell <= " + param2,
                        body: [
                            { type: "statement", text: "punkt_zeichnen(x_Aktuell, " + param3 + ")" },
                            { type: "statement", text: "x_Aktuell = x_Aktuell + 0.1" }
                        ]
                    }
                ]
            },
            {
                type: "call",
                text: "waagerechte_strecke_zeichnen(" + formatValue(start, "____") + ", " + formatValue(end, "____") + ", " + formatValue(y, "____") + ")",
                tone: "a",
                label: "Aufruf"
            }
        ]);

        const scene = { segments: [], points: [] };
        const summaryLines = [];

        if (points.length > 0) {
            scene.segments.push({ x1: start, y1: y, x2: end, y2: y, color: cssVar("--line-horizontal"), width: 9, opacity: 0.35 });
            scene.points = points.map(point => ({ x: point.x, y: point.y, color: cssVar("--point-seq"), radius: 3.6 }));
            summaryLines.push(points.length + " Punkte liegen dicht nebeneinander auf derselben Höhe y = " + formatValue(y, "") + ".");
            summaryLines.push("So wird aus einzelnen Punkten eine waagerechte Strecke von x = " + formatValue(start, "") + " bis x = " + formatValue(end, "") + ".");
        } else {
            summaryLines.push("Noch entsteht keine Strecke. Die Schleife zeichnet nur dann Punkte, wenn x_Start kleiner oder gleich x_Ziel ist.");
            summaryLines.push("Probiere zum Beispiel x_Start = 3 und x_Ziel = 6 aus.");
        }

        renderBoard(document.getElementById("board-stage3"), scene);
        setSummary("summary-stage3", "Von Punkten zur Strecke", summaryLines, [
            { text: "Einzelne Punkte", className: "token-point-seq" },
            { text: "Waagerechte Strecke", className: "token-line" }
        ]);
    }

    function renderStage4() {
        const param1 = readParam("stage4-param1");
        const param2 = readParam("stage4-param2");
        const param3 = readParam("stage4-param3");
        const x = readNumber("stage4-x");
        const start = readNumber("stage4-start");
        const end = readNumber("stage4-end");
        const points = generateVerticalPoints(x, start, end);

        renderDiagram("diagram-stage4", [
            {
                type: "function",
                signature: "funktion senkrechte_strecke_zeichnen(" + param1 + ", " + param2 + ", " + param3 + ") {",
                body: [
                    { type: "statement", text: "y_Aktuell = " + param2 },
                    {
                        type: "loop",
                        condition: "y_Aktuell <= " + param3,
                        body: [
                            { type: "statement", text: "punkt_zeichnen(" + param1 + ", y_Aktuell)" },
                            { type: "statement", text: "y_Aktuell = y_Aktuell + 0.1" }
                        ]
                    }
                ]
            },
            {
                type: "call",
                text: "senkrechte_strecke_zeichnen(" + formatValue(x, "____") + ", " + formatValue(start, "____") + ", " + formatValue(end, "____") + ")",
                tone: "b",
                label: "Aufruf"
            }
        ]);

        const scene = { segments: [], points: [] };
        const summaryLines = [];

        if (points.length > 0) {
            scene.segments.push({ x1: x, y1: start, x2: x, y2: end, color: cssVar("--line-vertical"), width: 9, opacity: 0.35 });
            scene.points = points.map(point => ({ x: point.x, y: point.y, color: cssVar("--point-seq"), radius: 3.6 }));
            summaryLines.push(points.length + " Punkte liegen untereinander auf derselben x-Position.");
            summaryLines.push("So wird aus vielen Punkten eine senkrechte Strecke bei x = " + formatValue(x, "") + ".");
        } else {
            summaryLines.push("Noch entsteht keine Strecke. Die Schleife startet nur, wenn y_Start kleiner oder gleich y_Ziel ist.");
            summaryLines.push("Probiere zum Beispiel y_Start = 2 und y_Ziel = 7 aus.");
        }

        renderBoard(document.getElementById("board-stage4"), scene);
        setSummary("summary-stage4", "Gleiche Idee, andere Richtung", summaryLines, [
            { text: "Einzelne Punkte", className: "token-point-seq" },
            { text: "Senkrechte Strecke", className: "token-line-vertical" }
        ]);
    }

    function renderStage5() {
        const param1 = readParam("stage5-param1");
        const param2 = readParam("stage5-param2");
        const param3 = readParam("stage5-param3");
        const param4 = readParam("stage5-param4");

        const x = readNumber("stage5-x");
        const y = readNumber("stage5-y");
        const height = readNumber("stage5-height");
        const width = readNumber("stage5-width");

        renderDiagram("diagram-stage5", [
            {
                type: "function",
                signature: "funktion rechteck_zeichnen(" + param1 + ", " + param2 + ", " + param3 + ", " + param4 + ") {",
                body: [
                    { type: "call", text: "waagerechte_strecke_zeichnen(" + param1 + ", " + param1 + " + " + param4 + ", " + param2 + ")", tone: "top", label: "oben" },
                    { type: "call", text: "waagerechte_strecke_zeichnen(" + param1 + ", " + param1 + " + " + param4 + ", " + param2 + " - " + param3 + ")", tone: "bottom", label: "unten" },
                    { type: "call", text: "senkrechte_strecke_zeichnen(" + param1 + ", " + param2 + " - " + param3 + ", " + param2 + ")", tone: "left", label: "links" },
                    { type: "call", text: "senkrechte_strecke_zeichnen(" + param1 + " + " + param4 + ", " + param2 + " - " + param3 + ", " + param2 + ")", tone: "right", label: "rechts" }
                ]
            },
            {
                type: "call",
                text: "rechteck_zeichnen(" + formatValue(x, "____") + ", " + formatValue(y, "____") + ", " + formatValue(height, "____") + ", " + formatValue(width, "____") + ")",
                tone: "a",
                label: "Aufruf"
            }
        ]);

        const scene = { rects: [], segments: [], points: [] };
        const summaryLines = [];
        const tokens = [];

        if ([x, y, height, width].every(isNumber)) {
            const top = generateHorizontalPoints(x, x + width, y);
            const bottom = generateHorizontalPoints(x, x + width, y - height);
            const left = generateVerticalPoints(x, y - height, y);
            const right = generateVerticalPoints(x + width, y - height, y);

            if (top.length && bottom.length && left.length && right.length) {
                scene.rects.push({ x, y: y - height, width, height, fill: cssVar("--rect-fill"), stroke: "transparent", strokeWidth: 0 });
                scene.segments.push(
                    { x1: x, y1: y, x2: x + width, y2: y, color: cssVar("--rect-top"), width: 6, opacity: 0.55 },
                    { x1: x, y1: y - height, x2: x + width, y2: y - height, color: cssVar("--rect-bottom"), width: 6, opacity: 0.55 },
                    { x1: x, y1: y - height, x2: x, y2: y, color: cssVar("--rect-left"), width: 6, opacity: 0.55 },
                    { x1: x + width, y1: y - height, x2: x + width, y2: y, color: cssVar("--rect-right"), width: 6, opacity: 0.55 }
                );

                scene.points = [
                    ...top.map(point => ({ x: point.x, y: point.y, color: cssVar("--rect-top"), radius: 2.9 })),
                    ...bottom.map(point => ({ x: point.x, y: point.y, color: cssVar("--rect-bottom"), radius: 2.9 })),
                    ...left.map(point => ({ x: point.x, y: point.y, color: cssVar("--rect-left"), radius: 2.9 })),
                    ...right.map(point => ({ x: point.x, y: point.y, color: cssVar("--rect-right"), radius: 2.9 }))
                ];

                summaryLines.push("Das Rechteck entsteht aus vier Teilstrecken: oben, unten, links und rechts.");
                summaryLines.push("Ausgangspunkt ist die obere linke Ecke bei (" + formatValue(x, "") + ", " + formatValue(y, "") + "). Breite = " + formatValue(width, "") + ", Höhe = " + formatValue(height, "") + ".");
                if (x + width > BOARD_MAX || y - height < 0) {
                    summaryLines.push("Ein Teil des Rechtecks liegt außerhalb des sichtbaren Koordinatensystems.");
                }

                tokens.push(
                    { text: "oben: waagerechte_strecke_zeichnen(" + formatValue(x, "") + ", " + formatValue(x + width, "") + ", " + formatValue(y, "") + ")", className: "token-top" },
                    { text: "unten: waagerechte_strecke_zeichnen(" + formatValue(x, "") + ", " + formatValue(x + width, "") + ", " + formatValue(y - height, "") + ")", className: "token-bottom" },
                    { text: "links: senkrechte_strecke_zeichnen(" + formatValue(x, "") + ", " + formatValue(y - height, "") + ", " + formatValue(y, "") + ")", className: "token-left" },
                    { text: "rechts: senkrechte_strecke_zeichnen(" + formatValue(x + width, "") + ", " + formatValue(y - height, "") + ", " + formatValue(y, "") + ")", className: "token-right" }
                );
            } else {
                summaryLines.push("Mit den aktuellen Werten kann noch kein vollständiges Rechteck entstehen. Achte darauf, dass Breite und Höhe positiv sind.");
            }
        } else {
            summaryLines.push("Setze Werte für x, y, Höhe und Breite ein. Danach zerlegt die Funktion das Rechteck in vier Strecken.");
        }

        renderBoard(document.getElementById("board-stage5"), scene);
        setSummary("summary-stage5", "So setzt sich das Rechteck zusammen", summaryLines, tokens);
    }

    function renderDiagram(containerId, blocks) {
        const container = document.getElementById(containerId);
        const stack = document.createElement("div");
        stack.className = "sg-stack";
        blocks.forEach(block => stack.appendChild(createBlock(block)));
        container.replaceChildren(stack);
    }

    function createBlock(block) {
        if (block.type === "statement") {
            return createStatement(block.text);
        }

        if (block.type === "call") {
            const element = createStatement(block.text, ["sg-call", toneClass(block.tone)]);
            const tag = document.createElement("span");
            tag.className = "sg-tag";
            tag.textContent = block.label || "Aufruf";
            element.prepend(tag);
            return element;
        }

        if (block.type === "function") {
            const wrapper = document.createElement("div");
            wrapper.className = "sg-block sg-function";

            const header = document.createElement("div");
            header.className = "sg-function-header";
            header.textContent = block.signature;

            const body = document.createElement("div");
            body.className = "sg-function-body";
            block.body.forEach(child => body.appendChild(createBlock(child)));

            const footer = document.createElement("div");
            footer.className = "sg-function-footer";
            footer.textContent = "}";

            wrapper.append(header, body, footer);
            return wrapper;
        }

        if (block.type === "loop") {
            const wrapper = document.createElement("div");
            wrapper.className = "sg-block sg-loop";

            const header = document.createElement("div");
            header.className = "sg-loop-header";
            header.textContent = "SOLANGE " + block.condition;

            const body = document.createElement("div");
            body.className = "sg-loop-body";
            block.body.forEach(child => body.appendChild(createBlock(child)));

            wrapper.append(header, body);
            return wrapper;
        }

        return createStatement(String(block.text || ""));
    }

    function createStatement(text, extraClasses) {
        const statement = document.createElement("div");
        statement.className = ["sg-block", "sg-statement"].concat(extraClasses || []).filter(Boolean).join(" ");
        const content = document.createElement("span");
        content.textContent = text;
        statement.appendChild(content);
        return statement;
    }

    function setDiagramPlaceholder(containerId, text) {
        const container = document.getElementById(containerId);
        const placeholder = document.createElement("div");
        placeholder.className = "diagram-empty";
        placeholder.textContent = text;
        container.replaceChildren(placeholder);
    }

    function renderBoard(svg, scene) {
        const size = 420;
        const padding = 34;
        const inner = size - padding * 2;

        svg.setAttribute("viewBox", "0 0 " + size + " " + size);
        svg.replaceChildren();

        for (let step = 0; step <= BOARD_MAX * 2; step += 1) {
            const value = step / 2;
            const x = mapX(value, padding, inner);
            const y = mapY(value, padding, inner);
            const className = Number.isInteger(value) ? "grid-line major" : "grid-line minor";
            svg.appendChild(createSvg("line", { x1: x, y1: padding, x2: x, y2: size - padding, class: className }));
            svg.appendChild(createSvg("line", { x1: padding, y1: y, x2: size - padding, y2: y, class: className }));
        }

        svg.appendChild(createSvg("line", { x1: padding, y1: size - padding, x2: padding, y2: padding - 8, class: "axis-line" }));
        svg.appendChild(createSvg("line", { x1: padding, y1: size - padding, x2: size - padding + 8, y2: size - padding, class: "axis-line" }));
        svg.appendChild(createSvg("polygon", { points: (padding - 10) + "," + (padding + 2) + " " + padding + "," + (padding - 14) + " " + (padding + 10) + "," + (padding + 2), class: "axis-arrow" }));
        svg.appendChild(createSvg("polygon", { points: (size - padding - 2) + "," + (size - padding - 10) + " " + (size - padding + 14) + "," + (size - padding) + " " + (size - padding - 2) + "," + (size - padding + 10), class: "axis-arrow" }));

        for (let value = 0; value <= BOARD_MAX; value += 1) {
            const x = mapX(value, padding, inner);
            const y = mapY(value, padding, inner);
            svg.appendChild(createSvg("text", { x, y: size - padding + 18, class: "axis-number", "text-anchor": "middle" }, String(value)));
            svg.appendChild(createSvg("text", { x: padding - 14, y: y + 4, class: "axis-number", "text-anchor": "end" }, String(value)));
        }

        svg.appendChild(createSvg("text", { x: size - padding + 16, y: size - padding + 36, class: "axis-label", "text-anchor": "middle" }, "X"));
        svg.appendChild(createSvg("text", { x: padding - 22, y: padding - 4, class: "axis-label", "text-anchor": "middle" }, "Y"));

        (scene.rects || []).forEach(rect => {
            svg.appendChild(createSvg("rect", {
                x: mapX(rect.x, padding, inner),
                y: mapY(rect.y + rect.height, padding, inner),
                width: scaleLength(rect.width, inner),
                height: scaleLength(rect.height, inner),
                fill: rect.fill,
                stroke: rect.stroke,
                "stroke-width": rect.strokeWidth
            }));
        });

        (scene.segments || []).forEach(segment => {
            svg.appendChild(createSvg("line", {
                x1: mapX(segment.x1, padding, inner),
                y1: mapY(segment.y1, padding, inner),
                x2: mapX(segment.x2, padding, inner),
                y2: mapY(segment.y2, padding, inner),
                stroke: segment.color,
                "stroke-width": segment.width,
                "stroke-linecap": "round",
                opacity: segment.opacity == null ? 1 : segment.opacity,
                class: "board-segment"
            }));
        });

        (scene.points || []).forEach(point => {
            svg.appendChild(createSvg("circle", {
                cx: mapX(point.x, padding, inner),
                cy: mapY(point.y, padding, inner),
                r: point.radius || 5,
                fill: point.color,
                class: "board-point"
            }));

            if (point.label) {
                svg.appendChild(createSvg("text", {
                    x: mapX(point.x, padding, inner),
                    y: mapY(point.y, padding, inner),
                    class: "board-label"
                }, point.label));
            }
        });
    }

    function setSummary(containerId, title, lines, tokens) {
        const container = document.getElementById(containerId);
        container.replaceChildren();

        const heading = document.createElement("h4");
        heading.textContent = title;
        container.appendChild(heading);

        lines.forEach(line => {
            const paragraph = document.createElement("p");
            paragraph.textContent = line;
            container.appendChild(paragraph);
        });

        if (tokens && tokens.length > 0) {
            const tokenRow = document.createElement("div");
            tokenRow.className = "token-row";
            tokens.forEach(token => {
                const pill = document.createElement("span");
                pill.className = ["token", token.className].filter(Boolean).join(" ");
                pill.textContent = token.text;
                tokenRow.appendChild(pill);
            });
            container.appendChild(tokenRow);
        }
    }

    function generateHorizontalPoints(start, end, y) {
        if (![start, end, y].every(isNumber) || start > end) {
            return [];
        }

        const points = [];
        let current = roundToTenth(start);
        let guard = 0;
        while (current <= roundToTenth(end) + 0.0001 && guard < 500) {
            points.push({ x: current, y });
            current = roundToTenth(current + 0.1);
            guard += 1;
        }
        return points;
    }

    function generateVerticalPoints(x, start, end) {
        if (![x, start, end].every(isNumber) || start > end) {
            return [];
        }

        const points = [];
        let current = roundToTenth(start);
        let guard = 0;
        while (current <= roundToTenth(end) + 0.0001 && guard < 500) {
            points.push({ x, y: current });
            current = roundToTenth(current + 0.1);
            guard += 1;
        }
        return points;
    }

    function readParam(id) {
        const value = document.getElementById(id).value.trim();
        return value || "____";
    }

    function readNumber(id) {
        const raw = document.getElementById(id).value.trim();
        if (raw === "") {
            return null;
        }

        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatValue(value, fallback) {
        if (!isNumber(value)) {
            return fallback;
        }

        if (Number.isInteger(value)) {
            return String(value);
        }

        return String(roundToTenth(value));
    }

    function hasRealParamNames(paramNames) {
        return paramNames.every(name => name !== "____");
    }

    function toneClass(tone) {
        return tone ? "tone-" + tone : "";
    }

    function isNumber(value) {
        return typeof value === "number" && Number.isFinite(value);
    }

    function roundToTenth(value) {
        return Math.round(value * 10) / 10;
    }

    function mapX(value, padding, inner) {
        return padding + (value / BOARD_MAX) * inner;
    }

    function mapY(value, padding, inner) {
        return padding + inner - (value / BOARD_MAX) * inner;
    }

    function scaleLength(length, inner) {
        return (length / BOARD_MAX) * inner;
    }

    function createSvg(tag, attrs, text) {
        const element = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });
        if (text) {
            element.textContent = text;
        }
        return element;
    }

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
})();