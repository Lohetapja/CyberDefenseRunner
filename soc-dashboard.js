// soc-dashboard.js — SOC Dashboard mode (MVP).
// Standalone game loop: three defendable nodes, timed threats, and
// multiple-choice incident response drawn from the existing question banks.
// Plain JS, no dependencies, no changes to the main game.

"use strict";

/* ── Tunables ──────────────────────────────────────────────────────── */
const SHIFT_SECONDS    = 120;  // survive this long to win
const SPAWN_EVERY      = 5;    // seconds between threat spawns
const FIRST_SPAWN_AT   = 2;    // first threat appears this many seconds in
const THREAT_LIFETIME  = 14;   // seconds before an unanswered threat detonates
const QUESTION_SECONDS = 20;   // default time allowed to answer one question
const TICK_MS          = 250;  // game loop resolution

const CORRECT_CREDITS  = 10;
const CORRECT_HEAL     = 8;    // node health restored on a correct answer
const WRONG_DAMAGE     = 15;
const WRONG_ESCALATION = 10;
const EXPIRE_DAMAGE    = 12;   // threat timed out on the node
const EXPIRE_ESCALATION= 8;

/* ── Question pool ─────────────────────────────────────────────────── */
// Small built-in pool used only if the real banks fail to load.
const FALLBACK_QUESTIONS = [
  { prompt:"What does MFA add to a login?", options:["A second proof of identity beyond the password","A faster internet connection","A colorful login page","Bigger disk storage"], correct:0, topic:"Identity", explain:"MFA requires a second factor, so a stolen password alone is not enough." },
  { prompt:"What is phishing?", options:["A network cable standard","Tricking people into revealing info or clicking bad links","A type of backup","A firewall rule"], correct:1, topic:"Attacks", explain:"Phishing uses deceptive messages to steal credentials or deliver malware." },
  { prompt:"Rapid encryption of many files suggests…", options:["A normal backup","A screen saver","Ransomware activity","A faster CPU"], correct:2, topic:"Malware", explain:"Mass file encryption is a hallmark behavior of ransomware." },
  { prompt:"Isolating an infected host mainly…", options:["Makes it faster","Brightens the screen","Adds storage","Stops the threat from spreading"], correct:3, topic:"Response", explain:"Network isolation contains a threat while you investigate." },
  { prompt:"Least privilege means giving accounts…", options:["Only the access they need","Full admin rights","No access at all","Shared passwords"], correct:0, topic:"Identity", explain:"Minimal access limits the damage a misused account can do." },
];

// After-Action Report toggle (default ON for training; survives restarts in this tab).
let aarEnabled = true;

// Player-selected response timer in seconds; null = "No timer" (answer at own pace).
let responseSeconds = QUESTION_SECONDS;
function timerLabel() { return responseSeconds === null ? "No timer" : responseSeconds + "s"; }

// Combine whatever real banks are present (same globals questions.js uses).
function buildPool() {
  const banks = [
    typeof NETWORKING_BASICS_QUESTIONS    !== "undefined" ? NETWORKING_BASICS_QUESTIONS    : [],
    typeof DEFENDING_SYSTEMS_QUESTIONS    !== "undefined" ? DEFENDING_SYSTEMS_QUESTIONS    : [],
    typeof ATTACKING_CONCEPTS_QUESTIONS   !== "undefined" ? ATTACKING_CONCEPTS_QUESTIONS   : [],
    typeof ALERT_INVESTIGATION_QUESTIONS  !== "undefined" ? ALERT_INVESTIGATION_QUESTIONS  : [],
    typeof CLOUD_DEVOPS_QUESTIONS         !== "undefined" ? CLOUD_DEVOPS_QUESTIONS         : [],
    typeof AI_AUTOMATION_SAFETY_QUESTIONS !== "undefined" ? AI_AUTOMATION_SAFETY_QUESTIONS : [],
    typeof IDENTITY_LOGINS_QUESTIONS      !== "undefined" ? IDENTITY_LOGINS_QUESTIONS      : [],
    typeof MALWARE_BASICS_QUESTIONS       !== "undefined" ? MALWARE_BASICS_QUESTIONS       : [],
  ];
  const pool = [].concat.apply([], banks);
  return pool.length ? pool : FALLBACK_QUESTIONS;
}

