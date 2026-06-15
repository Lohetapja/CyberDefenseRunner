// alert-triage.js — SOAR-Lite Alert Triage Engine (analyst tool prototype).
// Takes a simulated JSON alert, applies a small set of LOCAL detection rules,
// adds MOCK enrichment, then computes verdict/severity/confidence + MITRE mapping
// and exports Markdown / JSON. MVP scope: "Outlook spawning PowerShell" only.
// Pure local: no backend, no threat-intel calls, no AI, no file upload.

"use strict";

const $ = id => document.getElementById(id);

let lastResult = null;   // cached triage result for the copy buttons

/* ── Sample alert (entirely fictional, training only) ──────────────────
   Matches the Outlook→PowerShell scenario used across the other tools.
   IPs use RFC 5737 documentation ranges; URLs defanged; no real data. */
const SAMPLE_ALERT = {
  timestamp: "2026-06-12T09:15:00Z",
  alertName: "Outlook spawned encoded PowerShell",
  alertSource: "EDR",
  host: "WS-TRAINING-07",
  user: "TRAINING-CORP\\m.tamm",
  parentProcess: "outlook.exe",
  processName: "powershell.exe",
  commandLine: "powershell.exe -NoP -W Hidden -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA...",
  sourceIp: "198.51.100.41",
  destinationIp: "203.0.113.66",
  fileHash: "fc4e9b2a1d7c0e5f3a8b6c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
  domain: "files.example-cdn[.]test",
  emailSubject: "Invoice 4471 - payment overdue"
};

/* ── Helpers ───────────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mdCell(s) { return String(s == null || s === "" ? "—" : s).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " "); }
const has = v => v != null && String(v).trim() !== "";

// Known Office / email parent processes that should rarely spawn shells.
const OFFICE_PARENTS = ["outlook.exe", "winword.exe", "excel.exe", "powerpnt.exe", "onenote.exe", "mspub.exe", "msaccess.exe"];
// PowerShell-style children.
const SHELLS = ["powershell.exe", "powershell", "pwsh.exe", "powershell_ise.exe"];

// Rough "is this IP a private/internal address" check (defanged-friendly).
function isPrivateIp(ip) {
  if (!has(ip)) return false;
  return /^10\./.test(ip) || /^192\.168\./.test(ip) ||
         /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || /^127\./.test(ip);
}

/* ── Detection rules ───────────────────────────────────────────────────
   Each rule: id, label, points, and a test(alert) → boolean.
   Points feed a simple additive severity score (transparent, no ML). */
const RULES = [
  {
    id: "office_spawns_powershell",
    label: "Office/email app spawned PowerShell",
    points: 4,
    test: a => OFFICE_PARENTS.includes(String(a.parentProcess).toLowerCase()) &&
               SHELLS.includes(String(a.processName).toLowerCase()),
  },
  {
    id: "encoded_command",
    label: "Encoded PowerShell command (-Enc / -EncodedCommand)",
    points: 3,
    test: a => /(-enc\b|-encodedcommand\b|-e\s+[A-Za-z0-9+/=]{12,})/i.test(a.commandLine || ""),
  },
  {
    id: "bypass_flags",
    label: "Hidden window / NoProfile / ExecutionPolicy bypass flags",
    points: 2,
    test: a => /(-w\s+hidden|-windowstyle\s+hidden|-nop\b|-noprofile\b|-ep\s+bypass|-exec(utionpolicy)?\s+bypass)/i.test(a.commandLine || ""),
  },
  {
    id: "external_destination",
    label: "Outbound connection to an external destination IP",
    points: 2,
    test: a => has(a.destinationIp) && !isPrivateIp(a.destinationIp),
  },
  {
    id: "download_cradle",
    label: "Suspicious download cradle / remote script indicator",
    points: 3,
    test: a => /(downloadstring|downloadfile|invoke-webrequest|\biwr\b|\bcurl\b|\bwget\b|net\.webclient|iex\b|invoke-expression|hxxp|https?:\/\/|\.ps1\b)/i.test(
                 (a.commandLine || "") + " " + (a.domain || "")),
  },
  {
    id: "email_context",
    label: "Email / document delivery context present",
    points: 1,
    test: a => has(a.emailSubject) || String(a.parentProcess).toLowerCase() === "outlook.exe",
  },
];

