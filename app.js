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
  correct: "Good response.",
  wrong:   "Review needed.",
  victory: "Network secured.",
  defeat:  "Defenses failed."
};

let avatarTimer = null;

// msgOverride lets a caller show a one-off line (e.g. "Module earned.")
// while keeping the visual state colour.
function setAvatarState(stateName, msgOverride) {
  const avatarEl = el("avatar");
  const statusEl = el("avatar-status");
  if (!avatarEl || !statusEl) return;
  avatarEl.className = `avatar avatar--${stateName}`;
  // The idle line reflects the companion's current energy tier.
  const base = stateName === "idle" ? companionIdleMsg() : AVATAR_MESSAGES[stateName];
  statusEl.textContent = msgOverride || base || "";
}

function triggerAvatarReaction(isCorrect, msgOverride) {
  if (avatarTimer) clearTimeout(avatarTimer);
  setAvatarState(isCorrect ? "correct" : "wrong", msgOverride);
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
    streak:           0,        // current consecutive-correct streak
    bestStreak:       0,        // best streak this session
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

  // Cosmetic panels must never be able to abort the core quiz loop.
  try { renderAnalystStats(); renderCompanion(); }
  catch (e) { console.warn("Companion panel render skipped:", e); }
}

// ── Analyst Status panel (client-side, derived from session state) ────────────

function renderAnalystStats() {
  if (!el("as-answered")) return;   // panel only exists on the quiz screen
  const answered = state.correctAnswers + state.wrongAnswers;
  const accuracy = answered ? Math.round((state.correctAnswers / answered) * 100) : null;
  const q        = state.questions && state.questions[state.wave];

  el("as-answered").textContent = answered;
  el("as-accuracy").textContent = accuracy === null ? "—" : accuracy + "%";
  el("as-streak").textContent   = state.streak;
  el("as-path").textContent     = q ? q.topic : "—";
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
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;

    const bonus        = state.attackerLevel * CONFIG.scoreAttackerBonus;
    state.score       += CONFIG.scorePerCorrect + bonus;
    state.health       = Math.min(CONFIG.maxHealth, state.health + CONFIG.healthGainCorrect);
    const creditsEarned = addCreditsForQuestion(q);

    // Report screen still lists per-session reward modules.
    if (!state.upgrades.includes(q.reward)) state.upgrades.push(q.reward);

    feedback.className   = "feedback-banner correct";
    feedback.textContent =
      `✓ Correct!  +${CONFIG.scorePerCorrect + bonus} pts  |  +${CONFIG.healthGainCorrect} HP  |  +${creditsEarned} CR`;

  } else {
    // ── Wrong answer ────────────────────────────────────────────────────────
    state.wrongAnswers++;
    state.streak = 0;

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

  // Feed the Analyst Companion (energy/credits/modules/unlocks) from this answer.
  const earnedSomething = updateCompanionForAnswer(correct, q.topic, state.streak);

  triggerAvatarReaction(correct, correct && earnedSomething ? "Module earned." : undefined);
  updateHUD();
  updateShop();
  updateDefenseLane();
}

// ── Analyst Companion (Phase 1: client-side progression, localStorage) ────────
// A lightweight cyber-assistant powered by learning activity. Persists across
// sessions in localStorage only — no backend, no accounts, cosmetic-only unlocks.

const COMPANION_KEY = "cdl_companion_v1";

// Energy / credit tuning (kept gentle so progress feels earned, not grindy).
const ENERGY_CORRECT = 8;     // energy gained per correct answer
const ENERGY_WRONG   = 5;     // energy lost per wrong answer
const CREDITS_CORRECT = 5;    // cosmetic credits per correct answer
const STREAK_BONUS    = 10;   // bonus credits every 5-in-a-row
const MODULE_THRESHOLD = 10;  // correct answers in a topic to earn its module badge

// Cosmetic unlocks — quiz-detectable in Phase 1 (tool-based ones are roadmap).
const COSMETICS = [
  { id: "packet_watcher", name: "Packet Watcher",  hint: "10 correct answers",  test: c => c.lifetimeCorrect >= 10 },
  { id: "neon_shield",    name: "Neon Shield Skin", hint: "10-answer streak",    test: c => c.bestStreak >= 10 },
  { id: "terminal_glow",  name: "Terminal Glow",    hint: "reach Overcharged",   test: c => c.energy >= 100 },
];

function defaultCompanion() {
  return { name: "SENTINEL", title: "", type: "sentinel", energy: 50, credits: 0, modules: [],
           topicCorrect: {}, lifetimeCorrect: 0, bestStreak: 0, unlocks: [], toolUnlocks: [] };
}

