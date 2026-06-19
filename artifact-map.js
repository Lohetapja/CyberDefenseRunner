// artifact-map.js — Artifact Relationship View (analyst tool prototype).
// A standalone, READ-ONLY evidence map for the canonical "Invoice 4471" scenario.
// The graph topology is defined locally here; window.CDL_SCENARIOS["phishing-powershell"]
// is read only for optional enrichment, with a safe fallback if it is missing or
// malformed. Deterministic lane layout drawn as inline SVG.
//
// SAFETY: no backend, no external libraries, no persistence, no live SIEM/EDR/cloud
// connection. All data is fictional / simulated training data.

"use strict";

const $ = id => document.getElementById(id);
const escHtml = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const truncate = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

/* ── MVP graph data (fictional/simulated; mirrors the scenario pack) ──── */
const LANES = [
  { id: "identity",  label: "Identity & Users" },
  { id: "delivery",  label: "Email Delivery" },
  { id: "execution", label: "Execution" },
  { id: "network",   label: "Network / Egress" },
  { id: "detection", label: "Detection" },
  { id: "response",  label: "Response" },
];

const NODES = [
  { id: "user-mtamm",   type: "user",        lane: "identity",  row: 0, label: "TRAINING-CORP\\m.tamm",     sub: "Standard user (victim)" },
  { id: "host-ws07",    type: "host",        lane: "identity",  row: 1, label: "WS-TRAINING-07",            sub: "Workstation" },
  { id: "email-inv",    type: "email",       lane: "delivery",  row: 0, label: "Invoice 4471 email",        sub: 'Subj: "Invoice 4471 - payment overdue"' },
  { id: "file-docm",    type: "file",        lane: "delivery",  row: 1, label: "Invoice_4471.docm",         sub: "Macro-enabled attachment" },
  { id: "proc-outlook", type: "process",     lane: "execution", row: 0, label: "outlook.exe",               sub: "Parent process" },
  { id: "proc-ps",      type: "process",     lane: "execution", row: 1, label: "powershell.exe",            sub: "-Enc · hidden window" },
  { id: "dest-ip",      type: "destination", lane: "network",   row: 0, label: "203.0.113.66",              sub: "External destination (RFC 5737)" },
  { id: "domain-cdn",   type: "domain",      lane: "network",   row: 1, label: "files.example-cdn[.]test",  sub: "hxxp://…/inv.ps1 (defanged)" },
  { id: "alert-tr",     type: "alert",       lane: "detection", row: 0, label: "TR-2031",                   sub: "Outlook spawned encoded PowerShell (EDR)" },
  { id: "act-isolate",  type: "action",      lane: "response",  row: 0, label: "Host isolated",             sub: "EDR containment · 09:24Z" },
  { id: "act-secure",   type: "action",      lane: "response",  row: 1, label: "Sessions revoked / password reset", sub: "09:31Z" },
];

const EDGES = [
  { from: "user-mtamm",   to: "email-inv",    rel: "received",           time: "09:02", evidence: "Email gateway MAIL-GW-01 delivered the phishing email to m.tamm." },
  { from: "email-inv",    to: "file-docm",    rel: "carried",            time: "",      evidence: "The email carried the macro-enabled attachment Invoice_4471.docm." },
  { from: "user-mtamm",   to: "file-docm",    rel: "opened",             time: "09:14", evidence: "User opened the attachment and enabled macros (Office trust-center event)." },
  { from: "file-docm",    to: "proc-outlook", rel: "executed in",        time: "09:14", evidence: "The document macro executed within the Outlook / Office process context." },
  { from: "proc-outlook", to: "proc-ps",      rel: "spawned",            time: "09:15", evidence: "EDR ProcessCreation: outlook.exe spawned powershell.exe with an encoded command." },
  { from: "proc-ps",      to: "domain-cdn",   rel: "attempted download", time: "09:15", evidence: "Download cradle attempted to fetch hxxp://files.example-cdn[.]test/inv.ps1." },
  { from: "proc-ps",      to: "dest-ip",      rel: "connected to",       time: "09:15", evidence: "Outbound connection attempt to 203.0.113.66 (status: blocked)." },
  { from: "dest-ip",      to: "alert-tr",     rel: "blocked by",         time: "09:15", evidence: "Proxy PROXY-01 blocked the outbound connection by policy." },
  { from: "proc-ps",      to: "alert-tr",     rel: "triggered",          time: "09:18", evidence: "EDR behavioral alert TR-2031 raised on the suspicious parent-child process chain." },
  { from: "host-ws07",    to: "act-isolate",  rel: "contained by",       time: "09:24", evidence: "WS-TRAINING-07 isolated from the network via EDR containment action.", route: "bottom", trackY: 238 },
  { from: "user-mtamm",   to: "act-secure",   rel: "secured by",         time: "09:31", evidence: "Active sessions revoked and password reset for the affected user.", route: "bottom", trackY: 262 },
];