/* ── MITRE ATT&CK mapping ──────────────────────────────────────────────
   Map only when supporting evidence exists; weak evidence → lower confidence. */
function mapMitre(a, hitIds) {
  const m = [];
  const hit = id => hitIds.includes(id);

  if (has(a.emailSubject)) {
    m.push({ id: "T1566", name: "Phishing", confidence: "Medium",
      reason: "Email subject present, consistent with a phishing delivery vector." });
  }
  if (hit("office_spawns_powershell") || SHELLS.includes(String(a.processName).toLowerCase())) {
    m.push({ id: "T1059.001", name: "Command and Scripting Interpreter: PowerShell",
      confidence: hit("encoded_command") ? "High" : "Medium",
      reason: hit("encoded_command")
        ? "PowerShell executed with an encoded command line."
        : "PowerShell execution observed on the host." });
  }
  if (has(a.emailSubject) || String(a.parentProcess).toLowerCase() === "outlook.exe") {
    m.push({ id: "T1204", name: "User Execution",
      confidence: has(a.emailSubject) ? "Medium" : "Low",
      reason: has(a.emailSubject)
        ? "User likely opened an emailed attachment/link that triggered execution."
        : "Possible user-initiated execution (limited context — possible mapping)." });
  }
  if (hit("download_cradle")) {
    m.push({ id: "T1105", name: "Ingress Tool Transfer",
      confidence: (hit("external_destination") ? "High" : "Medium"),
      reason: hit("external_destination")
        ? "Download cradle plus outbound connection to an external destination."
        : "Download/remote-script indicators present in the command line." });
  }
  return m;
}

/* ── Mock enrichment (local only) ──────────────────────────────────── */
function enrich(a) {
  const host = String(a.host || "").toUpperCase();
  let hostCriticality = "workstation (standard)";
  if (/DC[-\d]/.test(host) || host.includes("DC-")) hostCriticality = "domain controller (critical)";
  else if (/SRV|SERVER|SQL|FILE/.test(host)) hostCriticality = "server (elevated)";

  const user = String(a.user || "").toLowerCase();
  let userRole = "normal user";
  if (/svc[-_]|service|\$$/.test(user)) userRole = "service account";
  else if (/adm|admin/.test(user)) userRole = "administrator";

  let ipRep = "no destination IP";
  if (has(a.destinationIp)) {
    if (isPrivateIp(a.destinationIp)) ipRep = "internal/private range";
    else if (/^(198\.51\.100\.|203\.0\.113\.|192\.0\.2\.)/.test(a.destinationIp))
      ipRep = "documentation-only range (RFC 5737) — fictional";
    else ipRep = "external, unknown (no live lookup in this demo)";
  }

  const rarity = (OFFICE_PARENTS.includes(String(a.parentProcess).toLowerCase()) &&
                  SHELLS.includes(String(a.processName).toLowerCase()))
    ? "suspicious (Office → PowerShell is rarely legitimate)"
    : "common";

  return {
    hostCriticality,
    userRole,
    ipReputation: ipRep,
    parentChildRarity: rarity,
    allowlistResult: "not allowlisted",
  };
}