function loadCompanion() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(COMPANION_KEY)) || {}; } catch (e) { c = {}; }
  const d = defaultCompanion();
  return {
    name:            typeof c.name === "string" && c.name.trim() ? c.name : d.name,
    title:           typeof c.title === "string" ? c.title : "",
    type:            typeof c.type === "string" && c.type ? c.type : "sentinel",
    energy:          typeof c.energy === "number" ? clampEnergy(c.energy) : d.energy,
    credits:         typeof c.credits === "number" ? c.credits : d.credits,
    modules:         Array.isArray(c.modules) ? c.modules : [],
    topicCorrect:    (c.topicCorrect && typeof c.topicCorrect === "object") ? c.topicCorrect : {},
    lifetimeCorrect: typeof c.lifetimeCorrect === "number" ? c.lifetimeCorrect : 0,
    bestStreak:      typeof c.bestStreak === "number" ? c.bestStreak : 0,
    unlocks:         Array.isArray(c.unlocks) ? c.unlocks : [],
    // Tool-based badges earned from the analyst tools (written by companion-unlocks.js).
    toolUnlocks:     Array.isArray(c.toolUnlocks) ? c.toolUnlocks : [],
  };
}

// Catalog of tool-based field badges (id → label) for locked/unlocked display.
const TOOL_BADGES = [
  { id: "report_writer",     label: "Report Writer",     hint: "Use SOC Alert Report Generator" },
  { id: "timeline_analyst",  label: "Timeline Analyst",  hint: "Use Incident Timeline Builder" },
  { id: "log_hunter",        label: "Log Hunter",        hint: "Use Log Parser / SIEM Demo" },
  { id: "triage_operator",   label: "Triage Operator",   hint: "Use SOAR-Lite Alert Triage" },
  { id: "shadow_ai_watcher", label: "Shadow AI Watcher", hint: "Use AI Misuse Detection Demo" },
  { id: "detection_builder", label: "Detection Builder", hint: "Use KQL Detection Assistant" },
];

// Selectable companion types (cosmetic only). Unlock tests read existing
// companion progress — no gameplay effect, no extra tracking added.
const COMPANION_TYPES = [
  { id: "sentinel",        name: "Sentinel",        icon: "🛡️", desc: "General SOC assistant",      unlock: "Always available",
    test: () => true },
  { id: "packet_owl",      name: "Packet Owl",      icon: "🦉", desc: "Networking specialist",       unlock: "Answer 10 Networking Basics questions correctly",
    test: c => (c.modules || []).includes("Networking Basics") },
  { id: "log_fox",         name: "Log Fox",         icon: "🦊", desc: "Log analysis specialist",     unlock: "Use Log Parser / SIEM Demo",
    test: c => (c.toolUnlocks || []).some(u => u && u.id === "log_hunter") },
  { id: "malware_raven",   name: "Malware Raven",   icon: "🐦‍⬛", desc: "Malware analysis specialist", unlock: "Answer 10 Malware Basics questions correctly",
    test: c => (c.modules || []).includes("Malware Basics") },
  { id: "firewall_dragon", name: "Firewall Dragon", icon: "🐉", desc: "Defense specialist",          unlock: "Complete a SOC Dashboard shift",
    test: () => false },   // placeholder — SOC shift completion isn't tracked yet
  { id: "triage_drone",    name: "Triage Drone",    icon: "🤖", desc: "Alert triage specialist",     unlock: "Use SOAR-Lite Alert Triage",
    test: c => (c.toolUnlocks || []).some(u => u && u.id === "triage_operator") },
];

function companionType() {
  // Selected type, falling back to Sentinel if missing or not (yet) unlocked.
  const t = COMPANION_TYPES.find(x => x.id === companion.type && x.test(companion));
  return t || COMPANION_TYPES[0];
}

// Large avatar glyph for a given companion type id (used in sidebar + cards).
function getCompanionIcon(typeId) {
  const t = COMPANION_TYPES.find(x => x.id === typeId);
  return t ? t.icon : COMPANION_TYPES[0].icon;
}

function saveCompanion() {
  try { localStorage.setItem(COMPANION_KEY, JSON.stringify(companion)); } catch (e) { /* storage off — stay in-memory */ }
}

const clampEnergy = v => Math.max(0, Math.min(100, v));

let companion = loadCompanion();

function companionStateLabel(e) {
  if (e <= 20) return "Tired";
  if (e <= 60) return "Monitoring";
  if (e <= 90) return "Focused";
  return "Overcharged";
}

