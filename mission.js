// mission.js — Defense Mission (small-office topology MVP, SOC-dashboard hints)
// Self-contained: does NOT touch the quiz game, scoring, credits, or report in app.js.
// Phase 1: Preparation (click-select + click-place). Phase 2: Attack (watch hostile traffic).
// Board is a simplified network topology — Critical Systems on the LEFT, the Internet on the
// RIGHT. Hostile traffic spawns on the right and flows RIGHT → LEFT toward Critical Systems.

(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  // ── Topology zones (rendered LEFT → RIGHT) ────────────────────────────────
  const M_ZONES = [
    { id: "critical", name: "Critical Systems",    sub: "Protected objective", tone: "gold", icon: "🏰" },
    { id: "office",   name: "Office Network",      sub: "Company systems",     tone: "cyan", icon: "🏢" },
    { id: "perimeter",name: "Perimeter",           sub: "Security boundary",   tone: "blue", icon: "🧱" },
    { id: "external", name: "External / Internet",  sub: "Attacker spawn",      tone: "red",  icon: "🌐" }
  ];
  const CRITICAL_ZONE = 0;                 // leftmost = the objective
  const SPAWN_ZONE    = M_ZONES.length - 1; // rightmost = attacker spawn

  // ── Items (devices + security controls) ───────────────────────────────────
  // cat must match a slot's type for placement (realistic zoning).
  const M_DEVICES = {
    dc:          { name: "Domain Controller",  icon: "🏰", cost: 0,  cat: "critical-asset" },
    fileserver:  { name: "File Server",        icon: "🗄️", cost: 25, cat: "critical-asset" },
    appserver:   { name: "App Server",         icon: "🖥️", cost: 25, cat: "network-device" },
    swi:         { name: "Access Switch",      icon: "🔀", cost: 15, cat: "network-device" },
    router:      { name: "Edge Router",        icon: "📡", cost: 15, cat: "perimeter-device" },
    firewall:    { name: "Firewall",           icon: "🧱", cost: 20, cat: "perimeter-device" },
    workstation: { name: "User Workstation",   icon: "💻", cost: 15, cat: "user-device" },
    wifi:        { name: "Wi-Fi Access Point", icon: "📶", cost: 15, cat: "user-device" }
  };
  const M_DEFENSES = {
    ftower: { name: "Firewall Tower", icon: "🔥", cost: 40, dmg: 25, range: 1, cat: "defense", evt: "Firewall inspected hostile traffic" },
    ids:    { name: "IDS Sensor",     icon: "👁️", cost: 35, dmg: 15, range: 1, cat: "defense", evt: "IDS detected suspicious activity" },
    edr:    { name: "EDR Shield",     icon: "🛡️", cost: 45, dmg: 20, range: 1, cat: "defense", evt: "EDR engaged hostile process" }
  };
  const ITEM = id => M_DEVICES[id] || M_DEFENSES[id];

  // ── Difficulty (Easy fully tuned; Medium/Hard scaffolded + functional) ─────
  // slot.zone: 0 critical · 1 office · 2 perimeter · 3 external
  const M_DIFFS = {
    Easy: {
      budget: 120,
      attacker: { hp: 60, moveEvery: 2, count: 1, name: "Recon Probe" },
      slots: [
        { zone: 0, type: "critical-asset" },
        { zone: 1, type: "network-device" },
        { zone: 1, type: "defense" },
        { zone: 2, type: "perimeter-device" },
        { zone: 2, type: "defense" }
      ]
    },
    Medium: {
      budget: 200,
      attacker: { hp: 120, moveEvery: 2, count: 2, name: "Phishing Packet" },
      slots: [
        { zone: 0, type: "critical-asset" }, { zone: 0, type: "critical-asset" },
        { zone: 1, type: "network-device" }, { zone: 1, type: "user-device" }, { zone: 1, type: "defense" },
        { zone: 2, type: "perimeter-device" }, { zone: 2, type: "perimeter-device" }, { zone: 2, type: "defense" },
        { zone: 3, type: "defense" }
      ]
    },
    Hard: {
      budget: 280,
      attacker: { hp: 170, moveEvery: 1, count: 3, name: "Malware Beacon" },
      slots: [
        { zone: 0, type: "critical-asset" }, { zone: 0, type: "critical-asset" }, { zone: 0, type: "network-device" },
        { zone: 1, type: "network-device" }, { zone: 1, type: "user-device" }, { zone: 1, type: "user-device" }, { zone: 1, type: "defense" },
        { zone: 2, type: "perimeter-device" }, { zone: 2, type: "perimeter-device" }, { zone: 2, type: "defense" },
        { zone: 3, type: "defense" }, { zone: 3, type: "defense" }
      ]
    }
  };

  const TICK_MS = 600;

  let M = {};   // mission state

  // ── Init / reset ──────────────────────────────────────────────────────────
  function initMission(diff) {
    stopLoop();
    const cfg = M_DIFFS[diff] || M_DIFFS.Easy;
    M = {
      diff, cfg,
      phase: "prep",                 // 'prep' | 'attack' | 'result'
      budget: cfg.budget,
      selected: null,
      slots: cfg.slots.map((s, i) => ({ id: "ms" + i, zone: s.zone, type: s.type, item: null })),
      enemies: [],
      loopId: null,
      tick: 0,
      alerts: 0,
      defensesTriggered: 0,
      events: []
    };
    logEvent("Preparation phase — build your network defenses.");
    hideResult();
    renderAll();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function placeholderFor(type) {
    if (type === "critical-asset") return "Protect Critical Asset";
    if (type === "defense")        return "Place Defense";
    return "Place Device";
  }

  function dcPlaced() {
    return M.slots.some(s => s.type === "critical-asset" && s.item === "dc");
  }

  function aliveEnemies() {
    return M.enemies.filter(e => !e.dead);
  }

  // ── Board render (topology) ───────────────────────────────────────────────
  function renderBoard() {
    const board = $("mission-board");
    if (!board) return;

    let html = "";
    M_ZONES.forEach((zone, zi) => {
      html += zoneHtml(zone, zi);
      if (zi < M_ZONES.length - 1) {
        const active = M.phase === "attack" ? " mlink-active" : "";
        html += `<div class="mlink${active}"><span class="mlink-flow"></span><span class="mlink-arrow">◄</span></div>`;
      }
    });
    board.innerHTML = html;
  }

  function zoneHtml(zone, zi) {
    const defSlots = M.slots.filter(s => s.zone === zi && s.type === "defense");
    const devSlots = M.slots.filter(s => s.zone === zi && s.type !== "defense");
    const enemiesHere = aliveEnemies().filter(e => e.zone === zi);

    let h = `<div class="mzone mzone-${zone.tone}">`;
    h += `<div class="mzone-head"><span class="mzone-ico">${zone.icon}</span>`
       + `<span class="mzone-name">${zone.name}</span>`
       + `<span class="mzone-sub">${zone.sub}</span></div>`;

    if (zone.id === "critical") h += `<div class="mzone-objective">★ Protected Objective</div>`;

    // Traffic lane (enemies that are currently in this zone)
    h += '<div class="mzone-traffic">';
    enemiesHere.forEach(e => { h += enemyHtml(e); });
    h += "</div>";

    h += '<div class="mzone-stack">';

    // External zone shows the fixed Internet / malicious-source node
    if (zone.id === "external") {
      h += `<div class="mnode mnode-source"><span class="mnode-ico">🌐</span>`
         + `<span class="mnode-nm">Internet</span>`
         + `<span class="mnode-tag">malicious source</span></div>`;
    }

    // Device / critical / perimeter / user slots
    devSlots.forEach(s => { h += slotHtml(s); });

    // Defense (security control) slots
    if (defSlots.length) {
      h += '<div class="mzone-defs"><div class="mzone-defs-label">SECURITY CONTROLS</div>';
      defSlots.forEach(s => { h += slotHtml(s); });
      h += "</div>";
    }

    h += "</div>"; // stack
    h += "</div>"; // zone
    return h;
  }

  function enemyHtml(e) {
    const pct = Math.max(0, (e.hp / e.maxHp) * 100);
    const flash = e.hitFlash ? " menemy-hit" : "";
    if (e.hitFlash) e.hitFlash = false;
    return `<div class="menemy${flash}">`
         + `<span class="menemy-ico">⚠</span>`
         + `<span class="menemy-nm">${e.name}</span>`
         + `<div class="menemy-hp"><div class="menemy-hp-fill" style="width:${pct}%"></div></div>`
         + `</div>`;
  }

  function slotHtml(slot) {
    const it = slot.item ? ITEM(slot.item) : null;
    const valid = M.phase === "prep" && M.selected
      && ITEM(M.selected).cat === slot.type && !slot.item;

    let cls = "mslot mslot-" + slot.type;
    if (slot.item)      cls += " filled";
    if (valid)          cls += " valid";
    if (slot.fireFlash) { cls += " firing"; slot.fireFlash = false; }

    let inner;
    if (it) {
      const tag = (slot.type === "defense") ? '<span class="mslot-ctrl">CONTROL</span>' : "";
      inner = `<span class="mslot-ico">${it.icon}</span><span class="mslot-nm">${it.name}</span>${tag}`;
    } else {
      inner = `<span class="mslot-ph">${placeholderFor(slot.type)}</span>`;
    }
    return `<div class="${cls}" data-slot="${slot.id}">${inner}</div>`;
  }

  // ── Placement panel render ────────────────────────────────────────────────
  function renderShop() {
    const shop = $("mission-shop");
    if (!shop) return;
    const locked = M.phase !== "prep";

    let html = '<div class="mshop-group"><div class="mshop-title">NETWORK DEVICES</div><div class="mshop-items">';
    Object.keys(M_DEVICES).forEach(id => { html += shopBtn(id, M_DEVICES[id], locked); });
    html += "</div></div>";

    html += '<div class="mshop-group"><div class="mshop-title">SECURITY CONTROLS</div><div class="mshop-items">';
    Object.keys(M_DEFENSES).forEach(id => { html += shopBtn(id, M_DEFENSES[id], locked); });
    html += "</div></div>";

    shop.innerHTML = html;
  }

  function shopBtn(id, item, locked) {
    const sel = (M.selected === id) ? " selected" : "";
    const afford = M.budget >= item.cost;
    const dis = locked || !afford;
    const dmg = item.dmg ? `<span class="mshop-dmg">${item.dmg} dmg</span>` : "";
    return `<button type="button" class="mshop-btn${sel}" data-item="${id}" ${dis ? "disabled" : ""}>`
         + `<span class="mshop-ico">${item.icon}</span>`
         + `<span class="mshop-nm">${item.name}</span>`
         + `<span class="mshop-cost">${item.cost === 0 ? "FREE" : item.cost + " ⬡"}</span>`
         + dmg
         + `</button>`;
  }

  // ── SOC status / event panel ──────────────────────────────────────────────
  function statusText() {
    if (M.phase === "prep")   return { t: "Preparing", cls: "prep" };
    if (M.phase === "attack") return { t: "Under Attack", cls: "attack" };
    return { t: M.lastSuccess ? "Defended" : "Breached", cls: M.lastSuccess ? "win" : "lose" };
  }

  function renderSoc() {
    const soc = $("mission-soc");
    if (!soc) return;

    const st = statusText();
    const alive = aliveEnemies();
    const threat = (M.phase === "attack" && alive.length)
      ? alive[0].name + (alive.length > 1 ? ` (+${alive.length - 1})` : "")
      : (M.phase === "result" ? "—" : "None yet");

    let html = '<div class="msoc-head">▣ SOC MONITOR</div>';
    html += '<div class="msoc-grid">';
    html += socStat("MISSION STATUS", st.t, "msoc-" + st.cls);
    html += socStat("ACTIVE THREAT", threat, "msoc-threat");
    html += socStat("ALERTS", M.alerts, "");
    html += socStat("DEFENSES TRIGGERED", M.defensesTriggered, "");
    html += "</div>";

    html += '<div class="msoc-log"><div class="msoc-log-title">EVENT LOG</div>';
    if (M.events.length === 0) {
      html += '<div class="msoc-event msoc-event-muted">Awaiting activity…</div>';
    } else {
      M.events.forEach(ev => { html += `<div class="msoc-event">${ev}</div>`; });
    }
    html += "</div>";

    soc.innerHTML = html;
  }

  function socStat(k, v, vcls) {
    return `<div class="msoc-stat"><span class="msoc-k">${k}</span><span class="msoc-v ${vcls}">${v}</span></div>`;
  }

  function logEvent(text) {
    M.events.unshift(text);
    if (M.events.length > 6) M.events.pop();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  function updateHud() {
    const b = $("mission-budget"); if (b) b.textContent = M.budget;
    const ph = $("mission-phase");
    if (ph) ph.textContent = M.phase === "prep" ? "Preparation" : M.phase === "attack" ? "Attack" : "Result";

    const startBtn = $("btn-mission-start");
    if (startBtn) startBtn.disabled = !(M.phase === "prep" && dcPlaced());

    document.querySelectorAll(".mdiff-btn").forEach(btn => {
      btn.disabled = M.phase !== "prep";
      btn.classList.toggle("active", btn.dataset.diff === M.diff);
    });

    const hint = $("mission-hint");
    if (hint && M.phase === "prep") {
      hint.textContent = dcPlaced()
        ? "Domain Controller placed. Add security controls on the path, then Start Attack."
        : "Preparation — place your Domain Controller in Critical Systems to enable Start Attack.";
    }
  }

  function renderAll() { renderBoard(); renderShop(); renderSoc(); updateHud(); }

  // ── Placement interactions ────────────────────────────────────────────────
  function selectItem(id) {
    if (M.phase !== "prep") return;
    M.selected = (M.selected === id) ? null : id;
    renderAll();
  }

  function clickSlot(slotId) {
    if (M.phase !== "prep") return;
    const slot = M.slots.find(s => s.id === slotId);
    if (!slot) return;

    // Occupied → remove & refund
    if (slot.item) {
      M.budget += ITEM(slot.item).cost;
      slot.item = null;
      renderAll();
      return;
    }

    // Empty → place selected item if category matches slot type + affordable
    if (!M.selected) return;
    const item = ITEM(M.selected);
    if (item.cat !== slot.type) return;       // realistic zoning enforced
    if (M.budget < item.cost) return;

    slot.item = M.selected;
    M.budget -= item.cost;
    renderAll();
  }

  // ── Attack phase ──────────────────────────────────────────────────────────
  function startAttack() {
    if (M.phase !== "prep" || !dcPlaced()) return;
    M.phase = "attack";
    M.tick = 0;
    M.selected = null;
    M.alerts = 0;
    M.defensesTriggered = 0;
    M.events = [];

    const a = M.cfg.attacker;
    M.enemies = [];
    for (let i = 0; i < a.count; i++) {
      M.enemies.push({
        hp: a.hp, maxHp: a.hp, name: a.name,
        zone: SPAWN_ZONE, moveAccum: 0, spawnTick: i * 3, dead: false, hitFlash: false
      });
    }

    logEvent("⚠ Hostile traffic detected from the Internet.");
    const hint = $("mission-hint");
    if (hint) hint.textContent = "Attack — security controls fire automatically. Stop the traffic before Critical Systems!";
    renderAll();
    M.loopId = setInterval(tick, TICK_MS);
  }

  function tick() {
    M.tick++;

    // 1) Security controls fire on the alive, spawned enemy closest to Critical Systems
    M.slots.filter(s => s.type === "defense" && s.item).forEach(s => {
      const def = M_DEFENSES[s.item];
      const target = aliveEnemies()
        .filter(e => M.tick >= e.spawnTick && Math.abs(e.zone - s.zone) <= (def.range || 1))
        .sort((a, b) => a.zone - b.zone)[0];
      if (target) {
        target.hp -= def.dmg;
        target.hitFlash = true;
        s.fireFlash = true;
        M.defensesTriggered++;
        if (s.item === "ids") M.alerts++;
        // Throttle log: only when this control was not already the most recent event
        const line = def.evt;
        if (M.events[0] !== line) logEvent(line);
        if (target.hp <= 0) { target.hp = 0; target.dead = true; logEvent("✓ Hostile traffic neutralized."); }
      }
    });

    // 2) Victory if all hostile traffic stopped
    if (aliveEnemies().length === 0) { renderBoard(); endMission(true); return; }

    // 3) Move survivors RIGHT → LEFT, check breach
    let breach = false;
    aliveEnemies().forEach(e => {
      if (M.tick < e.spawnTick) return;
      e.moveAccum++;
      if (e.moveAccum >= M.cfg.attacker.moveEvery) {
        e.moveAccum = 0;
        e.zone--;
        if (e.zone <= CRITICAL_ZONE) { e.zone = CRITICAL_ZONE; breach = true; }
      }
    });

    renderBoard();
    renderSoc();
    if (breach) endMission(false);
  }

  function endMission(success) {
    stopLoop();
    M.phase = "result";
    M.lastSuccess = success;
    logEvent(success ? "✓ Attack blocked before critical assets." : "✗ Critical Systems breached!");
    renderSoc();
    updateHud();
    showResult(success);
  }

  // ── Result overlay ────────────────────────────────────────────────────────
  function showResult(success) {
    const res = $("mission-result");
    if (!res) return;
    res.classList.remove("hidden");

    const badge = $("mission-result-badge");
    const title = $("mission-result-title");
    const text  = $("mission-result-text");

    if (badge) { badge.textContent = success ? "✓ DEFENDED" : "✗ BREACHED"; badge.className = "mission-result-badge " + (success ? "win" : "lose"); }
    if (title) title.textContent = success ? "Critical Systems Secured" : "Critical Systems Breached";
    if (text)  text.textContent = success
      ? "Your security controls stopped the hostile traffic before it reached the Domain Controller."
      : "Hostile traffic reached your Critical Systems. Add more security controls on the path and try again.";
  }

  function hideResult() {
    const res = $("mission-result");
    if (res) res.classList.add("hidden");
  }

  // ── Loop / navigation ─────────────────────────────────────────────────────
  function stopLoop() {
    if (M && M.loopId) { clearInterval(M.loopId); M.loopId = null; }
  }

  function showMissionScreen() {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const ms = $("screen-mission");
    if (ms) ms.classList.add("active");
  }

  function returnToMenu() {
    stopLoop();
    hideResult();
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const start = $("screen-start");
    if (start) start.classList.add("active");
  }

  // ── Wiring ────────────────────────────────────────────────────────────────
  function wire() {
    const entry = $("btn-defense-mission");
    if (entry) entry.addEventListener("click", () => { initMission("Easy"); showMissionScreen(); });

    const board = $("mission-board");
    if (board) board.addEventListener("click", e => {
      const slot = e.target.closest(".mslot");
      if (slot) clickSlot(slot.dataset.slot);
    });

    const shop = $("mission-shop");
    if (shop) shop.addEventListener("click", e => {
      const btn = e.target.closest(".mshop-btn");
      if (btn && !btn.disabled) selectItem(btn.dataset.item);
    });

    const diff = $("mission-diff");
    if (diff) diff.addEventListener("click", e => {
      const btn = e.target.closest(".mdiff-btn");
      if (btn && M.phase === "prep") initMission(btn.dataset.diff);
    });

    const startBtn = $("btn-mission-start");
    if (startBtn) startBtn.addEventListener("click", startAttack);

    const abortBtn = $("btn-mission-abort");
    if (abortBtn) abortBtn.addEventListener("click", returnToMenu);

    const replay = $("btn-mission-replay");
    if (replay) replay.addEventListener("click", () => initMission(M.diff));

    const menu = $("btn-mission-menu");
    if (menu) menu.addEventListener("click", returnToMenu);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
