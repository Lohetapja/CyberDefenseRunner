// app.js — Cyber Defense Runner
// Correctness is always: chosen === q.correct  (deterministic, no AI, no randomness)

// ── Core config ───────────────────────────────────────────────────────────────

const CONFIG = {
  startHealth:        100,
  maxHealth:          100,
  startAttackerLevel: 1,
  scorePerCorrect:    100,
  scoreAttackerBonus: 10,
  healthGainCorrect:  4,
  damageBase:         12,
  damagePerLevel:     6     // damage = damageBase + damagePerLevel * attackerLevel
};

// ── Topic / cert-track data ───────────────────────────────────────────────────

// Topic strings match the eight validated question banks AND the Learning Path names.
const TOPIC_ORDER = [
  "Networking Basics", "Defending Systems", "Attacking Concepts", "Alert Investigation",
  "Cloud & DevOps", "AI & Automation Safety", "Identity & Logins", "Malware Basics"
];

const STUDY_RECS = {
  "Networking Basics":      "Review IP addressing, subnets, DNS, DHCP, common ports, routing, NAT, and basic traffic flow.",
  "Defending Systems":      "Review firewalls, IDS/IPS, EDR, patching, backups, hardening, logging, monitoring, and least privilege.",
  "Attacking Concepts":     "Review recon, phishing, exploitation, privilege escalation, lateral movement, persistence, C2, and exfiltration.",
  "Alert Investigation":    "Review triage, severity, false positives, evidence, timelines, process trees, and what a SOC analyst should ask.",
  "Cloud & DevOps":         "Review shared responsibility, IAM, storage, containers, CI/CD, secrets, infrastructure as code, and deployment safety.",
  "AI & Automation Safety": "Review AI tool risks, prompt injection, secret exposure, human approval gates, least privilege, and verifying AI output.",
  "Identity & Logins":      "Review authentication, authorization, MFA, passwords, sessions, tokens, credential theft, and least privilege.",
  "Malware Basics":         "Review malware types, persistence, suspicious process behavior, IOCs, sandboxing, and containment basics."
};

// Each Learning Path maps to its own topic bank (1:1). Mixed (null) draws from all topics.
// Visible label === data-value === key here.
const CERT_TRACK_TOPICS = {
  "Mixed":                  null,
  "Networking Basics":      ["Networking Basics"],
  "Defending Systems":      ["Defending Systems"],
  "Attacking Concepts":     ["Attacking Concepts"],
  "Alert Investigation":    ["Alert Investigation"],
  "Cloud & DevOps":         ["Cloud & DevOps"],
  "AI & Automation Safety": ["AI & Automation Safety"],
  "Identity & Logins":      ["Identity & Logins"],
  "Malware Basics":         ["Malware Basics"],
};

// ── Network Defense Lane ──────────────────────────────────────────────────────

const LANE_NODES = [
  { name: "Internet",          abbr: "INET" },
  { name: "Firewall",          abbr: "FW"   },
  { name: "Switch",            abbr: "SW"   },
  { name: "Workstation",       abbr: "WS"   },
  { name: "Server",            abbr: "SRV"  },
  { name: "Domain Controller", abbr: "DC"   }
];

const LANE_LAST = LANE_NODES.length - 1; // index of Domain Controller

// Credits earned for a correct answer, by tier
const CREDIT_BY_TIER = { "Beginner": 10, "Intermediate": 15, "Advanced": 25 };

// Shop upgrade definitions
const SHOP_UPGRADES = {
  firewall: { label: "Firewall Rule",  cost: 40 },
  ids:      { label: "IDS Sensor",     cost: 50 },
  patch:    { label: "Patch System",   cost: 60 },
  edr:      { label: "EDR Shield",     cost: 75 }
};

// ── Tower Defense — Blue Team Bastion ────────────────────────────────────────

const TD_PATH = [
  { id: 'inet', icon: '🌐', name: 'Internet' },
  { id: 'rtr',  icon: '📡', name: 'Edge Router' },
  { id: 'fw',   icon: '🧱', name: 'Firewall' },
  { id: 'sw',   icon: '🔀', name: 'Internal Switch' },
  { id: 'srv',  icon: '🖥️', name: 'Server' },
  { id: 'dc',   icon: '🏰', name: 'Domain Controller' },
];

const TD_SLOTS = [
  { id: 'slot1', nearNode: 0, label: 'T1' },
  { id: 'slot2', nearNode: 2, label: 'T2' },
  { id: 'slot3', nearNode: 3, label: 'T3' },
  { id: 'slot4', nearNode: 4, label: 'T4' },
];