function companionIdleMsg() {
  const e = companion ? companion.energy : 50;
  if (e <= 20) return "Need more clean responses.";
  if (e <= 60) return "Monitoring traffic...";
  if (e <= 90) return "Good rhythm. Keep going.";
  return "Excellent streak.";
}

// Apply one answer's effects; returns true if a new module/cosmetic was earned.
function updateCompanionForAnswer(correct, topic, streak) {
  let earned = false;
  if (correct) {
    companion.energy = clampEnergy(companion.energy + ENERGY_CORRECT);
    companion.credits += CREDITS_CORRECT;
    if (streak > 0 && streak % 5 === 0) companion.credits += STREAK_BONUS;
    companion.lifetimeCorrect++;
    if (streak > companion.bestStreak) companion.bestStreak = streak;

    if (topic) {
      companion.topicCorrect[topic] = (companion.topicCorrect[topic] || 0) + 1;
      if (companion.topicCorrect[topic] >= MODULE_THRESHOLD && !companion.modules.includes(topic)) {
        companion.modules.push(topic);
        earned = true;
      }
    }
  } else {
    companion.energy = clampEnergy(companion.energy - ENERGY_WRONG);
  }
  if (evaluateCosmeticUnlocks()) earned = true;
  saveCompanion();
  return earned;
}

// Persist any cosmetics whose conditions are now met; returns true if any new.
function evaluateCosmeticUnlocks() {
  let added = false;
  COSMETICS.forEach(cos => {
    if (!companion.unlocks.includes(cos.id) && cos.test(companion)) {
      companion.unlocks.push(cos.id);
      added = true;
    }
  });
  return added;
}

// Flat list of every earned badge label, in earn order (modules → cosmetics → field).
function earnedBadgeLabels() {
  const labels = [];
  (companion.modules || []).forEach(m => labels.push(m));
  COSMETICS.forEach(cos => { if (companion.unlocks.includes(cos.id)) labels.push(cos.name); });
  (companion.toolUnlocks || []).forEach(u => { if (u && u.label) labels.push(u.label); });
  return labels;
}

function renderCompanion() {
  if (!el("comp-name")) return;   // only present on the quiz screen
  const label = companionStateLabel(companion.energy);

  el("comp-name").textContent  = companion.name;
  el("comp-state").textContent = label;
  el("comp-credits").textContent = companion.credits;

  // Selected companion type (cosmetic) — the avatar glyph itself changes
  const type = companionType();
  const glyph = el("avatar-glyph"); if (glyph) glyph.textContent = type.icon;
  const typeName = el("comp-type");  if (typeName) typeName.textContent = "Type · " + type.name;

  // Selected title (optional)
  const titleEl = el("comp-title");
  if (titleEl) {
    if (companion.title) { titleEl.textContent = companion.title; titleEl.classList.remove("hidden"); }
    else { titleEl.textContent = ""; titleEl.classList.add("hidden"); }
  }

  // Energy bar + avatar glow tier
  const pct = Math.round(companion.energy);
  el("comp-energy-pct").textContent = pct + "%";
  const fill = el("comp-energy-fill");
  fill.style.width = pct + "%";
  fill.className = "comp-energy-fill tier-" + label.toLowerCase();
  const card = el("companion-card");
  if (card) {
    card.classList.remove("tier-tired", "tier-monitoring", "tier-focused", "tier-overcharged");
    card.classList.add("tier-" + label.toLowerCase());
  }

  // Recent badges (latest 2–3 only) — sidebar
  const recent = el("companion-recent");
  if (recent) {
    const all = earnedBadgeLabels();
    if (all.length === 0) {
      recent.innerHTML = '<p class="no-upgrades">No badges yet. Answer correctly or explore tools to unlock them.</p>';
    } else {
      recent.innerHTML = all.slice(-3).reverse()
        .map(l => `<div class="cosmetic unlocked"><span class="cos-name">✦ ${escapeHtml(l)}</span></div>`).join("");
    }
  }

  // Full cosmetic + field-badge lists — modal (only rendered if the modal exists)
  const cosEl = el("companion-cosmetics");
  if (cosEl) {
    cosEl.innerHTML = COSMETICS.map(cos => {
      const unlocked = companion.unlocks.includes(cos.id);
      return `<div class="cosmetic ${unlocked ? "unlocked" : "locked"}">
        <span class="cos-name">${unlocked ? "✦" : "🔒"} ${escapeHtml(cos.name)}</span>
        <span class="cos-hint">${unlocked ? "Unlocked" : escapeHtml(cos.hint)}</span>
      </div>`;
    }).join("");
  }
  const badgesEl = el("companion-badges");
  if (badgesEl) {
    const earnedIds = (companion.toolUnlocks || []).map(u => u && u.id);
    badgesEl.innerHTML = TOOL_BADGES.map(b => {
      const unlocked = earnedIds.includes(b.id);
      return `<div class="cosmetic ${unlocked ? "unlocked" : "locked"}">
        <span class="cos-name">${unlocked ? "✦" : "🔒"} ${escapeHtml(b.label)}</span>
        <span class="cos-hint">${unlocked ? "Unlocked" : escapeHtml(b.hint)}</span>
      </div>`;
    }).join("");
  }

  renderTitleOptions();
  renderCompanionTypes();
}

