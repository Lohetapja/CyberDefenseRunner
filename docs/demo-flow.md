# Cyber Defense Lab — Portfolio Demo Flow

A short walkthrough for showing **Cyber Defense Lab** as a junior SOC / blue-team
**portfolio lab** — a place to practise detection, triage, and incident work — rather than
mainly as a game. Use it for a screen-share, a recruiter call, or a recorded clip.

**Framing to keep in mind throughout:**
- It's an **educational lab**, built as a **static, client-side** site (no backend, no
  accounts, no database).
- All incidents, logs, IPs, hosts, and users are **fictional / simulated training data**
  (documentation-reserved IP ranges, invented organizations).
- It's a **personal learning + portfolio project** and an honest **work in progress** —
  not a production tool. Say that out loud; it reads as mature, not weak.

---

## 30-second spoken intro (elevator version)

> "Cyber Defense Lab is a browser-based blue-team practice lab I built to sharpen junior
> SOC skills — answering security questions, triaging incidents under time pressure, and
> using small analyst tools like alert triage, KQL drafting, and incident reporting.
> It runs entirely in the browser as a static site, uses only safe simulated data, and
> it's an ongoing learning and portfolio project rather than a finished product."

---

## 60-second version (quick tour)

1. **Landing page** — "Everything's client-side and free to open; here are the training
   modes and a set of analyst tools."
2. **One quiz question** — "The core is a large, validated question bank across eight
   blue-team topics."
3. **SOC Dashboard (5 seconds)** — "This adds *time pressure* — triage incidents before
   the timer runs out, then review what you missed."
4. **SOAR-Lite Alert Triage** — "And these are analyst tools. This one takes a simulated
   alert and produces a verdict, severity, and MITRE ATT&CK mapping — the reasoning a
   triage analyst does."
5. **Close** — "All simulated data, all in the browser, and still actively evolving."

---

## 3–5 minute version (full walkthrough)

> Tip: open `http://localhost:3900` (or the live GitHub Pages demo) and hard-refresh first.
> Keep each stop short — the goal is to show *analyst thinking*, not to play through content.

### 1 · Main landing page
- **Click:** just present the landing page; expand the **Analyst Tools** section.
- **Say:** "This is the home screen. It's a static site — no install, no login. There's the
  quiz training, the SOC Dashboard, and an Analyst Tools section with six small tools. The
  game-style modes are clearly separated as experiments."
- **Screenshot:** `assets/screenshots/main-menu.jpg`
- **Skill it demonstrates:** product framing, front-end structure, honest scoping
  (finished work vs. experiments are visibly separated).
- **Don't:** linger on the experimental game modes — mention they exist and move on.

### 2 · One Main Quiz question (Security Foundations)
- **Click:** **Start Quiz Training** → pick a learning path (e.g. Networking Basics or a
  Mixed set) → answer one question → read the explanation.
- **Say:** "The foundation is a validated question bank across eight topics. Each question
  has an explanation, so it teaches the *why*, not just the answer. Questions are
  randomized per session."
- **Screenshot:** `assets/screenshots/quiz-companion.jpg`
- **Skill it demonstrates:** cybersecurity fundamentals; content design and validation
  (balanced answers, no brand bias, deduped).
- **Don't:** grind through many questions or show scoring mechanics in depth.

### 3 · Analyst Companion (brief)
- **Click:** point at the companion panel on the right of the quiz screen (open
  **Customize Companion** for a couple of seconds if you like).
- **Say:** "There's a light progression layer — energy, credits, and badges earned from
  answering, with a companion you can name and choose a type for. It's saved locally in the
  browser. It's a UX / engagement layer; it doesn't change scoring or difficulty."
- **Screenshot:** `assets/screenshots/quiz-companion.jpg`
- **Skill it demonstrates:** front-end state management, `localStorage` persistence, and
  restrained UX design (professional, not a cartoon pet).
- **Don't:** over-explain the cosmetics — one sentence and move on.

