// ai-misuse-demo.js — AI Misuse Detection Demo (analyst tool prototype).
// Defensive, educational simulation: paste fictional AI-usage logs, run local
// rules, and reason about risky/"shadow AI" activity. Produces a verdict, an
// evidence table, plain-language risk explanation, and Markdown / JSON output.
//
// SAFETY: no backend, no real monitoring, no AI provider calls, no prompt or
// browser-history collection, no file upload, no secret verification. All data
// is fictional and entered by the user.

"use strict";

const $ = id => document.getElementById(id);

let events = [];        // parsed, normalized events (with computed severity/reasons)
let parseErrors = [];   // { line, text } for malformed input
let lastResult = null;  // cached result for copy buttons

/* ── Mock allowlist / sensitive data (local demo logic only) ───────── */
const APPROVED_AI = ["approved-ai.training.local", "company-copilot.training.local"];
const UNAPPROVED_AI = ["ai-chat.example", "unknown-llm.example", "personal-ai.example"];
const SENSITIVE_TYPES = ["customer_data", "source_code", "api_key", "password",
  "internal_document", "hr_data", "financial_data"];
// Terms highlighted in the message / evidence table.
const HOT_WORDS = ["api_key", "password", "customer_data", "source_code", "hr_data",
  "financial_data", "unauthorized", "personal account", "secret", "token"];

/* ── Sample logs (entirely fictional, training only) ────────────────── */
// Mixes clear misuse, a possible secret leak, repeated uploads, and a benign
// approved-AI event so the demo shows both true and false positives.
const SAMPLE_LOGS = `2026-06-12T10:05:00Z | Proxy | TRAINING-CORP\\j.kask | WS-TRAINING-03 | CompanyCopilot | Query | internal_document | company-copilot.training.local | 0 | asked approved copilot to summarize an internal wiki page
2026-06-12T10:15:00Z | Proxy | TRAINING-CORP\\m.tamm | WS-TRAINING-07 | UnauthorizedAIChat | Upload | customer_data | ai-chat.example | 18 | pasted customer export into unauthorized AI tool
2026-06-12T10:16:30Z | DLP | TRAINING-CORP\\m.tamm | WS-TRAINING-07 | UnauthorizedAIChat | Upload | source_code | ai-chat.example | 4 | uploaded repository snippet from billing-service to AI chat
2026-06-12T10:17:10Z | DLP | TRAINING-CORP\\m.tamm | WS-TRAINING-07 | UnauthorizedAIChat | Upload | api_key | ai-chat.example | 1 | message contained AKIA-style api_key and a bearer token in pasted config
2026-06-12T10:42:00Z | Proxy | TRAINING-CORP\\r.oja | WS-TRAINING-11 | PersonalAI | Upload | hr_data | personal-ai.example | 9 | used personal account to send HR spreadsheet to non-approved AI service
2026-06-12T11:03:00Z | Proxy | TRAINING-CORP\\j.kask | WS-TRAINING-03 | CompanyCopilot | Query | none | company-copilot.training.local | 0 | drafted a meeting summary with approved copilot`;

