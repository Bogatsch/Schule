const MIN_TEAMS = 2;
const MAX_TEAMS = 12;
const MIN_SIZE = 1;
const MAX_SIZE = 30;
const DEFAULT_SIZE = 4;

/* Fuer jeden Einsatz Rueckstand auf den Vielspieler des Teams steigt das Gewicht
   um diesen Faktor. Wer eine Runde ausgesetzt hat, wird also deutlich eher
   gezogen - simuliert liegt die Spanne zwischen Viel- und Wenigspieler meist bei
   0 bis 1 Einsatz, ohne dass die Auslosung berechenbar wird. Der Deckel haelt
   die Gewichte auch nach vielen Runden in einem gesunden Bereich. */
const FAIRNESS_BASE = 25;
const FAIRNESS_CAP = 4;

const STORAGE_KEY = "spieler-zufallsgenerator:v1";

const el = {
  body: document.body,
  setupView: document.getElementById("setup-view"),
  sessionView: document.getElementById("session-view"),
  teamsCount: document.getElementById("teams-count"),
  teamsDec: document.getElementById("teams-dec"),
  teamsInc: document.getElementById("teams-inc"),
  teamList: document.getElementById("team-list"),
  startSession: document.getElementById("start-session"),
  sizeChips: document.getElementById("size-chips"),
  resultHeadline: document.getElementById("result-headline"),
  resultGrid: document.getElementById("result-grid"),
  drawButton: document.getElementById("draw-button"),
  endSession: document.getElementById("end-session"),
};

const state = {
  teams: [makeTeam(1), makeTeam(2)],
  session: null,
  perTeamChoice: "random",
};

let rollTimer = null;

function makeTeam(index, size = DEFAULT_SIZE) {
  return { name: `Team ${index}`, size };
}

/* ---------- Zufall ---------- */

function random() {
  const source = globalThis.crypto;
  if (source && typeof source.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    source.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  }
  return Math.random();
}

function randomInt(min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/* Zieht `count` Spielernummern aus einem Team. Wer in dieser Session seltener
   dran war, bekommt ein hoeheres Gewicht. Gewichtetes Ziehen ohne Zuruecklegen
   nach Efraimidis/Spirakis: Schluessel = zufall^(1/gewicht), groesste gewinnen. */
function pickPlayers(counts, count) {
  const busiest = Math.max(...counts);
  const keyed = counts.map((played, index) => {
    const behind = Math.min(FAIRNESS_CAP, busiest - played);
    const weight = FAIRNESS_BASE ** behind;
    const chance = random() || Number.MIN_VALUE;
    return { number: index + 1, key: chance ** (1 / weight) };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed
    .slice(0, count)
    .map((entry) => entry.number)
    .sort((a, b) => a - b);
}

/* ---------- Speichern ---------- */

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        teams: state.teams,
        session: state.session,
        perTeamChoice: state.perTeamChoice,
      }),
    );
  } catch {
    /* Privater Modus o.ae. - die App laeuft auch ohne Speicher weiter. */
  }
}