/* ── Decision engine ───────────────────────────────────────────────── */
function decide(score, hitIds) {
  // Severity from additive score (transparent thresholds).
  let severity = "Low";
  if (score >= 11) severity = "Critical";
  else if (score >= 7) severity = "High";
  else if (score >= 3) severity = "Medium";

  // Verdict from the strongest combination of evidence.
  const core = hitIds.includes("office_spawns_powershell");
  const encoded = hitIds.includes("encoded_command");
  const cradleOrNet = hitIds.includes("download_cradle") || hitIds.includes("external_destination");

  let verdict = "Needs Analyst Review";
  if (!hitIds.length) verdict = "Benign";
  else if (core && encoded && cradleOrNet) verdict = "High Risk";
  else if (core && (encoded || cradleOrNet)) verdict = "Likely True Positive";
  else if (core || hitIds.length >= 2) verdict = "Suspicious";

  // Confidence from how much corroborating evidence lines up.
  let confidence = "Low";
  if (hitIds.length >= 4 && core && encoded) confidence = "High";
  else if (hitIds.length >= 2) confidence = "Medium";

  return { severity, verdict, confidence };
}

/* ── Main analysis ─────────────────────────────────────────────────── */
function analyze() {
  let alert;
  try {
    const raw = $("alert-json").value.trim();
    if (!raw) throw new Error("Alert input is empty. Load the sample or paste a JSON alert.");
    alert = JSON.parse(raw);
    if (typeof alert !== "object" || Array.isArray(alert) || alert === null)
      throw new Error("Top-level JSON must be an object with alert fields.");
  } catch (e) {
    $("at-parse-error").classList.remove("hidden");
    $("at-parse-error").textContent = "⚠ Could not parse alert JSON: " + e.message;
    return;
  }
  $("at-parse-error").classList.add("hidden");

  // Run rules.
  const hits = RULES.filter(r => { try { return r.test(alert); } catch { return false; } });
  const misses = RULES.filter(r => !hits.includes(r));
  const hitIds = hits.map(r => r.id);
  const score = hits.reduce((s, r) => s + r.points, 0);
  const maxScore = RULES.reduce((s, r) => s + r.points, 0);

  const enrichment = enrich(alert);
  const { severity, verdict, confidence } = decide(score, hitIds);
  const mitre = mapMitre(alert, hitIds);

  const recommendedActions = [
    "Isolate the host if the behavior is confirmed malicious.",
    "Collect the full process tree around the PowerShell execution.",
    "Review PowerShell script-block / module logging for the decoded command.",
    "Review the related email and attachment evidence.",
    "Check proxy / DNS logs for the destination and any follow-on connections.",
    "Hunt across the estate for the same command line or file hash.",
    "Reset user sessions and credentials if credential theft is suspected.",
  ];
  const limitations = [
    "Demo uses mock enrichment, not real asset/identity data.",
    "No live threat-intelligence lookups are performed.",
    "No real endpoint connection or response capability.",
    "Educational / portfolio prototype — single alert type (Outlook → PowerShell).",
  ];
  const falsePositives = buildFpConsiderations(alert, hitIds);

  lastResult = {
    normalizedAlert: normalize(alert),
    ruleHits: hits.map(r => ({ id: r.id, label: r.label, points: r.points })),
    ruleMisses: misses.map(r => ({ id: r.id, label: r.label })),
    score, maxScore,
    enrichment,
    verdict, severity, confidence,
    mitreMappings: mitre,
    falsePositiveConsiderations: falsePositives,
    recommendedActions,
    limitations,
  };

  render(lastResult);
}

// Normalize to a stable field set (missing fields become null) for JSON output.
function normalize(a) {
  const fields = ["timestamp","alertName","alertSource","host","user","parentProcess",
    "processName","commandLine","sourceIp","destinationIp","fileHash","domain","emailSubject"];
  const out = {};
  fields.forEach(f => out[f] = has(a[f]) ? a[f] : null);
  return out;
}