// Beginner-friendly zones — visual grouping only (no logic change)
const TD_ZONES = [
  { id: 'external',  name: 'External Zone',     sub: 'Attacker starts here', nodes: [0]    },
  { id: 'perimeter', name: 'Perimeter Defense', sub: 'First security layer', nodes: [1, 2] },
  { id: 'internal',  name: 'Internal Network',  sub: 'Company systems',      nodes: [3, 4] },
  { id: 'critical',  name: 'Critical Assets',   sub: 'Protect this',         nodes: [5]    },
];

const TD_TOWER_DEFS = {
  firewall: { name: 'Firewall Tower', cost: 50, damage: 25, range: 1, attackEveryTicks: 4 }
};

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_MESSAGES = {
  idle:    "Monitoring traffic...",
  correct: "Threat contained.",
  wrong:   "Breach pressure rising.",
  victory: "Network secured.",
  defeat:  "Defenses failed."
};

let avatarTimer = null;

function setAvatarState(stateName) {
  const avatarEl = el("avatar");
  const statusEl = el("avatar-status");
  if (!avatarEl || !statusEl) return;
  avatarEl.className = `avatar avatar--${stateName}`;
  statusEl.textContent = AVATAR_MESSAGES[stateName] || "";
}

function triggerAvatarReaction(isCorrect) {
  if (avatarTimer) clearTimeout(avatarTimer);
  setAvatarState(isCorrect ? "correct" : "wrong");
  avatarTimer = setTimeout(() => setAvatarState("idle"), 2200);
}

// ── Game state ────────────────────────────────────────────────────────────────

let state = {};

