# Cyber Defense Lab — Decision Log

This file records important product, architecture, scope, and workflow decisions for
Cyber Defense Lab, so future AI-assisted development sessions don't re-litigate the same
choices. Newest context lives at the bottom; revise an entry only when a decision actually
changes.

---

## 1. Project positioning
- Positioned as a browser-based **blue-team / junior SOC portfolio lab**.
- **Not** primarily a game.
- **Not** a production SOC / SIEM / SOAR platform.
- Strongest story: **practical analyst thinking** — foundations, triage, timelines,
  KQL-style detection reasoning, reporting — on **safe simulated data**.

## 2. Technical scope
- Static **GitHub Pages / browser-only** project.
- HTML, CSS, vanilla JavaScript.
- No backend. No accounts. No database.
- No real SIEM / EDR / cloud / threat-intelligence integrations.
- No secrets or API keys in front-end code.

## 3. Data model
- All data must be **fictional / simulated**.
- Use documentation-reserved IP ranges and invented organizations / users / hosts.
- Users should not paste real production logs or sensitive data.

## 4. Question banks
- Question bank files are **protected**.
- Do not touch `questions-*.js` or `questions.js` unless explicitly requested.
- Treat question-bank work as a **separate task** from app / UI work.

## 5. Analyst Tools
- Analyst Tools are a **primary professional section**, separate from Experimental Game Modes.
- The six live prototype tools:
  - SOAR-Lite Alert Triage
  - KQL Detection Assistant
  - SOC Alert Report Generator
  - Incident Timeline Builder
  - Log Parser / SIEM Demo
  - AI Misuse Detection Demo
- They remain **local simulated workbenches** unless a future approved architecture change is made.

## 6. Experimental Game Modes
- Defense Mission and Network Defense Mission are **secondary experimental** game modes.
- They should not dominate the portfolio story.
- Do not polish or expand them before the core SOC / analyst workflow is clearer.

## 7. Analyst Companion
- A learning / progression **support layer** — should not dominate the project story.
- **Nickname and companion type are separate:**
  - nickname: user-defined
  - type: Packet Owl / Sentinel / Log Fox / Malware Raven / Firewall Dragon / Triage Drone
  - If a nickname exists, show it as the main name; otherwise show the type name.
- Companion customization stays **cosmetic** — it must not affect scoring or difficulty.

## 8. Real integrations / connector-ready principle
- The project may **document** connector-ready architecture ideas.
- Do **not** add real integrations yet.
- Any future integration must be **user-owned, authorized, and handled outside** the static
  front-end.
- API keys / secrets must **never** live in front-end JavaScript.

## 9. AI-assisted development workflow
- ChatGPT: strategy, research, planning, prompts, writing, and review.
- Claude: narrow implementation tasks.
- Prefer **small, reversible** changes; ask for a plan before coding.
- Commit after stable checkpoints.
- Avoid giant rewrites and avoid touching unrelated files.

## 10. Current next strategic direction
- **Short term:** clarity, documentation, demo flow, screenshots, public presentation.
- **Medium term:** one flagship scenario connecting quiz / SOC / triage / timeline / report.
- **Long term:** a local-first blue-team scenario lab with multiple polished simulated cases.

## 11. Case Workspace (future product direction)
- **Idea:** Cyber Defense Lab may evolve from separate analyst tools into a **case-centered
  workspace** — one local, browser-based place where a user loads a safe, simulated SOC case
  and moves through the full workflow: 1) Triage · 2) Timeline · 3) Artifact Relationship
  View · 4) Report · 5) Detection logic · 6) Export.
- **Shape:** the existing tools become **panels around one case** — case-centered, not
  tool-sprawl-centered.
- **What it is NOT:** not a fake SIEM dashboard. It must not imply real telemetry, real
  SIEM/EDR integration, accounts, a backend, or live data.
- **Data rules (unchanged):** built-in cases use safe **fictional scenario packs**; any future
  user-supplied case is a **local JSON import only** — no uploaded data, no backend storage,
  no real customer logs.
- **Principle:** *"Separate tools are useful, but the long-term product shape is a Case
  Workspace where tools become panels around one case."*
- **Priority guard:** the **current priority remains finishing and polishing the Invoice 4471
  workflow.** Do not start Case Workspace implementation until the current workflow is
  documented, committed, and stable. This is a direction note, not an approved build, and
  claims no production readiness.
