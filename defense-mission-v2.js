// defense-mission-v2.js — Network Defense Mission v2 (MVP prototype).
// Tower-defense on a fixed Blue-Team topology: threat packets travel
// Gateway → DMZ → Switch → Workstations → Crown Jewel DB. The player builds
// layer-matched controls (NGFW / WAF / EDR) by answering real bank questions.
// Pure vanilla JS. Standalone — does not touch the main game or SOC dashboard.

"use strict";

/* ── Tunables ──────────────────────────────────────────────────────── */
const SHIFT_SECONDS    = 120;   // survive this long to win
const TICK_MS          = 100;   // game loop resolution
const START_CREDITS    = 100;
const BUILD_COST       = 30;
const INTERCEPT_REWARD = 5;     // credits per intercepted packet
const PACKET_TRAVEL_S  = 18;    // seconds for a packet to cross the whole path
const SPAWN_EVERY_S    = 6;     // base seconds between packet spawns
const SPAWN_MIN_S      = 3.5;   // spawn interval floor as pressure ramps up
const QUESTION_SECONDS = 20;
const BREACH_DB_DAMAGE = 15;    // packet reaching the Crown Jewel DB
const BREACH_ESCALATION= 8;
const FAIL_NODE_DAMAGE = 10;    // wrong answer / timeout while building
const FAIL_ESCALATION  = 10;
const BUILD_HEAL       = 5;     // nearby node integrity restored on build
const SLOT_LOCK_S      = 10;    // failed-build slot lockout

/* ── Topology ──────────────────────────────────────────────────────── */
// x = percent across the map; packets enter at 3% and exit at 97%.
const NODE_DEFS = [
  { id:"gw",   icon:"🚪", name:"GATEWAY",        x: 8  },
  { id:"dmz",  icon:"🌐", name:"EDGE DMZ",       x: 29 },
  { id:"sw",   icon:"🔀", name:"INT. SWITCH",    x: 50 },
  { id:"ws",   icon:"💻", name:"WORKSTATIONS",   x: 71 },
  { id:"db",   icon:"🗄️", name:"CROWN JEWEL DB", x: 92, crown:true },
];

// Defense slots: NET early, APP mid, HOST late — matching real layering.
const SLOT_DEFS = [
  { id:"s1", layer:"net",  x: 18, side:"above" },
  { id:"s2", layer:"net",  x: 39, side:"below" },
  { id:"s3", layer:"app",  x: 50, side:"above" },
  { id:"s4", layer:"app",  x: 60, side:"below" },
  { id:"s5", layer:"host", x: 78, side:"above" },
  { id:"s6", layer:"host", x: 84, side:"below" },
];

// One tool per slot layer (MVP: build only, no upgrade tree).
const TOOLS = {
  net:  { name:"NGFW",  label:"Network Firewall (NGFW)", blurb:"Filters network-layer traffic: scans, brute force, suspicious DNS." },
  app:  { name:"WAF",   label:"Web App Firewall (WAF)",  blurb:"Inspects web requests: SQL injection, XSS, malicious payloads." },
  host: { name:"EDR",   label:"Endpoint D&R (EDR)",      blurb:"Watches host behavior: malware, ransomware precursors, rogue scripts." },
};

// Threat catalog by layer.
const THREATS = {
  net:  ["Port scan", "Suspicious DNS burst", "Brute-force traffic"],
  app:  ["SQL injection attempt", "XSS payload", "Suspicious web request"],
  host: ["Malware callback", "Ransomware precursor", "Suspicious PowerShell"],
};
const LAYER_LABEL = { net:"Network", app:"Application", host:"Host" };

/* ── Question pools (topic-matched, real banks; fallback if missing) ── */
// Identity & Logins / AI & Automation Safety are reserved for future
// identity- and automation-themed threats; not used by the three MVP layers.
const LAYER_TOPICS = {
  net:  ["Networking Basics", "Defending Systems"],
  app:  ["Attacking Concepts", "Cloud & DevOps"],
  host: ["Malware Basics", "Alert Investigation"],
};