function initState(questions) {
  const topicStats = {};
  TOPIC_ORDER.forEach(t => { topicStats[t] = { correct: 0, total: 0 }; });

  state = {
    // Core game
    health:           CONFIG.startHealth,
    score:            0,
    wave:             0,
    attackerLevel:    CONFIG.startAttackerLevel,
    correctAnswers:   0,
    wrongAnswers:     0,
    upgrades:         [],       // defensive module chips (from correct answers)
    topicStats,
    questions,
    answered:         false,
    gameOver:         false,
    won:              false,

    // Defense lane
    credits:          0,
    attackerPosition: 0,        // 0=Internet … 5=Domain Controller (fail)
    shieldCharges:    0,        // EDR Shield: absorbs one wrong-answer damage hit
    firewallSlowActive: false,  // Firewall Rule: blocks next attacker movement
    idsHintAvailable: false,    // IDS Sensor: allows eliminating one wrong option
    defensePurchases: [],       // names of upgrades bought this session

    // Tower Defense (Blue Team Bastion)
    tdSelectedTower: null,      // tower type currently selected for placement
    tdTowers:        {},        // slotId → { type, attackTicks }
    tdEnemies:       [],        // active enemies on the path
    tdWaveActive:    false,
    tdLoopId:        null,      // setInterval handle
    tdIntegrity:     3,         // Domain Controller integrity (lives)
    tdEnemyCounter:  0          // monotonic enemy ID
  };
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

const el = id => document.getElementById(id);

const SCREENS = {
  start:  el("screen-start"),
  game:   el("screen-game"),
  report: el("screen-report")
};

function showScreen(name) {
  Object.values(SCREENS).forEach(s => s.classList.remove("active"));
  SCREENS[name].classList.add("active");
}

// ── Filters ───────────────────────────────────────────────────────────────────

function getActiveFilter(groupId) {
  const group = el(groupId);
  const active = group && group.querySelector(".fbtn.active");
  return active ? active.dataset.value : null;
}

function buildFilteredQuestions() {
  const certTrack = getActiveFilter("filter-cert")  || "Mixed";
  const tier      = getActiveFilter("filter-tier")  || "All";
  const waveCount = parseInt(getActiveFilter("filter-waves") || "40", 10);
  const topicEl   = el("filter-topic");
  const topic     = topicEl ? topicEl.value : "all";

  let pool = [...QUESTIONS];

  const trackTopics = CERT_TRACK_TOPICS[certTrack];
  if (trackTopics) pool = pool.filter(q => trackTopics.includes(q.topic));
  if (topic !== "all") pool = pool.filter(q => q.topic === topic);
  if (tier  !== "All") pool = pool.filter(q => q.tier  === tier);

  if (pool.length < waveCount) {
    showFilterWarning(pool.length, waveCount);
    return null;
  }

  hideFilterWarning();
  return pool.slice(0, waveCount);
}

function showFilterWarning(found, needed) {
  const w = el("filter-warning");
  if (!w) return;
  w.textContent = `Only ${found} question${found !== 1 ? "s" : ""} match your filters — need at least ${needed}. Adjust your selection.`;
  w.classList.remove("hidden");
}

function hideFilterWarning() {
  const w = el("filter-warning");
  if (w) w.classList.add("hidden");
}

document.querySelectorAll(".filter-btngroup").forEach(group => {
  group.addEventListener("click", e => {
    const btn = e.target.closest(".fbtn");
    if (!btn) return;
    group.querySelectorAll(".fbtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    hideFilterWarning();
  });
});

const topicSelect = el("filter-topic");
if (topicSelect) topicSelect.addEventListener("change", hideFilterWarning);

// ── HUD ───────────────────────────────────────────────────────────────────────

function updateHUD() {
  const hp  = Math.max(0, state.health);
  const pct = (hp / CONFIG.maxHealth) * 100;
  const bar = el("health-bar");

  el("health-value").textContent     = hp;
  el("score-display").textContent    = state.score;
  el("wave-display").textContent     = `${state.wave + 1} / ${state.questions.length}`;
  el("attacker-display").textContent = state.attackerLevel;
  el("hud-credits").textContent      = state.credits;

  bar.style.width      = pct + "%";
  bar.style.background = pct > 50 ? "#00e87a" : pct > 25 ? "#ffb300" : "#ff3d55";

  const waveFill = el("wave-progress");
  if (waveFill) waveFill.style.width = (state.wave / state.questions.length * 100) + "%";
}

// ── Defense Lane ──────────────────────────────────────────────────────────────

function updateDefenseLane() {
  const lane = el("defense-lane");
  if (!lane) return;

  const pos = state.attackerPosition;
  let html = '<div class="lane-inner"><div class="lane-nodes">';

  LANE_NODES.forEach((node, i) => {
    const isAttacker = (i === pos);
    const isDC       = (i === LANE_LAST);
    let cls = "lane-node";
    if (isAttacker) cls += " attacker-here";
    if (isDC)       cls += " dc-node";

    html += `<div class="${cls}">`;
    if (isAttacker) html += `<div class="attacker-dot">▲</div>`;
    html += `<div class="node-body">${node.abbr}</div>`;
    html += `<div class="node-label">${node.name}</div>`;
    html += `</div>`;

    if (i < LANE_LAST) html += `<div class="lane-arrow">›</div>`;
  });

  html += `</div>`; // lane-nodes

  // Active defenses strip
  const active = [];
  if (state.firewallSlowActive)  active.push("🔥 Firewall");
  if (state.shieldCharges > 0)   active.push(`🛡 EDR ×${state.shieldCharges}`);
  if (state.idsHintAvailable)    active.push("👁 IDS");

  if (active.length > 0) {
    html += `<div class="lane-defenses">ACTIVE: ${active.join(" · ")}</div>`;
  }

  html += `</div>`; // lane-inner
  lane.innerHTML = html;
}

// ── Credits ───────────────────────────────────────────────────────────────────

function addCreditsForQuestion(q) {
  const earned = CREDIT_BY_TIER[q.tier] || 10;
  state.credits += earned;
  return earned;
}

// ── Attacker movement ─────────────────────────────────────────────────────────

// Returns a string describing what happened (used in feedback banner).
function moveAttacker() {
  // Firewall Rule: absorb this movement
  if (state.firewallSlowActive) {
    state.firewallSlowActive = false;
    return "🔥 Firewall blocked attacker!";
  }

  // Advance attacker (cap at DC)
  if (state.attackerPosition < LANE_LAST) {
    state.attackerPosition++;
  }

  // Domain Controller reached → immediate mission failure
  if (state.attackerPosition >= LANE_LAST) {
    state.gameOver = true;
    state.won      = false;
    return "⚠ DOMAIN CONTROLLER BREACHED — Mission Failed";
  }

  return `⚡ Attacker → ${LANE_NODES[state.attackerPosition].name}`;
}

// ── Upgrade Shop ──────────────────────────────────────────────────────────────

function updateShop() {
  const defs = [
    { key: "firewall", cost: 40, active: state.firewallSlowActive,              activeLabel: "ACTIVE"                       },
    { key: "ids",      cost: 50, active: state.idsHintAvailable,                activeLabel: "READY"                        },
    { key: "patch",    cost: 60, active: false,                                  activeLabel: ""                             },
    { key: "edr",      cost: 75, active: state.shieldCharges > 0,               activeLabel: `×${state.shieldCharges} CHARGES` }
  ];

  defs.forEach(d => {
    const btn      = el("shop-" + d.key);
    const statusEl = el("status-" + d.key);
    if (!btn) return;

    btn.disabled = state.credits < d.cost;

    if (statusEl) {
      statusEl.textContent = d.active ? d.activeLabel : "";
      statusEl.className   = d.active ? "shop-status active" : "shop-status";
    }
  });

  // Credits badge in sidebar
  const badge = el("credits-display");
  if (badge) badge.textContent = state.credits + " CR";
}

// "Every 5 waves" shop pulse — draws attention to available shop
function openUpgradeShop() {
  updateShop();
  if ((state.wave + 1) % 5 === 0) {
    const panel = el("shop-panel");
    if (panel) {
      panel.classList.add("shop-pulse");
      setTimeout(() => panel.classList.remove("shop-pulse"), 2000);
    }
  }
}

function buyUpgrade(key) {
  const item = SHOP_UPGRADES[key];
  if (!item || state.credits < item.cost) return;

  state.credits -= item.cost;
  state.defensePurchases.push(item.label);

  switch (key) {
    case "firewall":
      state.firewallSlowActive = true;
      break;
    case "ids":
      state.idsHintAvailable = true;
      updateIdsHintVisibility();
      break;
    case "patch":
      state.attackerPosition = Math.max(0, state.attackerPosition - 1);
      updateDefenseLane();
      break;
    case "edr":
      state.shieldCharges++;
      break;
  }

  updateShop();
  updateHUD();
  updateDefenseLane();
}

// ── IDS Hint ──────────────────────────────────────────────────────────────────

function updateIdsHintVisibility() {
  const area = el("ids-hint-area");
  if (!area) return;
  // Show only when hint is available AND the question has not been answered yet
  const show = state.idsHintAvailable && !state.answered;
  area.classList.toggle("hidden", !show);
}

// Deterministic: disables the first option that is not the correct answer
function useIdsHint() {
  if (!state.idsHintAvailable || state.answered) return;

  const q = state.questions[state.wave];

  for (let i = 0; i < q.options.length; i++) {
    if (i === q.correct) continue; // skip the correct answer
    const btn = document.querySelector(`.option-btn[data-index="${i}"]`);
    if (btn && !btn.disabled) {
      btn.disabled = true;
      btn.classList.add("ids-eliminated");
      break; // only eliminate one
    }
  }

  state.idsHintAvailable = false;
  updateIdsHintVisibility();
  updateShop();
}

// ── Tower Defense — Blue Team Bastion ────────────────────────────────────────

function endTdWave() {
  if (state.tdLoopId) { clearInterval(state.tdLoopId); state.tdLoopId = null; }
  state.tdWaveActive = false;
  state.tdEnemies    = [];
  if (state.tdTowers) updateTdDisplay();
}

function startTdWave() {
  if (state.tdWaveActive || state.gameOver) return;
  state.tdEnemyCounter++;
  state.tdEnemies = [{
    id:         state.tdEnemyCounter,
    hp:         100,
    maxHp:      100,
    pathIndex:  0,
    moveTicks:  0,
    moveEvery:  6,    // 6 × 500 ms = 3 s per node
    dead:       false
  }];
  Object.values(state.tdTowers).forEach(t => { t.attackTicks = 0; });
  state.tdWaveActive = true;
  state.tdLoopId = setInterval(tdGameLoop, 500);
  updateTdDisplay();
}

function tdGameLoop() {
  // 1. Move enemies along the path
  state.tdEnemies.forEach(enemy => {
    if (enemy.dead) return;
    enemy.moveTicks++;
    if (enemy.moveTicks >= enemy.moveEvery) {
      enemy.moveTicks = 0;
      enemy.pathIndex++;
      if (enemy.pathIndex >= TD_PATH.length) {
        enemy.dead        = true;
        state.tdIntegrity = Math.max(0, state.tdIntegrity - 1);
        state.health      = Math.max(0, state.health - 20);
        if (state.health <= 0) { state.health = 0; state.gameOver = true; state.won = false; }
        updateHUD();
      }
    }
  });

  // 2. Tower attacks
  TD_SLOTS.forEach(slot => {
    const tower = state.tdTowers[slot.id];
    if (!tower) return;
    const def = TD_TOWER_DEFS[tower.type];
    tower.attackTicks++;
    if (tower.attackTicks < def.attackEveryTicks) return;
    const target = state.tdEnemies.find(
      e => !e.dead && Math.abs(e.pathIndex - slot.nearNode) <= def.range
    );
    if (target) {
      tower.attackTicks = 0;
      tower.fireFlash = true;          // one-shot firing flash, baked into next render
      target.hp -= def.damage;
      target.hitFlash = true;          // one-shot hit flash on next render
      target.lastDmg  = def.damage;
      if (target.hp <= 0) { target.hp = 0; target.dead = true; }
    }
  });

  // 3. Clean up dead enemies and refresh display
  state.tdEnemies = state.tdEnemies.filter(e => !e.dead);
  updateTdDisplay();

  // 4. End wave when all enemies are gone
  if (state.tdEnemies.length === 0) endTdWave();
}

function tdSlotClick(slotId) {
  if (state.tdTowers[slotId]) return;
  if (!state.tdSelectedTower) return;
  const def = TD_TOWER_DEFS[state.tdSelectedTower];
  if (!def || state.credits < def.cost) return;

  state.credits -= def.cost;
  state.tdTowers[slotId] = { type: state.tdSelectedTower, attackTicks: 0 };
  state.tdSelectedTower  = null;

  const towerBtn = el('btn-tower-firewall');
  if (towerBtn) towerBtn.classList.remove('td-tower-selected');
  const hintEl = el('td-select-hint');
  if (hintEl) hintEl.classList.add('hidden');

  updateHUD();
  updateShop();
  updateTdDisplay();
}

function selectTdTower(type) {
  const def = TD_TOWER_DEFS[type];
  if (!def || state.credits < def.cost || state.gameOver) return;
  state.tdSelectedTower = (state.tdSelectedTower === type) ? null : type;
  const towerBtn = el('btn-tower-firewall');
  if (towerBtn) towerBtn.classList.toggle('td-tower-selected', state.tdSelectedTower === type);
  const hintEl = el('td-select-hint');
  if (hintEl) hintEl.classList.toggle('hidden', !state.tdSelectedTower);
  updateTdDisplay();   // refresh slots so "Place Tower Here" + pulse appear
}

function renderTdMap() {
  const canvas = el('td-canvas');
  if (!canvas) return;

  // Map each node index to its tower slot (if any)
  const slotByNode = {};
  TD_SLOTS.forEach(s => { slotByNode[s.nearNode] = s; });

  let html = '<div class="td-flowlabel">🔴 Red Team Attack Path →</div>';
  html += '<div class="td-zones">';

  TD_ZONES.forEach((zone, zi) => {
    html += `<div class="td-zone td-zone-${zone.id}">`;
    html += `<div class="td-zone-head">`
          + `<span class="td-zone-name">${zone.name}</span>`
          + `<span class="td-zone-sub">${zone.sub}</span>`
          + `</div>`;
    html += '<div class="td-zone-row">';

    zone.nodes.forEach((ni, idx) => {
      html += renderTdNodeColumn(ni, slotByNode[ni]);
      if (idx < zone.nodes.length - 1) html += '<div class="td-nodesep">›</div>';
    });

    html += '</div></div>'; // zone-row, zone

    if (zi < TD_ZONES.length - 1) html += '<div class="td-zonearrow">⟶</div>';
  });

  html += '</div>'; // td-zones
  canvas.innerHTML = html;

  // Re-attach slot click listeners
  TD_SLOTS.forEach(slot => {
    const slotEl = el('td-' + slot.id);
    if (slotEl) slotEl.addEventListener('click', () => tdSlotClick(slot.id));
  });
}

// Renders one node column (its tower slot above, then the network node)
function renderTdNodeColumn(i, slot) {
  const node   = TD_PATH[i];
  const isDC   = (i === TD_PATH.length - 1);
  const threat = state.tdEnemies.find(e => !e.dead && e.pathIndex === i);
  const tower  = slot ? state.tdTowers[slot.id] : null;

  let html = '<div class="td-col">';

  // Slot row — always reserve height so node boxes stay aligned
  html += '<div class="td-slotwrap">';
  if (slot) {
    const selectable = state.tdSelectedTower && !tower;
    let scls = 'td-slot';
    if (tower)       scls += ' td-slot-occupied';
    if (selectable)  scls += ' td-slot-selectable';
    if (tower && tower.fireFlash) { scls += ' td-slot-firing'; tower.fireFlash = false; }
    html += `<div class="${scls}" id="td-${slot.id}" data-slot="${slot.id}">`;
    if (tower) {
      html += `<span class="td-slot-ico">🔵</span><span class="td-slot-txt">Firewall Tower</span>`;
    } else if (selectable) {
      html += `<span class="td-slot-txt">Place Tower Here</span>`;
    } else {
      html += `<span class="td-slot-txt">Build Defense</span>`;
    }
    html += '</div>';
  } else {
    html += '<div class="td-slot-spacer"></div>';
  }
  html += '</div>';

  // Network node
  let ncls = 'td-node';
  if (isDC)    ncls += ' td-node-dc';
  if (threat)  ncls += ' td-node-threat';
  if (threat && threat.hitFlash) ncls += ' td-node-hit';

  html += `<div class="${ncls}">`;
  if (threat) {
    html += '<div class="td-threat">'
          + '<span class="td-threat-name">Attacker</span>'
          + '<span class="td-threat-tri">▼</span>'
          + '</div>';
    if (threat.hitFlash) {
      html += `<div class="td-dmg">-${threat.lastDmg}</div>`;
      threat.hitFlash = false;          // consume the flash
    }
  }
  if (isDC) html += '<div class="td-objtag">OBJECTIVE</div>';
  html += `<div class="td-nicon">${node.icon}</div>`;
  html += `<div class="td-nname">${node.name}</div>`;
  if (isDC) html += '<div class="td-protect">Protect this</div>';
  html += '</div>';

  html += '</div>'; // td-col
  return html;
}

function updateTdDisplay() {
  renderTdMap();

  // Enemy HP bar
  const statusEl = el('td-enemy-status');
  const hpFill   = el('td-hp-fill');
  const hpText   = el('td-hp-text');
  if (statusEl) {
    if (state.tdEnemies.length > 0) {
      const e = state.tdEnemies[0];
      statusEl.classList.remove('hidden');
      if (hpFill) hpFill.style.width = Math.max(0, (e.hp / e.maxHp) * 100) + '%';
      if (hpText) hpText.textContent = `${Math.max(0, e.hp)}/${e.maxHp} HP`;
    } else {
      statusEl.classList.add('hidden');
    }
  }

  // Integrity badge
  const intEl = el('td-integrity');
  if (intEl) {
    intEl.textContent = `🏰 Domain Controller Integrity: ${state.tdIntegrity}/3`;
    intEl.classList.toggle('td-integrity-low', state.tdIntegrity <= 1);
  }

  // Wave button
  const waveBtn = el('btn-td-wave');
  if (waveBtn) {
    waveBtn.disabled    = state.tdWaveActive || state.gameOver;
    waveBtn.textContent = state.tdWaveActive ? '⚡ WAVE ACTIVE' : '▶ START DEFENSE WAVE';
  }

  // Tower buy button
  const towerBtn = el('btn-tower-firewall');
  if (towerBtn) {
    towerBtn.disabled = state.credits < TD_TOWER_DEFS.firewall.cost || state.gameOver;
  }
}

// ── Question loading ───────────────────────────────────────────────────────────

function loadQuestion() {
  const q = state.questions[state.wave];

  el("topic-chip").textContent    = q.topic;
  el("tier-chip").textContent     = q.tier;
  el("question-text").textContent = q.prompt;

  const container = el("options-container");
  container.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className     = "option-btn";
    btn.dataset.index = i;

    const badge = document.createElement("span");
    badge.className   = "option-letter";
    badge.textContent = String.fromCharCode(65 + i);

    const text = document.createElement("span");
    text.className   = "option-text";
    text.textContent = opt;

    btn.appendChild(badge);
    btn.appendChild(text);
    btn.addEventListener("click", () => handleAnswer(i));
    container.appendChild(btn);
  });

  el("feedback-area").classList.add("hidden");
  el("btn-next").textContent = "NEXT WAVE →";
  state.answered = false;

  setAvatarState("idle");
  updateIdsHintVisibility();
  updateHUD();
  updateDefenseLane();
  updateTdDisplay();
  openUpgradeShop();
}