/* ── Node + state setup ────────────────────────────────────────────── */
const NODE_DEFS = [
  { id:"web",  icon:"🌐", name:"WEB SERVER",        role:"Public-facing services" },
  { id:"work", icon:"💻", name:"WORKSTATION BANK",  role:"Employee endpoints" },
  { id:"db",   icon:"🗄️", name:"CROWN JEWEL DB",    role:"Critical data — protect at all costs", critical:true },
];

const THREAT_NAMES = [
  "Phishing payload detected", "Brute-force burst", "Beaconing to rare domain",
  "Suspicious PowerShell", "Macro document opened", "Port scan inbound",
  "Credential stuffing", "Ransomware precursor", "Privilege escalation attempt",
];

let pool, state, loopHandle;

function freshState() {
  return {
    nodes: NODE_DEFS.map(d => ({ ...d, hp: 100, threat: null })),
    credits: 0,
    escalation: 0,
    timeLeft: SHIFT_SECONDS,
    nextSpawnAt: SHIFT_SECONDS - FIRST_SPAWN_AT,
    question: null,           // { node, q, shuffled, deadline }
    answered: 0, correct: 0,
    history: [],              // incident records for the After-Action Report
    won: false, endReason: "",
    over: false,
  };
}

/* ── Tiny DOM helpers ──────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
function fmtTime(s) { const m = Math.floor(s / 60); return m + ":" + String(Math.ceil(s) % 60).padStart(2, "0"); }

/* ── SIEM log ──────────────────────────────────────────────────────── */
function log(kind, msg) {
  const li = document.createElement("li");
  const t = new Date().toLocaleTimeString([], { hour12: false });
  li.innerHTML = `<span class="t">[${t}]</span> <span class="${kind}">${msg}</span>`;
  const ul = $("siem-log");
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 40) ul.removeChild(ul.lastChild);   // cap the log
}

/* ── Rendering ─────────────────────────────────────────────────────── */
function renderNodes() {
  const row = $("node-row");
  row.innerHTML = "";
  state.nodes.forEach(n => {
    const card = document.createElement("div");
    card.className = "node-card"
      + (n.threat ? " threatened" : "")
      + (state.question && state.question.node === n ? " selected" : "")
      + (n.hp <= 0 ? " dead" : "");
    const hpClass = n.hp > 60 ? "" : n.hp > 30 ? "mid" : "low";
    const threatHtml = n.threat
      ? `<span class="bad">⚠ ${n.threat.name}</span><br/><span class="threat-timer">detonates in ${Math.ceil(n.threat.expiresIn)}s — click to respond</span>`
      : `<span class="ok">● secure</span>`;
    card.innerHTML = `
      <div class="node-icon">${n.icon}</div>
      <div class="node-name">${n.name}</div>
      <div class="node-role">${n.role}</div>
      <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width:${Math.max(0, n.hp)}%"></div></div>
      <div class="hp-text">INTEGRITY ${Math.max(0, Math.round(n.hp))}%</div>
      <div class="threat-status">${threatHtml}</div>`;
    card.addEventListener("click", () => onNodeClick(n));
    row.appendChild(card);
  });
}

function renderHud() {
  $("hud-credits").textContent = state.credits;
  $("hud-escalation").textContent = Math.round(state.escalation) + "%";
  const fill = $("esc-fill");
  fill.style.width = Math.min(100, state.escalation) + "%";
  fill.classList.toggle("high", state.escalation >= 60);
  $("hud-timer").textContent = fmtTime(state.timeLeft);
}

/* ── Threats ───────────────────────────────────────────────────────── */
function spawnThreat() {
  const open = state.nodes.filter(n => !n.threat && n.hp > 0);
  if (!open.length) return;
  const node = open[Math.floor(Math.random() * open.length)];
  node.threat = {
    name: THREAT_NAMES[Math.floor(Math.random() * THREAT_NAMES.length)],
    expiresIn: THREAT_LIFETIME,
  };
  log("warn", `ALERT: ${node.threat.name} on ${node.name}`);
}

function detonate(node) {
  log("crit", `IMPACT: threat on ${node.name} was not handled (−${EXPIRE_DAMAGE} integrity, +${EXPIRE_ESCALATION}% escalation)`);
  node.threat = null;
  damage(node, EXPIRE_DAMAGE, EXPIRE_ESCALATION);
  // If this node's question was open and unanswered, log it as a timeout for the report.
  if (state.question && state.question.node === node) {
    if (!state.question.locked) {
      state.answered++;
      recordIncident(state.question, "timeout", null, -EXPIRE_DAMAGE, EXPIRE_ESCALATION);
    }
    closeQuestion();
  }
}

