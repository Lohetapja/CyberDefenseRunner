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
  // Randomize each session: shuffle the filtered COPY (never the global bank),
  // then take the first waveCount. Distinct questions → no in-session repeats.
  return shuffle(pool).slice(0, waveCount);
}

// Fisher-Yates shuffle, in place on the passed array (a local copy).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

  flashCompanion(correct ? (earnedSomething ? "unlock" : "correct") : "wrong");
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
  return { name: "", title: "", type: "sentinel", energy: 50, credits: 0, modules: [],
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

// While true, every companion type is selectable regardless of unlock state —
// handy for visually testing all avatars. Flip to false for normal unlocking.
const COMPANION_TYPES_TEST_UNLOCK = true;

// Distinct inline-SVG faces (single source of truth). All draw with
// currentColor so they inherit the avatar's state colour (idle/correct/wrong),
// and sit inside the shared circular frame. viewBox is 0 0 64 64.
// Each is a small stylized character portrait (filled head mass + silhouette
// features + readable eyes), drawn with the type's --cav/--cav2 palette.
// Full-colour layered SVG portraits — each a recognizable cyber companion
// (multiple fills, silhouette + face structure), readable at card size.
// Colours are inline per type; only the animated parts carry hook classes.
const COMPANION_SVG = {
  // Sentinel — steel guardian helm, dark visor, twin cyan eyes, mouth grille.
  sentinel: `<svg class="cav" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 4 L36 11 H28 Z" fill="#9fb6c9"/>
    <path d="M16 14 Q32 4 48 14 L50 35 Q50 50 32 57 Q14 50 14 35 Z" fill="#6f8aa6"/>
    <path d="M16 14 Q32 4 48 14 L50 35 Q50 50 32 57 Q14 50 14 35 Z" fill="none" stroke="#243a4f" stroke-width="2"/>
    <path d="M32 6 V19" stroke="#9fc3d6" stroke-width="2"/>
    <rect x="8" y="26" width="6" height="11" rx="2" fill="#4a6680"/>
    <rect x="50" y="26" width="6" height="11" rx="2" fill="#4a6680"/>
    <path d="M17 24 H47 L44 37 H20 Z" fill="#0c2740"/>
    <g class="s-eyes">
      <rect x="21" y="27" width="9" height="5.5" rx="2.7" fill="#36e0ff"/>
      <rect x="34" y="27" width="9" height="5.5" rx="2.7" fill="#36e0ff"/>
    </g>
    <path d="M26 45 H38 M28 49 H36" stroke="#243a4f" stroke-width="2"/>
    <path d="M19 21 H45" stroke="#2aa7d6" stroke-width="1.3" opacity=".65"/></svg>`,
  // Packet Owl — deep-blue head, gold tufts/beak, gold-ringed cyan eyes.
  packet_owl: `<svg class="cav" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M16 17 L20 6 L26 17 Z" fill="#e8b73e"/>
    <path d="M48 17 L44 6 L38 17 Z" fill="#e8b73e"/>
    <path d="M13 26 Q13 11 32 11 Q51 11 51 26 V37 Q51 54 32 55 Q13 54 13 37 Z" fill="#284a7a"/>
    <path d="M19 27 Q19 18 32 18 Q45 18 45 27 V33 Q45 43 32 44 Q19 43 19 33 Z" fill="#35608f"/>
    <g class="owl-eyes">
      <circle cx="25" cy="30" r="7.5" fill="#e8b73e"/><circle cx="25" cy="30" r="5" fill="#08233a"/><circle cx="25" cy="30" r="2.6" fill="#2ad4ff"/>
      <circle cx="39" cy="30" r="7.5" fill="#e8b73e"/><circle cx="39" cy="30" r="5" fill="#08233a"/><circle cx="39" cy="30" r="2.6" fill="#2ad4ff"/>
    </g>
    <path d="M32 34 l-4 5 4 3 4 -3 z" fill="#f0c14a"/>
    <path d="M22 48 q10 7 20 0" fill="none" stroke="#cfe0f2" stroke-width="2" opacity=".7"/></svg>`,
  // Log Fox — orange head, amber inner ears, white muzzle, cyan slit eyes.
  log_fox: `<svg class="cav" viewBox="0 0 64 64" aria-hidden="true">
    <g class="fox-ears">
      <path d="M12 9 L26 26 L16 27 Z" fill="#ff7a2f"/><path d="M15 14 L23 24 L18 25 Z" fill="#ffba73"/>
      <path d="M52 9 L38 26 L48 27 Z" fill="#ff7a2f"/><path d="M49 14 L41 24 L46 25 Z" fill="#ffba73"/>
    </g>
    <path d="M16 25 Q22 22 26 25 H38 Q42 22 48 25 L41 41 Q36 51 32 53 Q28 51 23 41 Z" fill="#ff7a2f"/>
    <path d="M16 25 Q22 22 26 25 H38 Q42 22 48 25 L41 41 Q36 51 32 53 Q28 51 23 41 Z" fill="none" stroke="#d85a12" stroke-width="1.6"/>
    <path d="M24 38 H40 L32 52 Z" fill="#f2e9df"/>
    <path d="M22 31 l6 2.4 -2 3 z" fill="#08233a"/><circle cx="26" cy="32" r="1.9" fill="#2ad4ff"/>
    <path d="M42 31 l-6 2.4 2 3 z" fill="#08233a"/><circle cx="38" cy="32" r="1.9" fill="#2ad4ff"/>
    <path d="M32 43 l-3.2 -3.4 h6.4 z" fill="#2a1d14"/></svg>`,
  // Malware Raven — slate skull, purple sheen, hooked beak, glowing cyan eye.
  malware_raven: `<svg class="cav" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M20 16 L23 7 L27 15 L31 6 L34 15 L38 8 L40 17 Z" fill="#3a3460"/>
    <path d="M17 20 Q31 12 44 22 Q50 28 46 39 Q41 51 28 50 Q16 47 15 33 Q14 25 17 20 Z" fill="#2b2742"/>
    <path d="M21 22 Q31 17 40 23 Q44 27 42 33 Q33 26 22 30 Q19 26 21 22 Z" fill="#6f4bd0" opacity=".5"/>
    <path d="M44 24 L63 29 L44 33 Z" fill="#9a93b8"/>
    <path d="M44 29 L63 29 L44 33 Z" fill="#6b6486"/>
    <path d="M59 29 q-2 4 -7 3.4" fill="none" stroke="#2b2742" stroke-width="2"/>
    <circle cx="33" cy="28" r="5.5" fill="#08111f"/>
    <circle class="raven-eye" cx="33" cy="28" r="3" fill="#25e0ff"/>
    <path d="M19 42 q9 5 18 1" fill="none" stroke="#6f4bd0" stroke-width="2" opacity=".55"/></svg>`,
  // Firewall Dragon — horned, plated head, gold eye, snout + nostril, ember.
  firewall_dragon: `<svg class="cav" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M24 16 Q18 6 20 3 Q26 7 28 15 Z" fill="#f4c145"/>
    <path d="M40 15 Q47 6 45 3 Q39 8 37 14 Z" fill="#f4c145"/>
    <path d="M30 13 l3 -6 3 6 z" fill="#d8381f"/>
    <path d="M14 40 Q11 24 27 19 Q42 14 49 24 L62 30 L50 34 Q54 40 47 43 L54 51 L36 47 Q21 51 14 40 Z" fill="#d8381f"/>
    <path d="M27 21 Q41 17 48 25 L40 27 Q33 23 26 26 Z" fill="#ff7a2f" opacity=".85"/>
    <path d="M22 22 Q30 20 38 24 L36 30 Q29 26 23 29 Z" fill="#5a1f15" opacity=".7"/>
    <path d="M20 34 Q26 33 30 36 L28 41 Q23 40 20 37 Z" fill="#5a1f15" opacity=".55"/>
    <path d="M28 27 L40 29 L33 33 Z" fill="#1c0a06"/>
    <path class="dragon-eye" d="M30 28 L38 30 L33 31.8 Z" fill="#ffe08a"/>
    <ellipse cx="56" cy="31" rx="1.7" ry="1.1" fill="#1c0a06"/>
    <path d="M30 44 Q40 46 48 43" fill="none" stroke="#5a1f15" stroke-width="1.6" opacity=".7"/>
    <path d="M18 30 Q24 33 22 38" fill="none" stroke="#29c7ff" stroke-width="1.3" opacity=".7"/>
    <circle class="fd-ember" cx="49" cy="41" r="3.4" fill="#ffd36b"/>
    <circle class="fd-ember" cx="45" cy="46" r="1.5" fill="#ffb020"/></svg>`,
  // Triage Drone — teal chassis, rotor arms, antenna, central green lens.
  triage_drone: `<svg class="cav" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M20 27 L7 19 M44 27 L57 19" stroke="#2aa597" stroke-width="2.4"/>
    <ellipse cx="7" cy="18" rx="6" ry="2.2" fill="#2fd0ff" opacity=".8"/>
    <ellipse cx="57" cy="18" rx="6" ry="2.2" fill="#2fd0ff" opacity=".8"/>
    <path d="M32 23 V15" stroke="#aee7df" stroke-width="2"/><circle cx="32" cy="14" r="2" fill="#39ffb0"/>
    <rect x="17" y="23" width="30" height="22" rx="9" fill="#1d6e63"/>
    <rect x="17" y="23" width="30" height="22" rx="9" fill="none" stroke="#aee7df" stroke-width="2"/>
    <path d="M21 44 L18 50 M43 44 L46 50" stroke="#2aa597" stroke-width="2.4"/>
    <circle cx="32" cy="34" r="9" fill="#062b27"/>
    <circle cx="32" cy="34" r="9" fill="none" stroke="#2aa597" stroke-width="2"/>
    <circle class="td-lens" cx="32" cy="34" r="3.6" fill="#39ffb0"/>
    <circle cx="23" cy="40" r="1.5" fill="#2fd0ff"/><circle cx="41" cy="40" r="1.5" fill="#2fd0ff"/></svg>`,
};

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

// A type is selectable if test mode is on, or its unlock condition is met.
function isTypeUnlocked(t) {
  return COMPANION_TYPES_TEST_UNLOCK || (t && t.test(companion));
}

function companionType() {
  // Selected type, falling back to Sentinel if missing or not (yet) unlocked.
  const t = COMPANION_TYPES.find(x => x.id === companion.type && isTypeUnlocked(x));
  return t || COMPANION_TYPES[0];
}

// Companion art mode. Default = painted PNG portrait (→ inline SVG fallback if
// the image is missing). Set this to true to re-enable the experimental
// pixel-art animated sprites instead.
const COMPANION_USE_SPRITES = false;

// Asset paths for a type id (filenames are hyphenated).
function companionAsset(typeId)  { return "assets/companions/" + String(typeId).replace(/_/g, "-") + ".png"; }
function companionSprite(typeId) { return "assets/companions/sprites/" + String(typeId).replace(/_/g, "-") + ".png"; }

// Companion art markup (used in sidebar + modal cards).
function getCompanionAvatar(typeId) {
  const safe = COMPANION_SVG[typeId] ? typeId : "sentinel";
  if (COMPANION_USE_SPRITES) {
    // Animated 4-frame pixel sprite; if it fails to load, swap to PNG portrait.
    return `<span class="cav-sprite" role="img" aria-label=""
              style="background-image:url('${companionSprite(safe)}')"
              data-type="${safe}"></span>`;
  }
  return `<img class="cav-img" src="${companionAsset(safe)}" alt="" draggable="false"
            onerror="companionImgFallback(this,'${safe}')">`;
}

// Fallback: swap a failed image for the type's inline SVG (no crash).
function companionImgFallback(img, typeId) {
  const wrap = img.parentElement;
  if (wrap) wrap.innerHTML = COMPANION_SVG[typeId] || COMPANION_SVG.sentinel;
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

  // Selected companion type (cosmetic) — the avatar/portrait + role come from it
  const type = companionType();

  // Main name = the player's nickname if set, otherwise the companion type name.
  const nickname = (companion.name || "").trim();
  el("comp-name").textContent  = nickname || type.name;
  el("comp-state").textContent = label;
  el("comp-credits").textContent = companion.credits;
  const glyph = el("avatar-glyph"); if (glyph) glyph.innerHTML = getCompanionAvatar(type.id);
  const typeName = el("comp-type");  if (typeName) typeName.textContent = "Type · " + type.name;
  const roleEl = el("comp-role");    if (roleEl) roleEl.textContent = type.desc;
  const card0 = el("companion-card"); if (card0) card0.dataset.ctype = type.id;  // drives type-flavor CSS

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
    const unlocked = isTypeUnlocked(t);
    const selected = unlocked && companion.type === t.id;
    const cls = ["ctype-card"];
    if (!unlocked) cls.push("locked");
    if (selected)  cls.push("selected");
    return `<button class="${cls.join(" ")}" data-type="${t.id}" ${unlocked ? "" : "disabled"}>
      <span class="ctype-icon">${unlocked ? getCompanionAvatar(t.id) : "🔒"}</span>
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

// Short-lived answer/unlock feedback animation on the companion card.
let compFlashTimer = null;
function flashCompanion(kind) {
  const card = el("companion-card");
  if (!card) return;
  card.classList.remove("companion-feedback-correct", "companion-feedback-wrong", "companion-feedback-unlock");
  void card.offsetWidth;   // force reflow so the animation restarts on rapid answers
  card.classList.add("companion-feedback-" + kind);
  if (compFlashTimer) clearTimeout(compFlashTimer);
  compFlashTimer = setTimeout(() => card.classList.remove("companion-feedback-" + kind), 1100);
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
    if (!t || !isTypeUnlocked(t)) return;   // locked → ignore
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