// ── Answer handling ───────────────────────────────────────────────────────────

function handleAnswer(chosen) {
  if (state.answered) return;
  state.answered = true;

  // Hide IDS hint as soon as the player answers
  const idsArea = el("ids-hint-area");
  if (idsArea) idsArea.classList.add("hidden");

  const q       = state.questions[state.wave];
  const correct = chosen === q.correct; // deterministic index comparison

  state.topicStats[q.topic].total++;

  // Highlight buttons
  document.querySelectorAll(".option-btn").forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct)          btn.classList.add("correct");
    if (i === chosen && !correct) btn.classList.add("wrong");
  });

  const feedback    = el("feedback-banner");
  const explanation = el("explanation-box");

  if (correct) {
    // ── Correct answer ──────────────────────────────────────────────────────
    state.correctAnswers++;
    state.topicStats[q.topic].correct++;

    const bonus        = state.attackerLevel * CONFIG.scoreAttackerBonus;
    state.score       += CONFIG.scorePerCorrect + bonus;
    state.health       = Math.min(CONFIG.maxHealth, state.health + CONFIG.healthGainCorrect);
    const creditsEarned = addCreditsForQuestion(q);

    if (!state.upgrades.includes(q.reward)) state.upgrades.push(q.reward);
    addUpgradeChip(q.reward);

    feedback.className   = "feedback-banner correct";
    feedback.textContent =
      `✓ Correct!  +${CONFIG.scorePerCorrect + bonus} pts  |  +${CONFIG.healthGainCorrect} HP  |  +${creditsEarned} CR`;

  } else {
    // ── Wrong answer ────────────────────────────────────────────────────────
    state.wrongAnswers++;

    const rawDamage = CONFIG.damageBase + CONFIG.damagePerLevel * state.attackerLevel;
    state.attackerLevel++;

    const events = [];

    // EDR Shield absorbs this damage hit
    if (state.shieldCharges > 0) {
      state.shieldCharges--;
      events.push(`🛡 EDR blocked −${rawDamage} dmg`);
    } else {
      state.health -= rawDamage;
      events.push(`−${rawDamage} health`);
    }

    // (Quiz Training: attacker-path movement removed — tower defense now lives
    //  only in the separate Defense Mission. Scoring/health/attacker level kept.)

    feedback.className   = "feedback-banner wrong";
    feedback.textContent =
      `✗ Wrong.  Attacker Lvl ${state.attackerLevel}  |  ${events.join("  |  ")}`;
  }

  explanation.textContent = q.explain;
  el("feedback-area").classList.remove("hidden");

  // ── Loss conditions ─────────────────────────────────────────────────────────
  if (state.health <= 0) {
    state.health   = 0;
    state.gameOver = true;
    state.won      = false;
  }
  // Attacker reaching DC is set inside moveAttacker()

  if (state.gameOver) {
    el("btn-next").textContent = "VIEW REPORT →";
  }

  triggerAvatarReaction(correct);
  updateHUD();
  updateShop();
  updateDefenseLane();
}

