# Cyber Defense Lab — Architecture

A plain-language overview of how **Cyber Defense Lab** is built, written for portfolio
reviewers. It favours honesty over hype: this is a personal learning and portfolio
project, not production tooling.

---

## High-level overview

Cyber Defense Lab is a **static, browser-only** blue-team training lab. Everything runs in
the visitor's browser from plain files — there is no server-side application, no API, and
no data store beyond the browser itself. Each major mode/tool is its own HTML page that
shares a common dark SOC visual style and a few shared data and helper files.

```
Browser (GitHub Pages or local static server)
├── index.html ............ Main menu + Quiz Training + Analyst Companion
│   ├── app.js ............. quiz/companion logic, state, scoring, rendering
│   ├── mission.js ........ Defense Mission (experimental game mode)
│   ├── questions.js ...... combines the 8 topic banks into one QUESTIONS array
│   └── questions-*.js ..... 8 topic question banks (data only)
├── soc-dashboard.html .... SOC Dashboard (timed incident response) + soc-dashboard.js
├── defense-mission-v2.html  Network Defense Mission v2 (experimental) + its JS
├── Analyst Tools (one page each, each with its own .js):
│   ├── alert-triage.html ......... SOAR-Lite Alert Triage
│   ├── kql-assistant.html ........ KQL Detection Assistant
│   ├── report-generator.html ..... SOC Alert Report Generator
│   ├── timeline-builder.html ..... Incident Timeline Builder
│   ├── log-parser.html ........... Log Parser / SIEM Demo
│   └── ai-misuse-demo.html ....... AI Misuse Detection Demo
├── companion-unlocks.js ... shared helper: tools award companion badges via localStorage
├── style.css + per-tool CSS  dark cyber/SOC theme
└── assets/ ............... companion portraits, screenshots
```

There is no build step: no bundler, no transpiler, no package manager. The files served
are the files written.

---

## Static / browser-only design

- **Hosting:** GitHub Pages (a pure static file host). The repo keeps its original
  `CyberDefenseRunner` name so existing links stay valid; the public-facing name is
  *Cyber Defense Lab*.
- **Local run:** any static server works — `python -m http.server 3900` or the bundled
  `start.bat`, then open `http://localhost:3900`. (A server is preferred over `file://`
  because browsers restrict some behaviour on the file protocol.)
- **Stack:** HTML5, CSS3, and vanilla JavaScript. No frameworks, no external runtime
  libraries.
- **No backend, no accounts, no database.** Nothing the user does is sent anywhere; there
  is no login, no session server, and no server-side persistence.

---

## Safe simulated data model

All scenario content is **fictional and simulated training data** by design:

- Example IPs use documentation-reserved ranges (`192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24`).
- Domains use safe placeholders (`example.test`, `training.local`,
  `files.example-cdn.test`).
- Hostnames, usernames, and organizations are invented (e.g. `TRAINING-CORP`,
  `WS-TRAINING-07`).
- No real secrets, API keys, customer data, private logs, or company data are included.
- The content teaches **defensive recognition**, not operational attack technique.

Sample data lives inline in each tool's JavaScript (e.g. a sample alert, sample logs, a
sample incident) so "Load Sample" always produces a known, safe scenario.

---

## Main modules

### Main Quiz Training (`index.html` + `app.js`)
The core learning loop: pick a learning path, tier, and wave count; answer multiple-choice
questions; read the explanation; see a results report. Questions are **shuffled per
session** (Fisher-Yates on a filtered copy of the bank, never mutating the source). Scoring
and filtering are deterministic so the learning content stays verifiable.

### Analyst Companion (in `app.js`, persisted via localStorage)
A lightweight progression/engagement layer on the quiz screen, styled as a cyber analyst
assistant. It tracks **energy, credits, streak/accuracy, modules, and badges**, supports a
custom **nickname** and a selectable **companion type** (with a painted portrait, an SVG
fallback, and an optional experimental pixel-sprite mode). It is purely cosmetic/UX — it
does **not** change scoring, difficulty, or question selection.

### SOC Dashboard (`soc-dashboard.html` + `soc-dashboard.js`)
The same knowledge applied under **time pressure**: defend nodes, triage threats against a
configurable response timer, and watch escalation rise. Afterward, an **After-Action
Report** replays missed questions with explanations and weak-topic summaries (copyable as
Markdown) — mirroring a real post-incident review.

### Analyst Tools (six standalone pages)
Local "workbenches" that make junior-analyst reasoning explicit (details below): SOAR-Lite
Alert Triage, KQL Detection Assistant, SOC Alert Report Generator, Incident Timeline
Builder, Log Parser / SIEM Demo, and AI Misuse Detection Demo.

### Experimental Game Modes (`mission.js`, `defense-mission-v2.html`)
Two tower-defense-style experiments (Defense Mission, Network Defense Mission v2). They are
clearly separated from the analyst tools in the menu and labelled experimental/BETA — they
are unfinished and not balanced.

---

## Analyst tools as local simulated workbenches