function load() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    stored = null;
  }
  if (!stored || !Array.isArray(stored.teams) || stored.teams.length < MIN_TEAMS) return;

  state.teams = stored.teams
    .slice(0, MAX_TEAMS)
    .map((team, index) => ({
      name: typeof team?.name === "string" && team.name.trim() ? team.name : `Team ${index + 1}`,
      size: clamp(Number(team?.size) || DEFAULT_SIZE, MIN_SIZE, MAX_SIZE),
    }));

  if (stored.perTeamChoice === "random" || Number.isInteger(stored.perTeamChoice)) {
    state.perTeamChoice = stored.perTeamChoice;
  }

  const session = stored.session;
  if (session && Array.isArray(session.teams) && session.teams.length >= MIN_TEAMS) {
    state.session = {
      perTeam: Number(session.perTeam) || 0,
      picks: Array.isArray(session.picks) ? session.picks : [],
      teams: session.teams.map((team, index) => ({
        name: team?.name || `Team ${index + 1}`,
        size: clamp(Number(team?.size) || DEFAULT_SIZE, MIN_SIZE, MAX_SIZE),
        counts: Array.isArray(team?.counts)
          ? team.counts.map((value) => Number(value) || 0)
          : [],
      })),
    };
    for (const team of state.session.teams) {
      while (team.counts.length < team.size) team.counts.push(0);
      team.counts.length = team.size;
    }
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ---------- Setup ---------- */

function renderTeamCount() {
  el.teamsCount.value = String(state.teams.length);
  el.teamsDec.disabled = state.teams.length <= MIN_TEAMS;
  el.teamsInc.disabled = state.teams.length >= MAX_TEAMS;
}

function renderTeamList() {
  el.teamList.replaceChildren();

  state.teams.forEach((team, index) => {
    const row = document.createElement("div");
    row.className = "team-row";

    const badge = document.createElement("span");
    badge.className = "team-index";
    badge.textContent = String(index + 1);
    badge.setAttribute("aria-hidden", "true");

    const name = document.createElement("input");
    name.className = "team-name";
    name.type = "text";
    name.value = team.name;
    name.maxLength = 24;
    name.setAttribute("aria-label", `Name von Team ${index + 1}`);
    name.addEventListener("input", () => {
      state.teams[index].name = name.value;
      save();
    });
    name.addEventListener("blur", () => {
      if (!name.value.trim()) {
        name.value = `Team ${index + 1}`;
        state.teams[index].name = name.value;
        save();
      }
    });

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const dec = document.createElement("button");
    dec.type = "button";
    dec.textContent = "−";
    dec.setAttribute("aria-label", `Ein Spieler weniger in Team ${index + 1}`);

    const size = document.createElement("input");
    size.type = "number";
    size.inputMode = "numeric";
    size.min = String(MIN_SIZE);
    size.max = String(MAX_SIZE);
    size.value = String(team.size);
    size.setAttribute("aria-label", `Spieleranzahl in Team ${index + 1}`);

    const inc = document.createElement("button");
    inc.type = "button";
    inc.textContent = "+";
    inc.setAttribute("aria-label", `Ein Spieler mehr in Team ${index + 1}`);

    const setSize = (value) => {
      state.teams[index].size = clamp(value, MIN_SIZE, MAX_SIZE);
      size.value = String(state.teams[index].size);
      dec.disabled = state.teams[index].size <= MIN_SIZE;
      inc.disabled = state.teams[index].size >= MAX_SIZE;
      save();
    };

    dec.addEventListener("click", () => setSize(state.teams[index].size - 1));
    inc.addEventListener("click", () => setSize(state.teams[index].size + 1));
    size.addEventListener("input", () => {
      const parsed = Number.parseInt(size.value, 10);
      if (Number.isFinite(parsed)) {
        state.teams[index].size = clamp(parsed, MIN_SIZE, MAX_SIZE);
          save();
      }
    });
    size.addEventListener("blur", () => setSize(Number.parseInt(size.value, 10) || DEFAULT_SIZE));

    dec.disabled = team.size <= MIN_SIZE;
    inc.disabled = team.size >= MAX_SIZE;

    stepper.append(dec, size, inc);
    row.append(badge, name, stepper);
    el.teamList.append(row);
  });
}

function setTeamCount(count) {
  const target = clamp(count, MIN_TEAMS, MAX_TEAMS);
  while (state.teams.length < target) state.teams.push(makeTeam(state.teams.length + 1));
  state.teams.length = target;
  renderTeamCount();
  renderTeamList();
  save();
}

/* ---------- Session ---------- */

function startSession() {
  state.session = {
    perTeam: 0,
    picks: [],
    teams: state.teams.map((team) => ({
      name: team.name.trim() || "Team",
      size: team.size,
      counts: new Array(team.size).fill(0),
    })),
  };
  const smallest = maxPossible();
  if (state.perTeamChoice !== "random" && state.perTeamChoice > smallest) {
    state.perTeamChoice = "random";
  }
  showView("session");
  renderSession();
  save();
  el.drawButton.focus();
}

function endSession() {
  stopRolling();
  state.session = null;
  showView("setup");
  renderTeamCount();
  renderTeamList();
  save();
  el.startSession.focus();
}

function maxPossible() {
  return Math.min(...state.session.teams.map((team) => team.size));
}

function drawRound() {
  const session = state.session;
  const smallest = maxPossible();
  const perTeam =
    state.perTeamChoice === "random"
      ? randomInt(1, smallest)
      : clamp(state.perTeamChoice, 1, smallest);

  session.picks = session.teams.map((team) => pickPlayers(team.counts, perTeam));
  session.picks.forEach((numbers, teamIndex) => {
    for (const number of numbers) session.teams[teamIndex].counts[number - 1] += 1;
  });
  session.perTeam = perTeam;

  renderSession({ animate: true });
  save();
}

function showView(view) {
  el.body.dataset.view = view;
  el.setupView.hidden = view !== "setup";
  el.sessionView.hidden = view !== "session";
}

function renderSizeChips() {
  const smallest = maxPossible();
  el.sizeChips.replaceChildren();

  const options = [{ value: "random", label: "Zufall" }];
  for (let i = 1; i <= smallest; i += 1) options.push({ value: i, label: String(i) });

  for (const option of options) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = option.label;
    chip.setAttribute("aria-pressed", String(state.perTeamChoice === option.value));
    chip.setAttribute(
      "aria-label",
      option.value === "random" ? "Anzahl zufällig auslosen" : `${option.label} Spieler pro Team`,
    );
    chip.addEventListener("click", () => {
      state.perTeamChoice = option.value;
      renderSizeChips();
      save();
    });
    el.sizeChips.append(chip);
  }
}