// ── Upgrade chips (modules earned from correct answers) ───────────────────────

function addUpgradeChip(name) {
  const list        = el("upgrades-list");
  const placeholder = list.querySelector(".no-upgrades");
  if (placeholder) placeholder.remove();

  const chips = Array.from(list.querySelectorAll(".upgrade-chip"));
  if (chips.some(c => c.textContent === name)) return;

  const chip       = document.createElement("div");
  chip.className   = "upgrade-chip";
  chip.textContent = name;
  list.appendChild(chip);
}

// ── Wave progression ──────────────────────────────────────────────────────────

function nextWave() {
  if (state.gameOver) { showReport(); return; }

  state.wave++;

  if (state.wave >= state.questions.length) {
    state.won      = true;
    state.gameOver = true;
    showReport();
    return;
  }

  loadQuestion();
}

// ── Final report ──────────────────────────────────────────────────────────────

function showReport() {
  endTdWave();
  showScreen("report");

  const won = state.won;
  setAvatarState(won ? "victory" : "defeat");

  el("report-title").textContent = won ? "Mission Accomplished" : "Mission Failed";

  const badge     = el("result-badge");
  badge.className = "result-badge " + (won ? "win" : "lose");
  badge.textContent = won
    ? "✓ You defended the network successfully!"
    : "✗ The attacker breached your defenses.";

  el("r-score").textContent   = state.score;
  el("r-correct").textContent = state.correctAnswers;
  el("r-wrong").textContent   = state.wrongAnswers;
  el("r-credits").textContent = state.credits;
  const apEl = el("r-attacker-pos");
  if (apEl) apEl.textContent = LANE_NODES[state.attackerPosition].name;

  // Defense purchases
  el("r-purchases").textContent = state.defensePurchases.length > 0
    ? state.defensePurchases.join(", ")
    : "None";

  // Strongest / weakest topic — tie-broken by TOPIC_ORDER
  let strongest = null, weakest = null;
  let bestAcc   = -1,   worstAcc = 2;
  let playedCount = 0;

  TOPIC_ORDER.forEach(topic => {
    const s = state.topicStats[topic];
    if (s.total === 0) return;
    playedCount++;
    const acc = s.correct / s.total;
    if (acc > bestAcc)  { bestAcc  = acc; strongest = topic; }
    if (acc < worstAcc) { worstAcc = acc; weakest   = topic; }
  });

  // With only one topic played, strongest and weakest are the same topic.
  // Show it as Strongest and leave Weakest blank to avoid duplicating it.
  const weakestDisplay = (playedCount < 2) ? null : weakest;

  el("r-strongest").textContent = strongest    || "—";
  el("r-weakest").textContent   = weakestDisplay || "—";

  // Upgrade modules
  const upgradesEl  = el("r-upgrades");
  upgradesEl.innerHTML = "";
  if (state.upgrades.length === 0) {
    upgradesEl.innerHTML = '<p class="no-upgrades">None earned.</p>';
  } else {
    state.upgrades.forEach(u => {
      const chip       = document.createElement("div");
      chip.className   = "upgrade-chip";
      chip.textContent = u;
      upgradesEl.appendChild(chip);
    });
  }

  el("r-study").textContent = weakest
    ? STUDY_RECS[weakest]
    : "Excellent performance across all topics. Keep practicing to stay sharp.";
}