function damage(node, hp, esc) {
  node.hp = Math.max(0, node.hp - hp);
  state.escalation = Math.min(100, state.escalation + esc);
  if (node.hp <= 0) log("crit", `${node.name} is DOWN.`);
}

/* ── Questions ─────────────────────────────────────────────────────── */
function onNodeClick(node) {
  if (state.over || !node.threat || node.hp <= 0) return;
  if (state.question) return;                       // one incident at a time
  const q = pool[Math.floor(Math.random() * pool.length)];
  // Shuffle the options so the answer position varies.
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const untimed = responseSeconds === null;
  state.question = { node, q, order, untimed,
                     timeLeft: untimed ? Infinity : responseSeconds,
                     locked: false,
                     threatName: node.threat.name };   // kept for the report
  $("q-timer").textContent = untimed ? "∞" : responseSeconds + "s";

  $("q-idle").classList.add("hidden");
  $("q-active").classList.remove("hidden");
  $("q-node").textContent = "INCIDENT @ " + node.name;
  $("q-prompt").textContent = q.prompt;
  const box = $("q-options");
  box.innerHTML = "";
  order.forEach(origIdx => {
    const btn = document.createElement("button");
    btn.className = "q-option";
    btn.textContent = q.options[origIdx];
    btn.addEventListener("click", () => answer(origIdx, btn));
    box.appendChild(btn);
  });
  renderNodes();
}

// Record one finished incident for the After-Action Report.
function recordIncident(Q, outcome, selectedIdx, hpChange, escChange) {
  state.history.push({
    time: new Date().toLocaleTimeString([], { hour12: false }),
    node: Q.node.name,
    threat: Q.threatName,
    topic: Q.q.topic || "General",
    prompt: Q.q.prompt,
    options: Q.q.options.slice(),
    selected: selectedIdx === null ? null : Q.q.options[selectedIdx],
    correctAnswer: Q.q.options[Q.q.correct],
    outcome,                            // "correct" | "wrong" | "timeout"
    explain: Q.q.explain || "",
    hpChange, escChange,
    timerSetting: timerLabel(),     // which response timer was active
  });
}

// Short in-game feedback only — full explanations wait for the report.
function showFeedback(text, good) {
  const f = $("q-feedback");
  f.textContent = text;
  f.className = "q-feedback " + (good ? "good" : "bad");
}

function answer(origIdx, btn) {
  const Q = state.question;
  if (!Q || Q.locked) return;
  Q.locked = true;
  state.answered++;
  const node = Q.node;

  if (origIdx === Q.q.correct) {
    state.correct++;
    btn.classList.add("right");
    state.credits += CORRECT_CREDITS;
    node.hp = Math.min(100, node.hp + CORRECT_HEAL);
    node.threat = null;
    showFeedback("Mitigation successful.", true);
    recordIncident(Q, "correct", origIdx, +CORRECT_HEAL, 0);
    log("good", `RESOLVED: incident on ${node.name} contained (+${CORRECT_CREDITS} cr, +${CORRECT_HEAL} integrity)`);
  } else {
    btn.classList.add("wrong");
    node.threat = null;   // incident closed badly
    damage(node, WRONG_DAMAGE, WRONG_ESCALATION);
    showFeedback("Response failed.", false);
    recordIncident(Q, "wrong", origIdx, -WRONG_DAMAGE, WRONG_ESCALATION);
    log("crit", `MISTAKE: wrong response on ${node.name} (−${WRONG_DAMAGE} integrity, +${WRONG_ESCALATION}% escalation)`);
  }
  setTimeout(closeQuestion, 900);   // brief feedback flash, then clear
}

function questionTimeout() {
  const Q = state.question;
  if (!Q || Q.locked) return;
  Q.locked = true;
  state.answered++;
  const node = Q.node;
  node.threat = null;
  damage(node, WRONG_DAMAGE, WRONG_ESCALATION);
  showFeedback("Threat detonated.", false);
  recordIncident(Q, "timeout", null, -WRONG_DAMAGE, WRONG_ESCALATION);
  log("crit", `TIMEOUT: no response on ${node.name} (−${WRONG_DAMAGE} integrity, +${WRONG_ESCALATION}% escalation)`);
  setTimeout(closeQuestion, 900);
}

function closeQuestion() {
  state.question = null;
  $("q-active").classList.add("hidden");
  $("q-idle").classList.remove("hidden");
  $("q-feedback").className = "q-feedback hidden";
  renderNodes();
}