/* ── Helpers ───────────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mdCell(s) { return String(s == null || s === "" ? "—" : s).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " "); }
function highlight(s) {
  let safe = escHtml(s);
  HOT_WORDS.forEach(w => {
    safe = safe.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s") + ")", "gi"), "<mark>$1</mark>");
  });
  return safe;
}
const SEV_ORDER = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const maxSev = (a, b) => (SEV_ORDER[a] >= SEV_ORDER[b] ? a : b);

function isApproved(dest)   { return APPROVED_AI.includes(String(dest).toLowerCase()); }
function isUnapproved(dest) { return UNAPPROVED_AI.includes(String(dest).toLowerCase()); }

/* ── Parsing ───────────────────────────────────────────────────────── */
// Fields: timestamp | source | user | host | app | action | dataType | destination | sizeMB | message
function parse() {
  events = [];
  parseErrors = [];
  const lines = $("ai-logs").value.split("\n");
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const p = line.split("|").map(s => s.trim());
    if (p.length < 10) { parseErrors.push({ line: i + 1, text: line.slice(0, 80) }); return; }
    const ev = {
      timestamp: p[0], source: p[1], user: p[2], host: p[3], app: p[4],
      action: p[5], dataType: p[6], destination: p[7],
      sizeMB: parseFloat(p[8]) || 0, message: p.slice(9).join("|"), raw: line,
    };
    events.push(ev);
  });
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/* ── Detection rules ───────────────────────────────────────────────── */
// Each event accumulates severity + reasons; rule hits are tallied globally.
function runRules() {
  const ruleHitsMap = {};      // ruleId -> count
  const tally = (id) => ruleHitsMap[id] = (ruleHitsMap[id] || 0) + 1;

  // pre-compute per-user upload timestamps for the "repeated uploads" rule
  const uploadsByUser = {};
  events.forEach(e => {
    if (/upload|post/i.test(e.action)) {
      (uploadsByUser[e.user] = uploadsByUser[e.user] || []).push(Date.parse(e.timestamp) || 0);
    }
  });

  events.forEach(e => {
    e.severity = "Low";
    e.reasons = [];
    const dt = String(e.dataType).toLowerCase();
    const msg = String(e.message).toLowerCase();
    const isUpload = /upload|post/i.test(e.action);
    const sensitive = SENSITIVE_TYPES.includes(dt) ||
      SENSITIVE_TYPES.some(t => msg.includes(t));

    // 1. Unauthorized AI tool usage
    if (isUnapproved(e.destination) || /unauthorized|personalai/i.test(e.app)) {
      tally("unauthorized_ai"); e.reasons.push("unauthorized/non-approved AI service");
      e.severity = maxSev(e.severity, "Medium");
    }
    // 7. Personal / non-approved account
    if (/personal/i.test(e.app) || /personal account/.test(msg)) {
      tally("personal_account"); e.reasons.push("personal account / non-approved service");
      e.severity = maxSev(e.severity, "Medium");
    }
    // 2. Sensitive data type near AI activity (only escalates off the allowlist)
    if (sensitive && !isApproved(e.destination)) {
      tally("sensitive_near_ai"); e.reasons.push("sensitive data type involved");
      e.severity = maxSev(e.severity, "Medium");
    }
    // 6. Customer / personal data to AI tool
    if ((dt === "customer_data" || dt === "hr_data" || msg.includes("customer_data") || msg.includes("hr_data"))
        && !isApproved(e.destination)) {
      tally("customer_data_to_ai"); e.reasons.push("customer/personal data sent to AI tool");
      e.severity = maxSev(e.severity, "High");
    }
    // 5. Source code / repository to AI tool
    if ((dt === "source_code" || /repositor|repo\b|source code|source_code/.test(msg)) && !isApproved(e.destination)) {
      tally("source_code_to_ai"); e.reasons.push("source code / repository data sent to AI tool");
      e.severity = maxSev(e.severity, "High");
    }
    // 4. Secret / API key pattern in message
    if (dt === "api_key" || dt === "password" ||
        /\bapi[_-]?key\b|\bpassword\b|\bbearer\b|\btoken\b|akia[0-9a-z]{8,}|secret/i.test(e.message)) {
      tally("secret_pattern"); e.reasons.push("possible secret/API key in message");
      e.severity = maxSev(e.severity, "Critical");
    }
    // 3. Large outbound upload to AI-like service
    if (isUpload && e.sizeMB >= 10 && !isApproved(e.destination)) {
      tally("large_upload"); e.reasons.push("large outbound upload (≥10 MB)");
      e.severity = maxSev(e.severity, "High");
    }
    // 8. Repeated AI uploads in short time window (≥3 within 10 min)
    if (isUpload) {
      const ts = Date.parse(e.timestamp) || 0;
      const near = (uploadsByUser[e.user] || []).filter(t => Math.abs(t - ts) <= 10 * 60 * 1000);
      if (near.length >= 3) {
        tally("repeated_uploads"); e.reasons.push("repeated uploads in a short window");
        e.severity = maxSev(e.severity, "High");
      }
    }

    // approved service with no sensitive data => benign/expected
    if (isApproved(e.destination) && !sensitive && !e.reasons.length) {
      e.reasons.push("approved AI service, no sensitive data");
    }
  });

  return ruleHitsMap;
}

const RULE_LABELS = {
  unauthorized_ai: "Unauthorized AI tool usage",
  sensitive_near_ai: "Sensitive data type near AI activity",
  large_upload: "Large outbound upload to AI service",
  secret_pattern: "Possible secret / API key in message",
  source_code_to_ai: "Source code / repository sent to AI tool",
  customer_data_to_ai: "Customer / personal data sent to AI tool",
  personal_account: "Personal / non-approved account used",
  repeated_uploads: "Repeated AI uploads in short window",
};

/* ── Decision engine ───────────────────────────────────────────────── */
function decide(ruleHitsMap, highestSeverity) {
  const hit = id => !!ruleHitsMap[id];
  let verdict = "Benign / Expected";
  if (hit("secret_pattern")) verdict = "Possible Secret Exposure";
  else if (highestSeverity === "High" && (hit("customer_data_to_ai") || hit("source_code_to_ai") || hit("large_upload")))
    verdict = "High Risk AI Data Exposure";
  else if (hit("unauthorized_ai") || hit("personal_account") || hit("sensitive_near_ai"))
    verdict = "Suspicious AI Usage";
  else if (Object.keys(ruleHitsMap).length) verdict = "Needs Review";
  return verdict;
}