// ── Event listeners ───────────────────────────────────────────────────────────

el("btn-start").addEventListener("click", () => {
  const questions = buildFilteredQuestions();
  if (!questions) return;

  endTdWave();
  initState(questions);
  el("upgrades-list").innerHTML = '<p class="no-upgrades">None collected yet</p>';
  setAvatarState("idle");
  showScreen("game");
  loadQuestion();
});

// Tower Defense event listeners
const btnTdWave = el("btn-td-wave");
if (btnTdWave) btnTdWave.addEventListener("click", startTdWave);

const btnTowerFirewall = el("btn-tower-firewall");
if (btnTowerFirewall) btnTowerFirewall.addEventListener("click", () => selectTdTower("firewall"));

el("btn-next").addEventListener("click", nextWave);

el("btn-restart").addEventListener("click", () => {
  if (avatarTimer) clearTimeout(avatarTimer);
  showScreen("start");
});

// Return to Menu (abort an active quiz without showing the report)
const btnQuitQuiz = el("btn-quit-quiz");
if (btnQuitQuiz) btnQuitQuiz.addEventListener("click", () => {
  if (confirm("Abort this quiz and return to the main menu?")) {
    if (avatarTimer) clearTimeout(avatarTimer);
    showScreen("start");
  }
});

// Shop buttons
["firewall", "ids", "patch", "edr"].forEach(key => {
  const btn = el("shop-" + key);
  if (btn) btn.addEventListener("click", () => buyUpgrade(key));
});

