// log-parser.js — Log Parser / SIEM Demo (analyst tool prototype).
// Paste pipe-separated logs, parse them into structured events, filter them
// SIEM-style, and copy investigation notes as Markdown.
// Pure local: no backend, no upload, no AI. Practice with fictional logs only.

"use strict";

const $ = id => document.getElementById(id);

/* ── State ─────────────────────────────────────────────────────────── */
let events = [];      // parsed events
let errors = [];      // { line, text } for malformed input lines

// Keywords highlighted in messages — common triage signal words.
const HOT_WORDS = ["powershell", "encoded", "blocked", "macro", "ransomware", "admin", "failed login", "failed"];

/* ── Sample logs (entirely fictional, for training/demo use) ───────── */
// Extends the Outlook→PowerShell training scenario used by the other tools.
// Hosts/users fake; IPs from RFC 5737 documentation ranges; URLs defanged.
const SAMPLE_LOGS = `2026-06-12T08:31:00Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\k.laine | LoginSuccess | Low | Interactive login from 198.51.100.41 (office subnet)
2026-06-12T08:47:12Z | Proxy | PROXY-01 | TRAINING-CORP\\k.laine | OutboundAllowed | Low | connection to news.example.test allowed
2026-06-12T09:02:00Z | EmailGateway | MAIL-GW-01 | TRAINING-CORP\\m.tamm | EmailDelivered | Low | Suspicious attachment Invoice_4471.docm delivered
2026-06-12T09:05:33Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\svc-backup | LoginSuccess | Low | Service logon, scheduled job (expected)
2026-06-12T09:14:02Z | Endpoint | WS-TRAINING-07 | TRAINING-CORP\\m.tamm | DocumentOpened | Medium | Invoice_4471.docm opened, macro content enabled by user
2026-06-12T09:15:00Z | EDR | WS-TRAINING-07 | TRAINING-CORP\\m.tamm | ProcessCreation | High | outlook.exe spawned powershell.exe with encoded command
2026-06-12T09:15:10Z | Proxy | PROXY-01 | TRAINING-CORP\\m.tamm | OutboundBlocked | High | connection to hxxp://files.example-cdn[.]test/inv.ps1 blocked (dest 203.0.113.66)
2026-06-12T09:16:45Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\m.tamm | FailedLogin | Medium | failed login to FILE-SRV-02, bad password x1
2026-06-12T09:17:02Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\m.tamm | FailedLogin | Medium | failed login to FILE-SRV-02, bad password x2
2026-06-12T09:18:00Z | EDR | WS-TRAINING-07 | SOC | AlertRaised | High | behavioral alert TR-2031: suspicious parent-child process chain
2026-06-12T09:24:30Z | EDR | WS-TRAINING-07 | SOC | HostIsolated | Medium | containment action applied, host isolated from network
2026-06-12T09:31:00Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\m.tamm | AccountSecured | Medium | sessions revoked and password reset by admin
2026-06-12T09:40:18Z | Proxy | PROXY-01 | TRAINING-CORP\\k.laine | OutboundAllowed | Low | connection to weather.example.test allowed`;

/* ── Parsing ───────────────────────────────────────────────────────── */
const SEVERITIES = ["Low", "Medium", "High", "Critical"];

function parseLogs() {
  events = [];
  errors = [];
  const lines = $("raw-logs").value.split("\n");
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;                                // skip blank lines silently
    const parts = line.split("|").map(p => p.trim());
    const sevOk = parts.length === 7 && SEVERITIES.includes(parts[5]);
    if (!sevOk) {
      errors.push({ line: i + 1, text: line.slice(0, 80) });
      return;
    }
    events.push({
      time: parts[0], source: parts[1], host: parts[2], user: parts[3],
      type: parts[4], severity: parts[5], msg: parts[6], raw: line,
    });
  });
  events.sort((a, b) => a.time.localeCompare(b.time));   // chronological
  rebuildFilterOptions();
  render();
}

function clearLogs() {
  $("raw-logs").value = "";
  events = [];
  errors = [];
  ["flt-keyword"].forEach(id => $(id).value = "");
  ["flt-severity", "flt-type", "flt-host", "flt-user"].forEach(id => $(id).value = "");
  rebuildFilterOptions();
  render();
}

function loadSample() {
  $("raw-logs").value = SAMPLE_LOGS;
  parseLogs();
}

/* ── Filtering ─────────────────────────────────────────────────────── */
// Dropdowns for type/host/user are rebuilt from whatever was parsed.
function rebuildFilterOptions() {
  const fill = (id, values) => {
    const sel = $(id);
    const current = sel.value;
    sel.innerHTML = '<option value="">All</option>' +
      [...new Set(values)].sort().map(v => `<option>${escHtml(v)}</option>`).join("");
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  };
  fill("flt-type", events.map(e => e.type));
  fill("flt-host", events.map(e => e.host));
  fill("flt-user", events.map(e => e.user));
}

function filteredEvents() {
  const kw   = $("flt-keyword").value.trim().toLowerCase();
  const sev  = $("flt-severity").value;
  const type = $("flt-type").value;
  const host = $("flt-host").value;
  const user = $("flt-user").value;
  return events.filter(e =>
    (!sev  || e.severity === sev) &&
    (!type || e.type === type) &&
    (!host || e.host === host) &&
    (!user || e.user === user) &&
    (!kw   || e.raw.toLowerCase().includes(kw))
  );
}