/* ── Filters ───────────────────────────────────────────────────────── */
function rebuildFilterOptions() {
  const fill = (id, vals) => {
    const sel = $(id), cur = sel.value;
    sel.innerHTML = '<option value="">All</option>' +
      [...new Set(vals)].filter(Boolean).sort().map(v => `<option>${escHtml(v)}</option>`).join("");
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  };
  fill("flt-user", events.map(e => e.user));
  fill("flt-dest", events.map(e => e.destination));
}
function filteredEvents() {
  const sev = $("flt-severity").value, user = $("flt-user").value, dest = $("flt-dest").value;
  return events.filter(e =>
    (!sev || e.severity === sev) && (!user || e.user === user) && (!dest || e.destination === dest));
}

/* ── Analyze ───────────────────────────────────────────────────────── */
function analyze() {
  parse();
  if (!events.length && !parseErrors.length) {
    $("am-result").innerHTML = `<div class="am-empty parse-error">No events found. Load the sample or paste pipe-delimited AI logs.</div>`;
    lastResult = null;
    return;
  }
  const ruleHitsMap = runRules();
  rebuildFilterOptions();

  const highestSeverity = events.reduce((acc, e) => maxSev(acc, e.severity), "Low");
  const verdict = decide(ruleHitsMap, highestSeverity);
  const affectedUsers = [...new Set(events.filter(e => e.reasons.some(r => !r.startsWith("approved"))).map(e => e.user))];
  const affectedHosts = [...new Set(events.filter(e => e.reasons.some(r => !r.startsWith("approved"))).map(e => e.host))];
  const suspiciousDestinations = [...new Set(events.filter(e => isUnapproved(e.destination)).map(e => e.destination))];
  const detectedDataTypes = [...new Set(events
    .filter(e => SENSITIVE_TYPES.includes(String(e.dataType).toLowerCase()))
    .map(e => e.dataType))];

  lastResult = {
    normalizedEvents: events.map(e => ({
      timestamp: e.timestamp, source: e.source, user: e.user, host: e.host, app: e.app,
      action: e.action, dataType: e.dataType, destination: e.destination, sizeMB: e.sizeMB,
      message: e.message, severity: e.severity, reasons: e.reasons,
    })),
    ruleHits: Object.keys(ruleHitsMap).map(id => ({ id, label: RULE_LABELS[id] || id, count: ruleHitsMap[id] })),
    affectedUsers, affectedHosts, suspiciousDestinations, detectedDataTypes,
    verdict, highestSeverity,
    eventsAnalyzed: events.length,
    parseErrors: parseErrors.length,
    recommendedActions: recommended(ruleHitsMap),
    falsePositiveConsiderations: [
      "Approved business workflow using a sanctioned AI provider.",
      "Destination is on the approved allowlist (verify before escalating).",
      "Test/synthetic data rather than real sensitive data.",
      "Sanctioned automation or an existing DLP exception.",
    ],
    limitations: [
      "Simulated logs only — not real telemetry.",
      "Local demo rules only; no policy engine or CASB.",
      "No real monitoring, browser-history access, or AI provider calls.",
      "Educational / portfolio prototype only.",
    ],
  };
  render();
}

function recommended(map) {
  const acts = [
    "Verify whether the AI service is approved for this data class.",
    "Confirm whether the data involved was actually sensitive.",
  ];
  if (map.secret_pattern) acts.push("Rotate any exposed secrets/API keys immediately and check for misuse.");
  if (map.customer_data_to_ai || map.source_code_to_ai)
    acts.push("Notify the security/privacy owner about possible sensitive-data exposure.");
  acts.push("Review proxy / DLP / SaaS logs around these events for related activity.");
  if (map.unauthorized_ai || map.personal_account) acts.push("Educate the user/team on approved AI usage policy.");
  acts.push("Consider allowlist/blocklist tuning and adding DLP or CASB detections for AI services.");
  return acts;
}