function buildFpConsiderations(a, hitIds) {
  const fp = [];
  if (hitIds.includes("office_spawns_powershell"))
    fp.push("Some enterprise add-ins or macros legitimately launch PowerShell — confirm against approved automation.");
  fp.push(has(a.user) && /adm|admin|svc/i.test(a.user)
    ? "Account looks like an admin/service account — could be sanctioned scripted automation."
    : "Standard user account makes legitimate scripted automation less likely.");
  if (!hitIds.includes("encoded_command"))
    fp.push("No encoded command observed — encoded payloads are a stronger malicious signal when present.");
  if (!hitIds.includes("download_cradle") && !hitIds.includes("external_destination"))
    fp.push("No download cradle / external connection seen — may be local-only activity.");
  fp.push("Missing evidence (e.g. decoded command, file reputation) limits confidence — gather more before final disposition.");
  return fp;
}

/* ── Render ────────────────────────────────────────────────────────── */
function render(r) {
  const a = r.normalizedAlert;
  const sev = r.severity;
  const badge = (cls, txt) => `<span class="badge ${cls}">${escHtml(txt)}</span>`;

  const mitreRows = r.mitreMappings.length
    ? r.mitreMappings.map(t =>
        `<tr><td class="tech">${escHtml(t.id)}</td><td>${escHtml(t.name)}</td>
         <td class="conf-${t.confidence}">${escHtml(t.confidence)}</td><td>${escHtml(t.reason)}</td></tr>`).join("")
    : `<tr><td colspan="4" style="color:var(--dim)">No techniques mapped (insufficient evidence).</td></tr>`;

  $("at-result").innerHTML = `
    <div class="verdict-banner sev-${sev}">
      <div class="vb-item"><span class="vb-label">VERDICT</span><span class="vb-value">${escHtml(r.verdict)}</span></div>
      <div class="vb-item"><span class="vb-label">SEVERITY</span><span class="vb-value sev-${sev}">${escHtml(sev)}</span></div>
      <div class="vb-item"><span class="vb-label">CONFIDENCE</span><span class="vb-value">${escHtml(r.confidence)}</span></div>
      <div class="vb-item"><span class="vb-label">SCORE</span><span class="vb-value">${r.score}<span class="vb-score"> / ${r.maxScore}</span></span></div>
    </div>

    <div class="at-section">
      <h3>SUMMARY</h3>
      <dl class="kv">
        <dt>Alert name</dt><dd>${escHtml(a.alertName)}</dd>
        <dt>Alert source</dt><dd>${escHtml(a.alertSource)}</dd>
        <dt>Host</dt><dd>${escHtml(a.host)}</dd>
        <dt>User</dt><dd>${escHtml(a.user)}</dd>
        <dt>Timestamp</dt><dd>${escHtml(a.timestamp)}</dd>
      </dl>
    </div>

    <div class="at-section">
      <h3>KEY EVIDENCE</h3>
      <dl class="kv">
        <dt>Parent process</dt><dd>${escHtml(a.parentProcess)}</dd>
        <dt>Child process</dt><dd>${escHtml(a.processName)}</dd>
        <dt>Command line</dt><dd>${escHtml(a.commandLine)}</dd>
        <dt>Destination</dt><dd>${escHtml(a.destinationIp)}${a.domain ? " · " + escHtml(a.domain) : ""}</dd>
        <dt>File hash</dt><dd>${escHtml(a.fileHash)}</dd>
        <dt>Email subject</dt><dd>${escHtml(a.emailSubject)}</dd>
      </dl>
    </div>

    <div class="at-section">
      <h3>DETECTION LOGIC</h3>
      <div class="badges">
        ${r.ruleHits.map(h => badge("hit", "✓ " + h.label)).join("")}
        ${r.ruleMisses.map(m => badge("miss", "– " + m.label)).join("")}
      </div>
      <ul class="rule-list">
        ${r.ruleHits.length
          ? r.ruleHits.map(h => `<li>✓ ${escHtml(h.label)} <span class="pts">(+${h.points})</span></li>`).join("")
          : "<li style='color:var(--dim)'>No rules triggered.</li>"}
      </ul>
    </div>

    <div class="at-section">
      <h3>ENRICHMENT (MOCK)</h3>
      <dl class="kv">
        <dt>Host context</dt><dd>${escHtml(r.enrichment.hostCriticality)}</dd>
        <dt>User context</dt><dd>${escHtml(r.enrichment.userRole)}</dd>
        <dt>IP reputation</dt><dd>${escHtml(r.enrichment.ipReputation)}</dd>
        <dt>Parent/child rarity</dt><dd>${escHtml(r.enrichment.parentChildRarity)}</dd>
        <dt>Allowlist</dt><dd>${escHtml(r.enrichment.allowlistResult)}</dd>
      </dl>
    </div>

    <div class="at-section">
      <h3>MITRE ATT&CK MAPPING</h3>
      <table class="mitre-tbl">
        <thead><tr><th>Technique</th><th>Name</th><th>Confidence</th><th>Reason</th></tr></thead>
        <tbody>${mitreRows}</tbody>
      </table>
    </div>

    <div class="at-section">
      <h3>FALSE POSITIVE CONSIDERATIONS</h3>
      <ul class="bullets">${r.falsePositiveConsiderations.map(f => `<li>${escHtml(f)}</li>`).join("")}</ul>
    </div>

    <div class="at-section">
      <h3>RECOMMENDED NEXT STEPS</h3>
      <ul class="bullets">${r.recommendedActions.map(s => `<li>${escHtml(s)}</li>`).join("")}</ul>
    </div>

    <div class="at-section">
      <h3>LIMITATIONS</h3>
      <ul class="bullets">${r.limitations.map(s => `<li>${escHtml(s)}</li>`).join("")}</ul>
    </div>
  `;
}

