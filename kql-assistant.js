// kql-assistant.js — KQL Detection Assistant (analyst tool prototype).
// An educational, LOCAL detection-building helper for blue-team learning.
// Fills a builder from safe defensive templates, generates a KQL query plus a
// full detection note, and exports Markdown. Nothing connects to a real SIEM.
//
// SAFETY: no API, no Sentinel/Defender/Azure connection, no query execution,
// no backend, no AI. Generated queries are demo-only and must be validated.

"use strict";

const $ = id => document.getElementById(id);

let lastResult = null;   // { kql, note fields... } cached for copy buttons

/* ── Detection templates (defensive, blue-team only) ────────────────── */
// Each template seeds the builder and carries the narrative note fields.
const TEMPLATES = {
  outlook_powershell: {
    name: "Outlook spawning PowerShell",
    source: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    time: "7d", severity: "High",
    parent: "OUTLOOK.EXE", child: "powershell.exe", cmd: "",
    account: "AccountName", device: "DeviceName",
    mitre: "T1059.001 PowerShell",
    fp: "IT automation or add-ins that legitimately launch PowerShell from Outlook.",
    goal: "Detect Microsoft Outlook spawning PowerShell, a common phishing-to-execution pattern.",
    why: "Email clients rarely launch script interpreters. Outlook spawning powershell.exe often indicates a malicious attachment or link that executed code on the endpoint.",
    triage: [
      "Review the full process tree and the PowerShell command line.",
      "Check the user's recent email for a matching attachment or link.",
      "Look for follow-on network connections or file writes.",
      "Confirm whether the activity matches any sanctioned automation.",
    ],
    tuning: [
      "Exclude known management tools or signed internal scripts by path/hash.",
      "Add InitiatingProcessCommandLine context to spot add-in launches.",
      "Tighten the time range once a baseline is established.",
    ],
  },
  office_cmd: {
    name: "Office application spawning cmd.exe",
    source: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    time: "7d", severity: "High",
    parent: "winword.exe", child: "cmd.exe", cmd: "",
    account: "AccountName", device: "DeviceName",
    mitre: "T1059.003 Windows Command Shell",
    fp: "Document-automation macros approved by the business.",
    goal: "Detect Office applications (Word/Excel/PowerPoint) spawning the Windows command shell.",
    why: "Office apps spawning cmd.exe is a classic macro/exploit execution behavior and is uncommon in normal business use.",
    triage: [
      "Inspect the spawned command line and any child processes.",
      "Identify the source document and how it reached the user.",
      "Check for persistence or additional payload downloads.",
    ],
    tuning: [
      "Allowlist specific signed macro-enabled templates used by the business.",
      "Broaden parent list to winword.exe/excel.exe/powerpnt.exe as needed.",
    ],
  },
  encoded_powershell: {
    name: "Encoded PowerShell command",
    source: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    time: "7d", severity: "High",
    parent: "", child: "powershell.exe", cmd: "-enc",
    account: "AccountName", device: "DeviceName",
    mitre: "T1059.001 PowerShell",
    fp: "Some legitimate installers and management tools use encoded commands.",
    goal: "Detect PowerShell executed with an encoded command (-EncodedCommand / -enc).",
    why: "Encoded commands are frequently used to obfuscate malicious payloads and evade simple string-based detection.",
    triage: [
      "Decode the Base64 command (offline) and review what it does.",
      "Determine the parent process and how PowerShell was launched.",
      "Check for outbound connections initiated by the decoded script.",
    ],
    tuning: [
      "Exclude approved tools known to use encoded commands by hash.",
      "Combine with download-cradle keywords for higher fidelity.",
    ],
  },
  hidden_powershell: {
    name: "PowerShell with hidden / no-profile flags",
    source: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    time: "7d", severity: "Medium",
    parent: "", child: "powershell.exe", cmd: "-w hidden",
    account: "AccountName", device: "DeviceName",
    mitre: "T1059.001 PowerShell",
    fp: "Login scripts and deployment tooling sometimes run hidden.",
    goal: "Detect PowerShell launched with hidden window / no-profile / execution-bypass flags.",
    why: "Flags like -WindowStyle Hidden, -NoProfile and -ExecutionPolicy Bypass are commonly used to run scripts stealthily.",
    triage: [
      "Review the full command line for additional suspicious flags.",
      "Identify the parent process and execution context.",
      "Correlate with the user's expected activity.",
    ],
    tuning: [
      "Exclude signed deployment scripts by path/hash.",
      "Require an additional indicator (encoded command, download cradle) to reduce noise.",
    ],
  },
  failed_logins: {
    name: "Multiple failed logins",
    source: "Windows Security / Microsoft Entra",
    table: "DeviceLogonEvents",
    time: "1d", severity: "Medium",
    parent: "", child: "", cmd: "",
    account: "AccountName", device: "DeviceName",
    mitre: "T1110 Brute Force",
    fp: "Users mistyping passwords; stale cached credentials on devices/services.",
    goal: "Detect accounts with a high number of failed logons in a short window (possible brute force / password spray).",
    why: "A spike in failed logons can indicate brute-force or password-spray attempts, especially across many accounts or from one source.",
    triage: [
      "Identify whether one account or many are affected (spray vs. brute force).",
      "Check the source device/IP and whether any attempt later succeeded.",
      "Confirm with the user whether the activity is expected.",
    ],
    tuning: [
      "Adjust the failure threshold to your environment's baseline.",
      "Exclude service accounts with known credential-rotation issues.",
    ],
  },
  rare_outbound: {
    name: "Rare process making outbound connection",
    source: "Microsoft Defender for Endpoint",
    table: "DeviceNetworkEvents",
    time: "7d", severity: "Medium",
    parent: "", child: "", cmd: "",
    account: "AccountName", device: "DeviceName",
    mitre: "T1071 Application Layer Protocol",
    fp: "Newly deployed legitimate software; rare but sanctioned admin tools.",
    goal: "Surface uncommon processes that initiate outbound network connections (possible C2 / unusual egress).",
    why: "Processes that rarely connect outbound, suddenly doing so, can indicate command-and-control or data exfiltration.",
    triage: [
      "Review the destination, port, and connection frequency.",
      "Check the initiating process path and signature.",
      "Correlate with EDR alerts on the same device.",
    ],
    tuning: [
      "Build a baseline of common processes before alerting.",
      "Allowlist known updaters and management agents.",
    ],
  },
};

