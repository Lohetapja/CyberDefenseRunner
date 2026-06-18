# Cyber Defense Lab — Scenario Packs

## What scenario packs are

A **scenario pack** is a single, shared, **data-only** description of one simulated SOC
incident — the alert, the supporting log lines, a timeline, suggested MITRE ATT&CK
mappings, a reference triage result, a report outline, and a detection idea. The goal is
**one source of truth** that multiple analyst tools can reuse, so the same incident reads
consistently whether you triage it, build its timeline, write its report, or draft a
detection for it.

Packs live in `scenarios/` and register themselves on a global object:

```js
window.CDL_SCENARIOS = window.CDL_SCENARIOS || {};
window.CDL_SCENARIOS["phishing-powershell"] = { /* ... */ };
```

## Safe and simulated

Every scenario pack is **fictional / simulated training data only**:

- Documentation-reserved IP ranges (RFC 5737: `192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24`).
- `.test` domains and invented organizations, users, and hosts.
- Fictional file hashes and **defanged** URLs (`hxxp://…[.]test`).
- No real IOCs, no real companies, no real users, no secrets.

This is an educational portfolio project, not production tooling, and it makes no real
SIEM / EDR / threat-intelligence connections.

---

## Scenario: "Invoice 4471" — Phishing → Encoded PowerShell → Blocked C2

**File:** `scenarios/phishing-powershell.js` · **id:** `phishing-powershell`

**Summary:** A standard user at **TRAINING-CORP** opens a macro-enabled invoice attachment
from a phishing email. Macros launch an encoded PowerShell command; `outlook.exe` spawns
`powershell.exe`, which attempts an outbound download from a defanged URL. The proxy blocks
the connection, EDR raises behavioral alert **TR-2031**, and the SOC triages, isolates the
host, and secures the account.

**Key simulated entities**

| Item | Value |
|---|---|
| Organization | TRAINING-CORP (`training-corp.test`) |
| Affected user | `TRAINING-CORP\m.tamm` (`m.tamm@training-corp.test`) |
| Workstation | WS-TRAINING-07 |
| Mail gateway / Proxy / DC | MAIL-GW-01 / PROXY-01 / DC-TRAINING-01 |
| Alert | TR-2031 — "Outlook spawned encoded PowerShell" |
| File | Invoice_4471.docm |
| Destination | 203.0.113.66 · `hxxp://files.example-cdn[.]test/inv.ps1` |
| Window | 2026-06-12T09:02:00Z → 09:31:00Z |

**Fields provided by the pack** (data only): `id`, `title`, `summary`, `learningGoals`,
`organization`, `entities`, `alert`, `timelineEvents`, `logLines`, `soarLiteInput`,
`expectedTriageOutput`, `mitreMappings`, `reportStructure`, `timelineBuilderRows`,
`kqlDetectionIdea`, `analystGuidance`, `scopeNotes`.

**Analyst-judgement guidance:** a scenario pack may also carry an optional, data-only
`analystGuidance` block so the case teaches *judgement*, not just alert handling. For
"Invoice 4471" it includes `falsePositiveConsiderations`, `analystQuestions`,
`missingEvidence`, `limitations`, `recommendedNextSteps`, `evidenceThatRaisesSeverity`, and
`evidenceThatLowersSeverity`. These are additive and not yet read by any tool — surfacing
them in a tool is an optional later wiring task.

**Suggested ATT&CK mappings:** T1566 (Phishing), T1204.002 (User Execution: Malicious
File), T1059.001 (PowerShell), T1105 (Ingress Tool Transfer), and T1110 (Brute Force —
possible mapping from the failed logons).

---

## Recommended future tool order

Once a pack is connected to the tools (a later task), this is the intended analyst flow for
"Invoice 4471":

1. **SOAR-Lite Alert Triage** — start from the alert; produce verdict, severity, and ATT&CK mapping.
2. **Incident Timeline Builder** — reconstruct the sequence of events.
3. **SOC Alert Report Generator** — write the structured NIST-lifecycle report.
4. **KQL Detection Assistant** — draft a detection so this is caught next time.
5. **Log Parser / SIEM Demo** — practise filtering the raw log lines (optional/supporting).

---

## Scope note for this task

This first task **only creates the shared scenario pack** (`scenarios/phishing-powershell.js`)
and this documentation. It does **not** connect the scenario to any tool, change any tool
logic, or modify existing tool samples. Wiring tools to read from `window.CDL_SCENARIOS`
is a separate, later task — one tool at a time, each independently verifiable.