// Used only if the scenario pack's analystGuidance.missingEvidence is unavailable.
const MISSING_FALLBACK = [
  { label: "Full email headers",          note: "SPF/DKIM/DMARC + sender infrastructure — not collected." },
  { label: "Decoded PowerShell payload",  note: "Encoded command not yet decoded / reviewed." },
  { label: "PowerShell script-block logs",note: "Not available for WS-TRAINING-07." },
  { label: "File-hash reputation",        note: "No sandbox / reputation verdict for the attachment." },
];

const TYPE_LABEL = {
  user: "User", host: "Host", email: "Email", file: "File", process: "Process",
  destination: "Destination IP", domain: "Domain", alert: "Alert", action: "Response action",
};

/* ── Layout (deterministic lanes; no physics) ─────────────────────────── */
const LANE_W = 184, MX = 16, CARD_W = 152, CARD_H = 56;
const HEADER_Y = 26, ROW0_Y = 52, ROW_STEP = 90, TRACK_Y = 250;
const VIEW_W = MX * 2 + LANES.length * LANE_W;   // 1136
const VIEW_H = 300;

const nodeById = {};
NODES.forEach(n => { nodeById[n.id] = n; });
const laneIndex = id => LANES.findIndex(l => l.id === id);

function nodeBox(n) {
  const li = laneIndex(n.lane);
  const x = MX + li * LANE_W + (LANE_W - CARD_W) / 2;
  const y = ROW0_Y + n.row * ROW_STEP;
  return { x, y, w: CARD_W, h: CARD_H, cx: x + CARD_W / 2, cy: y + CARD_H / 2 };
}

function edgePath(e) {
  const a = nodeBox(nodeById[e.from]), b = nodeBox(nodeById[e.to]);
  const la = laneIndex(nodeById[e.from].lane), lb = laneIndex(nodeById[e.to].lane);

  if (e.route === "bottom") {                       // long response edges dip below the cards
    const ty = e.trackY || TRACK_Y;
    const sx = a.cx, sy = a.y + a.h, tx = b.cx, ty2 = b.y + b.h;
    return { d: `M${sx},${sy} C ${sx},${ty} ${tx},${ty} ${tx},${ty2}`, lx: (sx + tx) / 2, ly: ty };
  }
  if (la === lb) {                                  // same lane → vertical link
    const sx = a.cx, sy = a.y + a.h, tx = b.cx, ty = b.y;
    const my = (sy + ty) / 2;
    return { d: `M${sx},${sy} C ${sx},${my} ${tx},${my} ${tx},${ty}`, lx: (sx + tx) / 2, ly: my };
  }
  // forward (left → right) flow
  let sx, sy, tx, ty;
  if (lb > la) { sx = a.x + a.w; sy = a.cy; tx = b.x;       ty = b.cy; }
  else         { sx = a.x;       sy = a.cy; tx = b.x + b.w; ty = b.cy; }
  const dx = (tx - sx) * 0.45;
  return { d: `M${sx},${sy} C ${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`, lx: (sx + tx) / 2, ly: (sy + ty) / 2 - 7 };
}