/* ── Helpers ───────────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const val = id => $(id).value.trim();

// Highlight common KQL operators + quoted strings for the on-screen block only.
function highlightKql(kql) {
  let safe = escHtml(kql);
  safe = safe.replace(/"[^"]*"/g, m => `<span class="str">${m}</span>`);
  // word-boundary operators (longer phrases first)
  ["order by", "where", "project", "summarize", "extend", "join", "count", "by", "ago", "bin"]
    .forEach(op => {
      safe = safe.replace(new RegExp("\\b(" + op.replace(/ /g, "\\s") + ")\\b", "g"), '<span class="op">$1</span>');
    });
  return safe;
}

/* ── KQL generation ────────────────────────────────────────────────── */
// Build a defensive query from the builder fields + the chosen template id.
function generateKql(tplId, f) {
  const t = f.table;
  const time = f.time || "7d";
  const lines = [t];
  lines.push(`| where Timestamp > ago(${time})`);

  if (tplId === "failed_logins") {
    lines.length = 1; // rebuild for logon schema
    lines.push(`| where Timestamp > ago(${time})`);
    lines.push(`| where ActionType == "LogonFailed"`);
    lines.push(`| summarize FailedCount = count(), Devices = make_set(${f.device || "DeviceName"}) by ${f.account || "AccountName"}, bin(Timestamp, 1h)`);
    lines.push(`| where FailedCount >= 10`);
    lines.push(`| order by FailedCount desc`);
    return lines.join("\n");
  }

  if (tplId === "rare_outbound") {
    lines.push(`| where ActionType == "ConnectionSuccess"`);
    lines.push(`| where RemoteIPType == "Public"`);
    lines.push(`| summarize ConnCount = count(), Devices = make_set(${f.device || "DeviceName"}) by InitiatingProcessFileName`);
    lines.push(`| where ConnCount < 5   // rare processes only — tune to your baseline`);
    lines.push(`| order by ConnCount asc`);
    return lines.join("\n");
  }

  // process-creation style templates
  if (f.parent) lines.push(`| where InitiatingProcessFileName =~ "${f.parent}"`);
  if (f.child)  lines.push(`| where FileName =~ "${f.child}"`);
  if (f.cmd)    lines.push(`| where ProcessCommandLine has "${f.cmd}"`);
  lines.push(`| project Timestamp, ${f.device || "DeviceName"}, ${f.account || "AccountName"}, InitiatingProcessFileName, FileName, ProcessCommandLine, InitiatingProcessCommandLine, FolderPath`);
  lines.push(`| order by Timestamp desc`);
  return lines.join("\n");
}