function renderSession({ animate = false } = {}) {
  const session = state.session;
  renderSizeChips();

  const hasDraw = session.picks.length > 0;
  el.drawButton.textContent = hasDraw ? "Neue Gegner würfeln" : "Start";

  if (!hasDraw) {
    el.resultHeadline.textContent = "Bereit – drücke auf „Start“.";
    el.resultHeadline.classList.add("placeholder");
    el.resultGrid.replaceChildren();
    return;
  }

  el.resultHeadline.classList.remove("placeholder");
  el.resultHeadline.textContent =
    session.perTeam === 1
      ? "1 Spieler pro Team"
      : `${session.perTeam} Spieler pro Team`;

  el.resultGrid.replaceChildren();
  const rolling = [];

  session.teams.forEach((team, teamIndex) => {
    const card = document.createElement("div");
    card.className = "result-card";

    const name = document.createElement("span");
    name.className = "result-card-name";
    name.textContent = team.name;

    const numbers = document.createElement("div");
    numbers.className = "result-numbers";

    session.picks[teamIndex].forEach((number, position) => {
      if (position > 0) {
        const separator = document.createElement("span");
        separator.className = "result-separator";
        separator.setAttribute("aria-hidden", "true");
        separator.textContent = "|";
        numbers.append(separator);
      }
      const value = document.createElement("span");
      value.className = "result-number";
      value.textContent = String(number);
      numbers.append(value);
      rolling.push({ element: value, final: number, size: team.size });
    });

    card.append(name, numbers);
    el.resultGrid.append(card);
  });

  if (animate && !prefersReducedMotion()) rollNumbers(rolling);
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function stopRolling() {
  if (rollTimer !== null) {
    cancelAnimationFrame(rollTimer);
    rollTimer = null;
  }
  el.drawButton.disabled = false;
}

function rollNumbers(entries) {
  stopRolling();
  if (entries.length === 0) return;

  const duration = 750;
  const started = performance.now();
  let lastSwap = 0;

  el.drawButton.disabled = true;
  for (const entry of entries) entry.element.classList.add("rolling");

  const settle = (entry) => {
    entry.element.textContent = String(entry.final);
    entry.element.classList.remove("rolling");
  };

  const tick = (now) => {
    const progress = (now - started) / duration;
    if (progress >= 1) {
      entries.forEach(settle);
      rollTimer = null;
      el.drawButton.disabled = false;
      return;
    }

    if (now - lastSwap > 60) {
      lastSwap = now;
      entries.forEach((entry, index) => {
        /* Die Nummern kommen nacheinander zur Ruhe. */
        const settleAt = 0.45 + (0.5 * index) / entries.length;
        if (progress >= settleAt) settle(entry);
        else entry.element.textContent = String(randomInt(1, entry.size));
      });
    }

    rollTimer = requestAnimationFrame(tick);
  };

  rollTimer = requestAnimationFrame(tick);
}

/* ---------- Ereignisse ---------- */

el.teamsDec.addEventListener("click", () => setTeamCount(state.teams.length - 1));
el.teamsInc.addEventListener("click", () => setTeamCount(state.teams.length + 1));
el.teamsCount.addEventListener("change", () => {
  setTeamCount(Number.parseInt(el.teamsCount.value, 10) || MIN_TEAMS);
});

el.startSession.addEventListener("click", startSession);
el.drawButton.addEventListener("click", drawRound);

el.endSession.addEventListener("click", endSession);

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || el.body.dataset.view !== "session") return;
  const target = event.target;
  if (target instanceof HTMLElement && ["INPUT", "BUTTON", "TEXTAREA"].includes(target.tagName)) return;
  event.preventDefault();
  if (!el.drawButton.disabled) drawRound();
});

/* ---------- Start ---------- */

load();
renderTeamCount();
renderTeamList();

if (state.session) {
  showView("session");
  renderSession();
} else {
  showView("setup");
}
