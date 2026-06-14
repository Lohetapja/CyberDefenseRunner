# Cyber Defense Lab — Claude Working Rules

## Project Identity
Cyber Defense Lab is a browser-based blue-team training simulator and SOC portfolio project.
It is built with:

* HTML
* CSS
* Vanilla JavaScript
* GitHub Pages
* No backend
* No accounts
* No database
* No external libraries unless explicitly approved

## Project Goal
Cyber Defense Lab demonstrates practical blue-team thinking through:

* Quiz-based cybersecurity learning
* SOC alert response
* Analyst-style reporting
* Log parsing
* Incident timeline building
* KQL detection building
* SOAR-lite triage logic
* AI misuse detection
* Safe simulated data only

## Hard Rules

* Do not touch question bank files unless explicitly asked.
* Do not rewrite the whole app.
* Do not remove working features.
* Do not add real API calls.
* Do not add secrets.
* Do not connect to real SIEM, EDR, cloud, AI, or threat-intelligence services.
* Keep everything client-side.
* Prefer small, reversible changes.
* Before coding, inspect current files and state the plan.
* After coding, verify that Main Quiz, SOC Dashboard, Experimental Modes, and analyst tools still open.

## Visual Style
The project uses a dark cyber/SOC interface.
The UI should be:

* Professional
* Readable
* Portfolio-friendly
* Clean and practical
* Cybersecurity-themed without becoming childish

Avoid overly playful game UI.
The companion system should feel like a cyber analyst assistant, not a cartoon toy.

## Companion Design Rules
Companion nickname and companion type are separate.

* Nickname = user-given custom name
* Type = Sentinel, Packet Owl, Log Fox, Malware Raven, Firewall Dragon, or Triage Drone

The selected companion type controls:

* Portrait/avatar
* Role
* Type label
* Unlock condition
* Companion visual identity

The nickname controls only the custom display name.
If a nickname exists, display the nickname as the main name.
If no nickname exists, display the selected companion type name as the main name.

Correct display example when a nickname exists:

```text
<Custom Nickname>
TYPE · PACKET OWL
NETWORKING SPECIALIST
```

Correct display example when no nickname exists:

```text
Packet Owl
TYPE · PACKET OWL
NETWORKING SPECIALIST
```

Wrong display example:

```text
SENTINEL
TYPE · PACKET OWL
```

Sentinel should only appear as the main name if Sentinel is the selected companion type or if the user manually chose Sentinel as the nickname.

## Companion Visual Direction
Default companion visuals should use polished portrait assets if available.
Visual priority:

1. Painted/illustrated portrait assets
2. SVG/icon fallback if portrait assets fail
3. Pixel sprites only as optional/experimental mode

Do not turn companions into tiny abstract icons.
Companions should be visually distinct and readable:

* Sentinel: cyber security assistant / defensive guardian
* Packet Owl: networking specialist
* Log Fox: log analysis specialist
* Malware Raven: malware analysis specialist
* Firewall Dragon: defense specialist
* Triage Drone: alert triage specialist

The overall UI can remain dark cyber/SOC style, but companion portraits should be allowed to use distinct colors.

## Safe Data Rules
All sample data must be fictional, simulated, or clearly marked as training data.
Do not include:

* Real secrets
* Real API keys
* Real customer data
* Real private logs
* Real company data
* Live third-party scanning
* Live threat-intelligence calls

Use documentation-reserved IP ranges when example IPs are needed:

* 192.0.2.0/24
* 198.51.100.0/24
* 203.0.113.0/24

Use fake training domains when needed, such as:

* example.test
* training.local
* files.example-cdn.test

## Connector-Ready Principle
Cyber Defense Lab is demo-first and local-first.
The current version does not connect to real SIEM, EDR, cloud, AI, or threat-intelligence services.
However, the project may document how someone could connect their own authorized data source later through:

* A secure backend
* A local connector
* A private proxy
* A user-owned integration layer

Never place API keys or secrets in frontend JavaScript.

## Testing Expectations
After every change, verify:

* Main Quiz starts
* Correct and wrong answers work
* Companion panel still works
* SOC Dashboard opens
* Experimental Modes opens
* All analyst tools open
* Console has no errors
* No question bank files changed unless explicitly requested

## Preferred Workflow
For each task:

1. Inspect the relevant files first.
2. Explain the smallest safe plan.
3. State which files will be edited.
4. Confirm question bank files will not be touched unless the task requires it.
5. Make the smallest working change.
6. Verify the core app still works.
7. Summarize exactly what changed.

Prefer one narrow task at a time.
Avoid broad rewrites.