/* ── Rendering ─────────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Escape first, then wrap triage keywords in <mark>.
function highlight(msg) {
  let safe = escHtml(msg);
  HOT_WORDS.forEach(w => {
    safe = safe.replace(new RegExp("(" + w.replace(/ /g, "\\s") + ")", "gi"), "<mark>$1</mark>");
  });
  return safe;
}

function renderSummary(shown) {
  const box = $("lp-summary");
  if (!events.length) { box.innerHTML = "No logs parsed yet."; return; }
  const count = sev => events.filter(e => e.severity === sev).length;
  const hosts = [...new Set(events.map(e => e.host))];
  const users = [...new Set(events.map(e => e.user))];
  box.innerHTML =
    `Events: <b>${events.length}</b> (showing <b>${shown}</b>)` +
    (count("Critical") ? `<span class="sev-crit">Critical: <b>${count("Critical")}</b></span>` : "") +
    `<span class="sev-high">High: <b>${count("High")}</b></span>` +
    `<span class="sev-med">Medium: <b>${count("Medium")}</b></span>` +
    `<span class="sev-low">Low: <b>${count("Low")}</b></span>` +
    `Hosts: <b>${hosts.length}</b>` +
    `Users: <b>${users.length}</b>`;
}

function renderErrors() {
  const box = $("lp-errors");
  if (!errors.length) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  box.innerHTML = `⚠ ${errors.length} line(s) could not be parsed (need 7 “|”-separated fields with a valid severity):<br/>` +
    errors.slice(0, 5).map(e => `&nbsp;&nbsp;line ${e.line}: ${escHtml(e.text)}…`).join("<br/>") +
    (errors.length > 5 ? `<br/>&nbsp;&nbsp;…and ${errors.length - 5} more` : "");
}

function render() {
  const shown = filteredEvents();
  renderSummary(shown.length);
  renderErrors();
  const list = $("lp-list");
  list.innerHTML = "";
  if (!events.length) {
    list.innerHTML = `<div class="lp-empty">Paste logs on the left (or ⤓ LOAD SAMPLE LOGS), then ▶ PARSE LOGS.</div>`;
    return;
  }
  if (!shown.length) {
    list.innerHTML = `<div class="lp-empty">No events match the current filters.</div>`;
    return;
  }
  shown.forEach(e => {
    const card = document.createElement("div");
    card.className = "lev sev-" + e.severity;
    card.title = e.raw;                                   // raw line on hover
    card.innerHTML = `
      <div class="lev-top">
        <span class="lev-time">${escHtml(e.time.replace("T", " ").replace("Z", ""))}</span>
        <span>${escHtml(e.source)}</span>
        <span>${escHtml(e.host)}</span>
        <span>${escHtml(e.user)}</span>
        <span>${escHtml(e.type)}</span>
        <span class="lev-sev">${e.severity.toUpperCase()}</span>
      </div>
      <div class="lev-msg">${highlight(e.msg)}</div>`;
    list.appendChild(card);
  });
}

/* ── Markdown export ───────────────────────────────────────────────── */
function mdCell(s) { return String(s || "—").replace(/\|/g, "\\|"); }

function buildMarkdown() {
  const shown = filteredEvents();
  const count = sev => events.filter(e => e.severity === sev).length;
  const hosts = [...new Set(events.map(e => e.host))];
  const users = [...new Set(events.map(e => e.user))];
  const L = [];
  L.push("# SIEM Log Investigation Notes");
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(`- Total events: ${events.length}`);
  if (count("Critical")) L.push(`- Critical severity: ${count("Critical")}`);
  L.push(`- High severity: ${count("High")}`);
  L.push(`- Medium severity: ${count("Medium")}`);
  L.push(`- Low severity: ${count("Low")}`);
  L.push(`- Hosts observed: ${hosts.join(", ") || "—"}`);
  L.push(`- Users observed: ${users.join(", ") || "—"}`);
  L.push("");
  L.push(`## Notable Events`);
  L.push("");
  L.push(`_${shown.length} event(s) matching the current filters:_`);
  L.push("");
  L.push("| Time | Source | Host | User | Event Type | Severity | Message |");
  L.push("| --- | --- | --- | --- | --- | --- | --- |");
  shown.forEach(e => {
    L.push(`| ${mdCell(e.time)} | ${mdCell(e.source)} | ${mdCell(e.host)} | ${mdCell(e.user)} | ${mdCell(e.type)} | ${mdCell(e.severity)} | ${mdCell(e.msg)} |`);
  });
  L.push("");
  L.push("## Analyst Notes");
  L.push("");
  L.push("- Possible suspicious parent-child process relationship.");
  L.push("- Review endpoint telemetry.");
  L.push("- Check related email and proxy logs.");
  L.push("- Consider containment if behavior is confirmed malicious.");
  L.push("");
  L.push("---");
  L.push("_Notes generated with Cyber Defense Lab — Log Parser / SIEM Demo (prototype). Training data is fictional._");
  return L.join("\n");
}

function copyFindings() {
  const text = buildMarkdown();
  const done = () => {
    const b = $("btn-copy");
    b.textContent = "✔ COPIED";
    b.classList.add("copied");
    setTimeout(() => { b.textContent = "⧉ COPY FINDINGS (MD)"; b.classList.remove("copied"); }, 1500);
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
$("btn-parse").addEventListener("click", parseLogs);
$("btn-sample").addEventListener("click", loadSample);
$("btn-clear").addEventListener("click", clearLogs);
$("btn-copy").addEventListener("click", copyFindings);
["flt-keyword", "flt-severity", "flt-type", "flt-host", "flt-user"]
  .forEach(id => $(id).addEventListener("input", render));

/* ── Local file load (browser-side FileReader only; no upload) ─────── */
function wireFileLoad(textareaId) {
  const MAX_MB = 5;   // log files can be larger
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
      $(textareaId).value = reader.result;
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
}
wireFileLoad("raw-logs");

render();
