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

function loadSample() {
  Object.entries(SAMPLE).forEach(([id, v]) => { $(id).value = v; });
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