// IDS hint button
const btnIdsHint = el("btn-ids-hint");
if (btnIdsHint) btnIdsHint.addEventListener("click", useIdsHint);

// ── How to Play help modal ────────────────────────────────────────────────────

function openHelp() {
  const modal = el("help-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeHelp() {
  const modal = el("help-modal");
  if (modal) modal.classList.add("hidden");
}

["btn-how-to-play", "btn-help"].forEach(id => {
  const btn = el(id);
  if (btn) btn.addEventListener("click", openHelp);
});

["btn-help-close", "btn-help-gotit"].forEach(id => {
  const btn = el(id);
  if (btn) btn.addEventListener("click", closeHelp);
});

// Close on backdrop click (any element flagged data-help-close)
document.querySelectorAll("[data-help-close]").forEach(elm => {
  elm.addEventListener("click", closeHelp);
});

// Close on Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeHelp();
});

// Show the live question-bank size on the start screen (keeps the label from going stale).
(function setQuestionCount() {
  try {
    if (typeof QUESTIONS === "undefined" || !Array.isArray(QUESTIONS)) return;
    const total = QUESTIONS.length.toLocaleString();
    ["meta-qcount", "desc-qcount"].forEach(id => {
      const node = el(id);
      if (node) node.textContent = total;
    });
  } catch (e) { /* non-fatal: leave the static label */ }
})();