/* ── SVG builder ──────────────────────────────────────────────────────── */
function buildSvg() {
  let lanesSvg = "";
  LANES.forEach((l, i) => {
    const x = MX + i * LANE_W;
    lanesSvg +=
      `<g class="lane">` +
        `<rect class="lane-bg" x="${x + 2}" y="40" width="${LANE_W - 4}" height="${VIEW_H - 52}" rx="8"/>` +
        `<text class="lane-hdr" x="${x + LANE_W / 2}" y="${HEADER_Y}">${escHtml(l.label)}</text>` +
      `</g>`;
  });

  let edgesSvg = "";
  EDGES.forEach((e, i) => {
    const p = edgePath(e);
    const w = e.rel.length * 6.1 + 12;
    const aria = `${nodeById[e.from].label} ${e.rel} ${nodeById[e.to].label}`;
    edgesSvg +=
      `<g class="edge" data-edge="${i}" tabindex="0" role="button" aria-label="${escHtml(aria)}">` +
        `<path class="edge-hit" d="${p.d}"/>` +
        `<path class="edge-line" d="${p.d}" marker-end="url(#am-arrow)"/>` +
        `<g class="edge-lbl">` +
          `<rect x="${(p.lx - w / 2).toFixed(1)}" y="${(p.ly - 9).toFixed(1)}" width="${w.toFixed(1)}" height="16" rx="3"/>` +
          `<text x="${p.lx.toFixed(1)}" y="${p.ly.toFixed(1)}">${escHtml(e.rel)}</text>` +
        `</g>` +
      `</g>`;
  });

  let nodesSvg = "";
  NODES.forEach(n => {
    const b = nodeBox(n);
    nodesSvg +=
      `<g class="node type-${n.type}" data-node="${n.id}" tabindex="0" role="button" aria-label="${escHtml(TYPE_LABEL[n.type] || n.type)}: ${escHtml(n.label)}">` +
        `<rect class="node-bg" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/>` +
        `<rect class="node-stripe" x="${b.x}" y="${b.y}" width="5" height="${b.h}"/>` +
        `<text class="node-type" x="${b.x + 14}" y="${b.y + 17}">${escHtml((TYPE_LABEL[n.type] || n.type).toUpperCase())}</text>` +
        `<text class="node-label" x="${b.x + 14}" y="${b.y + 34}">${escHtml(truncate(n.label, 21))}</text>` +
        `<text class="node-sub" x="${b.x + 14}" y="${b.y + 48}">${escHtml(truncate(n.sub, 25))}</text>` +
      `</g>`;
  });

  return `<svg id="am-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" ` +
    `aria-label="Invoice 4471 artifact relationship map">` +
    `<defs><marker id="am-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">` +
      `<path d="M0,0 L10,5 L0,10 z"/></marker></defs>` +
    `<g class="lanes">${lanesSvg}</g>` +
    `<g class="edges">${edgesSvg}</g>` +
    `<g class="nodes">${nodesSvg}</g>` +
    `</svg>`;
}

/* ── Highlight (adjacency) ────────────────────────────────────────────── */
function adjacency(id) {
  const edges = [], nodes = new Set();
  EDGES.forEach((e, i) => { if (e.from === id || e.to === id) { edges.push(i); nodes.add(e.from); nodes.add(e.to); } });
  nodes.delete(id);
  return { edges, nodes };
}
function applyHighlight(nodeOn, edgeOn) {
  const svg = $("am-svg"); if (!svg) return;
  svg.classList.add("is-filtering");
  svg.querySelectorAll(".node").forEach(g => {
    const on = nodeOn(g.dataset.node); g.classList.toggle("hl", on); g.classList.toggle("dim", !on);
  });
  svg.querySelectorAll(".edge").forEach(g => {
    const on = edgeOn(+g.dataset.edge); g.classList.toggle("hl", on); g.classList.toggle("dim", !on);
  });
}
function highlightNode(id) {
  const adj = adjacency(id);
  applyHighlight(n => n === id || adj.nodes.has(n), i => adj.edges.includes(i));
}
function highlightEdge(i) {
  const e = EDGES[i]; if (!e) return;
  applyHighlight(n => n === e.from || n === e.to, idx => idx === i);
}
function clearHighlight() {
  const svg = $("am-svg"); if (!svg) return;
  svg.classList.remove("is-filtering");
  svg.querySelectorAll(".hl, .dim").forEach(g => g.classList.remove("hl", "dim"));
}