const FALLBACK_QUESTIONS = [
  { prompt:"What does a firewall mainly do?", options:["Filters network traffic by rules","Backs up files nightly","Speeds up the internet","Designs web pages"], correct:0, topic:"Networking Basics", explain:"Firewalls allow or block traffic according to configured rules." },
  { prompt:"SQL injection targets…", options:["The power supply","Database queries built from unsafe input","The monitor cable","The keyboard layout"], correct:1, topic:"Attacking Concepts", explain:"Injection abuses unsanitized input that reaches a database query." },
  { prompt:"EDR tools primarily watch…", options:["Weather data","Stock prices","Endpoint behavior like processes and files","Printer queues"], correct:2, topic:"Malware Basics", explain:"EDR records and responds to suspicious behavior on hosts." },
];

function allBanks() {
  return [
    typeof NETWORKING_BASICS_QUESTIONS    !== "undefined" ? NETWORKING_BASICS_QUESTIONS    : [],
    typeof DEFENDING_SYSTEMS_QUESTIONS    !== "undefined" ? DEFENDING_SYSTEMS_QUESTIONS    : [],
    typeof ATTACKING_CONCEPTS_QUESTIONS   !== "undefined" ? ATTACKING_CONCEPTS_QUESTIONS   : [],
    typeof ALERT_INVESTIGATION_QUESTIONS  !== "undefined" ? ALERT_INVESTIGATION_QUESTIONS  : [],
    typeof CLOUD_DEVOPS_QUESTIONS         !== "undefined" ? CLOUD_DEVOPS_QUESTIONS         : [],
    typeof AI_AUTOMATION_SAFETY_QUESTIONS !== "undefined" ? AI_AUTOMATION_SAFETY_QUESTIONS : [],
    typeof IDENTITY_LOGINS_QUESTIONS      !== "undefined" ? IDENTITY_LOGINS_QUESTIONS      : [],
    typeof MALWARE_BASICS_QUESTIONS       !== "undefined" ? MALWARE_BASICS_QUESTIONS       : [],
  ];
}

// pools.net / pools.app / pools.host — questions filtered by mapped topics.
function buildPools() {
  const flat = [].concat.apply([], allBanks());
  const pools = {};
  for (const layer of Object.keys(LAYER_TOPICS)) {
    pools[layer] = flat.filter(q => LAYER_TOPICS[layer].includes(q.topic));
    if (!pools[layer].length) pools[layer] = FALLBACK_QUESTIONS;   // safety net
  }
  return pools;
}

/* ── State ─────────────────────────────────────────────────────────── */
let pools, state, loopHandle;

function freshState() {
  return {
    credits: START_CREDITS,
    escalation: 0,
    timeLeft: SHIFT_SECONDS,
    nodes: NODE_DEFS.map(d => ({ ...d, hp: 100 })),
    slots: SLOT_DEFS.map(d => ({ ...d, built: false, lockedFor: 0 })),
    packets: [],                 // { id, layer, name, progress(0..1), el, passed:Set }
    nextSpawnIn: 2,              // first packet after 2s
    spawnEvery: SPAWN_EVERY_S,
    packetSeq: 0,
    question: null,              // { slot, q, timeLeft, locked }
    selectedSlot: null,
    stats: { spawned: 0, intercepted: 0, breached: 0, bypassed: 0, builds: 0, answered: 0, correct: 0 },
    over: false,
  };
}

/* ── DOM helpers ───────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmtTime = s => Math.floor(s / 60) + ":" + String(Math.ceil(s) % 60).padStart(2, "0");

function log(kind, msg) {
  const li = document.createElement("li");
  const t = new Date().toLocaleTimeString([], { hour12: false });
  li.innerHTML = `<span class="t">[${t}]</span> <span class="${kind}">${msg}</span>`;
  const ul = $("siem-log");
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 50) ul.removeChild(ul.lastChild);
}

/* ── Map rendering ─────────────────────────────────────────────────── */
function buildMap() {
  const map = $("map");
  // wipe everything except the path line
  [...map.querySelectorAll(".node, .slot, .packet")].forEach(e => e.remove());

  state.nodes.forEach(n => {
    const el = document.createElement("div");
    el.className = "node" + (n.crown ? " crown" : "");
    el.style.left = n.x + "%";
    el.innerHTML = `<div class="n-icon">${n.icon}</div><div class="n-name">${n.name}</div>
                    <div class="n-bar"><div class="n-fill" style="width:100%"></div></div>`;
    map.appendChild(el);
    n.el = el;
  });

  state.slots.forEach(s => {
    const el = document.createElement("div");
    el.className = `slot ${s.side}`;
    el.style.left = s.x + "%";
    el.innerHTML = `<div class="s-type ${s.layer}">${s.layer.toUpperCase()} SLOT</div>
                    <div class="s-tool">[ empty ]</div>`;
    el.addEventListener("click", () => onSlotClick(s));
    map.appendChild(el);
    s.el = el;
  });
}