/* ── Render ────────────────────────────────────────────────────────── */
function render() {
  const r = lastResult;
  const shown = filteredEvents();
  const chips = (arr, bad) => arr.length
    ? `<div class="chips">${arr.map(x => `<span class="chip ${bad ? "bad" : ""}">${escHtml(x)}</span>`).join("")}</div>`
    : `<span style="color:var(--dim)">none</span>`;

  const rows = shown.length ? shown.map(e => `
    <tr class="sev-${e.severity}">
      <td>${escHtml(e.timestamp.replace("T", " ").replace("Z", ""))}</td>
      <td>${escHtml(e.user)}</td><td>${escHtml(e.host)}</td><td>${escHtml(e.app)}</td>
      <td>${escHtml(e.action)}</td><td>${highlight(e.dataType)}</td>
      <td>${escHtml(e.destination)}</td><td>${e.sizeMB || 0}</td>
      <td class="sev">${e.severity.toUpperCase()}</td>
      <td>${escHtml(e.reasons.join("; ") || "—")}</td>
    </tr>`).join("")
    : `<tr><td colspan="10" class="ev-empty">No events match the current filters.</td></tr>`;

  const errBlock = r.parseErrors
    ? `<div class="am-section"><h3 class="parse-error">⚠ MALFORMED LINES</h3>
        <div style="font-size:11px;color:var(--danger)">${r.parseErrors} line(s) skipped (need 10 “|”-separated fields).</div></div>`
    : "";

  const sev = r.highestSeverity;
  $("am-result").innerHTML = `
    <div class="verdict-banner sev-${sev}">
      <div class="vb-item"><span class="vb-label">VERDICT</span><span class="vb-value">${escHtml(r.verdict)}</span></div>
      <div class="vb-item"><span class="vb-label">HIGHEST SEVERITY</span><span class="vb-value sev-${sev}">${escHtml(sev)}</span></div>
      <div class="vb-item"><span class="vb-label">EVENTS</span><span class="vb-value">${r.eventsAnalyzed}</span></div>
      <div class="vb-item"><span class="vb-label">RULE HITS</span><span class="vb-value">${r.ruleHits.reduce((s, h) => s + h.count, 0)}</span></div>
    </div>

    <div class="am-section">
      <h3>SUMMARY</h3>
      <dl class="kv">
        <dt>Users involved</dt><dd>${escHtml(r.affectedUsers.join(", ") || "—")}</dd>
        <dt>Hosts involved</dt><dd>${escHtml(r.affectedHosts.join(", ") || "—")}</dd>
        <dt>Suspicious destinations</dt><dd>${chips(r.suspiciousDestinations, true)}</dd>
        <dt>Sensitive data types</dt><dd>${chips(r.detectedDataTypes, true)}</dd>
      </dl>
    </div>

    <div class="am-section">
      <h3>KEY FINDINGS</h3>
      ${r.ruleHits.length
        ? `<ul class="bullets">${r.ruleHits.map(h => `<li>${escHtml(h.label)} <span style="color:var(--warn)">×${h.count}</span></li>`).join("")}</ul>`
        : `<div style="color:var(--dim);font-size:12px">No rules triggered — activity looks expected.</div>`}
    </div>

    <div class="am-section">
      <h3>EVIDENCE TABLE${shown.length !== r.eventsAnalyzed ? ` (showing ${shown.length} of ${r.eventsAnalyzed})` : ""}</h3>
      <table class="ev-tbl">
        <thead><tr><th>Time</th><th>User</th><th>Host</th><th>App</th><th>Action</th><th>Data</th><th>Destination</th><th>MB</th><th>Severity</th><th>Reason</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="am-section">
      <h3>WHY THIS MATTERS</h3>
      <ul class="bullets">
        <li>Possible <b>data leakage</b> of sensitive information to an external AI service.</li>
        <li><b>Shadow AI</b> / unauthorized SaaS usage outside sanctioned tooling.</li>
        <li>Potential <b>secret exposure</b> if keys/tokens were pasted into prompts.</li>
        <li>Likely <b>policy violation</b> if data class isn't permitted for that destination.</li>
      </ul>
    </div>

    ${errBlock}

    <div class="am-section">
      <h3>FALSE POSITIVE CONSIDERATIONS</h3>
      <ul class="bullets">${r.falsePositiveConsiderations.map(f => `<li>${escHtml(f)}</li>`).join("")}</ul>
    </div>

    <div class="am-section">
      <h3>RECOMMENDED ACTIONS</h3>
      <ul class="bullets">${r.recommendedActions.map(a => `<li>${escHtml(a)}</li>`).join("")}</ul>
    </div>

    <div class="am-section">
      <h3>LIMITATIONS</h3>
      <ul class="bullets">${r.limitations.map(l => `<li>${escHtml(l)}</li>`).join("")}</ul>
    </div>
  `;
}

