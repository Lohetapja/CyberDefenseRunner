# Cyber Defense Lab

**A browser-based blue team training simulator.** Practice SOC fundamentals through a
3,200-question quiz system, a timed incident-response dashboard with post-shift learning
reports, and a growing set of analyst tool prototypes — all running as static files,
entirely in the browser.

> ⚠️ **Work in progress.** This is a personal learning and portfolio project. Mechanics,
> visuals, and content are actively evolving. Some experimental modes are rough by design.

**Live demo:** https://lohetapja.github.io/CyberDefenseRunner/
*(The repository keeps its original `CyberDefenseRunner` name so existing links stay valid;
the public-facing name of the project is Cyber Defense Lab.)*

---

## Features

- **3,200 validated questions** across 8 cybersecurity topics, each bank independently
  checked for unique IDs, balanced answer positions, tier distribution, duplicate prompts,
  and certification-brand neutrality.
- **Multiple training modes** from calm quiz study to timed incident pressure.
- **Post-incident learning reports** — missed questions are replayed with explanations
  after the pressure is off, mirroring how real SOC teams run post-incident reviews.
- **Analyst tool prototypes** — small, practical utilities a junior analyst would
  actually use, built as standalone pages.
- **Zero infrastructure** — no backend, no accounts, no database, no build step.
  Plain HTML/CSS/JS served as static files.

## Modes

| Mode | Status | What it trains |
|---|---|---|
| **Quiz Training** | Stable | Core knowledge across 8 learning paths, with topic / tier / wave-count filters, scoring, and a results report. |
| **SOC Dashboard** | Stable | Timed incident response: defend three nodes, triage threats under a configurable response timer (10s–45s or untimed). |
| **After-Action Report** | Stable | Post-shift review inside SOC Dashboard: every missed question replayed with the correct answer, explanation, and topic to review. Copyable as Markdown. |
| **SOC Alert Report Generator** | Prototype | Structured incident reporting: a form that produces a clean Markdown report following the NIST incident-handling lifecycle, with a fictional sample incident loader. |
| **Defense Mission** | Experimental | Topology-based tower defense (preparation → attack phases). |
| **Network Defense Mission v2** | Experimental | Layer-matching tower defense: NGFW vs network threats, WAF vs application threats, EDR vs host threats — mismatched layers are bypassed and logged. |

Experimental modes are grouped under **Experimental Modes** on the main menu, alongside
planned analyst tool prototypes (KQL Detection Assistant, Incident Timeline Builder,
Log Parser / SIEM Demo, AI Misuse Detection Demo).

## Learning paths

Networking Basics · Defending Systems · Attacking Concepts · Alert Investigation ·
Cloud & DevOps · AI & Automation Safety · Identity & Logins · Malware Basics
(8 topics × 400 questions; tiers: 200 Beginner / 140 Intermediate / 60 Advanced each)

## Tech stack

- **HTML5 / CSS3 / vanilla JavaScript** — no frameworks, no build tooling
- **GitHub Pages** for hosting (pure static site)
- A reusable **question validator** (`tools/`) that runs in the browser or Node

## What I learned

- Designing deterministic game rules so learning content stays verifiable and fair
- Writing and *validating* large question banks (balance, duplicates, distractor quality)
- Structuring incident reports around the NIST incident-handling lifecycle
- Why timed pressure and post-incident review need to be separate learning moments
- Keeping a multi-mode project maintainable with standalone pages and shared data files

## Current status

- Quiz Training, SOC Dashboard, and the After-Action Report are stable.
- SOC Alert Report Generator is a working prototype.
- Defense Mission modes are playable experiments, not yet balanced.
- Four more analyst tools are planned (visible as roadmap cards in the menu).

See [`ROADMAP.md`](ROADMAP.md) for what's next and [`TESTING.md`](TESTING.md) for the
pre-commit manual test checklist.

## Screenshots

*(Screenshots coming — main menu, SOC Dashboard mid-shift, After-Action Report,
Report Generator with sample incident.)*

## How to run locally

A local web server is recommended (browsers restrict some behavior on `file://`).

**Windows:** double-click `start.bat` (starts a server on port 3900 and opens the site).

**Any OS with Python:**

```
python -m http.server 3900
```

Then open **http://localhost:3900**.

## Disclaimer

This is an **educational training project**. All incidents, alerts, hostnames, users,
and indicators used in samples and game content are **fictional**, using
documentation-reserved IP ranges and invented organizations. Nothing here is derived
from real company data, and the content teaches defensive recognition — not operational
attack technique.

## License

MIT — see [`LICENSE`](LICENSE).
