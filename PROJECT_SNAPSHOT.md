# Cyber Defense Runner — Project Snapshot

> Point-in-time snapshot of the project so work can resume later without losing context.
> ⚠️ Work in progress — rough and experimental; see README.md.

## Current status

Cyber Defense Runner is a local browser-based cybersecurity learning game built with HTML, CSS, and JavaScript.

It currently has:

- Quiz Training mode
- Defense Mission mode
- How to Play modal
- Reusable question validator
- 800 validated questions integrated into the live quiz system
- 8 learning paths
- Local launch scripts
- README updated
- MIT license

Runs entirely from static files (no backend, no database, no external APIs, no frameworks, no npm).

---

## Current game modes

### Quiz Training

- Uses the integrated **800-question** bank.
- Has **8 learning paths plus Mixed** (Mixed draws from all 800 questions).
- Supports **topic filtering** (Topic dropdown with the 8 topics + "All Topics").
- Supports **tier filtering** (All / Beginner / Intermediate / Advanced).
- Supports **wave counts 10 / 20 / 40**.
- Scoring, health, credits, explanations, modules earned, and the report screen all work.
- If a selected filter combination has fewer questions than the chosen wave count, the existing
  "not enough questions" warning appears and blocks start (preserved behavior).
- **Return to Menu (added):** during an active quiz the HUD now shows a **"⟵ Return to Menu"**
  button. Clicking it asks "Abort this quiz and return to the main menu?" — Cancel keeps the quiz
  unchanged, OK returns to the start screen **without** showing the report, and a new quiz can be
  started cleanly afterward. (The "↺ RETURN TO START" button still exists on the report screen.)

### Defense Mission

- A **separate mode** from Quiz Training.
- Opened from the main menu ("🛡 Defense Mission" button, marked BETA).
- Has a **Preparation phase** and an **Attack phase**.
- Uses a **topology-style board** (small office network layout).
- **Click-select → click-place** placement (no drag-and-drop).
- Zones run from **Critical Systems → Office Network → Perimeter → External / Internet**.
- Has **devices and defenses** (network devices + security controls) placed into typed slots.
- Has **Abort** behavior (✕ ABORT) and a **Return to Menu** button on the result overlay.
- Currently **experimental / BETA**.
- Uses its own temporary mission budget (not yet connected to Quiz Training credits).

---

## Question bank

- **800 / 800 questions complete.**
- **8 topics × 100 questions each.**
- All validated.
- The live quiz now uses the 800 questions.
- The standalone question files remain as the source banks (single validated source of truth).

### Topic files

- `questions-networking-basics.js`
- `questions-defending-systems.js`
- `questions-attacking-concepts.js`
- `questions-alert-investigation.js`
- `questions-cloud-devops.js`
- `questions-ai-automation-safety.js`
- `questions-identity-logins.js`
- `questions-malware-basics.js`

### Validation rules (per topic, all passing)

- Unique IDs
- 25 / 25 / 25 / 25 answer-position distribution (A / B / C / D)
- 50 Beginner / 35 Intermediate / 15 Advanced difficulty split
- No duplicate prompts (and no near-duplicates)
- No duplicate option text within a question
- No certification branding (CCNA, Network+, Security+, OSCP, Pentest+, CompTIA, CEH, CISSP)
- Explanation length sanity
- 0 errors / 0 warnings

---

## Current file structure

- `index.html` — three screens (start, quiz game, report) + Defense Mission screen + How to Play modal; loads the 8 topic banks, then `questions.js`, then `app.js`, then `mission.js`.
- `app.js` — Quiz Training logic: state, filters, scoring, health, credits, modules, report, avatar; topic constants (`TOPIC_ORDER`, `STUDY_RECS`, `CERT_TRACK_TOPICS`) now use the 8 topics.
- `mission.js` — self-contained Defense Mission mode (not touched by the question-bank integration).
- `questions.js` — combines the 8 topic-bank globals into the live `QUESTIONS` array (800).
- `questions-*.js` — the 8 standalone validated topic banks (100 each).
- `style.css` — all styling (dark cyber theme).
- `tools/validate-questions.js` — reusable validator engine (browser + Node).
- `tools/validate-questions.html` — browser UI for the validator.
- `tools/README.md` — validator usage docs.
- `README.md` — project overview, features, learning paths, question-bank status, how to run, validator, status files, license. Marked work in progress.
- `PROJECT_STATUS.md` — overall game design / handoff notes.
- `QUESTION_BANK_STATUS.md` — per-topic validation results + integration status.
- `start.bat` — Windows local-server launcher (port 3900, tries python then py).
- `start.ps1` — PowerShell equivalent of start.bat.
- `LICENSE` — MIT.
- `.gitignore` — minimal (ignores `.claude/`, `.vscode/`, `.DS_Store`, `Thumbs.db`, `files.zip`).