/* ── Markdown export ───────────────────────────────────────────────── */
function buildMarkdown() {
  const r = lastResult;
  const shown = filteredEvents();
  const L = [];
  L.push("# AI Misuse Detection Report");
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(`- Verdict: ${r.verdict}`);
  L.push(`- Highest severity: ${r.highestSeverity}`);
  L.push(`- Events analyzed: ${r.eventsAnalyzed}`);
  L.push(`- Users involved: ${r.affectedUsers.join(", ") || "—"}`);
  L.push(`- Hosts involved: ${r.affectedHosts.join(", ") || "—"}`);
  L.push(`- Suspicious destinations: ${r.suspiciousDestinations.join(", ") || "—"}`);
  L.push("");
  L.push("## Key Findings");
  L.push("");
  if (r.ruleHits.length) r.ruleHits.forEach(h => L.push(`- ${h.label} (×${h.count})`));
  else L.push("- No rules triggered");
  L.push("");
  L.push("## Evidence Table");
  L.push("");
  L.push("| Time | User | Host | App | Action | Data Type | Destination | Size | Severity | Reason |");
  L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  shown.forEach(e => L.push(`| ${mdCell(e.timestamp)} | ${mdCell(e.user)} | ${mdCell(e.host)} | ${mdCell(e.app)} | ${mdCell(e.action)} | ${mdCell(e.dataType)} | ${mdCell(e.destination)} | ${e.sizeMB || 0} | ${mdCell(e.severity)} | ${mdCell(e.reasons.join("; "))} |`));
  L.push("");
  L.push("## Why This Matters");
  L.push("");
  L.push("- Possible data leakage of sensitive information to an external AI service.");
  L.push("- Unauthorized SaaS / shadow AI usage outside sanctioned tooling.");
  L.push("- Sensitive data exposure and potential secret exposure if keys/tokens were shared.");
  L.push("- Policy violation if the data class is not permitted for that destination.");
  L.push("");
  L.push("## False Positive Considerations");
  L.push("");
  r.falsePositiveConsiderations.forEach(f => L.push(`- ${f}`));
  L.push("");
  L.push("## Recommended Actions");
  L.push("");
  r.recommendedActions.forEach(a => L.push(`- ${a}`));
  L.push("");
  L.push("## Limitations");
  L.push("");
  r.limitations.forEach(l => L.push(`- ${l}`));
  L.push("");
  L.push("---");
  L.push("_Generated with Cyber Defense Lab — AI Misuse Detection Demo (prototype). Defensive simulation; training data is fictional._");
  return L.join("\n");
}

/* ── Buttons ───────────────────────────────────────────────────────── */
function loadSample() { $("ai-logs").value = SAMPLE_LOGS; analyze(); }
function clearAll() {
  $("ai-logs").value = "";
  events = []; parseErrors = []; lastResult = null;
  ["flt-severity", "flt-user", "flt-dest"].forEach(id => $(id).value = "");
  rebuildFilterOptions();
  $("am-result").innerHTML = `<div class="am-empty">Cleared. Load the sample or paste AI logs, then ▶ ANALYZE LOGS.</div>`;
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
function copyMarkdown() { if (!lastResult) { analyze(); if (!lastResult) return; } copyText(buildMarkdown(), $("btn-md"), "⧉ COPY MARKDOWN"); }
function copyJson() { if (!lastResult) { analyze(); if (!lastResult) return; } copyText(JSON.stringify(lastResult, null, 2), $("btn-json"), "⧉ COPY JSON"); }

/* ── Wiring ────────────────────────────────────────────────────────── */
$("btn-sample").addEventListener("click", loadSample);
$("btn-analyze").addEventListener("click", analyze);
$("btn-clear").addEventListener("click", clearAll);
$("btn-md").addEventListener("click", copyMarkdown);
$("btn-json").addEventListener("click", copyJson);
["flt-severity", "flt-user", "flt-dest"].forEach(id => $(id).addEventListener("input", () => { if (lastResult) render(); }));

/* ── Local file load (browser-side FileReader only; no upload) ─────── */
(function wireFileLoad() {
  const MAX_MB = 5;   // simulated usage logs can be larger
  const input = $("file-input"), status = $("file-status");
  $("btn-file").addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const f = input.files[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      status.textContent = `⚠ File too large for this demo. Max size: ${MAX_MB} MB.`;
      status.className = "file-status warn";
      input.value = ""; return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      $("ai-logs").value = reader.result;
      status.textContent = "Loaded file locally. Nothing was uploaded.";
      status.className = "file-status ok";
    };
    reader.onerror = () => {
      status.textContent = "⚠ Could not read that file — try a plain text file.";
      status.className = "file-status warn";
    };
    reader.readAsText(f);
    input.value = "";   // allow re-loading the same file
  });
})();
