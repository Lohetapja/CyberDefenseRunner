// timeline-builder.js — Incident Timeline Builder (analyst tool prototype).
// Enter investigation events, keep them sorted by timestamp, and export a clean
// Markdown timeline table. Pure local: no backend, no saving, no AI.

"use strict";

const $ = id => document.getElementById(id);

/* ── State ─────────────────────────────────────────────────────────── */
let events = [];      // { time, source, host, user, type, severity, desc, notes }
let seq = 0;          // stable ids for delete buttons

/* ── Sample timeline (entirely fictional, for training/demo use) ───── */
// Matches the SOC Alert Report Generator sample scenario:
// suspicious PowerShell spawned from Outlook on WS-TRAINING-07.
// Hosts/users are fake; IPs use RFC 5737 documentation ranges; URLs defanged.
const SAMPLE = [
  { time:"09:02", source:"Email Gateway", host:"MAIL-GW-01",     user:"m.tamm@training-corp.test", type:"Email Delivered",   severity:"Low",
    desc:"Phishing email with attachment 'Invoice_4471.docm' delivered.",
    notes:"Sender domain registered 3 days ago; gateway verdict: clean (missed)." },
  { time:"09:14", source:"Endpoint",      host:"WS-TRAINING-07", user:"TRAINING-CORP\\m.tamm",     type:"Document Opened",   severity:"Medium",
    desc:"User opened the attachment and enabled macros.",
    notes:"Office trust-center event; macro execution allowed by user click." },
  { time:"09:15", source:"EDR",           host:"WS-TRAINING-07", user:"TRAINING-CORP\\m.tamm",     type:"Process Creation",  severity:"High",
    desc:"outlook.exe spawned powershell.exe with an encoded command.",
    notes:"EDR alert #TR-2031; encoded download cradle (fictional sample)." },
  { time:"09:15", source:"Proxy",         host:"PROXY-01",       user:"TRAINING-CORP\\m.tamm",     type:"Outbound Blocked",  severity:"High",
    desc:"Connection attempt to 203.0.113.66 blocked by proxy policy.",
    notes:"Requested URL: hxxp://files.example-cdn[.]test/inv.ps1 (defanged)." },
  { time:"09:18", source:"SOC",           host:"WS-TRAINING-07", user:"analyst.on-duty",           type:"Triage Started",    severity:"Medium",
    desc:"EDR behavioral alert picked up; SOC triage began.",
    notes:"" },
  { time:"09:24", source:"EDR",           host:"WS-TRAINING-07", user:"SOC",                       type:"Host Isolated",     severity:"Medium",
    desc:"Host isolated from the network via EDR containment action.",
    notes:"Isolation confirmed; user informed via phone." },
  { time:"09:31", source:"Identity",      host:"DC-TRAINING-01", user:"TRAINING-CORP\\m.tamm",     type:"Account Secured",   severity:"Medium",
    desc:"Active sessions revoked and password reset for the affected user.",
    notes:"No suspicious logins observed after isolation." },
];

/* ── Helpers ───────────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Markdown table cells must not contain raw pipes or newlines.
function mdCell(s) {
  return String(s || "—").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
}
function sortEvents() {
  // HH:MM sorts correctly as a string; missing times can't occur (validated on add).
  events.sort((a, b) => a.time.localeCompare(b.time));
}

/* ── Add / delete / clear ──────────────────────────────────────────── */
function addEvent() {
  const time = $("e-time").value;
  if (!time) {                                   // basic validation
    $("form-warning").classList.remove("hidden");
    $("e-time").focus();
    return;
  }
  $("form-warning").classList.add("hidden");
  events.push({
    id: ++seq,
    time,
    source: $("e-source").value.trim(),
    host:   $("e-host").value.trim(),
    user:   $("e-user").value.trim(),
    type:   $("e-type").value.trim(),
    severity: $("e-severity").value,
    desc:   $("e-desc").value.trim(),
    notes:  $("e-notes").value.trim(),
  });
  // keep timestamp+severity for fast multi-entry; clear the text fields
  ["e-source","e-host","e-user","e-type","e-desc","e-notes"].forEach(id => $(id).value = "");
  render();
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  render();
}