### 4 · SOC Dashboard — timed incident response
- **Click:** **SOC Dashboard** → let a threat appear → click the threatened node → answer
  under the timer. Optionally show the **After-Action Report** after a short shift.
- **Say:** "This is the same knowledge, but under pressure. Incidents escalate, there's a
  configurable response timer, and at the end an After-Action Report replays what you
  missed with explanations — mirroring a real post-incident review."
- **Screenshots:** `assets/screenshots/soc-dashboard.jpg`, then
  `assets/screenshots/after-action-report.jpg`
- **Skill it demonstrates:** triage under time pressure, prioritization, and the habit of
  post-incident learning.
- **Don't:** try to "win" the shift — one or two incidents is enough to show the loop.

### 5 · SOAR-Lite Alert Triage — verdict / severity / MITRE
- **Click:** open **SOAR-Lite Alert Triage** from Analyst Tools → **Load Sample Alert** →
  **Analyze Alert**.
- **Say:** "This is the triage reasoning a junior analyst does, made explicit: it takes a
  simulated alert, applies local detection rules, adds mock enrichment, and outputs a
  verdict, a severity, and a MITRE ATT&CK mapping — plus copyable Markdown/JSON. It's a
  demo with local rules; it doesn't connect to a real SIEM or threat intel."
- **Screenshot:** `assets/screenshots/soar-lite-triage.jpg`
- **Skill it demonstrates:** alert triage, enrichment thinking, severity/verdict reasoning,
  and ATT&CK familiarity.
- **Don't:** imply it's a real SOAR platform — call out that it's a local, rule-based demo.

### 6 · KQL Detection Assistant *(or)* Report Generator / Timeline Builder
Pick **one** to keep the demo tight.

- **Option A — KQL Detection Assistant**
  - **Click:** open it → **Load Sample Detection** (or pick a template) → **Generate KQL**.
  - **Say:** "This drafts a defensive KQL detection from a template, with detection notes,
    false-positive considerations, and a validation checklist. The queries are generated
    locally for practice — explicitly *not* run against Sentinel/Defender."
  - **Screenshot:** `assets/screenshots/kql-assistant.jpg`
  - **Skill it demonstrates:** detection logic and KQL practice, plus tuning/FP awareness.

- **Option B — SOC Alert Report Generator**
  - **Click:** open it → **Load Sample Incident** → **Copy** the Markdown report.
  - **Say:** "This turns alert evidence into a structured incident report following the NIST
    incident-handling lifecycle — the report-writing skill that's usually under-trained for
    junior analysts."
  - **Screenshot:** `assets/screenshots/report-generator.jpg`
  - **Skill it demonstrates:** structured incident reporting and clear written communication.

- **Option C — Incident Timeline Builder**
  - **Click:** open it → **Load Sample Timeline** → show the sorted, exportable timeline.
  - **Say:** "This sequences investigation events into a clean, exportable timeline —
    timeline reconstruction is the core analytical act of an investigation."
  - **Skill it demonstrates:** event sequencing and investigation structure.

### Closing line
- **Say:** "So end to end: learn the fundamentals, practise triage under pressure, then use
  small analyst tools the way a junior would on the job. It's all simulated data, all
  client-side, and it's an ongoing project — but it shows how I approach detection, triage,
  and incident work."

---

## What NOT to show in a short demo
- The experimental tower-defense game modes (Defense Mission / Network Defense Mission v2)
  — they're unfinished experiments and pull the story toward "game."
- Deep companion cosmetics, type unlocking, or reset flows.
- Editing/validating the question banks or internal tooling.
- Long quiz runs or trying to beat the SOC shift.
- Anything implying real SIEM/EDR/threat-intel connectivity — it's local and simulated.

---

## One-line honesty notes (use as needed)
- "All data here is fictional and simulated — documentation IP ranges and invented orgs."
- "It's static and client-side: no backend, no accounts, nothing leaves the browser."
- "It's a learning and portfolio project and a work in progress — not production tooling."