/* ── Detail panel ─────────────────────────────────────────────────────── */
function showNodeDetail(id) {
  const n = nodeById[id]; if (!n) return;
  const conns = EDGES.filter(e => e.from === id || e.to === id).map(e => {
    const out = e.from === id;
    const other = nodeById[out ? e.to : e.from].label;
    const arrow = out ? "→" : "←";
    const t = e.time ? ` <span class="t">(${escHtml(e.time)})</span>` : "";
    return `<li>${arrow} <b>${escHtml(e.rel)}</b> ${escHtml(other)}${t}</li>`;
  });
  $("am-detail").innerHTML =
    `<div class="d-kind type-${n.type}">${escHtml(TYPE_LABEL[n.type] || n.type)}</div>` +
    `<div class="d-title">${escHtml(n.label)}</div>` +
    `<div class="d-sub">${escHtml(n.sub)}</div>` +
    `<div class="d-h">Connections</div>` +
    `<ul class="d-list">${conns.join("") || "<li>—</li>"}</ul>`;
  highlightNode(id);
}
function showEdgeDetail(i) {
  const e = EDGES[i]; if (!e) return;
  $("am-detail").innerHTML =
    `<div class="d-kind d-rel">Relationship</div>` +
    `<div class="d-title">${escHtml(nodeById[e.from].label)} ` +
      `<span class="d-arrow">—${escHtml(e.rel)}→</span> ${escHtml(nodeById[e.to].label)}</div>` +
    `<div class="d-h">Timestamp</div>` +
    `<div class="d-sub">${e.time ? escHtml(e.time) + " (UTC, simulated)" : "—"}</div>` +
    `<div class="d-h">Supporting evidence</div>` +
    `<div class="d-ev">${escHtml(e.evidence)}</div>`;
  highlightEdge(i);
}

/* ── Legend + missing evidence + scenario banner ──────────────────────── */
function renderLegend() {
  $("am-legend").innerHTML = NODES
    .map(n => n.type).filter((t, i, a) => a.indexOf(t) === i)
    .map(t => `<span class="leg type-${t}"><i class="leg-dot"></i>${escHtml(TYPE_LABEL[t] || t)}</span>`)
    .join("");
}
function renderMissing(scenario) {
  let items = MISSING_FALLBACK;
  try {
    const me = scenario && scenario.analystGuidance && scenario.analystGuidance.missingEvidence;
    if (Array.isArray(me) && me.length) items = me.map(x => ({ label: String(x), note: "" }));
  } catch (e) { /* keep fallback */ }
  $("am-missing").innerHTML = items.map(it =>
    `<div class="miss-item"><span class="miss-label">⌗ ${escHtml(it.label)}</span>` +
    (it.note ? `<span class="miss-note">${escHtml(it.note)}</span>` : "") + `</div>`).join("");
}
function getScenario() {
  try {
    const s = window.CDL_SCENARIOS && window.CDL_SCENARIOS["phishing-powershell"];
    if (s && typeof s === "object" && !Array.isArray(s)) return s;
  } catch (e) { /* fall through */ }
  return null;
}

/* ── Wiring ───────────────────────────────────────────────────────────── */
function wire() {
  const svg = $("am-svg"); if (!svg) return;
  const target = e => {
    const nd = e.target.closest("[data-node]"); if (nd) return { kind: "node", id: nd.dataset.node };
    const ed = e.target.closest("[data-edge]"); if (ed) return { kind: "edge", i: +ed.dataset.edge };
    return null;
  };
  svg.addEventListener("click", e => {
    const t = target(e); if (!t) return;
    if (t.kind === "node") showNodeDetail(t.id); else showEdgeDetail(t.i);
  });
  svg.addEventListener("mouseover", e => {
    const t = target(e); if (!t) return;
    if (t.kind === "node") highlightNode(t.id); else highlightEdge(t.i);
  });
  svg.addEventListener("mouseleave", clearHighlight);
  svg.addEventListener("focusin", e => {
    const t = target(e); if (!t) return;
    if (t.kind === "node") highlightNode(t.id); else highlightEdge(t.i);
  });
  svg.addEventListener("focusout", e => { if (!svg.contains(e.relatedTarget)) clearHighlight(); });
  svg.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const t = target(e); if (!t) return;
    e.preventDefault();
    if (t.kind === "node") showNodeDetail(t.id); else showEdgeDetail(t.i);
  });
}

function init() {
  const scenario = getScenario();
  $("am-scenario").textContent = scenario
    ? "Scenario pack loaded: " + (scenario.title || "Invoice 4471")
    : "Scenario pack not detected — showing the built-in Invoice 4471 map (safe local data).";
  renderLegend();
  $("am-canvas").innerHTML = buildSvg();
  renderMissing(scenario);
  wire();
}

init();
