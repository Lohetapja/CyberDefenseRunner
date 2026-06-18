// report-generator.js — SOC Alert Report Generator (analyst tool prototype).
// Turns form fields into a structured Markdown incident report following the
// NIST incident-handling lifecycle. Pure local: no backend, no saving, no AI.

"use strict";

const $ = id => document.getElementById(id);
const val = id => $(id).value.trim();

// Field ids used by clear/regenerate.
const FIELDS = [
  "f-title","f-date","f-analyst","f-severity","f-status",
  "f-source","f-rule","f-user","f-host","f-srcip","f-dstip",
  "f-process","f-cmdline","f-evidence","f-timeline","f-assessment",
  "f-containment","f-nextsteps","f-lessons",
];

/* ── Markdown helpers ──────────────────────────────────────────────── */
const NOT_DOC = "_Not documented yet._";

// Multi-line textarea → Markdown bullet list (skips blank lines).
function bullets(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return lines.length ? lines.map(l => "- " + l).join("\n") : NOT_DOC;
}

// Single-line value or a placeholder, for the indicator table.
const cell = v => v || "—";

/* ── Report builder (NIST lifecycle structure) ─────────────────────── */
function buildReport() {
  const title    = val("f-title") || "Untitled incident";
  const date     = val("f-date") || new Date().toISOString().slice(0, 10);
  const analyst  = val("f-analyst") || "—";
  const severity = val("f-severity");
  const status   = val("f-status");

  const L = [];
  L.push(`# Incident Report: ${title}`);
  L.push("");
  L.push(`| Field | Value |`);
  L.push(`|---|---|`);
  L.push(`| Date | ${date} |`);
  L.push(`| Analyst | ${analyst} |`);
  L.push(`| Severity | ${severity} |`);
  L.push(`| Status | ${status} |`);
  L.push("");

  L.push(`## 1. Detection & Analysis`);
  L.push("");
  L.push(`| Indicator | Value |`);
  L.push(`|---|---|`);
  L.push(`| Alert source | ${cell(val("f-source"))} |`);
  L.push(`| Detection rule / alert | ${cell(val("f-rule"))} |`);
  L.push(`| Affected user | ${cell(val("f-user"))} |`);
  L.push(`| Affected host | ${cell(val("f-host"))} |`);
  L.push(`| Source IP | ${cell(val("f-srcip"))} |`);
  L.push(`| Destination IP | ${cell(val("f-dstip"))} |`);
  L.push(`| Suspicious process | ${cell(val("f-process"))} |`);
  L.push("");
  if (val("f-cmdline")) {
    L.push(`**Command line:**`);
    L.push("```");
    L.push(val("f-cmdline"));
    L.push("```");
    L.push("");
  }
  L.push(`### Key evidence`);
  L.push(bullets(val("f-evidence")));
  L.push("");
  L.push(`### Timeline`);
  L.push(bullets(val("f-timeline")));
  L.push("");
  L.push(`### Initial assessment`);
  L.push(val("f-assessment") || NOT_DOC);
  L.push("");

  L.push(`## 2. Containment`);
  L.push(bullets(val("f-containment")));
  L.push("");

  L.push(`## 3–4. Eradication & Recovery`);
  L.push(`### Recommended next steps`);
  L.push(bullets(val("f-nextsteps")));
  L.push("");

  L.push(`## 5. Post-Incident Activity`);
  L.push(`### Lessons learned`);
  L.push(val("f-lessons") || NOT_DOC);
  L.push("");
  L.push(`---`);
  L.push(`_Report generated with Cyber Defense Lab — SOC Alert Report Generator (prototype)._`);

  return L.join("\n");
}

/* ── Live preview ──────────────────────────────────────────────────── */
function refresh() {
  $("rg-preview").textContent = buildReport();
}

