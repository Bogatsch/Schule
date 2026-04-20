/* ==========================================================================
   Theoretische Grundlagen – Klasse 11 – Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ========== Accordion Toggle ==========
    document.querySelectorAll('.lerninsel-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('collapsed');
        });
    });

    // ========== 1. Zahlensystem-Umrechner ==========
    const convDec = document.getElementById('conv-dec');
    const convBin = document.getElementById('conv-bin');
    const convHex = document.getElementById('conv-hex');

    function sanitize(str) {
        return str.replace(/[<>"'&]/g, '');
    }

    function updateConverter(source) {
        const val = sanitize(source.value.trim());
        if (!val) {
            [convDec, convBin, convHex].forEach(f => { if (f !== source) f.value = ''; });
            return;
        }
        let num;
        const base = parseInt(source.dataset.base);
        if (base === 10) num = parseInt(val, 10);
        else if (base === 2) num = parseInt(val.replace(/\s/g, ''), 2);
        else num = parseInt(val.replace(/\s/g, ''), 16);

        if (isNaN(num) || num < 0 || num > 0xFFFFFFFF) {
            [convDec, convBin, convHex].forEach(f => { if (f !== source) f.value = '—'; });
            return;
        }
        if (source !== convDec) convDec.value = num;
        if (source !== convBin) convBin.value = (num >>> 0).toString(2);
        if (source !== convHex) convHex.value = (num >>> 0).toString(16).toUpperCase();
    }

    [convDec, convBin, convHex].forEach(input => {
        input.addEventListener('input', () => updateConverter(input));
    });

    // ========== Bit Field ==========
    const bitButtons = document.getElementById('bit-buttons');
    const bitResultDec = document.getElementById('bit-result-dec');
    const bitResultHex = document.getElementById('bit-result-hex');

    for (let i = 7; i >= 0; i--) {
        const btn = document.createElement('button');
        btn.className = 'bit-btn';
        btn.textContent = '0';
        btn.dataset.bit = i;
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? '1' : '0';
            updateBitResult();
        });
        bitButtons.appendChild(btn);
    }

    function updateBitResult() {
        let val = 0;
        bitButtons.querySelectorAll('.bit-btn').forEach(btn => {
            if (btn.classList.contains('active')) val += (1 << parseInt(btn.dataset.bit));
        });
        bitResultDec.textContent = val;
        bitResultHex.textContent = val.toString(16).toUpperCase();
    }

    // ========== 2. Zweierkomplement ==========
    document.getElementById('twos-calc').addEventListener('click', () => {
        const input = parseInt(document.getElementById('twos-input').value);
        const result = document.getElementById('twos-result');
        if (isNaN(input) || input < -128 || input > 127) {
            result.innerHTML = '<div class="result-box">Bitte eine Zahl zwischen -128 und 127 eingeben.</div>';
            return;
        }
        const unsigned = input < 0 ? (256 + input) : input;
        const bits = unsigned.toString(2).padStart(8, '0');
        const formatted = bits.slice(0, 4) + ' ' + bits.slice(4);

        let html = '<div class="result-box">';
        html += `<span class="result-label">Dezimal</span><span class="result-value">${escapeHtml(String(input))}</span><br>`;
        html += `<span class="result-label">Binär (8 Bit, Zweierkomplement)</span><span class="result-value">${escapeHtml(formatted)}</span><br>`;
        html += `<span class="result-label">Hex</span><span class="result-value">${escapeHtml(unsigned.toString(16).toUpperCase().padStart(2, '0'))}</span>`;

        if (input < 0) {
            const pos = (-input).toString(2).padStart(8, '0');
            const inv = pos.split('').map(b => b === '0' ? '1' : '0').join('');
            html += '<br><br><span class="result-label">Rechenweg</span>';
            html += `<br>|${escapeHtml(String(-input))}| = ${escapeHtml(pos.slice(0,4))} ${escapeHtml(pos.slice(4))}`;
            html += `<br>Invertiert: ${escapeHtml(inv.slice(0,4))} ${escapeHtml(inv.slice(4))}`;
            html += `<br>+1: <span class="result-value">${escapeHtml(formatted)}</span>`;
        }
        html += '</div>';
        result.innerHTML = html;
    });

    // ========== IEEE 754 ==========
    document.getElementById('ieee-calc').addEventListener('click', () => {
        const input = parseFloat(document.getElementById('ieee-input').value);
        const result = document.getElementById('ieee-result');
        if (isNaN(input)) {
            result.innerHTML = '<div class="result-box">Bitte eine gültige Zahl eingeben.</div>';
            return;
        }

        const buf = new ArrayBuffer(4);
        new Float32Array(buf)[0] = input;
        const int = new Uint32Array(buf)[0];
        const bits = int.toString(2).padStart(32, '0');

        const sign = bits[0];
        const exp = bits.slice(1, 9);
        const mantissa = bits.slice(9);
        const expVal = parseInt(exp, 2);
        const bias = 127;

        let html = '<div class="result-box">';
        html += `<span class="result-label">Dezimal</span><span class="result-value">${escapeHtml(String(input))}</span><br>`;
        html += '<span class="result-label">IEEE 754 (32 Bit)</span><br>';
        html += `<div class="bit-vis"><span class="sign">${escapeHtml(sign)}</span> <span class="exp">${escapeHtml(exp)}</span> <span class="man">${escapeHtml(mantissa)}</span></div>`;
        html += `<span class="result-label" style="margin-top:8px">Vorzeichen: ${sign === '0' ? '+' : '−'} | Exponent: ${escapeHtml(String(expVal))} (${escapeHtml(String(expVal))} − ${bias} = ${escapeHtml(String(expVal - bias))}) | Mantisse: 1.${escapeHtml(mantissa)}</span>`;
        html += '</div>';
        html += '<div style="margin-top:6px;font-size:0.8rem;color:var(--text-muted)">Legende: <span style="color:var(--accent-red)">Vorzeichen</span> <span style="color:var(--accent-orange)">Exponent</span> <span style="color:var(--accent-green)">Mantisse</span></div>';
        result.innerHTML = html;
    });

    // ========== 3. Binäre Addition / Subtraktion ==========
    document.getElementById('op-calc').addEventListener('click', () => {
        const a = parseInt(document.getElementById('op-a').value);
        const b = parseInt(document.getElementById('op-b').value);
        const op = document.getElementById('op-type').value;
        const result = document.getElementById('op-result');

        if (isNaN(a) || isNaN(b) || a < -128 || a > 127 || b < -128 || b > 127) {
            result.innerHTML = '<div class="result-box">Bitte Zahlen zwischen -128 und 127 eingeben.</div>';
            return;
        }

        const res = op === 'add' ? a + b : a - b;
        const toTwos = n => ((n % 256) + 256) % 256;
        const fmt = n => { const s = toTwos(n).toString(2).padStart(8, '0'); return s.slice(0,4) + ' ' + s.slice(4); };

        let bVal = op === 'sub' ? -b : b;

        let html = '<div class="result-box">';
        html += `<span class="result-label">${escapeHtml(String(a))} ${op === 'add' ? '+' : '−'} ${escapeHtml(String(b))} = ${escapeHtml(String(res))}</span><br><br>`;
        html += `<span class="result-label">A (Zweierkomplement)</span> ${escapeHtml(fmt(a))}<br>`;
        if (op === 'sub') {
            html += `<span class="result-label">B</span> ${escapeHtml(fmt(b))}<br>`;
            html += `<span class="result-label">−B (Zweierkomplement)</span> ${escapeHtml(fmt(-b))}<br>`;
        } else {
            html += `<span class="result-label">B (Zweierkomplement)</span> ${escapeHtml(fmt(b))}<br>`;
        }
        html += `<span class="result-label">A + ${op === 'sub' ? '(−B)' : 'B'}</span>`;
        html += ` <span class="result-value">${escapeHtml(fmt(res))}</span>`;
        html += ` = <span class="result-value">${escapeHtml(String(res))}</span>`;

        if (res > 127 || res < -128) {
            html += '<br><span style="color:var(--accent-red)">⚠ Überlauf!</span>';
        }
        html += '</div>';
        result.innerHTML = html;
    });

    // ========== 4. Zeichenkodierung ==========
    const charInput = document.getElementById('char-input');
    charInput.addEventListener('input', () => {
        const text = charInput.value;
        const result = document.getElementById('char-result');
        if (!text) { result.innerHTML = ''; return; }

        let html = '<div class="result-box">';
        for (let i = 0; i < text.length && i < 20; i++) {
            const ch = text[i];
            const code = ch.codePointAt(0);
            const displayChar = escapeHtml(ch);
            html += `<div style="margin-bottom:6px">`;
            html += `<span style="font-size:1.3em;color:var(--accent-light)">${displayChar}</span> `;
            html += `<span class="result-label" style="display:inline">Dezimal: ${code} | Hex: U+${code.toString(16).toUpperCase().padStart(4,'0')} | Binär: ${code.toString(2).padStart(8,'0')}</span>`;
            html += `</div>`;
        }
        html += '</div>';
        result.innerHTML = html;
    });

    // ASCII Table
    const asciiTable = document.getElementById('ascii-table');
    for (let i = 32; i < 127; i++) {
        const cell = document.createElement('div');
        cell.className = 'ascii-cell';
        cell.innerHTML = `<span class="ascii-char">${escapeHtml(String.fromCharCode(i))}</span>${i}`;
        cell.title = `Dezimal: ${i}\nHex: 0x${i.toString(16).toUpperCase()}\nBinär: ${i.toString(2).padStart(7, '0')}`;
        asciiTable.appendChild(cell);
    }

    // ========== 5. Interactive Gates ==========
    document.querySelectorAll('.gate-input-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = btn.dataset.state === '0' ? '1' : '0';
            btn.dataset.state = state;
            const label = btn.textContent.split(':')[0];
            btn.textContent = `${label}: ${state}`;
            updateGate(btn.closest('.gate-sim'));
        });
    });

    function updateGate(gateSim) {
        const gateName = gateSim.dataset.gate;
        const inputs = Array.from(gateSim.querySelectorAll('.gate-input-btn')).map(b => parseInt(b.dataset.state));
        let out;
        switch (gateName) {
            case 'NOT':  out = 1 - inputs[0]; break;
            case 'AND':  out = inputs[0] & inputs[1]; break;
            case 'OR':   out = inputs[0] | inputs[1]; break;
            case 'XOR':  out = inputs[0] ^ inputs[1]; break;
            case 'NAND': out = 1 - (inputs[0] & inputs[1]); break;
            case 'NOR':  out = 1 - (inputs[0] | inputs[1]); break;
        }
        gateSim.querySelector('.gate-out').textContent = out;
    }

    // Init gates
    document.querySelectorAll('.gate-sim').forEach(g => updateGate(g));

    // ========== Boolean Expression Evaluator ==========
    document.getElementById('bool-calc').addEventListener('click', () => {
        const exprRaw = document.getElementById('bool-expr').value.trim().toUpperCase();
        const resultDiv = document.getElementById('bool-result');

        if (!exprRaw) { resultDiv.innerHTML = ''; return; }

        // Extract variables (single uppercase letters)
        const vars = [...new Set(exprRaw.match(/[A-Z]/g) || [])].filter(
            v => !['A','N','D','O','R','X','T'].includes(v) || 
                 !exprRaw.includes(v === 'A' ? 'AND' : v === 'O' ? 'OR' : v === 'N' ? 'NOT' : v === 'X' ? 'XOR' : '__')
        );
        
        // Better variable extraction: find single letters not part of keywords
        const keywords = ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'];
        let cleaned = exprRaw;
        keywords.forEach(k => { cleaned = cleaned.split(k).join(' '); });
        const variables = [...new Set(cleaned.match(/[A-Z]/g) || [])].sort();

        if (variables.length === 0 || variables.length > 5) {
            resultDiv.innerHTML = '<div class="result-box">Bitte einen gültigen Ausdruck mit 1–5 Variablen eingeben.</div>';
            return;
        }

        // Build truth table
        const rows = 1 << variables.length;
        let html = '<table class="result-table"><thead><tr>';
        variables.forEach(v => html += `<th>${escapeHtml(v)}</th>`);
        html += '<th>Ergebnis</th></tr></thead><tbody>';

        const minterms = [];

        for (let i = 0; i < rows; i++) {
            html += '<tr>';
            const vals = {};
            variables.forEach((v, j) => {
                const bit = (i >> (variables.length - 1 - j)) & 1;
                vals[v] = bit;
                html += `<td>${bit}</td>`;
            });

            try {
                const out = evalBool(exprRaw, vals);
                html += `<td class="${out ? 'out-1' : 'out-0'}">${out ? 1 : 0}</td>`;
                if (out) minterms.push(i);
            } catch {
                html += '<td>?</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';

        // DNF
        if (minterms.length > 0 && minterms.length < rows) {
            const dnfTerms = minterms.map(m => {
                return '(' + variables.map((v, j) => {
                    return ((m >> (variables.length - 1 - j)) & 1) ? v : '¬' + v;
                }).join(' ∧ ') + ')';
            });
            html += `<div class="result-box" style="margin-top:10px"><span class="result-label">DNF</span><span class="result-value">${escapeHtml(dnfTerms.join(' ∨ '))}</span></div>`;
        }

        resultDiv.innerHTML = html;
    });

    function evalBool(expr, vars) {
        // Tokenize and evaluate boolean expression
        let s = expr;
        // Replace variable names with values
        for (const [k, v] of Object.entries(vars)) {
            s = s.replace(new RegExp(`(?<![A-Z])${k}(?![A-Z])`, 'g'), v ? 'T' : 'F');
        }
        // Replace operators
        s = s.replace(/\bNAND\b/g, ' NAND ');
        s = s.replace(/\bNOR\b/g, ' NOR ');
        s = s.replace(/\bAND\b/g, ' AND ');
        s = s.replace(/\bOR\b/g, ' OR ');
        s = s.replace(/\bXOR\b/g, ' XOR ');
        s = s.replace(/\bNOT\b/g, ' NOT ');

        return parseBoolExpr(s.trim());
    }

    function parseBoolExpr(s) {
        const tokens = tokenize(s);
        let pos = 0;

        function peek() { return tokens[pos]; }
        function consume() { return tokens[pos++]; }

        function parseOr() {
            let left = parseXor();
            while (peek() === 'OR') { consume(); left = left | parseXor(); }
            return left;
        }
        function parseXor() {
            let left = parseAnd();
            while (peek() === 'XOR') { consume(); left = left ^ parseAnd(); }
            return left;
        }
        function parseAnd() {
            let left = parseNandNor();
            while (peek() === 'AND') { consume(); left = left & parseNandNor(); }
            return left;
        }
        function parseNandNor() {
            let left = parseNot();
            while (peek() === 'NAND' || peek() === 'NOR') {
                const op = consume();
                const right = parseNot();
                left = op === 'NAND' ? (1 - (left & right)) : (1 - (left | right));
            }
            return left;
        }
        function parseNot() {
            if (peek() === 'NOT') { consume(); return 1 - parseNot(); }
            return parsePrimary();
        }
        function parsePrimary() {
            const t = consume();
            if (t === '(') {
                const val = parseOr();
                consume(); // ')'
                return val;
            }
            if (t === 'T') return 1;
            if (t === 'F') return 0;
            return 0;
        }

        return parseOr();
    }

    function tokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            if (s[i] === ' ') { i++; continue; }
            if (s[i] === '(' || s[i] === ')') { tokens.push(s[i]); i++; continue; }
            if (s[i] === 'T' || s[i] === 'F') { tokens.push(s[i]); i++; continue; }
            let word = '';
            while (i < s.length && s[i] !== ' ' && s[i] !== '(' && s[i] !== ')') { word += s[i]; i++; }
            if (word) tokens.push(word);
        }
        return tokens;
    }

    // ========== 6. Schaltnetz-Synthese ==========
    let synthData = null;

    document.getElementById('synth-generate').addEventListener('click', () => {
        const numVars = parseInt(document.getElementById('synth-vars').value);
        const varNames = 'ABCD'.slice(0, numVars).split('');
        const rows = 1 << numVars;
        synthData = { numVars, varNames, outputs: new Array(rows).fill(0) };

        let html = '<table class="result-table"><thead><tr>';
        varNames.forEach(v => html += `<th>${escapeHtml(v)}</th>`);
        html += '<th>Y</th></tr></thead><tbody>';

        for (let i = 0; i < rows; i++) {
            html += '<tr>';
            varNames.forEach((_, j) => {
                html += `<td>${(i >> (numVars - 1 - j)) & 1}</td>`;
            });
            html += `<td><button class="synth-output-btn" data-row="${i}">0</button></td></tr>`;
        }
        html += '</tbody></table>';

        document.getElementById('synth-table').innerHTML = html;
        document.getElementById('synth-solve').style.display = 'inline-block';
        document.getElementById('synth-result').innerHTML = '';

        // Bind toggle buttons
        document.querySelectorAll('.synth-output-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = parseInt(btn.dataset.row);
                synthData.outputs[row] = 1 - synthData.outputs[row];
                btn.textContent = synthData.outputs[row];
                btn.classList.toggle('active', synthData.outputs[row] === 1);
            });
        });
    });

    document.getElementById('synth-solve').addEventListener('click', () => {
        if (!synthData) return;
        const { numVars, varNames, outputs } = synthData;
        const resultDiv = document.getElementById('synth-result');

        const minterms = [];
        outputs.forEach((v, i) => { if (v) minterms.push(i); });

        if (minterms.length === 0) {
            resultDiv.innerHTML = '<div class="result-box"><span class="result-value">Y = 0</span> (kein Ausgang ist 1)</div>';
            return;
        }
        if (minterms.length === (1 << numVars)) {
            resultDiv.innerHTML = '<div class="result-box"><span class="result-value">Y = 1</span> (alle Ausgänge sind 1)</div>';
            return;
        }

        const dnfTerms = minterms.map(m => {
            return '(' + varNames.map((v, j) => {
                return ((m >> (numVars - 1 - j)) & 1) ? v : '¬' + v;
            }).join(' ∧ ') + ')';
        });
        const dnf = dnfTerms.join(' ∨ ');

        let html = '<div class="result-box">';
        html += `<span class="result-label">Disjunktive Normalform (DNF)</span>`;
        html += `<span class="result-value">${escapeHtml(dnf)}</span>`;
        html += `<br><br><span class="result-label">Minterme</span>`;
        html += `m(${escapeHtml(minterms.join(', '))})`;
        html += '</div>';
        resultDiv.innerHTML = html;
    });

    // Generate initial synth table
    document.getElementById('synth-generate').click();

    // ========== Utility ==========
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // Smooth scroll for nav
    document.querySelectorAll('.nav-pill').forEach(pill => {
        pill.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(pill.getAttribute('href'));
            if (target) {
                target.classList.remove('collapsed');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