Each analyst tool is a self-contained page with a consistent shape: a left input panel, a
right results panel, a **Load Sample** action, and **Copy** (Markdown/JSON) actions. They
run entirely on local rules and fixed sample data:

- **SOAR-Lite Alert Triage** — applies local detection rules + mock enrichment to a
  simulated alert, then outputs verdict, severity, and MITRE ATT&CK mapping.
- **KQL Detection Assistant** — generates template-based KQL plus detection notes,
  false-positive considerations, and a validation checklist.
- **SOC Alert Report Generator** — turns form input into a structured Markdown report
  following the NIST incident-handling lifecycle.
- **Incident Timeline Builder** — sorts entered events into an exportable timeline.
- **Log Parser / SIEM Demo** — parses pipe-delimited sample logs, filters/highlights, and
  exports investigation notes.
- **AI Misuse Detection Demo** — flags simulated risky/shadow-AI usage and possible data
  exposure from sample enterprise logs.

Some tools accept a **local file** via the browser's `FileReader` (read in-browser only,
never uploaded), with a privacy note and a size cap. None of the tools call out to any
external service.

---

## localStorage usage

The only persistence is the browser's `localStorage`:

- **Analyst Companion state** — name, type, energy, credits, streak/best, modules, cosmetic
  unlocks, and tool-earned badges, stored under a single key (`cdl_companion_v1`).
- **Tool → companion badges** — `companion-unlocks.js` lets each tool record a small
  achievement badge into that same companion object when a user meaningfully tries the
  tool.

There is no other client storage, no cookies for tracking, and nothing leaves the device.
Clearing the browser's storage (or the in-app "Reset Companion Progress") returns the
companion to defaults.

---

## Question bank structure (high level)

- Eight topic banks, one file each (`questions-*.js`), each defining a topic-scoped array.
- `questions.js` combines them into a single global `QUESTIONS` array the quiz consumes.
- Roughly **400 questions per topic (~3,200 total)**, organized into difficulty tiers
  (Beginner / Intermediate / Advanced).
- Each item carries its prompt, options, the correct index, an explanation, a topic, and a
  tier. The banks are treated as **protected data** — they are validated for unique IDs,
  balanced answer positions, duplicate prompts, and certification-brand neutrality, and are
  not edited casually.

(Exact per-tier counts and validation details live with the banks and the project's
validation notes; this section is intentionally high-level.)

---

## Connector-ready principle

Cyber Defense Lab is **demo-first and local-first**. It deliberately does **not** connect to
any real SIEM, EDR, cloud, AI, or threat-intelligence service today. However, the structure
keeps that door open without rewriting the app:

- Tools separate their **sample data** from their **analysis logic**, so a future input
  adapter could feed real (authorized) data into the same analysis path.
- A real integration would belong **outside** the static front-end — e.g. a secure backend,
  a local connector, a private proxy, or a user-owned integration layer — that the tools
  could read from.
- **Hard rule:** API keys and secrets must never live in the front-end JavaScript. Any real
  data source would be the operator's own, authorized, and brokered by their own backend.

This is a design intention and a roadmap note, **not** an existing capability.

---

## Security & privacy boundaries

- **Client-side only** — no backend to attack, no server-side data, no auth surface.
- **No data exfiltration** — the app makes no outbound API calls; "Load File" uses
  in-browser `FileReader` only and uploads nothing.
- **No real data** — all content is fictional/simulated; users are advised in-app to paste
  only training data, never real production logs.
- **No secrets** — nothing in the repo or runtime holds credentials or keys.
- **Local persistence only** — `localStorage` on the user's own device; easy to reset/clear.

---

## Known limitations

- **Not production tooling** — the analyst tools are teaching prototypes with local rules
  and fixed samples; they do not reflect the full complexity of real detection/triage.
- **No real integrations** — no live SIEM/EDR/threat-intel; results are illustrative.
- **No automated tests** — verification is a manual checklist (`TESTING.md`); there is no CI.
- **Aggressive caching** — because it's static with no cache-busting on every asset, a
  hard refresh is sometimes needed after updates.
- **Experimental game modes are rough** — unbalanced and incomplete by design.
- **Single-user, single-device** — no profiles, no sync; progress is per-browser.
- **Accessibility/mobile** — usable but not fully optimized for very small screens or
  assistive tech.

---

## Future improvement ideas

- Add a few more sample scenarios per tool (e.g. impossible-travel login, ransomware
  precursor) behind the existing Load Sample buttons.
- Light cross-tool flow (e.g. send a triage result into the Report Generator or Timeline
  Builder) while keeping everything local.
- A minimal automated smoke test to complement the manual checklist.
- Optional asset versioning to reduce the need for hard refreshes.
- Decide the long-term direction of the experimental game modes (polish one, retire the
  others).
- Document a concrete, optional **connector** example (read-only, user-owned) without
  shipping any real integration.

---

*This document describes the project as a learning/portfolio artifact. It is intentionally
modest about scope: the value is in showing analyst reasoning and clean front-end structure,
not in being a finished security product.*