// Render the selectable companion-type cards in the Customize modal.
function renderCompanionTypes() {
  const wrap = el("companion-types");
  if (!wrap) return;
  wrap.innerHTML = COMPANION_TYPES.map(t => {
    const unlocked = t.test(companion);
    const selected = unlocked && companion.type === t.id;
    const cls = ["ctype-card"];
    if (!unlocked) cls.push("locked");
    if (selected)  cls.push("selected");
    return `<button class="${cls.join(" ")}" data-type="${t.id}" ${unlocked ? "" : "disabled"}>
      <span class="ctype-icon">${unlocked ? getCompanionIcon(t.id) : "🔒"}</span>
      <span class="ctype-name">${escapeHtml(t.name)}</span>
      <span class="ctype-desc">${escapeHtml(t.desc)}</span>
      <span class="ctype-cond">${unlocked ? (selected ? "Selected" : "Tap to select") : escapeHtml(t.unlock)}</span>
    </button>`;
  }).join("");
}

// Populate the modal title selector from currently unlocked badge labels.
function renderTitleOptions() {
  const sel = el("comp-title-select");
  if (!sel) return;
  const labels = earnedBadgeLabels();
  const opts = ['<option value="">None</option>']
    .concat(labels.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`));
  sel.innerHTML = opts.join("");
  sel.value = companion.title || "";
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resetCompanion() {
  if (!confirm("Reset all Analyst Companion progress?\nThis clears the name, energy, credits, modules, and cosmetic unlocks.")) return;
  companion = defaultCompanion();
  try { localStorage.removeItem(COMPANION_KEY); } catch (e) { /* ignore */ }
  setAvatarState("idle");
  renderCompanion();
}

// Customize controls (live inside the Customize Companion modal)
if (el("comp-rename")) {
  el("comp-rename").addEventListener("click", () => {
    const v = el("comp-name-input").value.trim();
    if (!v) return;
    companion.name = v.slice(0, 18);
    saveCompanion();
    el("comp-name-input").value = "";
    renderCompanion();
  });
}
if (el("comp-reset")) el("comp-reset").addEventListener("click", resetCompanion);

if (el("comp-title-select")) {
  el("comp-title-select").addEventListener("change", e => {
    companion.title = e.target.value || "";
    saveCompanion();
    renderCompanion();
  });
}

// Companion type selection (only unlocked types are selectable)
if (el("companion-types")) {
  el("companion-types").addEventListener("click", e => {
    const card = e.target.closest(".ctype-card");
    if (!card) return;
    const t = COMPANION_TYPES.find(x => x.id === card.dataset.type);
    if (!t || !t.test(companion)) return;   // locked → ignore
    companion.type = t.id;
    saveCompanion();
    renderCompanion();
  });
}

// Customize Companion modal open/close
function openCompModal()  { const m = el("comp-modal"); if (m) { renderCompanion(); m.classList.remove("hidden"); } }
function closeCompModal() { const m = el("comp-modal"); if (m) m.classList.add("hidden"); }
if (el("comp-customize"))   el("comp-customize").addEventListener("click", openCompModal);
if (el("comp-modal-close")) el("comp-modal-close").addEventListener("click", closeCompModal);
if (el("comp-modal")) el("comp-modal").addEventListener("click", e => { if (e.target.id === "comp-modal") closeCompModal(); });

// Show saved companion immediately on load (before any quiz starts).
renderCompanion();

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
  showScreen("game");   // switch to the quiz view first — must always happen
  loadQuestion();
  // Companion progress is cosmetic; never let it block the quiz from starting.
  try { setAvatarState("idle"); renderCompanion(); }
  catch (e) { console.warn("Companion init skipped:", e); }
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
  if (avatarTimer) clearTimeout(avatarTimer);
  showScreen("start");
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