/* ── Read builder into a field object ───────────────────────────────── */
function readFields() {
  return {
    name: val("f-name"), source: val("f-source"), table: val("f-table"),
    time: val("f-time"), severity: $("f-severity").value,
    parent: val("f-parent"), child: val("f-child"), cmd: val("f-cmd"),
    account: val("f-account"), device: val("f-device"),
    mitre: val("f-mitre"), fp: val("f-fp"),
  };
}

/* ── Generate ──────────────────────────────────────────────────────── */
function generate() {
  const tplId = $("f-template").value;
  const t = TEMPLATES[tplId];
  const f = readFields();

  // Syntax warning if no table selected (defensive UX).
  if (!f.table) {
    $("kq-result").innerHTML = `<div class="kq-warn">⚠ No table selected. Choose a table (e.g. DeviceProcessEvents) before generating KQL.</div>`;
    lastResult = null;
    return;
  }

  const kql = generateKql(tplId, f);
  const mitre = parseMitre(f.mitre || t.mitre);

  lastResult = {
    name: f.name || t.name,
    goal: t.goal,
    source: f.source || t.source,
    table: f.table,
    severity: f.severity,
    kql,
    why: t.why,
    falsePositives: [t.fp, f.fp].filter(Boolean),
    triage: t.triage,
    mitre,
    tuning: t.tuning,
    limitations: [
      "Query generated from a template for educational/demo purposes.",
      "Not connected to a real SIEM; field names and tables vary by environment.",
      "Has not been executed or validated against live data.",
      "Tune thresholds and exclusions before any operational use.",
    ],
    checklist: [
      "Does the table exist in your environment?",
      "Are the field names correct for your schema?",
      "Does the query return the expected results?",
      "Are there known admin scripts or automation causing false positives?",
      "Is the time range appropriate?",
      "Should exclusions be added?",
      "Does the alert include enough context for triage?",
    ],
  };
  render();
}

// Accept "T1059.001 PowerShell" or "T1059.001" → { id, name }.
function parseMitre(s) {
  if (!s) return null;
  const m = String(s).match(/^(T\d{4}(?:\.\d{3})?)\s*(.*)$/i);
  return m ? { id: m[1], name: m[2] || "" } : { id: s, name: "" };
}

/* ── Render ────────────────────────────────────────────────────────── */
function render() {
  const r = lastResult;
  const mitreRow = r.mitre
    ? `<tr><td class="tech">${escHtml(r.mitre.id)}</td><td>${escHtml(r.mitre.name || "—")}</td></tr>`
    : `<tr><td colspan="2" style="color:var(--dim)">No technique provided.</td></tr>`;

  $("kq-result").innerHTML = `
    <div class="kq-section">
      <h3>DETECTION GOAL</h3>
      <p>${escHtml(r.goal)}</p>
    </div>

    <div class="kq-section">
      <h3>REQUIRED DATA SOURCE</h3>
      <p>${escHtml(r.source)} — table <b>${escHtml(r.table)}</b> · severity <b>${escHtml(r.severity)}</b></p>
    </div>

    <div class="kq-section">
      <h3>KQL QUERY <span style="color:var(--warn)">(demo — validate before production)</span></h3>
      <div class="kql-block">${highlightKql(r.kql)}</div>
    </div>

    <div class="kq-section">
      <h3>WHY THIS MATTERS</h3>
      <p>${escHtml(r.why)}</p>
    </div>

    <div class="kq-section">
      <h3>POSSIBLE FALSE POSITIVES</h3>
      <ul class="bullets">${r.falsePositives.map(x => `<li>${escHtml(x)}</li>`).join("") || "<li>—</li>"}</ul>
    </div>

    <div class="kq-section">
      <h3>TRIAGE STEPS</h3>
      <ul class="bullets">${r.triage.map(x => `<li>${escHtml(x)}</li>`).join("")}</ul>
    </div>

    <div class="kq-section">
      <h3>MITRE ATT&CK MAPPING</h3>
      <table class="tbl"><thead><tr><th>Technique</th><th>Name</th></tr></thead><tbody>${mitreRow}</tbody></table>
    </div>

    <div class="kq-section">
      <h3>TUNING IDEAS</h3>
      <ul class="bullets">${r.tuning.map(x => `<li>${escHtml(x)}</li>`).join("")}</ul>
    </div>

    <div class="kq-section">
      <h3>VALIDATION CHECKLIST</h3>
      <ul class="checklist">${r.checklist.map(x => `<li>${escHtml(x)}</li>`).join("")}</ul>
    </div>

    <div class="kq-section">
      <h3>LIMITATIONS</h3>
      <ul class="bullets">${r.limitations.map(x => `<li>${escHtml(x)}</li>`).join("")}</ul>
    </div>
  `;
}