/* ── Markdown export ───────────────────────────────────────────────── */
function buildMarkdown(r) {
  const a = r.normalizedAlert;
  const L = [];
  L.push("# Alert Triage Report");
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(`- Alert name: ${a.alertName || "—"}`);
  L.push(`- Verdict: ${r.verdict}`);
  L.push(`- Severity: ${r.severity} (score ${r.score} / ${r.maxScore})`);
  L.push(`- Confidence: ${r.confidence}`);
  L.push(`- Host: ${a.host || "—"}`);
  L.push(`- User: ${a.user || "—"}`);
  L.push(`- Alert source: ${a.alertSource || "—"}`);
  L.push("");
  L.push("## Key Evidence");
  L.push("");
  L.push(`- Parent process: ${a.parentProcess || "—"}`);
  L.push(`- Child process: ${a.processName || "—"}`);
  L.push(`- Command line: ${a.commandLine || "—"}`);
  L.push(`- Destination: ${a.destinationIp || "—"}${a.domain ? " (" + a.domain + ")" : ""}`);
  L.push(`- Email/document context: ${a.emailSubject || "—"}`);
  L.push("");
  L.push("## Detection Logic");
  L.push("");
  L.push("**Rule hits:**");
  if (r.ruleHits.length) r.ruleHits.forEach(h => L.push(`- ${h.label} (+${h.points})`));
  else L.push("- None");
  L.push("");
  L.push("**Rule misses:**");
  if (r.ruleMisses.length) r.ruleMisses.forEach(m => L.push(`- ${m.label}`));
  else L.push("- None");
  L.push("");
  L.push(`**Why this is suspicious:** an Office/email parent spawning PowerShell — especially with encoded or hidden-window flags and an outbound connection — is a common initial-access-to-execution pattern that warrants review.`);
  L.push("");
  L.push("## Enrichment");
  L.push("");
  L.push(`- Host context: ${r.enrichment.hostCriticality}`);
  L.push(`- User context: ${r.enrichment.userRole}`);
  L.push(`- IP/domain/hash context: ${r.enrichment.ipReputation}${a.domain ? "; domain " + a.domain : ""}${a.fileHash ? "; hash " + a.fileHash : ""}`);
  L.push(`- Allowlist result: ${r.enrichment.allowlistResult}`);
  L.push("");
  L.push("## MITRE ATT&CK Mapping");
  L.push("");
  L.push("| Technique | Name | Confidence | Reason |");
  L.push("| --- | --- | --- | --- |");
  if (r.mitreMappings.length)
    r.mitreMappings.forEach(t => L.push(`| ${mdCell(t.id)} | ${mdCell(t.name)} | ${mdCell(t.confidence)} | ${mdCell(t.reason)} |`));
  else
    L.push("| — | No techniques mapped | — | Insufficient evidence |");
  L.push("");
  L.push("## False Positive Considerations");
  L.push("");
  r.falsePositiveConsiderations.forEach(f => L.push(`- ${f}`));
  L.push("");
  L.push("## Recommended Next Steps");
  L.push("");
  r.recommendedActions.forEach(s => L.push(`- ${s}`));
  L.push("");
  L.push("## Limitations");
  L.push("");
  r.limitations.forEach(s => L.push(`- ${s}`));
  L.push("");
  L.push("---");
  L.push("_Generated with Cyber Defense Lab — SOAR-Lite Alert Triage (prototype). Mock enrichment; training data is fictional._");
  return L.join("\n");
}