---

## Current implementation notes

- **Merge option used:** the separate validated topic files are loaded (via `<script>` tags in
  `index.html`) **before** `questions.js`.
- `questions.js` **combines the topic-bank globals** into the live `QUESTIONS` array
  (`[].concat.apply([], TOPIC_BANKS)`), with `typeof` guards so a missing file can't hard-crash.
- `app.js` **topic constants were updated** for the 8 topics: `TOPIC_ORDER`, `STUDY_RECS`, and
  `CERT_TRACK_TOPICS` (each Learning Path maps 1:1 to its own topic; Mixed = null = all topics).
- `index.html` script tags for `questions.js` and `app.js` carry a `?v=2` cache-bust so returning
  browsers don't load stale, incompatible code after the merge.
- `mission.js` was **not touched** during question-bank integration.
- Defense Mission remains **separate and functional**.
- README states the project is **work in progress**.

---

## Known issues / next fixes

1. ~~Add a **Return to Menu / Abort Quiz** button to Quiz Training.~~ ✅ **DONE.**
2. Later: connect Quiz Training credits/resources to Defense Mission.
3. Later: improve Defense Mission clarity and gameplay.
4. Later: add deterministic/randomized question selection so **Mixed** does not always begin from file order.
5. Later: add custom question pack import.
6. Later: consider a cyber pet / Tamagotchi-style reward system.
7. Later: improve README / screenshots / video demo.
8. Later: consider GitHub Pages if the project can run as a static site.

---

## Recommended next technical step

The previous recommended task — a **Return to Menu / Abort Quiz** button — is now **done**
(see "Quiz Training" above and "Recent milestone" below).

**Next task (suggested):** Add deterministic/randomized question selection so **Mixed** does not
always begin from file order (currently it slices the first N questions, which are all Networking
Basics). Keep it small and optional, and preserve deterministic scoring.

Requirements for the next change:

- Small surgical change.
- No game rewrite.
- No question-bank changes.
- No Defense Mission changes.
- Validate after the change.

---

## Recent milestone

- 800-question bank completed.
- Live quiz integration completed.
- README and launch scripts added.
- `.claude` removed from the public repo.
- Project pushed to GitHub.
- **"⟵ Return to Menu" button added to active Quiz Training** (HUD), with a confirm prompt;
  returns to the start screen without showing the report. (Changed: `index.html` HUD + 1 listener
  in `app.js`; `app.js` cache-bust bumped to `?v=3`. No scoring, question-bank, or Defense Mission changes.)

---

## GitHub

Repo: https://github.com/Lohetapja/CyberDefenseRunner

---

## Guardrails for future work

- Do not rewrite unrelated code.
- Read files before editing.
- Prefer small, verified changes.
- Validate after changes.
- Keep the project beginner-friendly.
- Keep the work-in-progress warning.
- Do not add too many features before the core loop is stable.

---

## June 2026 addendum (post-expansion snapshot)

The sections above predate the June 2026 expansion and are kept for history.
Headline changes since:

- **Public branding renamed to "Cyber Defense Lab"** (Blue Team Training Simulator).
  Repo, file names, and URLs intentionally unchanged.
- **Question banks expanded to 3,200** (8 × 400), deduplicated, re-tiered to 200/140/60,
  ~40 mislabeled answer keys fixed, option-quality cleanup on original banks.
- **New modes:** SOC Dashboard (timed incidents + configurable response timer) with
  After-Action Report; Network Defense Mission v2 (layer-matching tower defense);
  SOC Alert Report Generator (NIST-lifecycle Markdown reports + fictional sample loader).
- **Main menu reorganized:** 4 primary actions; experiments + 5 planned analyst-tool
  prototype cards grouped under "Experimental Modes".
- Current docs: `README.md` (rewritten), `ROADMAP.md`, `TESTING.md`.