function renderNodes() {
  state.nodes.forEach(n => {
    const fill = n.el.querySelector(".n-fill");
    fill.style.width = Math.max(0, n.hp) + "%";
    fill.className = "n-fill" + (n.hp > 60 ? "" : n.hp > 30 ? " mid" : " low");
  });
}

function renderSlot(s) {
  s.el.classList.toggle("built", s.built);
  s.el.classList.toggle("locked", s.lockedFor > 0);
  s.el.classList.toggle("selected", state.selectedSlot === s);
  s.el.querySelector(".s-tool").textContent =
    s.built ? "🛡 " + TOOLS[s.layer].name :
    s.lockedFor > 0 ? `locked ${Math.ceil(s.lockedFor)}s` : "[ empty ]";
}

function renderHud() {
  $("hud-credits").textContent = state.credits;
  $("hud-escalation").textContent = Math.round(state.escalation) + "%";
  const fill = $("esc-fill");
  fill.style.width = Math.min(100, state.escalation) + "%";
  fill.classList.toggle("high", state.escalation >= 60);
  $("hud-timer").textContent = fmtTime(state.timeLeft);
}

/* ── Packets ───────────────────────────────────────────────────────── */
function spawnPacket() {
  const layers = ["net", "app", "host"];
  const layer = layers[Math.floor(Math.random() * layers.length)];
  const name = THREATS[layer][Math.floor(Math.random() * THREATS[layer].length)];
  const el = document.createElement("div");
  el.className = "packet " + layer;
  el.textContent = layer[0].toUpperCase();
  el.title = name;
  $("map").appendChild(el);
  const p = { id: ++state.packetSeq, layer, name, progress: 0, el, passed: new Set() };
  state.packets.push(p);
  state.stats.spawned++;
  log("warn", `INBOUND: ${name} (${LAYER_LABEL[layer]} threat) entered at the Gateway`);
}

// Map progress (0..1) to percent across the map (path runs 3%..97%).
const progressToX = pr => 3 + pr * 94;

function movePackets(dt) {
  for (const p of [...state.packets]) {
    p.progress += dt / PACKET_TRAVEL_S;
    const x = progressToX(p.progress);
    p.el.style.left = x + "%";

    // slot checks — each slot evaluates a packet once, as it passes
    for (const s of state.slots) {
      if (p.passed.has(s.id) || x < s.x) continue;
      p.passed.add(s.id);
      if (!s.built) continue;
      const tool = TOOLS[s.layer].name;
      if (s.layer === p.layer) {
        // matching layer → intercepted
        state.stats.intercepted++;
        state.credits += INTERCEPT_REWARD;
        log("good", `INTERCEPT: ${tool} blocked ${p.name} (+${INTERCEPT_REWARD} cr)`);
        removePacket(p);
        break;
      } else {
        // wrong layer → bypass, exactly as in real defense-in-depth gaps
        state.stats.bypassed++;
        log("warn", `Layer mismatch: ${LAYER_LABEL[p.layer]} threat bypassed ${tool}`);
      }
    }

    // reached the Crown Jewel DB
    if (p.progress >= 1 && state.packets.includes(p)) {
      const db = state.nodes.find(n => n.id === "db");
      db.hp = Math.max(0, db.hp - BREACH_DB_DAMAGE);
      state.escalation = Math.min(100, state.escalation + BREACH_ESCALATION);
      state.stats.breached++;
      log("crit", `BREACH: ${p.name} hit the Crown Jewel DB (−${BREACH_DB_DAMAGE} integrity, +${BREACH_ESCALATION}% escalation)`);
      removePacket(p);
    }
  }
}

