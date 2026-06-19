# Cyber Defense Lab — Roadmap

> Practical, ordered plan. Each item lists purpose, why it matters for SOC / blue-team
> learning, an MVP scope, and an explicit "not yet" list to prevent over-building.
> Last updated: June 2026.

---

## 1 · Stable / polish next (small, low-risk)

| Item | Notes |
|---|---|
| ~~Visible rebrand to **Cyber Defense Lab**~~ | ✅ Done — titles, logo block, report footer, launcher text. Repo/URLs intentionally unchanged. |
| ~~README rewrite~~ | ✅ Done — see `README.md`. |
| **Screenshots** | Capture 4: main menu, SOC Dashboard mid-shift, After-Action Report, Report Generator with sample loaded. Add to README. Manual task (needs your eyes on the best moment). |
| **Commit & push current work** | `index.html`, `style.css` edits + the three `report-generator.*` files are uncommitted. Run `TESTING.md` first. |
| **Stale doc refresh** | `PROJECT_STATUS.md` / `PROJECT_SNAPSHOT.md` / `QUESTION_BANK_STATUS.md` predate the 3,200-question expansion and new modes. Low urgency; update or mark as historical. |
| **Defense Mission v1 difficulty label** | Tiny: it always starts on "Easy"; either expose difficulty or remove the dead parameter. |
| **Favicon + meta description** | One-line polish for the GitHub Pages listing. |

## 2 · Analyst tool prototypes (build in this order)

### 2.1 SOC Alert Report Generator — improvements (existing prototype)
- **Purpose:** turn alert evidence into a structured NIST-lifecycle report.
- **Why it matters:** report writing is the most under-trained junior-analyst skill; structure beats prose.
- **Next small steps (in order of value/effort):**
  1. **2–3 more sample incidents** (e.g. impossible-travel login, ransomware precursor) behind the same Load Sample button as a small picker.
  2. **Severity helper** — one-line tooltip per severity level explaining when to use it.
  3. **MITRE ATT&CK technique field** — free-text field (e.g. `T1059.001 PowerShell`) added to the Detection table. No technique database yet.
  4. **Report quality checklist** — static list under the preview ("timeline has timestamps? evidence is specific? next steps actionable?").
  5. **Download as `.md` file** — one `Blob` + anchor click; tiny.
- **Not yet:** PDF export, AI assistance, saving/loading drafts, multi-incident management, timeline-builder integration (do it when the Timeline Builder exists).

### 2.2 Incident Timeline Builder
- **Purpose:** paste/enter timestamped events → get a normalized, sorted, exportable timeline.
- **Why it matters:** timeline reconstruction is the core analytical act of every investigation; ordering and gaps reveal the story.
- **MVP:** one textarea (one event per line), parse `HH:MM` / ISO prefixes, sort, render as a vertical timeline + Markdown export. Flag unparseable lines instead of guessing.
- **Not yet:** timezone conversion, drag-to-reorder, multi-source merge, charting libraries.

### 2.3 Log Parser / SIEM Demo
- **Purpose:** paste sample logs and practice filtering, grouping, and spotting anomalies.
- **Why it matters:** reading raw logs without a SIEM crutch builds the instinct SIEMs then accelerate.
- **MVP:** textarea + 2–3 bundled fictional log sets (auth log, proxy log), substring/field filter, count-by-field grouping, highlight matches. Pure client-side string work.
- **Not yet:** real query language, regex builder UI, ingest of user PII-bearing logs (warn against pasting real data), persistence.

### 2.4 KQL Detection Assistant
- **Purpose:** build, explain, and validate KQL detection ideas.
- **Why it matters:** KQL is the lingua franca of Sentinel/Defender hunting; explaining a query proves understanding.
- **MVP:** template picker (5–10 common detections), fill-in-the-blank parameters, syntax-highlighted output, plain-English explanation per template, copy button. **Static templates, no execution.**
- **Not yet:** running queries against anything, AI query generation, full language parsing/linting.

### 2.5 AI Misuse Detection Demo
- **Purpose:** explore signs of unsafe/suspicious AI tool usage in fictional logs.
- **Why it matters:** shadow-AI and prompt-injection review is an emerging SOC duty; ties into the existing AI & Automation Safety question bank.
- **MVP:** 2–3 fictional log scenarios (secret pasted into a chat tool, agent with excess permissions), guided "what's wrong here?" questions reusing the quiz question format.
- **Not yet:** any real AI calls, log ingestion, detection engine.

## 3 · Experimental game ideas

### Defense Mission (v1)
- **Purpose:** spatial defense-in-depth thinking on a small office topology.
- **Why it matters:** placement decisions teach *where* controls live, not just what they do.
- **MVP next step:** connect quiz-earned credits to the mission budget (currently separate), one difficulty knob.
- **Not yet:** new enemy types, animations overhaul, meta-progression.

### Network Defense Mission (v2)
- **Purpose:** layer-matching (NGFW/WAF/EDR vs network/app/host threats) under time pressure.
- **Why it matters:** "right control, wrong layer = bypass" is the single best defense-in-depth lesson in the project.
- **MVP next step:** balance pass (spawn rate vs. one-question-at-a-time bottleneck), upgrade tier for built slots, identity-threat type wired to the Identity & Logins bank (mapping already reserved in code).
- **Not yet:** more node types, multiple maps, endless mode.

## 4 · Long-term direction — Case Workspace

A possible future evolution from separate analyst tools into a **case-centered workspace**:
load one safe, simulated SOC case and work the whole investigation in a single local view.

- **Flow:** 1) Triage · 2) Timeline · 3) Artifact Relationship View · 4) Report ·
  5) Detection logic · 6) Export.
- **Shape:** the existing tools become **panels around one case** — case-centered, not
  tool-sprawl. (Principle: *"Separate tools are useful, but the long-term product shape is a
  Case Workspace where tools become panels around one case."*)
- **MVP (when started):** wire the already-built Invoice 4471 tools to one shared, in-page
  case selection; reuse the existing scenario-pack data; keep each panel's current logic.
- **Data:** built-in cases = fictional scenario packs; future user cases = **local JSON import
  only**.
- **Not yet / not ever:** no fake SIEM dashboard, no real telemetry or SIEM/EDR integration,
  no accounts, no backend, no uploads/server storage, no real customer logs, no production
  claims.
- **Gate:** **do not start until the Invoice 4471 workflow is documented, committed, and
  stable.** See `docs/decisions.md` §11.

## Question banks — policy

The eight `questions-*.js` files are the validated source of truth.
**Do not edit them casually.** Any change must go through `tools/validate-questions.html`
(or the Node CLI) and keep: 400/file, unique IDs/prompts, tiers 200/140/60, no
certification branding.
