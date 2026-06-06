# Cyber Defense Runner

Cyber Defense Runner is an experimental browser-based cybersecurity learning game with
**Quiz Training**, a **Defense Mission** tower-defense mode, and validated question banks.
It runs entirely in your browser from static files — no backend, no accounts, no installs
beyond a simple local web server.

> ⚠️ **Work in progress**
>
> This project is still rough and experimental. The README, game mechanics, visuals, and
> question bank are actively being improved. Some things may not work perfectly yet.

---

## Current features

- **Quiz Training** — answer cybersecurity questions across Learning Paths, earn score and credits, and get a final report.
- **Defense Mission** — a small-office network-topology tower-defense mode (Preparation → Attack).
- **Click-select → click-place** defense/device placement (no drag-and-drop).
- **Question batch validator** — a reusable tool that checks question files before they are used.
- **Validated question files** — eight standalone topic banks, each independently validated.
- **Local, browser-based project** — pure HTML / CSS / JavaScript.
- **No backend required** — everything runs from static files.

---

## Learning paths

1. Networking Basics
2. Defending Systems
3. Attacking Concepts
4. Alert Investigation
5. Cloud & DevOps
6. AI & Automation Safety
7. Identity & Logins
8. Malware Basics

---

## Question bank status

**800 / 800 questions complete and validated** (8 topics × 100 questions each).

These live in standalone files (`questions-<topic>.js`) and are **not yet merged** into the
game's live `questions.js`. They are kept separate on purpose while the project is a
work in progress.

Each topic file is validated for:

- unique IDs
- balanced A/B/C/D answer positions (25 / 25 / 25 / 25)
- difficulty split (50 Beginner / 35 Intermediate / 15 Advanced)
- duplicate prompts
- duplicate option text within a question
- banned certification branding (no CCNA, Network+, Security+, OSCP, Pentest+, CompTIA, CEH, CISSP)
- explanation length sanity
- validation errors / warnings (target: 0 / 0)

See [`QUESTION_BANK_STATUS.md`](QUESTION_BANK_STATUS.md) for the per-topic breakdown.

---

## How to run locally

A local web server is recommended (some browsers restrict loading local scripts via `file://`).

**Option 1 — easiest (Windows):**
Double-click **`start.bat`**. It starts a local server and opens the game automatically.

**Option 2 — any OS with Python:**

```
python -m http.server 3900
```

Then open: **http://localhost:3900**

**Option 3 — open directly:**
You can open `index.html` directly in a browser, but running via **localhost is recommended**
for the most reliable behavior.

---

## Validator

The question validator lives in **`tools/`**.

Open it in your browser:

```
tools/validate-questions.html
```

(For example: http://localhost:3900/tools/validate-questions.html when the local server is running.)

Paste a question batch, set the expected topic and ID prefix, and click **Validate** to get a
PASS / FAIL report. The same logic is also available as a reusable module in
`tools/validate-questions.js` (usable in the browser and in Node), and usage notes are in
`tools/README.md`.

---

## Project status files

- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — overall game design, features, and handoff notes.
- [`QUESTION_BANK_STATUS.md`](QUESTION_BANK_STATUS.md) — question-bank progress and per-topic validation results.

---

## License

Released under the **MIT License**. See [`LICENSE`](LICENSE).