/* ── Buttons ───────────────────────────────────────────────────────── */
// Prefer the shared "Invoice 4471" scenario pack when present; fall back to the
// tool's built-in sample. Defensive: never break if the global is missing or malformed.
function getSampleAlert() {
  try {
    const s = window.CDL_SCENARIOS && window.CDL_SCENARIOS["phishing-powershell"];
    const input = s && s.soarLiteInput;
    if (input && typeof input === "object" && !Array.isArray(input) && input.alertName) {
      return input;
    }
  } catch (e) { /* fall through to the built-in sample */ }
  return SAMPLE_ALERT;
}

function loadSample() {
  $("alert-json").value = JSON.stringify(getSampleAlert(), null, 2);
  $("at-parse-error").classList.add("hidden");
  analyze();
}

function clearAll() {
  $("alert-json").value = "";
  $("at-parse-error").classList.add("hidden");
  lastResult = null;
  $("at-result").innerHTML = `<div class="at-empty">Cleared. Paste a JSON alert (or ⤓ LOAD SAMPLE ALERT), then ▶ ANALYZE ALERT.</div>`;
}

function copyText(text, btn, restore) {
  const done = () => {
    const orig = restore;
    btn.textContent = "✔ COPIED";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  else fallbackCopy(text, done);
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

function copyMarkdown() {
  if (!lastResult) { analyze(); if (!lastResult) return; }
  copyText(buildMarkdown(lastResult), $("btn-md"), "⧉ COPY MARKDOWN");
}
function copyJson() {
  if (!lastResult) { analyze(); if (!lastResult) return; }
  copyText(JSON.stringify(lastResult, null, 2), $("btn-json"), "⧉ COPY JSON");
}

/* ── Wiring ────────────────────────────────────────────────────────── */
$("btn-sample").addEventListener("click", loadSample);
$("btn-analyze").addEventListener("click", analyze);
$("btn-clear").addEventListener("click", clearAll);
$("btn-md").addEventListener("click", copyMarkdown);
$("btn-json").addEventListener("click", copyJson);

/* ── Local file load (browser-side FileReader only; no upload) ─────── */
(function wireFileLoad() {
  const MAX_MB = 1;   // JSON alerts should be small
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
      $("alert-json").value = reader.result;
      status.textContent = "Loaded file locally. Nothing was uploaded.";
      status.className = "file-status ok";
    };
    reader.onerror = () => {
      status.textContent = "⚠ Could not read that file — try a plain text/JSON file.";
      status.className = "file-status warn";
    };
    reader.readAsText(f);
    input.value = "";   // allow re-loading the same file
  });
})();
