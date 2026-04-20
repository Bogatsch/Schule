// ==========================================================================
// Algorithmen & Grundstrukturen – Interaktives Script
// ==========================================================================

(function () {
  'use strict';

  // ===== ACCORDION =====
  document.querySelectorAll('.lerninsel-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('collapsed');
    });
  });

  // ===== MINI JAVA PARSER =====
  // Parses a simplified Java-like syntax into an AST for Struktogramm rendering + simulation.
  function parseCode(code) {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return parseBlock(lines, 0).nodes;
  }

  function parseBlock(lines, start) {
    const nodes = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (line === '}') { return { nodes, end: i }; }

      // while loop
      const whileMatch = line.match(/^while\s*\((.+)\)\s*\{?\s*$/);
      if (whileMatch) {
        const body = parseBlock(lines, i + 1);
        nodes.push({ type: 'while', condition: whileMatch[1].trim(), body: body.nodes, src: line });
        i = body.end + 1;
        continue;
      }

      // if / else if / else
      const ifMatch = line.match(/^(else\s+)?if\s*\((.+)\)\s*\{?\s*$/);
      if (ifMatch) {
        const cond = ifMatch[2].trim();
        const isElseIf = !!ifMatch[1];
        const bodyTrue = parseBlock(lines, i + 1);
        let bodyFalse = { nodes: [], end: bodyTrue.end };
        const nextIdx = bodyTrue.end + 1;
        if (nextIdx < lines.length) {
          const nextLine = lines[nextIdx].trim();
          if (nextLine.match(/^else\s+if\s*\(/)) {
            bodyFalse = parseBlock(lines, nextIdx);
            // wrap remaining as a single else-if chain node
            const remaining = parseBlock(lines, nextIdx);
            bodyFalse = { nodes: remaining.nodes, end: remaining.end };
          } else if (nextLine.match(/^else\s*\{?\s*$/)) {
            bodyFalse = parseBlock(lines, nextIdx + 1);
          }
        }
        nodes.push({
          type: 'if', condition: cond,
          bodyTrue: bodyTrue.nodes, bodyFalse: bodyFalse.nodes,
          src: line, isElseIf
        });
        i = bodyFalse.end + 1;
        continue;
      }

      // else (standalone, should be consumed above)
      if (line.match(/^else\s*\{?\s*$/)) {
        i++;
        continue;
      }

      // function definition
      const funcMatch = line.match(/^(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{?\s*$/);
      if (funcMatch && !line.startsWith('if') && !line.startsWith('while') && !line.startsWith('else')) {
        const retType = funcMatch[1];
        const fname = funcMatch[2];
        const params = funcMatch[3];
        const body = parseBlock(lines, i + 1);
        nodes.push({ type: 'function', name: fname, returnType: retType, params, body: body.nodes, src: line });
        i = body.end + 1;
        continue;
      }

      // return statement
      const retMatch = line.match(/^return\s+(.+);?$/);
      if (retMatch) {
        nodes.push({ type: 'return', expr: retMatch[1].replace(/;$/, '').trim(), src: line });
        i++;
        continue;
      }

      // assignment / declaration / expression statement
      nodes.push({ type: 'statement', text: line.replace(/;$/, '').trim(), src: line });
      i++;
    }
    return { nodes, end: i };
  }

  // ===== STRUKTOGRAMM RENDERER =====
  function renderStruktogramm(container, nodes, options) {
    options = options || {};
    const block = document.createElement('div');
    block.className = 'strukt-block';
    nodes.forEach((node, idx) => {
      block.appendChild(renderNode(node, options, idx));
    });
    container.innerHTML = '';
    container.appendChild(block);
    return block;
  }

  function renderNode(node, options, nodeIndex) {
    options = options || {};
    const activeIndex = options.activeIndex;
    const activeType = options.activeType;
    const activeBranch = options.activeBranch;

    switch (node.type) {
      case 'statement':
      case 'return': {
        const div = document.createElement('div');
        div.className = 'strukt-statement';
        div.textContent = node.type === 'return' ? 'return ' + node.expr : node.text;
        if (nodeIndex === activeIndex && activeType === 'statement') div.classList.add('active');
        div.dataset.nodeIndex = nodeIndex;
        return div;
      }
      case 'if': return renderBranch(node, options, nodeIndex);
      case 'while': return renderLoop(node, options, nodeIndex);
      case 'function': return renderFunction(node, options, nodeIndex);
      default: {
        const div = document.createElement('div');
        div.className = 'strukt-statement';
        div.textContent = node.text || node.src || '';
        return div;
      }
    }
  }

  function renderBranch(node, options, nodeIndex) {
    const wrap = document.createElement('div');
    wrap.className = 'strukt-branch';

    const condDiv = document.createElement('div');
    condDiv.className = 'strukt-branch-condition';
    condDiv.textContent = node.condition;
    if (nodeIndex === options.activeIndex && options.activeType === 'branch-cond') condDiv.classList.add('active');
    wrap.appendChild(condDiv);

    // Triangle
    const tri = document.createElement('div');
    tri.className = 'strukt-branch-triangle';
    wrap.appendChild(tri);

    // Labels
    const labels = document.createElement('div');
    labels.className = 'strukt-branch-labels';
    const lblTrue = document.createElement('div');
    lblTrue.className = 'strukt-branch-label-true';
    lblTrue.textContent = 'Ja';
    const lblFalse = document.createElement('div');
    lblFalse.className = 'strukt-branch-label-false';
    lblFalse.textContent = 'Nein';
    labels.appendChild(lblTrue);
    labels.appendChild(lblFalse);
    wrap.appendChild(labels);

    // Bodies
    const bodies = document.createElement('div');
    bodies.className = 'strukt-branch-bodies';

    const bodyTrue = document.createElement('div');
    bodyTrue.className = 'strukt-branch-body-true';
    if (node.bodyTrue.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'strukt-statement';
      empty.textContent = '—';
      bodyTrue.appendChild(empty);
    } else {
      node.bodyTrue.forEach((child, ci) => {
        const el = renderNode(child, options, child._flatIndex != null ? child._flatIndex : undefined);
        if (options.activeBranch === 'true' && nodeIndex === options.activeIndex && options.activeType === 'branch-body') {
          el.classList.add('active-true');
        }
        bodyTrue.appendChild(el);
      });
    }

    const bodyFalse = document.createElement('div');
    bodyFalse.className = 'strukt-branch-body-false';
    if (node.bodyFalse.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'strukt-statement';
      empty.textContent = '—';
      bodyFalse.appendChild(empty);
    } else {
      node.bodyFalse.forEach((child, ci) => {
        const el = renderNode(child, options, child._flatIndex != null ? child._flatIndex : undefined);
        if (options.activeBranch === 'false' && nodeIndex === options.activeIndex && options.activeType === 'branch-body') {
          el.classList.add('active-false');
        }
        bodyFalse.appendChild(el);
      });
    }

    bodies.appendChild(bodyTrue);
    bodies.appendChild(bodyFalse);
    wrap.appendChild(bodies);
    return wrap;
  }

  function renderLoop(node, options, nodeIndex) {
    const wrap = document.createElement('div');
    wrap.className = 'strukt-loop';

    const condDiv = document.createElement('div');
    condDiv.className = 'strukt-loop-condition';
    condDiv.textContent = 'solange ' + node.condition;
    if (nodeIndex === options.activeIndex && options.activeType === 'loop-cond') {
      condDiv.classList.add('active');
    }
    wrap.appendChild(condDiv);

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'strukt-loop-body';
    node.body.forEach((child, ci) => {
      bodyDiv.appendChild(renderNode(child, options, child._flatIndex != null ? child._flatIndex : undefined));
    });
    wrap.appendChild(bodyDiv);
    return wrap;
  }

  function renderFunction(node, options, nodeIndex) {
    const wrap = document.createElement('div');
    wrap.className = 'strukt-function';

    const header = document.createElement('div');
    header.className = 'strukt-function-header';
    header.textContent = node.returnType + ' ' + node.name + '(' + node.params + ')';
    wrap.appendChild(header);

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'strukt-loop-body'; // reuse indented style
    node.body.forEach((child) => {
      bodyDiv.appendChild(renderNode(child, options, child._flatIndex != null ? child._flatIndex : undefined));
    });
    wrap.appendChild(bodyDiv);
    return wrap;
  }

  // ===== MINI INTERPRETER =====
  function createInterpreter(code) {
    const ast = parseCode(code);
    const vars = {};
    const steps = [];
    const output = [];

    // Flatten AST into execution steps
    function flatten(nodes) {
      nodes.forEach(node => {
        switch (node.type) {
          case 'statement':
            steps.push({ action: 'exec', node });
            break;
          case 'return':
            steps.push({ action: 'return', node });
            break;
          case 'if':
            steps.push({ action: 'eval-if', node });
            // We'll dynamically decide which branch at runtime
            break;
          case 'while':
            steps.push({ action: 'eval-while', node });
            break;
          case 'function':
            steps.push({ action: 'define-func', node });
            break;
        }
      });
    }
    flatten(ast);

    return { ast, vars, steps, output };
  }

  // Simple expression evaluator
  function evalExpr(expr, vars) {
    // Sanitize: only allow safe operations
    let safeExpr = expr.trim();
    // Replace variable names with their values
    const varNames = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const name of varNames) {
      const val = vars[name];
      const regex = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'g');
      if (typeof val === 'string') {
        safeExpr = safeExpr.replace(regex, JSON.stringify(val));
      } else {
        safeExpr = safeExpr.replace(regex, String(val));
      }
    }
    // Replace == with === for boolean correctness, but keep it simple
    safeExpr = safeExpr.replace(/==/g, '===').replace(/!===/g, '!==');
    // Replace true/false
    safeExpr = safeExpr.replace(/\btrue\b/g, 'true').replace(/\bfalse\b/g, 'false');
    try {
      // Use Function constructor for sandboxed eval
      return new Function('"use strict"; return (' + safeExpr + ')')();
    } catch (e) {
      return undefined;
    }
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Execute a single statement, update vars
  function execStatement(text, vars) {
    text = text.replace(/;$/, '').trim();

    // Declaration with assignment: int x = 5; or String name = "Max";
    const declMatch = text.match(/^(int|double|boolean|String|float|char|long)\s+(\w+)\s*=\s*(.+)$/);
    if (declMatch) {
      const type = declMatch[1];
      const name = declMatch[2];
      const value = evalExpr(declMatch[3], vars);
      vars[name] = value;
      return { name, value, type };
    }

    // Declaration only: int x;
    const declOnlyMatch = text.match(/^(int|double|boolean|String|float|char|long)\s+(\w+)\s*$/);
    if (declOnlyMatch) {
      const type = declOnlyMatch[1];
      const name = declOnlyMatch[2];
      const defaults = { int: 0, double: 0.0, boolean: false, String: '', float: 0.0, char: '', long: 0 };
      vars[name] = defaults[type] !== undefined ? defaults[type] : 0;
      return { name, value: vars[name], type };
    }

    // Assignment: x = expr
    const assignMatch = text.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch) {
      const name = assignMatch[1];
      const value = evalExpr(assignMatch[2], vars);
      vars[name] = value;
      return { name, value };
    }

    return null;
  }

  // ===== STEP-BY-STEP SIMULATOR =====
  class StepSimulator {
    constructor(code, stateBoxesEl, struktContainer, codeDisplayEl) {
      this.code = code;
      this.ast = parseCode(code);
      this.vars = {};
      this.stateBoxesEl = stateBoxesEl;
      this.struktContainer = struktContainer;
      this.codeDisplayEl = codeDisplayEl;
      this.currentStep = -1;
      this.executionPlan = [];
      this.autoTimer = null;
      this.finished = false;
      this.buildPlan(this.ast);
      this.render();
    }

    buildPlan(nodes) {
      for (const node of nodes) {
        this._planNode(node);
      }
    }

    _planNode(node) {
      switch (node.type) {
        case 'statement':
        case 'return':
          this.executionPlan.push({ type: 'exec', node });
          break;
        case 'if':
          this.executionPlan.push({ type: 'eval-cond', node });
          // At runtime, we push the chosen branch body
          this.executionPlan.push({ type: 'if-branch', node });
          break;
        case 'while':
          this.executionPlan.push({ type: 'while-start', node });
          break;
        case 'function':
          this.executionPlan.push({ type: 'func-def', node });
          break;
      }
    }

    step() {
      if (this.finished) return false;
      this.currentStep++;

      if (this.currentStep >= this.executionPlan.length) {
        this.finished = true;
        this.render();
        return false;
      }

      const plan = this.executionPlan[this.currentStep];
      switch (plan.type) {
        case 'exec':
          execStatement(plan.node.text || plan.node.expr || '', this.vars);
          break;
        case 'eval-cond': {
          const result = evalExpr(plan.node.condition, this.vars);
          plan._result = result;
          break;
        }
        case 'if-branch': {
          const condPlan = this.executionPlan[this.currentStep - 1];
          const result = condPlan._result;
          const branch = result ? plan.node.bodyTrue : plan.node.bodyFalse;
          // Insert branch steps after current position
          const newSteps = [];
          for (const child of branch) {
            if (child.type === 'statement' || child.type === 'return') {
              newSteps.push({ type: 'exec', node: child });
            } else if (child.type === 'if') {
              newSteps.push({ type: 'eval-cond', node: child });
              newSteps.push({ type: 'if-branch', node: child });
            } else if (child.type === 'while') {
              newSteps.push({ type: 'while-start', node: child });
            }
          }
          this.executionPlan.splice(this.currentStep + 1, 0, ...newSteps);
          break;
        }
        case 'while-start': {
          const cond = evalExpr(plan.node.condition, this.vars);
          if (cond) {
            // Push body + re-check
            const newSteps = [];
            for (const child of plan.node.body) {
              if (child.type === 'statement' || child.type === 'return') {
                newSteps.push({ type: 'exec', node: child });
              } else if (child.type === 'if') {
                newSteps.push({ type: 'eval-cond', node: child });
                newSteps.push({ type: 'if-branch', node: child });
              } else if (child.type === 'while') {
                newSteps.push({ type: 'while-start', node: child });
              }
            }
            newSteps.push({ type: 'while-start', node: plan.node }); // re-check
            this.executionPlan.splice(this.currentStep + 1, 0, ...newSteps);
          }
          break;
        }
        case 'func-def':
          // Just note the function exists
          this.vars['__func_' + plan.node.name] = plan.node;
          break;
      }

      this.render();
      return true;
    }

    reset() {
      this.vars = {};
      this.currentStep = -1;
      this.executionPlan = [];
      this.finished = false;
      this.stopAuto();
      this.buildPlan(this.ast);
      this.render();
    }

    auto(interval) {
      this.stopAuto();
      this.autoTimer = setInterval(() => {
        if (!this.step()) this.stopAuto();
      }, interval || 700);
    }

    stopAuto() {
      if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; }
    }

    render() {
      // Render state boxes
      this.renderState();
      // Render struktogramm
      renderStruktogramm(this.struktContainer, this.ast, {});
      // Highlight active line in code display if present
      if (this.codeDisplayEl) {
        this.renderCodeHighlight();
      }
    }

    renderState() {
      if (!this.stateBoxesEl) return;
      this.stateBoxesEl.innerHTML = '';
      const displayVars = Object.entries(this.vars).filter(([k]) => !k.startsWith('__'));
      if (displayVars.length === 0) {
        this.stateBoxesEl.innerHTML = '<span style="color:var(--text-muted)">Noch keine Variablen</span>';
        return;
      }
      for (const [name, value] of displayVars) {
        const box = document.createElement('div');
        box.className = 'state-box';
        box.innerHTML =
          '<div class="state-box-name">' + escapeHtml(name) + '</div>' +
          '<div class="state-box-value">' + escapeHtml(String(value)) + '</div>';
        this.stateBoxesEl.appendChild(box);
      }
    }

    renderCodeHighlight() {
      const codeLines = this.code.split('\n');
      this.codeDisplayEl.innerHTML = '';
      codeLines.forEach((line, idx) => {
        const span = document.createElement('span');
        span.className = 'line';
        span.textContent = line || ' ';
        this.codeDisplayEl.appendChild(span);
      });
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ===== DATATYPE CARDS =====
  const datatypes = [
    { icon: '🔢', name: 'int', desc: 'Ganzzahlen (ohne Komma)', example: 'int alter = 13;', values: '..., -2, -1, 0, 1, 2, ...' },
    { icon: '🔢.0', name: 'double', desc: 'Kommazahlen', example: 'double preis = 4.99;', values: '3.14, -0.5, 100.0' },
    { icon: '✅', name: 'boolean', desc: 'Wahrheitswert (wahr/falsch)', example: 'boolean regen = true;', values: 'true oder false' },
    { icon: '📝', name: 'String', desc: 'Texte (in Anfuehrungszeichen)', example: 'String name = "Anna";', values: '"Hallo", "123", ""' }
  ];

  const dtContainer = document.getElementById('datatype-cards');
  if (dtContainer) {
    datatypes.forEach(dt => {
      const card = document.createElement('div');
      card.className = 'datatype-card';
      card.innerHTML =
        '<div class="datatype-card-icon">' + dt.icon + '</div>' +
        '<h4>' + dt.name + '</h4>' +
        '<p>' + dt.desc + '</p>' +
        '<code>' + escapeHtml(dt.example) + '</code>' +
        '<p style="margin-top:6px;font-size:0.78rem;color:var(--text-muted)">Werte: ' + dt.values + '</p>';
      dtContainer.appendChild(card);
    });
  }

  // ===== VARIABLE BOX METAPHOR =====
  const boxes = [];
  const boxContainer = document.querySelector('.variable-boxes');
  const boxTypeSelect = document.getElementById('box-type-select');
  const boxNameInput = document.getElementById('box-name-input');
  const boxValueInput = document.getElementById('box-value-input');
  const boxAddBtn = document.getElementById('box-add-btn');
  const boxFeedback = document.getElementById('box-feedback');

  if (boxAddBtn) {
    boxAddBtn.addEventListener('click', () => {
      const type = boxTypeSelect.value;
      const name = boxNameInput.value.trim();
      const rawValue = boxValueInput.value.trim();

      if (!name) {
        showBoxFeedback('Bitte gib einen Namen ein!', 'error');
        return;
      }
      if (!/^[a-zA-Z_]\w*$/.test(name)) {
        showBoxFeedback('Name darf nur Buchstaben, Zahlen und _ enthalten und muss mit einem Buchstaben beginnen.', 'error');
        return;
      }
      if (!rawValue) {
        showBoxFeedback('Bitte gib einen Wert ein!', 'error');
        return;
      }

      let value = rawValue;
      let valid = true;
      switch (type) {
        case 'int':
          if (!/^-?\d+$/.test(rawValue)) { showBoxFeedback('Ein int braucht eine Ganzzahl, z.B. 42', 'error'); valid = false; }
          else value = parseInt(rawValue);
          break;
        case 'double':
          if (isNaN(parseFloat(rawValue))) { showBoxFeedback('Ein double braucht eine Zahl, z.B. 3.14', 'error'); valid = false; }
          else value = parseFloat(rawValue);
          break;
        case 'boolean':
          if (rawValue !== 'true' && rawValue !== 'false') { showBoxFeedback('Ein boolean muss true oder false sein', 'error'); valid = false; }
          else value = rawValue === 'true';
          break;
        case 'String':
          value = rawValue;
          break;
      }

      if (!valid) return;

      boxes.push({ type, name, value });
      renderBoxes();
      showBoxFeedback('Variable ' + type + ' ' + name + ' = ' + value + ' erstellt!', 'success');
      boxNameInput.value = '';
      boxValueInput.value = '';
    });
  }

  function renderBoxes() {
    if (!boxContainer) return;
    boxContainer.innerHTML = '';
    boxes.forEach(b => {
      const el = document.createElement('div');
      el.className = 'var-box';
      el.innerHTML =
        '<div class="var-box-label">' + b.type + '</div>' +
        '<div class="var-box-name">' + escapeHtml(b.name) + '</div>' +
        '<div class="var-box-value">' + escapeHtml(String(b.value)) + '</div>';
      boxContainer.appendChild(el);
    });
  }

  function showBoxFeedback(msg, type) {
    if (!boxFeedback) return;
    boxFeedback.textContent = msg;
    boxFeedback.className = 'box-feedback ' + type;
    setTimeout(() => { boxFeedback.textContent = ''; }, 4000);
  }

  // ===== SECTION 1: Variable Code -> Struktogramm =====
  const varRunBtn = document.getElementById('var-run-btn');
  const varCodeEditor = document.getElementById('var-code-editor');
  const varStrukt = document.getElementById('var-struktogramm');
  const varStateBoxes = document.getElementById('var-state-boxes');

  if (varRunBtn) {
    // Initial render
    renderFromEditor(varCodeEditor, varStrukt, varStateBoxes);

    varRunBtn.addEventListener('click', () => {
      renderFromEditor(varCodeEditor, varStrukt, varStateBoxes);
    });
    varCodeEditor.addEventListener('input', () => {
      renderStruktogrammOnly(varCodeEditor, varStrukt);
    });
  }

  function renderFromEditor(editor, struktEl, stateEl) {
    const code = editor.value;
    const ast = parseCode(code);
    renderStruktogramm(struktEl, ast, {});
    // Execute all statements
    const vars = {};
    executeAll(ast, vars);
    renderStateBoxes(stateEl, vars);
  }

  function renderStruktogrammOnly(editor, struktEl) {
    try {
      const ast = parseCode(editor.value);
      renderStruktogramm(struktEl, ast, {});
    } catch (e) { /* ignore parse errors during typing */ }
  }

  function executeAll(nodes, vars) {
    for (const node of nodes) {
      switch (node.type) {
        case 'statement':
          execStatement(node.text, vars);
          break;
        case 'return':
          return { returned: true, value: evalExpr(node.expr, vars) };
        case 'if': {
          const cond = evalExpr(node.condition, vars);
          const branch = cond ? node.bodyTrue : node.bodyFalse;
          const r = executeAll(branch, vars);
          if (r && r.returned) return r;
          break;
        }
        case 'while': {
          let guard = 0;
          while (evalExpr(node.condition, vars) && guard < 10000) {
            const r = executeAll(node.body, vars);
            if (r && r.returned) return r;
            guard++;
          }
          break;
        }
        case 'function':
          vars['__func_' + node.name] = node;
          break;
      }
    }
    return null;
  }

  function renderStateBoxes(el, vars) {
    if (!el) return;
    el.innerHTML = '';
    const displayVars = Object.entries(vars).filter(([k]) => !k.startsWith('__'));
    if (displayVars.length === 0) {
      el.innerHTML = '<span style="color:var(--text-muted)">Noch keine Variablen</span>';
      return;
    }
    for (const [name, value] of displayVars) {
      const box = document.createElement('div');
      box.className = 'state-box updated';
      box.innerHTML =
        '<div class="state-box-name">' + escapeHtml(name) + '</div>' +
        '<div class="state-box-value">' + escapeHtml(String(value)) + '</div>';
      el.appendChild(box);
      setTimeout(() => box.classList.remove('updated'), 600);
    }
  }

  // ===== SECTION 2: Sequential Step Simulator =====
  let seqSim = null;
  const seqCodeEditor = document.getElementById('seq-code-editor');
  const seqStepBtn = document.getElementById('seq-step-btn');
  const seqResetBtn = document.getElementById('seq-reset-btn');
  const seqAutoBtn = document.getElementById('seq-auto-btn');
  const seqStrukt = document.getElementById('seq-struktogramm');
  const seqStateBoxes = document.getElementById('seq-state-boxes');

  function initSeqSim() {
    seqSim = new StepSimulator(
      seqCodeEditor.value,
      seqStateBoxes, seqStrukt, null
    );
  }

  if (seqStepBtn) {
    initSeqSim();
    seqStepBtn.addEventListener('click', () => { if (seqSim) seqSim.step(); });
    seqResetBtn.addEventListener('click', () => { seqSim = new StepSimulator(seqCodeEditor.value, seqStateBoxes, seqStrukt, null); });
    seqAutoBtn.addEventListener('click', () => { if (seqSim) seqSim.auto(700); });
    seqCodeEditor.addEventListener('input', () => { renderStruktogrammOnly(seqCodeEditor, seqStrukt); });
  }

  // ===== SECTION 3: Verzweigungen =====
  // Operator Grid
  const operators = [
    { symbol: '<', meaning: 'kleiner als' },
    { symbol: '>', meaning: 'groesser als' },
    { symbol: '<=', meaning: 'kleiner oder gleich' },
    { symbol: '>=', meaning: 'groesser oder gleich' },
    { symbol: '==', meaning: 'gleich' },
    { symbol: '!=', meaning: 'ungleich' },
    { symbol: '+', meaning: 'Addition' },
    { symbol: '-', meaning: 'Subtraktion' },
    { symbol: 'true', meaning: 'wahr' },
    { symbol: 'false', meaning: 'falsch' }
  ];

  const opGrid = document.getElementById('operator-grid');
  if (opGrid) {
    operators.forEach(op => {
      const card = document.createElement('div');
      card.className = 'operator-card';
      card.innerHTML =
        '<div class="op-symbol">' + escapeHtml(op.symbol) + '</div>' +
        '<div class="op-meaning">' + op.meaning + '</div>';
      opGrid.appendChild(card);
    });
  }

  // Interactive Branch
  const branchSlider = document.getElementById('branch-slider');
  const branchSliderValue = document.getElementById('branch-slider-value');
  const branchCodeDisplay = document.getElementById('branch-code-display');
  const branchStrukt = document.getElementById('branch-struktogramm');
  const branchResultEl = document.getElementById('branch-result');

  function updateBranchDemo() {
    if (!branchSlider) return;
    const zahl = parseInt(branchSlider.value);
    branchSliderValue.textContent = zahl;

    const code =
      'int zahl = ' + zahl + ';\n\n' +
      'if (zahl >= 10) {\n' +
      '    String ergebnis = "Gross!";\n' +
      '} else {\n' +
      '    String ergebnis = "Klein!";\n' +
      '}';

    // Code display with highlighting
    const lines = code.split('\n');
    branchCodeDisplay.innerHTML = '';
    const condTrue = zahl >= 10;
    lines.forEach((line, i) => {
      const span = document.createElement('span');
      span.className = 'line';
      span.textContent = line || ' ';
      // Highlight active path
      if (i === 2) span.classList.add('active'); // if line
      if (condTrue && i === 3) span.classList.add('active');
      if (!condTrue && i === 5) span.classList.add('active');
      branchCodeDisplay.appendChild(span);
    });

    // Struktogramm
    const ast = parseCode(code);
    renderStruktogramm(branchStrukt, ast, {});

    // Result
    const result = condTrue ? 'Gross!' : 'Klein!';
    branchResultEl.innerHTML =
      '<span style="color:var(--accent-blue)">zahl = ' + zahl + '</span> → ' +
      '<span style="color:var(--text-muted)">' + zahl + ' >= 10 ist </span>' +
      '<span style="color:' + (condTrue ? 'var(--accent)' : 'var(--accent-red)') + '">' + condTrue + '</span>' +
      ' → ergebnis = <strong style="color:var(--accent-light)">"' + result + '"</strong>';
  }

  if (branchSlider) {
    branchSlider.addEventListener('input', updateBranchDemo);
    updateBranchDemo();
  }

  // Custom branch editor
  const branchRunBtn = document.getElementById('branch-run-btn');
  const branchCodeEditorEl = document.getElementById('branch-code-editor');
  const branchCustomStrukt = document.getElementById('branch-custom-struktogramm');
  const branchStateBoxes = document.getElementById('branch-state-boxes');

  if (branchRunBtn) {
    renderFromEditor(branchCodeEditorEl, branchCustomStrukt, branchStateBoxes);
    branchRunBtn.addEventListener('click', () => {
      renderFromEditor(branchCodeEditorEl, branchCustomStrukt, branchStateBoxes);
    });
    branchCodeEditorEl.addEventListener('input', () => {
      renderStruktogrammOnly(branchCodeEditorEl, branchCustomStrukt);
    });
  }

  // ===== SECTION 4: Schleifen =====
  // Simple loop demo
  const loopStartInput = document.getElementById('loop-start');
  const loopEndInput = document.getElementById('loop-end');
  const loopCodeDisplay = document.getElementById('loop-code-display');
  const loopStrukt = document.getElementById('loop-struktogramm');
  const loopStepBtn = document.getElementById('loop-step-btn');
  const loopResetBtn = document.getElementById('loop-reset-btn');
  const loopAutoBtn = document.getElementById('loop-auto-btn');
  const loopIValue = document.getElementById('loop-i-value');
  const loopIterCount = document.getElementById('loop-iteration-count');
  const loopOutputEl = document.getElementById('loop-output');

  let loopState = { i: 0, iteration: 0, finished: false, autoTimer: null };

  function getLoopCode() {
    const start = parseInt(loopStartInput?.value || 0);
    const end = parseInt(loopEndInput?.value || 5);
    return 'int i = ' + start + ';\n\nwhile (i < ' + end + ') {\n    i = i + 1;\n}';
  }

  function updateLoopDisplay() {
    if (!loopCodeDisplay) return;
    const code = getLoopCode();
    const lines = code.split('\n');
    const end = parseInt(loopEndInput?.value || 5);

    loopCodeDisplay.innerHTML = '';
    lines.forEach((line, idx) => {
      const span = document.createElement('span');
      span.className = 'line';
      span.textContent = line || ' ';
      if (!loopState.finished) {
        if (idx === 2 && loopState.iteration >= 0) span.classList.add('active'); // while line
      }
      loopCodeDisplay.appendChild(span);
    });

    // Struktogramm
    const ast = parseCode(code);
    renderStruktogramm(loopStrukt, ast, {});

    // Update display
    if (loopIValue) loopIValue.textContent = loopState.i;
    if (loopIterCount) loopIterCount.textContent = loopState.iteration;
  }

  function loopStep() {
    if (loopState.finished) return false;
    const end = parseInt(loopEndInput?.value || 5);
    if (loopState.i < end) {
      loopState.i++;
      loopState.iteration++;
      // Add output item
      const item = document.createElement('div');
      item.className = 'loop-output-item';
      item.textContent = 'i = ' + loopState.i;
      loopOutputEl?.appendChild(item);
      // Pulse animation
      if (loopIValue) {
        loopIValue.classList.add('pulse');
        setTimeout(() => loopIValue.classList.remove('pulse'), 300);
      }
    }
    if (loopState.i >= end) {
      loopState.finished = true;
    }
    updateLoopDisplay();
    return !loopState.finished;
  }

  function loopReset() {
    if (loopState.autoTimer) { clearInterval(loopState.autoTimer); loopState.autoTimer = null; }
    const start = parseInt(loopStartInput?.value || 0);
    loopState = { i: start, iteration: 0, finished: false, autoTimer: null };
    if (loopOutputEl) loopOutputEl.innerHTML = '';
    updateLoopDisplay();
  }

  if (loopStepBtn) {
    loopReset();
    loopStepBtn.addEventListener('click', loopStep);
    loopResetBtn.addEventListener('click', loopReset);
    loopAutoBtn.addEventListener('click', () => {
      if (loopState.autoTimer) { clearInterval(loopState.autoTimer); loopState.autoTimer = null; return; }
      loopState.autoTimer = setInterval(() => {
        if (!loopStep()) { clearInterval(loopState.autoTimer); loopState.autoTimer = null; }
      }, 600);
    });
    loopStartInput.addEventListener('change', loopReset);
    loopEndInput.addEventListener('change', loopReset);
  }

  // Custom loop editor with step execution
  let loopCustomSim = null;
  const loopCustomStepBtn = document.getElementById('loop-custom-step-btn');
  const loopCustomResetBtn = document.getElementById('loop-custom-reset-btn');
  const loopCustomCodeEditor = document.getElementById('loop-code-editor');
  const loopCustomStrukt = document.getElementById('loop-custom-struktogramm');
  const loopCustomStateBoxes = document.getElementById('loop-custom-state-boxes');

  if (loopCustomStepBtn) {
    loopCustomSim = new StepSimulator(loopCustomCodeEditor.value, loopCustomStateBoxes, loopCustomStrukt, null);
    loopCustomStepBtn.addEventListener('click', () => { if (loopCustomSim) loopCustomSim.step(); });
    loopCustomResetBtn.addEventListener('click', () => {
      loopCustomSim = new StepSimulator(loopCustomCodeEditor.value, loopCustomStateBoxes, loopCustomStrukt, null);
    });
    loopCustomCodeEditor.addEventListener('input', () => {
      renderStruktogrammOnly(loopCustomCodeEditor, loopCustomStrukt);
    });
  }

  // ===== SECTION 5: Funktionen =====
  const funcCodeDisplay = document.getElementById('func-code-display');
  const funcStrukt = document.getElementById('func-struktogramm');
  const funcInputA = document.getElementById('func-input-a');
  const funcInputB = document.getElementById('func-input-b');
  const funcCallBtn = document.getElementById('func-call-btn');
  const funcResultEl = document.getElementById('func-result');

  const funcDemoCode =
    'int berechneMax(int a, int b) {\n' +
    '    if (a > b) {\n' +
    '        return a;\n' +
    '    } else {\n' +
    '        return b;\n' +
    '    }\n' +
    '}';

  function updateFuncDemo() {
    if (!funcCodeDisplay) return;
    // Render code
    const lines = funcDemoCode.split('\n');
    funcCodeDisplay.innerHTML = '';
    lines.forEach(line => {
      const span = document.createElement('span');
      span.className = 'line';
      span.textContent = line || ' ';
      funcCodeDisplay.appendChild(span);
    });

    // Render struktogramm
    const ast = parseCode(funcDemoCode);
    renderStruktogramm(funcStrukt, ast, {});
  }

  if (funcCallBtn) {
    updateFuncDemo();
    funcCallBtn.addEventListener('click', () => {
      const a = parseInt(funcInputA.value) || 0;
      const b = parseInt(funcInputB.value) || 0;
      const result = Math.max(a, b);
      const isA = a > b;
      funcResultEl.innerHTML =
        'berechneMax(' + a + ', ' + b + ') → ' +
        '<span style="color:var(--accent-blue)">' + a + ' > ' + b + ' ist ' +
        '<span style="color:' + (isA ? 'var(--accent)' : 'var(--accent-red)') + '">' + (a > b) + '</span></span>' +
        ' → Ergebnis: <strong style="font-size:1.2rem">' + result + '</strong>';

      // Highlight path in code
      const lines = funcDemoCode.split('\n');
      funcCodeDisplay.innerHTML = '';
      lines.forEach((line, idx) => {
        const span = document.createElement('span');
        span.className = 'line';
        span.textContent = line || ' ';
        if (idx === 1) span.classList.add('active');
        if (isA && idx === 2) span.classList.add('active');
        if (!isA && idx === 4) span.classList.add('active');
        funcCodeDisplay.appendChild(span);
      });
    });
  }

  // Custom function editor
  const funcRunBtn = document.getElementById('func-run-btn');
  const funcCodeEditorEl = document.getElementById('func-code-editor');
  const funcCustomStrukt = document.getElementById('func-custom-struktogramm');
  const funcStateBoxes = document.getElementById('func-state-boxes');

  if (funcRunBtn) {
    renderFromEditor(funcCodeEditorEl, funcCustomStrukt, funcStateBoxes);
    funcRunBtn.addEventListener('click', () => {
      const code = funcCodeEditorEl.value;
      const ast = parseCode(code);
      renderStruktogramm(funcCustomStrukt, ast, {});
      // Try to execute: parse for function def + call
      const vars = {};
      executeAll(ast, vars);
      renderStateBoxes(funcStateBoxes, vars);
    });
    funcCodeEditorEl.addEventListener('input', () => {
      renderStruktogrammOnly(funcCodeEditorEl, funcCustomStrukt);
    });
  }

  // ===== SECTION 6: Sandbox =====
  const templates = {
    sequence:
      'int a = 10;\nint b = 3;\nint summe = a + b;\nint differenz = a - b;',
    branch:
      'int punkte = 75;\n\nif (punkte >= 90) {\n    String note = "Sehr gut";\n} else if (punkte >= 70) {\n    String note = "Gut";\n} else {\n    String note = "Muss ueben";\n}',
    loop:
      'int summe = 0;\nint i = 1;\n\nwhile (i <= 10) {\n    summe = summe + i;\n    i = i + 1;\n}',
    combined:
      'int summe = 0;\nint i = 1;\n\nwhile (i <= 10) {\n    if (i % 2 == 0) {\n        summe = summe + i;\n    }\n    i = i + 1;\n}'
  };

  const sandboxCodeEditor = document.getElementById('sandbox-code-editor');
  const sandboxStrukt = document.getElementById('sandbox-struktogramm');
  const sandboxStateBoxes = document.getElementById('sandbox-state-boxes');
  const sandboxStepBtn = document.getElementById('sandbox-step-btn');
  const sandboxAutoBtn = document.getElementById('sandbox-auto-btn');
  const sandboxResetBtn = document.getElementById('sandbox-reset-btn');

  let sandboxSim = null;

  function initSandbox() {
    if (!sandboxCodeEditor) return;
    sandboxSim = new StepSimulator(
      sandboxCodeEditor.value,
      sandboxStateBoxes, sandboxStrukt, null
    );
  }

  if (sandboxStepBtn) {
    initSandbox();
    sandboxStepBtn.addEventListener('click', () => { if (sandboxSim) sandboxSim.step(); });
    sandboxAutoBtn.addEventListener('click', () => { if (sandboxSim) sandboxSim.auto(500); });
    sandboxResetBtn.addEventListener('click', () => { initSandbox(); });
    sandboxCodeEditor.addEventListener('input', () => {
      renderStruktogrammOnly(sandboxCodeEditor, sandboxStrukt);
    });
  }

  // Template buttons
  document.querySelectorAll('.btn-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.template;
      if (templates[t] && sandboxCodeEditor) {
        sandboxCodeEditor.value = templates[t];
        initSandbox();
      }
    });
  });

})();