/* ── Buttons ───────────────────────────────────────────────────────── */
function copyReport() {
  const text = buildReport();
  const done = () => {
    const b = $("btn-copy");
    b.textContent = "✔ COPIED";
    b.classList.add("copied");
    setTimeout(() => { b.textContent = "⧉ COPY REPORT"; b.classList.remove("copied"); }, 1500);
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

function clearForm() {
  FIELDS.forEach(id => {
    const el = $(id);
    if (el.tagName === "SELECT") el.selectedIndex = id === "f-severity" ? 1 : 0; // Medium / Open
    else el.value = "";
  });
  $("f-date").value = new Date().toISOString().slice(0, 10);
  refresh();
}

/* ── Sample incident (entirely fictional, for training/demo use) ───── */
// Hosts/users are fake; IPs use RFC 5737 documentation ranges.
const SAMPLE = {
  "f-title":     "Suspicious PowerShell execution from Outlook on WS-TRAINING-07",
  "f-severity":  "High",
  "f-status":    "In Progress",
  "f-source":    "EDR (behavioral alert)",
  "f-rule":      "Office application spawned encoded PowerShell",
  "f-user":      "TRAINING-CORP\\m.tamm",
  "f-host":      "WS-TRAINING-07",
  "f-srcip":     "198.51.100.23",
  "f-dstip":     "203.0.113.66",
  "f-process":   "powershell.exe (parent: outlook.exe)",
  "f-cmdline":   "powershell.exe -NoP -W Hidden -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA... (truncated, fictional)",
  "f-evidence":  "EDR alert #TR-2031: Outlook spawned PowerShell with encoded command\nDecoded command attempts download from hxxp://files.example-cdn[.]test/inv.ps1\nAttachment 'Invoice_4471.docm' received 12 minutes before execution\nNo matching change ticket or admin activity for this host",
  "f-timeline":  "09:02 — phishing email with 'Invoice_4471.docm' delivered to m.tamm\n09:14 — user opened the attachment and enabled macros\n09:15 — outlook.exe spawned powershell.exe with encoded command\n09:15 — outbound connection attempt to 203.0.113.66 blocked by proxy\n09:18 — EDR behavioral alert raised; SOC triage began",
  "f-assessment":"Likely macro-based phishing leading to an attempted PowerShell download cradle. The download appears blocked at the proxy, but host compromise cannot be ruled out. Medium-high confidence; fictional training scenario.",
  "f-containment":"WS-TRAINING-07 isolated from the network via EDR\nAccount m.tamm sessions revoked and password reset\nSender domain and payload URL blocked at the mail gateway and proxy",
  "f-nextsteps": "Reimage WS-TRAINING-07 before reconnecting\nHunt for the attachment hash and payload URL across all mailboxes and endpoints\nReview proxy logs for any successful connections to 203.0.113.66\nConfirm macro-blocking policy is enforced for Office documents from the internet",
  "f-lessons":   "Macros from internet-sourced documents should be blocked by default\nUser reported the email only after the alert — reinforce phishing-report training\nDetection worked, but proxy block logs should auto-enrich EDR alerts to speed triage",
};

/* ── Canonical scenario integration ────────────────────────────────── */
// Map the shared "Invoice 4471" scenario pack (scenarios/phishing-powershell.js)
// into this tool's form fields. The report builder has no dedicated MITRE /
// false-positive / limitations sections, so that content is folded into the
// existing free-text fields (Initial assessment, Lessons learned) where it
// renders clearly. Returns a field-id → value map, or null if the pack is too
// sparse to build a useful sample.
function scenarioToFields(s) {
  const a   = s.alert || {};
  const rs  = s.reportStructure || {};
  const tri = s.expectedTriageOutput || {};
  const ent = s.entities || {};
  if (!a.alertName && !rs.summary) return null;   // not enough to build a useful sample

  // Extract "HH:MM" from an ISO timestamp; pass through anything already short.
  const hhmm = t =>
    (typeof t === "string" && t.indexOf("T") === 10 && t.length >= 16) ? t.slice(11, 16) : (t || "");

  // Timeline summary from the canonical timeline events.
  const timeline = (Array.isArray(s.timelineEvents) ? s.timelineEvents : [])
    .filter(e => e && e.time && e.description)
    .map(e => `${hhmm(e.time)} — ${e.description}`)
    .join("\n");

  // Key evidence bullets (factual indicators from the alert).
  const evidence = [];
  evidence.push(`EDR alert ${a.alertId || "(behavioral)"}: ${a.parentProcess || "parent process"} spawned ${a.processName || "powershell.exe"} with an encoded command`);
  if (a.url)           evidence.push(`Decoded command attempts a download from ${a.url} (blocked by proxy)`);
  if (a.fileName)      evidence.push(`Attachment '${a.fileName}'${a.fileHash ? ` (SHA-256 ${a.fileHash})` : ""}${a.emailSubject ? ` — email subject "${a.emailSubject}"` : ""}`);
  if (a.destinationIp) evidence.push(`Outbound destination ${a.destinationIp}${a.domain ? ` (${a.domain})` : ""}`);

  // MITRE ATT&CK mappings + false-positive notes — folded into the assessment.
  const mitre = (Array.isArray(s.mitreMappings) ? s.mitreMappings : [])
    .filter(m => m && m.id)
    .map(m => `- ${m.id} — ${m.name || ""} (${m.confidence || "?"} confidence): ${m.reason || ""}`)
    .join("\n");
  const fp = (Array.isArray(tri.falsePositiveConsiderations) ? tri.falsePositiveConsiderations : [])
    .map(x => `- ${x}`).join("\n");

  const assessment = [
    rs.summary || s.summary || "",
    `\nVerdict: ${tri.verdict || "—"} · Severity: ${rs.severity || tri.severity || "—"} · Confidence: ${tri.confidence || "—"}.`,
    mitre ? "\nMITRE ATT&CK mappings:\n" + mitre : "",
    fp ? "\nFalse-positive considerations:\n" + fp : "",
  ].filter(Boolean).join("\n").trim();

  // Containment / recovery actions taken, then forward-looking next steps.
  const containment = [rs.containment, rs.eradicationAndRecovery].filter(Boolean).join("\n");
  const nextsteps   = (Array.isArray(tri.recommendedActions) ? tri.recommendedActions : []).join("\n");

  // Lessons learned + an explicit limitations / simulated-data note.
  const scope = (Array.isArray(s.scopeNotes) ? s.scopeNotes : []).map(x => `- ${x}`).join("\n");
  const lessons = [
    rs.lessonsLearned || "",
    scope ? "\nLimitations / simulated data:\n" + scope : "",
  ].filter(Boolean).join("\n").trim();

  return {
    "f-title":      a.alertName ? `${a.alertName}${a.host ? ` on ${a.host}` : ""}` : (rs.summary || "Incident"),
    "f-severity":   rs.severity || tri.severity || "High",
    "f-status":     "In Progress",
    "f-analyst":    (ent.socAnalyst && ent.socAnalyst.account) || "",
    "f-source":     a.alertSource || "",
    "f-rule":       a.alertId ? `${a.alertId} — ${a.alertName || ""}`.trim() : (a.alertName || ""),
    "f-user":       a.user || "",
    "f-host":       a.host || "",
    "f-srcip":      a.sourceIp || "",
    "f-dstip":      a.destinationIp || "",
    "f-process":    a.processName ? `${a.processName} (parent: ${a.parentProcess || "?"})` : "",
    "f-cmdline":    a.commandLine || "",
    "f-evidence":   evidence.join("\n"),
    "f-timeline":   timeline,
    "f-assessment": assessment,
    "f-containment":containment,
    "f-nextsteps":  nextsteps,
    "f-lessons":    lessons,
  };
}

// Prefer the shared "Invoice 4471" scenario pack when present; fall back to the
// tool's built-in SAMPLE. Defensive: never break if the global is missing or malformed.
function getSampleFields() {
  try {
    const s = window.CDL_SCENARIOS && window.CDL_SCENARIOS["phishing-powershell"];
    if (s && typeof s === "object") {
      const fields = scenarioToFields(s);
      if (fields && fields["f-title"]) return fields;
    }
  } catch (e) { /* fall through to the built-in sample */ }
  return SAMPLE;
}

function loadSample() {
  Object.entries(getSampleFields()).forEach(([id, v]) => { const el = $(id); if (el) el.value = v; });
  $("f-date").value = new Date().toISOString().slice(0, 10);
  refresh();
}

/* ── Wiring ────────────────────────────────────────────────────────── */
FIELDS.forEach(id => $(id).addEventListener("input", refresh));
$("btn-copy").addEventListener("click", copyReport);
$("btn-clear").addEventListener("click", clearForm);
$("btn-sample").addEventListener("click", loadSample);

$("f-date").value = new Date().toISOString().slice(0, 10);   // default: today
refresh();