/* ── Win / lose ────────────────────────────────────────────────────── */
function endGame(won, reason) {
  state.over = true;
  state.won = won;
  state.endReason = reason;
  clearInterval(loopHandle);
  renderHud();
  renderNodes();
  log(won ? "good" : "crit", won ? "Shift ended. Network held." : "Shift failed: " + reason);

  // Training mode: show the full After-Action Report instead of the short overlay.
  if (aarEnabled) { renderAAR(); $("aar-overlay").classList.remove("hidden"); return; }

  const title = $("overlay-title");
  title.textContent = won ? "SHIFT SURVIVED ✔" : "NETWORK BREACHED ✖";
  title.classList.toggle("lose", !won);
  $("overlay-text").textContent = reason;
  const acc = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
  $("overlay-stats").innerHTML =
    `Credits earned: ${state.credits}<br/>` +
    `Incidents answered: ${state.answered} (${acc}% correct)<br/>` +
    `Final escalation: ${Math.round(state.escalation)}%`;
  $("soc-overlay").classList.remove("hidden");
}

/* ── After-Action Report ───────────────────────────────────────────── */
function missedIncidents() { return state.history.filter(h => h.outcome !== "correct"); }

// Topics ranked by how many questions were missed in them.
function weakestTopics() {
  const tally = {};
  missedIncidents().forEach(h => { tally[h.topic] = (tally[h.topic] || 0) + 1; });
  return Object.entries(tally).sort((a, b) => b[1] - a[1]);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderAAR() {
  const wrong    = state.history.filter(h => h.outcome === "wrong").length;
  const timeouts = state.history.filter(h => h.outcome === "timeout").length;

  const res = $("aar-result");
  res.textContent = state.won ? "SHIFT SURVIVED ✔" : "SHIFT FAILED ✖ — " + state.endReason;
  res.className = "aar-result " + (state.won ? "win" : "lose");

  $("aar-summary").innerHTML =
    `Total incidents handled: <b>${state.history.length}</b><br/>` +
    `Successful mitigations: <b>${state.correct}</b> · Wrong responses: <b>${wrong}</b> · Timeouts: <b>${timeouts}</b><br/>` +
    `Credits earned: <b>${state.credits}</b> · Final escalation: <b>${Math.round(state.escalation)}%</b><br/>` +
    `Response timer: <b>${timerLabel()}</b><br/>` +
    `Node integrity: ` + state.nodes.map(n => `${escapeHtml(n.name)} <b>${Math.max(0, Math.round(n.hp))}%</b>`).join(" · ");

  const topics = weakestTopics();
  $("aar-topics").innerHTML = topics.length
    ? `<div class="t-title">WEAKEST TOPICS — REVIEW THESE</div>` +
      topics.map(([t, n]) => `⚠ ${escapeHtml(t)} — ${n} missed`).join("<br/>")
    : `<div class="t-title">WEAKEST TOPICS</div>No missed questions. Clean shift, analyst. 🏅`;

  const missed = missedIncidents();
  $("aar-missed").innerHTML =
    `<div class="t-title">POST-INCIDENT REVIEW — MISSED QUESTIONS (${missed.length})</div>` +
    (missed.length === 0 ? `<span class="m-why">Nothing to review.</span>` :
      missed.map(h => `
        <div class="aar-miss">
          <div class="m-head">[${h.time}] ${escapeHtml(h.threat)} @ ${escapeHtml(h.node)} — ${h.outcome.toUpperCase()}</div>
          <div class="m-q">Q: ${escapeHtml(h.prompt)}</div>
          <div class="m-you">Your answer: ${h.selected === null ? "(no response)" : escapeHtml(h.selected)}</div>
          <div class="m-ans">Correct: ${escapeHtml(h.correctAnswer)}</div>
          ${h.explain ? `<div class="m-why">Why: ${escapeHtml(h.explain)}</div>` : ""}
          <div class="m-topic">Topic to review: ${escapeHtml(h.topic)}</div>
        </div>`).join(""));
}

// Plain-Markdown version of the report for the Copy button.
function buildReportText() {
  const wrong    = state.history.filter(h => h.outcome === "wrong").length;
  const timeouts = state.history.filter(h => h.outcome === "timeout").length;
  const L = [];
  L.push("# SOC Dashboard — After-Action Report");
  L.push("");
  L.push(`**Result:** ${state.won ? "Shift survived" : "Shift failed — " + state.endReason}`);
  L.push(`**Incidents:** ${state.history.length} total — ${state.correct} mitigated, ${wrong} wrong, ${timeouts} timed out`);
  L.push(`**Credits:** ${state.credits} · **Final escalation:** ${Math.round(state.escalation)}%`);
  L.push(`**Response timer:** ${timerLabel()}`);
  L.push(`**Node integrity:** ` + state.nodes.map(n => `${n.name} ${Math.max(0, Math.round(n.hp))}%`).join(", "));
  const topics = weakestTopics();
  if (topics.length) {
    L.push("");
    L.push("## Weakest topics");
    topics.forEach(([t, n]) => L.push(`- ${t} (${n} missed)`));
  }
  const missed = missedIncidents();
  if (missed.length) {
    L.push("");
    L.push("## Missed questions");
    missed.forEach(h => {
      L.push(`### [${h.time}] ${h.threat} @ ${h.node} (${h.outcome})`);
      L.push(`- Q: ${h.prompt}`);
      L.push(`- Your answer: ${h.selected === null ? "(no response)" : h.selected}`);
      L.push(`- Correct: ${h.correctAnswer}`);
      if (h.explain) L.push(`- Why: ${h.explain}`);
      L.push(`- Topic to review: ${h.topic}`);
    });
  }
  return L.join("\n");
}

function copyReport() {
  const text = buildReportText();
  const done = () => {
    const b = $("btn-copy-report");
    b.textContent = "✔ COPIED";
    b.classList.add("copied");
    setTimeout(() => { b.textContent = "⧉ COPY REPORT"; b.classList.remove("copied"); }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  done();
}

function toggleAar() {
  aarEnabled = !aarEnabled;
  const s = $("aar-state");
  s.textContent = aarEnabled ? "ON" : "OFF";
  s.className = aarEnabled ? "on" : "off";
  log("info", "After-Action Report " + (aarEnabled ? "enabled" : "disabled") + ".");
}

/* ── Main loop ─────────────────────────────────────────────────────── */
function tick() {
  if (state.over) return;
  const dt = TICK_MS / 1000;
  state.timeLeft -= dt;

  // Spawn threats on a fixed cadence.
  if (state.timeLeft <= state.nextSpawnAt) {
    spawnThreat();
    state.nextSpawnAt -= SPAWN_EVERY;
  }

  // Count down active threats. (Exception: in "No timer" mode the node being
  // actively worked on is frozen, so the player can read at their own pace.)
  state.nodes.forEach(n => {
    if (n.threat) {
      const beingHandledUntimed = state.question && state.question.node === n && state.question.untimed;
      if (!beingHandledUntimed) {
        n.threat.expiresIn -= dt;
        if (n.threat.expiresIn <= 0) detonate(n);
      }
    }
  });

  // Count down the active question (skipped entirely in "No timer" mode).
  if (state.question && !state.question.locked && !state.question.untimed) {
    state.question.timeLeft -= dt;
    $("q-timer").textContent = Math.max(0, Math.ceil(state.question.timeLeft)) + "s";
    if (state.question.timeLeft <= 0) questionTimeout();
  }

  // End conditions.
  const db = state.nodes.find(n => n.id === "db");
  if (db.hp <= 0)                return endGame(false, "The Crown Jewel Database was destroyed.");
  if (state.escalation >= 100)   return endGame(false, "Escalation reached 100% — the breach went public.");
  if (state.timeLeft <= 0) { state.timeLeft = 0; return endGame(true, "You held the network for the full shift."); }

  renderHud();
  renderNodes();
}

/* ── Start / restart ───────────────────────────────────────────────── */
function start() {
  state = freshState();
  $("soc-overlay").classList.add("hidden");
  $("aar-overlay").classList.add("hidden");
  $("siem-log").innerHTML = "";
  closeQuestion();
  log("info", `Shift started. Question pool: ${pool.length} questions.`);
  renderHud();
  renderNodes();
  clearInterval(loopHandle);
  loopHandle = setInterval(tick, TICK_MS);
}

pool = buildPool();
$("btn-restart").addEventListener("click", start);
$("btn-aar-restart").addEventListener("click", start);
$("btn-copy-report").addEventListener("click", copyReport);
$("btn-aar").addEventListener("click", toggleAar);
$("timer-select").addEventListener("change", e => {
  responseSeconds = e.target.value === "none" ? null : parseInt(e.target.value, 10);
  log("info", `Response timer set to ${timerLabel()}. Applies to the next incident.`);
});
start();