/* ── Markdown export ───────────────────────────────────────────────── */
function buildMarkdown() {
  const r = lastResult;
  const L = [];
  L.push(`# KQL Detection Note — ${r.name}`);
  L.push("");
  L.push("## Detection Goal");
  L.push(""); L.push(r.goal); L.push("");
  L.push("## Data Source");
  L.push(""); L.push(`${r.source} — table \`${r.table}\` (severity: ${r.severity})`); L.push("");
  L.push("## KQL");
  L.push(""); L.push("```kql"); L.push(r.kql); L.push("```"); L.push("");
  L.push("## Why This Matters");
  L.push(""); L.push(r.why); L.push("");
  L.push("## False Positive Considerations");
  L.push(""); r.falsePositives.forEach(x => L.push(`- ${x}`)); L.push("");
  L.push("## Triage Steps");
  L.push(""); r.triage.forEach(x => L.push(`- ${x}`)); L.push("");
  L.push("## MITRE ATT&CK Mapping");
  L.push("");
  if (r.mitre) L.push(`- ${r.mitre.id}${r.mitre.name ? " — " + r.mitre.name : ""}`);
  else L.push("- None provided");
  L.push("");
  L.push("## Tuning Ideas");
  L.push(""); r.tuning.forEach(x => L.push(`- ${x}`)); L.push("");
  L.push("## Validation Checklist");
  L.push(""); r.checklist.forEach(x => L.push(`- [ ] ${x}`)); L.push("");
  L.push("## Limitations");
  L.push(""); r.limitations.forEach(x => L.push(`- ${x}`)); L.push("");
  L.push("---");
  L.push("_This query is generated for educational/demo purposes and must be validated in a real environment before operational use. Generated with Cyber Defense Lab — KQL Detection Assistant (prototype)._");
  return L.join("\n");
}

/* ── Buttons ───────────────────────────────────────────────────────── */
function applyTemplate(tplId) {
  const t = TEMPLATES[tplId];
  if (!t) return;
  $("f-name").value = t.name;
  $("f-source").value = t.source;
  $("f-table").value = t.table;
  $("f-time").value = t.time;
  $("f-severity").value = t.severity;
  $("f-parent").value = t.parent;
  $("f-child").value = t.child;
  $("f-cmd").value = t.cmd;
  $("f-account").value = t.account;
  $("f-device").value = t.device;
  $("f-mitre").value = t.mitre;
  $("f-fp").value = t.fp;
}

function loadSample() {
  $("f-template").value = "outlook_powershell";
  applyTemplate("outlook_powershell");
  generate();
}

function clearAll() {
  ["f-name","f-source","f-time","f-parent","f-child","f-cmd","f-account","f-device","f-mitre","f-fp"]
    .forEach(id => $(id).value = "");
  lastResult = null;
  $("kq-result").innerHTML = `<div class="kq-empty">Cleared. Pick a template (or ⤓ LOAD SAMPLE DETECTION), fill the builder, then ▶ GENERATE KQL.</div>`;
}

function copyText(text, btn, restore) {
  const done = () => { btn.textContent = "✔ COPIED"; btn.classList.add("copied");
    setTimeout(() => { btn.textContent = restore; btn.classList.remove("copied"); }, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  document.execCommand("copy"); document.body.removeChild(ta); done();
}
function copyKql()   { if (!lastResult) { generate(); if (!lastResult) return; } copyText(lastResult.kql, $("btn-copy-kql"), "⧉ COPY KQL"); }
function copyNotes() { if (!lastResult) { generate(); if (!lastResult) return; } copyText(buildMarkdown(), $("btn-copy-notes"), "⧉ COPY DETECTION NOTES"); }

/* ── Wiring ────────────────────────────────────────────────────────── */
$("f-template").addEventListener("change", e => applyTemplate(e.target.value));
$("btn-sample").addEventListener("click", loadSample);
$("btn-generate").addEventListener("click", generate);
$("btn-clear").addEventListener("click", clearAll);
$("btn-copy-kql").addEventListener("click", copyKql);
$("btn-copy-notes").addEventListener("click", copyNotes);

// Seed the builder with the first template so the page isn't empty.
applyTemplate("outlook_powershell");