function removePacket(p) {
  p.el.remove();
  state.packets = state.packets.filter(x => x !== p);
}

/* ── Triage console: build flow ────────────────────────────────────── */
function onSlotClick(slot) {
  if (state.over || slot.built || slot.lockedFor > 0) return;
  if (state.question) return;            // finish the current question first
  state.selectedSlot = slot;
  const tool = TOOLS[slot.layer];
  $("t-idle").classList.add("hidden");
  $("t-question").classList.add("hidden");
  $("t-offer").classList.remove("hidden");
  $("t-offer-title").textContent = `${slot.layer.toUpperCase()} SLOT — deploy ${tool.label}`;
  $("t-offer-text").textContent =
    `${tool.blurb} Cost: ${BUILD_COST} credits. Building requires passing a ` +
    `${LAYER_TOPICS[slot.layer].join(" / ")} knowledge check.`;
  const btn = $("btn-build");
  btn.textContent = `BUILD ${tool.name} (−${BUILD_COST} cr)`;
  btn.disabled = state.credits < BUILD_COST;
  state.slots.forEach(renderSlot);
}

function closeConsole() {
  state.selectedSlot = null;
  state.question = null;
  $("t-offer").classList.add("hidden");
  $("t-question").classList.add("hidden");
  $("t-idle").classList.remove("hidden");
  $("q-feedback").className = "q-feedback hidden";
  state.slots.forEach(renderSlot);
}

function startQuestion() {
  const slot = state.selectedSlot;
  if (!slot || state.credits < BUILD_COST) return;
  const pool = pools[slot.layer];
  const q = pool[Math.floor(Math.random() * pool.length)];
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  state.question = { slot, q, order, timeLeft: QUESTION_SECONDS, locked: false };

  $("t-offer").classList.add("hidden");
  $("t-question").classList.remove("hidden");
  $("q-context").textContent = `KNOWLEDGE CHECK — ${TOOLS[slot.layer].name} @ ${slot.layer.toUpperCase()} slot`;
  $("q-timer").textContent = QUESTION_SECONDS + "s";
  $("q-prompt").textContent = q.prompt;
  const box = $("q-options");
  box.innerHTML = "";
  order.forEach(origIdx => {
    const b = document.createElement("button");
    b.className = "q-option";
    b.textContent = q.options[origIdx];
    b.addEventListener("click", () => answer(origIdx, b));
    box.appendChild(b);
  });
}

function nearestNode(slot) {
  let best = state.nodes[0], dist = Infinity;
  for (const n of state.nodes) {
    const d = Math.abs(n.x - slot.x);
    if (d < dist) { dist = d; best = n; }
  }
  return best;
}

function answer(origIdx, btn) {
  const Q = state.question;
  if (!Q || Q.locked) return;
  Q.locked = true;
  state.stats.answered++;
  const slot = Q.slot, node = nearestNode(slot);

  if (origIdx === Q.q.correct) {
    state.stats.correct++;
    state.stats.builds++;
    btn.classList.add("right");
    state.credits -= BUILD_COST;
    slot.built = true;
    node.hp = Math.min(100, node.hp + BUILD_HEAL);
    showFeedback(`${TOOLS[slot.layer].name} deployed.`, true);
    log("good", `DEPLOYED: ${TOOLS[slot.layer].name} on ${slot.layer.toUpperCase()} slot (−${BUILD_COST} cr, +${BUILD_HEAL} ${node.name} integrity)`);
  } else {
    btn.classList.add("wrong");
    failBuild(slot, node, "Deployment failed.");
  }
  setTimeout(closeConsole, 900);
}

function questionTimeout() {
  const Q = state.question;
  if (!Q || Q.locked) return;
  Q.locked = true;
  state.stats.answered++;
  failBuild(Q.slot, nearestNode(Q.slot), "Deployment timed out.");
  setTimeout(closeConsole, 900);
}