function clearTimeline() {
  events = [];
  render();
}

function loadSample() {
  events = SAMPLE.map(e => ({ ...e, id: ++seq }));
  render();
}

/* ── Render ────────────────────────────────────────────────────────── */
function renderStats() {
  const box = $("tb-stats");
  if (!events.length) { box.innerHTML = "No events yet."; return; }
  const count = sev => events.filter(e => e.severity === sev).length;
  const first = events[0].time, last = events[events.length - 1].time;
  box.innerHTML =
    `Events: <b>${events.length}</b>` +
    `<span class="sev-crit">Critical: <b>${count("Critical")}</b></span>` +
    `<span class="sev-high">High: <b>${count("High")}</b></span>` +
    `<span class="sev-med">Medium: <b>${count("Medium")}</b></span>` +
    `<span class="sev-low">Low: <b>${count("Low")}</b></span>` +
    `Window: <b>${first} – ${last}</b>`;
}

function render() {
  sortEvents();
  renderStats();
  const list = $("tb-list");
  list.innerHTML = "";
  if (!events.length) {
    list.innerHTML = `<div class="tb-empty">Timeline is empty.<br/>
      Add events on the left, or use ⤓ LOAD SAMPLE TIMELINE to see a worked example.</div>`;
    return;
  }
  events.forEach(e => {
    const row = document.createElement("div");
    row.className = "ev sev-" + e.severity;
    row.innerHTML = `
      <div class="ev-time">${escHtml(e.time)}</div>
      <div class="ev-main">
        <div class="ev-head">${escHtml(e.type || "Event")} <span class="ev-sev">· ${escHtml(e.severity).toUpperCase()}</span></div>
        <div class="ev-meta">${escHtml(e.source || "—")} · ${escHtml(e.host || "—")} · ${escHtml(e.user || "—")}</div>
        <div class="ev-desc">${escHtml(e.desc || "")}</div>
        ${e.notes ? `<div class="ev-notes">📎 ${escHtml(e.notes)}</div>` : ""}
      </div>
      <button class="ev-del" title="Delete event">✕</button>`;
    row.querySelector(".ev-del").addEventListener("click", () => deleteEvent(e.id));
    list.appendChild(row);
  });
}

/* ── Markdown export ───────────────────────────────────────────────── */
function buildMarkdown() {
  const L = [];
  L.push("# Incident Timeline");
  L.push("");
  L.push("| Time | Source | Host | User | Event Type | Severity | Description |");
  L.push("| --- | --- | --- | --- | --- | --- | --- |");
  events.forEach(e => {
    L.push(`| ${mdCell(e.time)} | ${mdCell(e.source)} | ${mdCell(e.host)} | ${mdCell(e.user)} | ${mdCell(e.type)} | ${mdCell(e.severity)} | ${mdCell(e.desc)} |`);
  });
  const withNotes = events.filter(e => e.notes);
  if (withNotes.length) {
    L.push("");
    L.push("## Evidence / Notes");
    withNotes.forEach(e => L.push(`- **${e.time}** — ${e.notes.replace(/\s*\n\s*/g, " ")}`));
  }
  L.push("");
  L.push("---");
  L.push("_Timeline generated with Cyber Defense Lab — Incident Timeline Builder (prototype)._");
  return L.join("\n");
}

function copyTimeline() {
  const text = buildMarkdown();
  const done = () => {
    const b = $("btn-copy");
    b.textContent = "✔ COPIED";
    b.classList.add("copied");
    setTimeout(() => { b.textContent = "⧉ COPY TIMELINE (MD)"; b.classList.remove("copied"); }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
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

/* ── Wiring ────────────────────────────────────────────────────────── */
$("btn-add").addEventListener("click", addEvent);
$("btn-clear").addEventListener("click", clearTimeline);
$("btn-sample").addEventListener("click", loadSample);
$("btn-copy").addEventListener("click", copyTimeline);

render();
