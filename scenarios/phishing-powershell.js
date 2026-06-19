/* scenarios/phishing-powershell.js
 * Canonical, DATA-ONLY flagship SOC scenario for Cyber Defense Lab.
 * "Invoice 4471" — Phishing → Encoded PowerShell → Blocked C2.
 *
 * Shared source of truth that tools MAY reuse later. This file does NOT wire
 * itself into any tool, change any tool logic, or run anything — it only
 * registers a plain object on window.CDL_SCENARIOS.
 *
 * SAFETY: everything here is fictional / simulated training data. RFC 5737
 * documentation IP ranges, .test domains, an invented organization/users/hosts,
 * a fictional file hash, and defanged URLs only. No real IOCs, companies, users,
 * or secrets. Not production tooling.
 */

window.CDL_SCENARIOS = window.CDL_SCENARIOS || {};

window.CDL_SCENARIOS["phishing-powershell"] = {
  id: "phishing-powershell",
  title: '"Invoice 4471" — Phishing → Encoded PowerShell → Blocked C2',

  summary:
    "A standard user at TRAINING-CORP opens a macro-enabled invoice attachment from a " +
    "phishing email. Macros launch an encoded PowerShell command; outlook.exe spawns " +
    "powershell.exe, which attempts an outbound download from a defanged URL. The proxy " +
    "blocks the connection, EDR raises a behavioral alert, and the SOC triages, isolates " +
    "the host, and secures the account.",

  learningGoals: [
    "Recognize the phishing → user-execution → script-execution → egress chain.",
    "Practice triage reasoning: enrichment, severity, verdict, and false-positive checks.",
    "Reconstruct an incident timeline from multiple log sources.",
    "Map observed activity to MITRE ATT&CK techniques.",
    "Draft a defensive detection (KQL) and a structured incident report.",
  ],

  organization: {
    name: "TRAINING-CORP",
    domain: "training-corp.test",
  },

  entities: {
    affectedUser: { account: "TRAINING-CORP\\m.tamm", email: "m.tamm@training-corp.test", role: "Standard user (victim)" },
    workstation:  { host: "WS-TRAINING-07", role: "Endpoint where execution occurred" },
    mailGateway:  { host: "MAIL-GW-01", role: "Delivered the phishing email" },
    proxy:        { host: "PROXY-01", role: "Blocked the outbound connection" },
    domainController: { host: "DC-TRAINING-01", role: "Identity / authentication events" },
    fileServer:   { host: "FILE-SRV-02", role: "Target of failed logons" },
    socAnalyst:   { account: "analyst.on-duty", role: "Responder" },
    benignNoise:  ["TRAINING-CORP\\j.kask", "TRAINING-CORP\\k.laine", "TRAINING-CORP\\svc-backup"],
  },

  alert: {
    timestamp: "2026-06-12T09:15:00Z",
    alertId: "TR-2031",
    alertName: "Outlook spawned encoded PowerShell",
    alertSource: "EDR",
    host: "WS-TRAINING-07",
    user: "TRAINING-CORP\\m.tamm",
    parentProcess: "outlook.exe",
    processName: "powershell.exe",
    commandLine: "powershell.exe -NoP -W Hidden -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA...",
    sourceIp: "198.51.100.41",
    destinationIp: "203.0.113.66",
    domain: "files.example-cdn[.]test",
    url: "hxxp://files.example-cdn[.]test/inv.ps1",
    fileName: "Invoice_4471.docm",
    fileHash: "fc4e9b2a1d7c0e5f3a8b6c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f", // fictional sample SHA-256
    emailSubject: "Invoice 4471 - payment overdue",
  },

  // Chronological story of the incident (UTC).
  timelineEvents: [
    { time: "2026-06-12T09:02:00Z", source: "EmailGateway", host: "MAIL-GW-01",     user: "TRAINING-CORP\\m.tamm", type: "EmailDelivered",  severity: "Low",    description: "Phishing email with attachment Invoice_4471.docm delivered.", notes: "Sender domain registered 3 days ago; gateway verdict: clean (missed)." },
    { time: "2026-06-12T09:14:02Z", source: "Endpoint",     host: "WS-TRAINING-07", user: "TRAINING-CORP\\m.tamm", type: "DocumentOpened",  severity: "Medium", description: "User opened the attachment and enabled macros.",            notes: "Office trust-center event; macro execution allowed by user click." },
    { time: "2026-06-12T09:15:00Z", source: "EDR",          host: "WS-TRAINING-07", user: "TRAINING-CORP\\m.tamm", type: "ProcessCreation", severity: "High",   description: "outlook.exe spawned powershell.exe with an encoded command.", notes: "EDR alert TR-2031; encoded download cradle (fictional sample)." },
    { time: "2026-06-12T09:15:10Z", source: "Proxy",        host: "PROXY-01",       user: "TRAINING-CORP\\m.tamm", type: "OutboundBlocked", severity: "High",   description: "Connection attempt to 203.0.113.66 blocked by proxy policy.", notes: "Requested URL: hxxp://files.example-cdn[.]test/inv.ps1 (defanged)." },
    { time: "2026-06-12T09:16:45Z", source: "Identity",     host: "DC-TRAINING-01", user: "TRAINING-CORP\\m.tamm", type: "FailedLogin",     severity: "Medium", description: "Failed logon to FILE-SRV-02 (attempt 1).",                   notes: "Possible attempted lateral movement or stale credential." },
    { time: "2026-06-12T09:17:02Z", source: "Identity",     host: "DC-TRAINING-01", user: "TRAINING-CORP\\m.tamm", type: "FailedLogin",     severity: "Medium", description: "Failed logon to FILE-SRV-02 (attempt 2).",                   notes: "" },
    { time: "2026-06-12T09:18:00Z", source: "EDR",          host: "WS-TRAINING-07", user: "SOC",                   type: "AlertRaised",     severity: "High",   description: "Behavioral alert TR-2031: suspicious parent-child process chain.", notes: "SOC triage began." },
    { time: "2026-06-12T09:24:30Z", source: "EDR",          host: "WS-TRAINING-07", user: "SOC",                   type: "HostIsolated",    severity: "Medium", description: "Host isolated from the network via EDR containment action.", notes: "Isolation confirmed; user informed by phone." },
    { time: "2026-06-12T09:31:00Z", source: "Identity",     host: "DC-TRAINING-01", user: "TRAINING-CORP\\m.tamm", type: "AccountSecured",  severity: "Medium", description: "Active sessions revoked and password reset for the affected user.", notes: "No suspicious logins observed after isolation." },
  ],

  // Pipe-delimited lines matching the Log Parser format:
  // timestamp | source | host | user | event-type | severity | message
  // (Includes a little benign noise for realistic filtering practice.)
  logLines: [
    "2026-06-12T08:47:12Z | Proxy | PROXY-01 | TRAINING-CORP\\k.laine | OutboundAllowed | Low | connection to news.example.test allowed",
    "2026-06-12T09:02:00Z | EmailGateway | MAIL-GW-01 | TRAINING-CORP\\m.tamm | EmailDelivered | Low | Suspicious attachment Invoice_4471.docm delivered",
    "2026-06-12T09:05:33Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\svc-backup | LoginSuccess | Low | Service logon, scheduled job (expected)",
    "2026-06-12T09:14:02Z | Endpoint | WS-TRAINING-07 | TRAINING-CORP\\m.tamm | DocumentOpened | Medium | Invoice_4471.docm opened, macros enabled by user",
    "2026-06-12T09:15:00Z | EDR | WS-TRAINING-07 | TRAINING-CORP\\m.tamm | ProcessCreation | High | outlook.exe spawned powershell.exe with encoded command",
    "2026-06-12T09:15:10Z | Proxy | PROXY-01 | TRAINING-CORP\\m.tamm | OutboundBlocked | High | connection to hxxp://files.example-cdn[.]test/inv.ps1 blocked (dest 203.0.113.66)",
    "2026-06-12T09:16:45Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\m.tamm | FailedLogin | Medium | failed logon to FILE-SRV-02, bad password x1",
    "2026-06-12T09:17:02Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\m.tamm | FailedLogin | Medium | failed logon to FILE-SRV-02, bad password x2",
    "2026-06-12T09:18:00Z | EDR | WS-TRAINING-07 | SOC | AlertRaised | High | behavioral alert TR-2031: suspicious parent-child process chain",
    "2026-06-12T09:24:30Z | EDR | WS-TRAINING-07 | SOC | HostIsolated | Medium | containment action applied, host isolated from network",
    "2026-06-12T09:31:00Z | Identity | DC-TRAINING-01 | TRAINING-CORP\\m.tamm | AccountSecured | Medium | sessions revoked and password reset by admin",
  ],

  // Ready-to-paste JSON alert for SOAR-Lite Alert Triage.
  soarLiteInput: {
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
    emailSubject: "Invoice 4471 - payment overdue",
  },

  // What a good triage of soarLiteInput should conclude (reference answer).
  expectedTriageOutput: {
    verdict: "Likely True Positive / High Risk",
    severity: "High",            // would trend Critical if the download had succeeded
    confidence: "High",
    ruleHits: [
      "Office/email app spawned PowerShell",
      "Encoded PowerShell command (-Enc)",
      "Hidden window / no-profile flags",
      "Outbound connection to an external destination",
      "Download cradle / remote script indicator",
      "Email / document delivery context present",
    ],
    mitigatingFactors: [
      "Outbound connection was blocked by the proxy (payload not retrieved).",
    ],
    falsePositiveConsiderations: [
      "Sanctioned admin automation can launch PowerShell — unlikely for a standard user account.",
      "Confirm the decoded command and whether any child processes or persistence followed.",
    ],
    recommendedActions: [
      "Isolate the host (done at 09:24).",
      "Collect the full process tree and decode the command offline.",
      "Reset user sessions / credentials (done at 09:31).",
      "Block the sender domain and payload URL at mail gateway and proxy.",
      "Hunt for the same command line / hash across the estate.",
    ],
  },

  mitreMappings: [
    { id: "T1566",     name: "Phishing",                                        confidence: "Medium", reason: "Emailed malicious attachment as the initial vector." },
    { id: "T1204.002", name: "User Execution: Malicious File",                  confidence: "High",   reason: "User opened the document and enabled macros." },
    { id: "T1059.001", name: "Command and Scripting Interpreter: PowerShell",   confidence: "High",   reason: "PowerShell executed with an encoded command." },
    { id: "T1105",     name: "Ingress Tool Transfer",                           confidence: "Medium", reason: "Attempted remote download (blocked) of inv.ps1." },
    { id: "T1110",     name: "Brute Force",                                     confidence: "Low",    reason: "Two failed logons to FILE-SRV-02 (possible mapping)." },
  ],

  // Section outline the SOC Alert Report Generator can fill (NIST lifecycle).
  reportStructure: {
    summary: "Phishing email led to encoded PowerShell on WS-TRAINING-07 (TRAINING-CORP\\m.tamm); outbound C2 attempt blocked by proxy; host isolated and account secured.",
    detectionAndAnalysis: "EDR alert TR-2031 on outlook.exe → powershell.exe with an encoded command; proxy block to 203.0.113.66; supporting email, endpoint, and identity events (see timeline).",
    containment: "Host WS-TRAINING-07 isolated from the network via EDR at 09:24Z.",
    eradicationAndRecovery: "User sessions revoked and password reset at 09:31Z; sender domain and payload URL blocked at the mail gateway and proxy.",
    lessonsLearned: "Mail gateway missed the attachment; review macro-execution policy; add a detection based on the suspicious Office-to-PowerShell behavior; reinforce user phishing awareness.",
    severity: "High",
  },

  // Rows for the Incident Timeline Builder (mirrors timelineEvents).
  timelineBuilderRows: [
    { time: "09:02", source: "Email Gateway", host: "MAIL-GW-01",     user: "m.tamm@training-corp.test", type: "Email Delivered",  severity: "Low",    desc: "Phishing email with attachment 'Invoice_4471.docm' delivered.", notes: "Sender domain registered 3 days ago; gateway verdict: clean (missed)." },
    { time: "09:14", source: "Endpoint",      host: "WS-TRAINING-07", user: "TRAINING-CORP\\m.tamm",     type: "Document Opened",  severity: "Medium", desc: "User opened the attachment and enabled macros.",                notes: "Office trust-center event; macro execution allowed by user click." },
    { time: "09:15", source: "EDR",           host: "WS-TRAINING-07", user: "TRAINING-CORP\\m.tamm",     type: "Process Creation", severity: "High",   desc: "outlook.exe spawned powershell.exe with an encoded command.",   notes: "EDR alert TR-2031; encoded download cradle (fictional sample)." },
    { time: "09:15", source: "Proxy",         host: "PROXY-01",       user: "TRAINING-CORP\\m.tamm",     type: "Outbound Blocked", severity: "High",   desc: "Connection attempt to 203.0.113.66 blocked by proxy policy.",   notes: "Requested URL: hxxp://files.example-cdn[.]test/inv.ps1 (defanged)." },
    { time: "09:18", source: "SOC",           host: "WS-TRAINING-07", user: "analyst.on-duty",           type: "Triage Started",   severity: "Medium", desc: "EDR behavioral alert picked up; SOC triage began.",             notes: "" },
    { time: "09:24", source: "EDR",           host: "WS-TRAINING-07", user: "SOC",                       type: "Host Isolated",    severity: "Medium", desc: "Host isolated from the network via EDR containment action.",    notes: "Isolation confirmed; user informed by phone." },
    { time: "09:31", source: "Identity",      host: "DC-TRAINING-01", user: "TRAINING-CORP\\m.tamm",     type: "Account Secured",  severity: "Medium", desc: "Active sessions revoked and password reset for the affected user.", notes: "No suspicious logins observed after isolation." },
  ],

  // Seed for the KQL Detection Assistant (template-style; demo only).
  kqlDetectionIdea: {
    name: "Office application spawning encoded PowerShell",
    dataSource: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    severity: "High",
    mitre: "T1059.001 PowerShell",
    query: [
      "DeviceProcessEvents",
      "| where Timestamp > ago(7d)",
      '| where InitiatingProcessFileName =~ "outlook.exe"',
      '| where FileName =~ "powershell.exe"',
      '| where ProcessCommandLine has_any ("-enc","-EncodedCommand","-w hidden","-nop")',
      "| project Timestamp, DeviceName, AccountName, InitiatingProcessFileName, FileName, ProcessCommandLine",
      "| order by Timestamp desc",
    ].join("\n"),
    falsePositives: "Legitimate admin add-ins/macros that launch PowerShell; signed deployment scripts.",
    note: "Generated locally for practice — not validated against a real SIEM.",
  },

  // ── Analyst-judgement guidance (Invoice 4471) ──────────────────────────
  // Teaching layer: how to reason about severity, what to ask, what is still
  // missing, and what to do next — so the scenario teaches judgement, not just
  // alert handling. DATA-ONLY and purely additive: no field above is changed,
  // so SOAR-Lite, Timeline Builder, Report Generator, and KQL Assistant keep
  // working unchanged. No tool reads analystGuidance yet (a later, optional
  // wiring task can surface it — see docs/scenarios.md).
  analystGuidance: {
    // Richer, case-specific FP reasoning (distinct from the short
    // expectedTriageOutput.falsePositiveConsiderations reference list above).
    falsePositiveConsiderations: [
      "A standard user account (m.tamm) running encoded PowerShell is unusual — sanctioned automation is unlikely here, but confirm before dismissing.",
      "Some legitimate Office add-ins or deployment tools launch PowerShell; verify the publisher and the command's intent before downgrading.",
      "Encoded commands are occasionally used by legitimate installers — decode and read the command before judging it malicious.",
      "A blocked outbound connection lowers impact but does not make the alert a false positive; the execution attempt still occurred.",
      "Confirm there is no matching change ticket or maintenance window before reducing severity.",
    ],

    analystQuestions: [
      "Did m.tamm actually expect an invoice from this sender?",
      "Did other TRAINING-CORP users receive the same 'Invoice 4471' email?",
      "Has the encoded PowerShell command been decoded and reviewed offline?",
      "Was the outbound connection to 203.0.113.66 established, or blocked at the proxy?",
      "Are PowerShell script-block / module logs available for WS-TRAINING-07?",
      "Are there similar Outlook→PowerShell alerts on other hosts?",
      "Has the attachment (Invoice_4471.docm) hash been seen on other endpoints or mailboxes?",
    ],

    missingEvidence: [
      "Full email headers for the phishing message (sender infrastructure, SPF/DKIM/DMARC results).",
      "The decoded PowerShell payload — what the encoded command actually does.",
      "PowerShell script-block / transcription logs from the endpoint.",
      "Reputation / sandbox verdict for the attachment file hash.",
      "DNS and proxy follow-up showing any retries or alternate destinations.",
      "Confirmed endpoint containment / isolation status at the time of triage.",
      "Direct user confirmation of whether they opened the attachment and enabled macros.",
    ],

    limitations: [
      "Simulated training scenario only — not a real incident.",
      "No live telemetry; all alerts and logs are fixed sample data.",
      "No real file-hash, domain, or IP reputation lookups are performed.",
      "Not validated against a real SIEM or EDR.",
      "Compromise cannot be confirmed from this evidence alone — more artifacts would be needed in a real investigation.",
    ],

    recommendedNextSteps: [
      "Isolate WS-TRAINING-07 if containment policy requires (host isolation is modeled at 09:24Z).",
      "Collect PowerShell script-block logs and the full process tree from the endpoint.",
      "Review email gateway logs for the sender, subject, and other recipients.",
      "Check proxy/DNS activity for any successful or retried connections to the destination.",
      "Search for the same attachment/hash and command line across mailboxes and endpoints.",
      "Reset credentials only if account-compromise indicators appear (e.g., a successful suspicious logon).",
      "Document findings, verdict, and follow-ups in the incident report.",
    ],

    evidenceThatRaisesSeverity: [
      "outlook.exe (an email client) spawning powershell.exe — email apps rarely launch script interpreters.",
      "Encoded / obfuscated PowerShell (-Enc, hidden window, -NoProfile) concealing the real command.",
      "Attempted remote script download (download cradle) to hxxp://files.example-cdn[.]test/inv.ps1.",
      "Outbound connection attempt to a suspicious external destination (203.0.113.66) tied to the script.",
      "User opened a macro-enabled attachment (Invoice_4471.docm) and enabled macros.",
      "Failed logons to FILE-SRV-02 shortly after execution (possible follow-on movement).",
    ],

    evidenceThatLowersSeverity: [
      "Activity matches a known, approved automation or deployment job for this host/user.",
      "The launching script is signed by a trusted internal publisher.",
      "PowerShell was launched by a sanctioned, known enterprise Outlook add-in.",
      "Execution falls inside a documented maintenance / change window with a matching ticket.",
      "The outbound destination is a known-safe, allowlisted update/CDN endpoint.",
      "The command line and pattern match prior benign baseline activity for this user.",
    ],
  },

  scopeNotes: [
    "This scenario powers the Invoice 4471 flagship workflow across SOAR-Lite, Timeline Builder, Report Generator, and KQL Detection Assistant.",
    "All values are fictional/simulated (RFC 5737 IPs, .test domains, defanged URLs, fictional hash).",
    "No backend, no real SIEM/EDR/threat-intel, no secrets — educational portfolio use only.",
  ],
};
