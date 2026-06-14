# Cyber Defense Lab — Portfolio Demo Flow

A short walkthrough for presenting **Cyber Defense Lab** as a junior SOC / blue-team portfolio lab.

The goal of the demo is to show practical analyst thinking: security foundations, alert triage, incident response practice, timeline building, detection reasoning, and structured reporting.

## Framing

Cyber Defense Lab is:

* an educational blue-team lab
* a static, client-side browser project
* built with safe simulated data
* designed for learning and portfolio demonstration
* not a production SOC, SIEM, SOAR, EDR, or threat-intelligence platform

All incidents, logs, IPs, hosts, users, and organizations are fictional or simulated training data.

## 30-second introduction

> Cyber Defense Lab is a browser-based blue-team practice lab I built to strengthen junior SOC skills. It combines security question training, timed incident response, and small analyst tools for alert triage, KQL-style detection drafting, timeline building, log parsing, AI misuse detection, and incident reporting. It runs entirely in the browser as a static site, uses safe simulated data, and is an ongoing learning and portfolio project rather than a production tool.

## 60-second quick tour

1. **Landing page**
   Cyber Defense Lab is client-side, safe to open, and organized around training, SOC simulation, and analyst tools.

2. **Main Quiz Training**
   The quiz contains a curated question bank across eight cybersecurity topics, with explanations after answers.

3. **Analyst Companion**
   The companion is a lightweight learning-progress layer with energy, credits, badges, companion type/name, and localStorage persistence.

4. **SOC Dashboard**
   The SOC Dashboard adds time pressure and after-action learning.

5. **Analyst Tools**
   The analyst tools demonstrate triage, detection reasoning, reporting, timeline reconstruction, log analysis, and AI misuse awareness.

6. **Closing**
   Everything is simulated, local-first, and built for learning and portfolio demonstration.

## 3–5 minute walkthrough

Open the live GitHub Pages demo or run the project locally. Keep each stop short. The goal is to show analyst reasoning, not to play through every mode.

---

## 1. Main landing page

**Click:** Open the landing page and expand the **Analyst Tools** section.

**Say:**

> This is the home screen. The project is a static browser lab with no login or backend. The main flow is quiz training, a SOC Dashboard, and six analyst tools. Experimental game modes are separated from the professional analyst tools.

**Screenshot:**
`assets/screenshots/main-menu.jpg`

**Skill demonstrated:**
Project organization, scope control, UI structure, and clear separation between stable analyst tools and experimental game modes.

**Keep short:**
Do not spend time on the experimental game modes during a short portfolio demo.

---

## 2. Main Quiz Training

**Click:** Start Quiz Training, choose a learning path such as Networking Basics or Mixed, answer one question, and show the explanation.

**Say:**

> The quiz is the foundations layer. It covers eight cybersecurity topics and gives explanations, so it supports understanding rather than only memorization. Questions are randomized per session.

**Screenshot:**
`assets/screenshots/quiz-companion.jpg`

**Skill demonstrated:**
Cybersecurity fundamentals, content organization, learning design, and topic-based practice.

**Keep short:**
Show one question only. Do not run through a long quiz session.

---

## 3. Analyst Companion

**Click:** Point briefly to the companion panel on the right side of the quiz screen.

**Say:**

> The Analyst Companion is a lightweight progress layer. It tracks energy, credits, streaks, accuracy, modules, and badges using localStorage. It is there to make learning more engaging, but it does not change scoring or difficulty.

**Screenshot:**
`assets/screenshots/quiz-companion.jpg`

**Skill demonstrated:**
Front-end state management, localStorage persistence, and UX thinking.

**Keep short:**
Avoid spending too much time on cosmetic customization in a short demo.

---

## 4. SOC Dashboard

**Click:** Open **SOC Dashboard**, let a threat appear, click the affected node, answer one or two incidents, and show the After-Action Report if available.

**Say:**

> This turns the learning into a timed incident-response simulation. Incidents escalate, the user has to prioritize responses, and the After-Action Report reviews what happened and what could be improved.

**Screenshots:**
`assets/screenshots/soc-dashboard.jpg`
`assets/screenshots/after-action-report.jpg`

**Skill demonstrated:**
Triage under time pressure, prioritization, incident review, and learning from missed decisions.

**Keep short:**
Do not try to complete a full long shift during the demo.

---

## 5. SOAR-Lite Alert Triage

**Click:** Open **SOAR-Lite Alert Triage**, load the sample alert, and analyze it.

**Say:**

> This tool makes triage reasoning explicit. It takes a simulated alert, applies local rules, adds mock enrichment, assigns a verdict and severity, maps possible MITRE ATT&CK techniques, and produces copyable Markdown and JSON output. It is a local demo and does not connect to a real SIEM, EDR, or threat-intelligence service.

**Screenshot:**
`assets/screenshots/soar-lite-triage.jpg`

**Skill demonstrated:**
Alert triage, enrichment thinking, severity reasoning, false-positive awareness, and ATT&CK mapping.

**Important note:**
Do not present this as a production SOAR platform. It is a safe local simulation.

---

## 6. Choose one analyst output tool

Pick one option depending on the audience and available time.

### Option A — KQL Detection Assistant

**Click:** Open **KQL Detection Assistant**, load a sample detection, and generate KQL.

**Say:**

> This drafts defensive KQL-style detections from templates and includes detection notes, false-positive considerations, and a validation checklist. The query is generated locally for practice and is not executed against Microsoft Sentinel, Defender, Azure, or any live environment.

**Screenshot:**
`assets/screenshots/kql-assistant.jpg`

**Skill demonstrated:**
Detection logic, KQL practice, tuning considerations, and validation thinking.

### Option B — SOC Alert Report Generator

**Click:** Open **SOC Alert Report Generator**, load a sample incident, and show the generated Markdown report.

**Say:**

> This turns alert evidence into a structured incident report. It practices the communication side of SOC work: summarizing evidence, impact, containment, recovery, and lessons learned.

**Screenshot:**
`assets/screenshots/report-generator.jpg`

**Skill demonstrated:**
Structured incident reporting and clear analyst communication.

### Option C — Incident Timeline Builder

**Click:** Open **Incident Timeline Builder**, load a sample timeline, and show the sorted timeline.

**Say:**

> This tool organizes investigation events into a clear timeline. Timeline reconstruction is one of the core skills in incident investigation because it helps separate known facts from assumptions.

**Screenshot:**
`assets/screenshots/timeline-builder.jpg`

**Skill demonstrated:**
Event sequencing, investigation structure, and evidence organization.

---

## Closing line

> End to end, Cyber Defense Lab shows how I approach junior SOC work: build foundations, triage alerts, organize evidence, map activity to ATT&CK, and communicate findings clearly. It is safe, simulated, client-side only, and still evolving as a learning and portfolio project.

## What not to show in a short demo

Avoid spending time on:

* Experimental Game Modes
* companion cosmetic customization
* internal question-bank validation
* long quiz runs
* trying to beat a full SOC shift
* anything that implies real SIEM, EDR, cloud, AI, or threat-intelligence connectivity

## Useful honesty notes

* “All data here is fictional and simulated.”
* “The project is static and client-side: no backend, no accounts, and nothing leaves the browser.”
* “This is a learning and portfolio project, not production tooling.”
* “The goal is to show practical analyst thinking, not to imitate a full enterprise SOC stack.”