function failBuild(slot, node, msg) {
  slot.lockedFor = SLOT_LOCK_S;
  node.hp = Math.max(0, node.hp - FAIL_NODE_DAMAGE);
  state.escalation = Math.min(100, state.escalation + FAIL_ESCALATION);
  showFeedback(msg, false);
  log("crit", `FAILED BUILD: misconfiguration on ${slot.layer.toUpperCase()} slot (−${FAIL_NODE_DAMAGE} ${node.name} integrity, +${FAIL_ESCALATION}% escalation, slot locked ${SLOT_LOCK_S}s)`);
}

function showFeedback(text, good) {
  const f = $("q-feedback");
  f.textContent = text;
  f.className = "q-feedback " + (good ? "good" : "bad");
}

/* ── Win / lose ────────────────────────────────────────────────────── */
function endGame(won, reason) {
  state.over = true;
  clearInterval(loopHandle);
  renderHud(); renderNodes();
  const title = $("overlay-title");
  title.textContent = won ? "NETWORK HELD ✔" : "NETWORK BREACHED ✖";
  title.classList.toggle("lose", !won);
  $("overlay-text").textContent = reason;
  const st = state.stats;
  $("overlay-stats").innerHTML =
    `Threats spawned: ${st.spawned} · intercepted: ${st.intercepted} · breached: ${st.breached}<br/>` +
    `Layer-mismatch bypasses: ${st.bypassed}<br/>` +
    `Defenses built: ${st.builds} · knowledge checks: ${st.answered} (${st.correct} passed)<br/>` +
    `Credits left: ${state.credits} · final escalation: ${Math.round(state.escalation)}%`;
  $("dm-overlay").classList.remove("hidden");
  log(won ? "good" : "crit", won ? "Shift complete. The Crown Jewel DB survived." : "Mission failed: " + reason);
}

/* ── Main loop ─────────────────────────────────────────────────────── */
function tick() {
  if (state.over) return;
  const dt = TICK_MS / 1000;
  state.timeLeft -= dt;

  // spawn pressure ramps up slowly over the shift
  state.nextSpawnIn -= dt;
  if (state.nextSpawnIn <= 0) {
    spawnPacket();
    state.spawnEvery = Math.max(SPAWN_MIN_S, state.spawnEvery - 0.15);
    state.nextSpawnIn = state.spawnEvery;
  }

  movePackets(dt);

  // slot lockout countdowns
  state.slots.forEach(s => {
    if (s.lockedFor > 0) { s.lockedFor = Math.max(0, s.lockedFor - dt); renderSlot(s); }
  });

  // question countdown
  if (state.question && !state.question.locked) {
    state.question.timeLeft -= dt;
    $("q-timer").textContent = Math.max(0, Math.ceil(state.question.timeLeft)) + "s";
    if (state.question.timeLeft <= 0) questionTimeout();
  }

  // end conditions
  const db = state.nodes.find(n => n.id === "db");
  if (db.hp <= 0)              return endGame(false, "The Crown Jewel Database was destroyed.");
  if (state.escalation >= 100) return endGame(false, "Escalation reached 100% — incident went public.");
  if (state.timeLeft <= 0) { state.timeLeft = 0; return endGame(true, "You held the network for the full shift."); }

  renderHud();
  renderNodes();
}

/* ── Start / restart ───────────────────────────────────────────────── */
function start() {
  state = freshState();
  $("dm-overlay").classList.add("hidden");
  $("siem-log").innerHTML = "";
  buildMap();
  closeConsole();
  state.slots.forEach(renderSlot);
  renderHud(); renderNodes();
  const real = pools.net !== FALLBACK_QUESTIONS;
  log("info", `Mission start. Question pools — NET:${pools.net.length} APP:${pools.app.length} HOST:${pools.host.length}${real ? "" : " (fallback)"}`);
  log("info", "Build layer-matched defenses: NGFW vs Network, WAF vs Application, EDR vs Host threats.");
  clearInterval(loopHandle);
  loopHandle = setInterval(tick, TICK_MS);
}

pools = buildPools();
$("btn-build").addEventListener("click", startQuestion);
$("btn-cancel").addEventListener("click", closeConsole);
$("btn-restart").addEventListener("click", start);
start();
