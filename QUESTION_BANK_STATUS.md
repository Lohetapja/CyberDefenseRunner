# Cyber Defense Runner — Question Bank Status

> Progress tracker for the question-bank expansion. Nothing here is merged into
> `questions.js` yet. No game logic is touched by this work.

_Last updated: after Topic 8 (Malware Basics) validated PASS — ALL 8 TOPICS COMPLETE._

---

## Current goal

Generate and validate **100 questions per Learning Path topic**.

Target topics:

1. Networking Basics
2. Defending Systems
3. Attacking Concepts
4. Alert Investigation
5. Cloud & DevOps
6. AI & Automation Safety
7. Identity & Logins
8. Malware Basics

**Target total: 800 questions.**

**Progress: 800 / 800 (8 of 8 topics complete). ✅ ALL TOPICS VALIDATED.**

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Networking Basics | questions-networking-basics.js | ✅ PASS |
| 2 | Defending Systems | questions-defending-systems.js | ✅ PASS |
| 3 | Attacking Concepts | questions-attacking-concepts.js | ✅ PASS |
| 4 | Alert Investigation | questions-alert-investigation.js | ✅ PASS |
| 5 | Cloud & DevOps | questions-cloud-devops.js | ✅ PASS |
| 6 | AI & Automation Safety | questions-ai-automation-safety.js | ✅ PASS |
| 7 | Identity & Logins | questions-identity-logins.js | ✅ PASS |
| 8 | Malware Basics | questions-malware-basics.js | ✅ PASS |

---

## Completed topic files

### Networking Basics

- **File:** questions-networking-basics.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** networking-basics-001 through networking-basics-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 107 / max 154 chars) · Errors/Warnings 0/0
- **Notes:** Two near-duplicate scenarios were caught and rewritten before final validation. The final batch passed cleanly.

### Defending Systems

- **File:** questions-defending-systems.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** defending-systems-001 through defending-systems-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 98 / max 132 chars) · Errors/Warnings 0/0
- **Subtopics:** firewalls, IDS/IPS, EDR, patching, backups, hardening, least privilege, logging, monitoring, vulnerability management, segmentation, allowlists/denylists, secure configuration, endpoint protection, recovery basics
- **Notes:** First pass came out 25/28/24/23; rebalanced by reordering options on three questions (-018, -059, -075), which also cleared the one consecutive-index warning. Three near-duplicate prompts rewritten during authoring.

### Attacking Concepts

- **File:** questions-attacking-concepts.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** attacking-concepts-001 through attacking-concepts-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 92 / max 112 chars) · Errors/Warnings 0/0
- **Subtopics:** reconnaissance, phishing, brute force, exploitation, privilege escalation, credential access, lateral movement, persistence, command and control, exfiltration, impact, social engineering, web attacks, password attacks, attack chains (all framed defensively — recognize/understand, no operational how-to)
- **Notes:** First pass came out 24/25/26/25 with two consecutive-index warnings; rebalanced by reordering options on three questions (-020, -072, -088), which also cleared both warnings. Five near-duplicate prompts rewritten during authoring.

### Alert Investigation

- **File:** questions-alert-investigation.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** alert-investigation-001 through alert-investigation-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 84 / max 109 chars) · Errors/Warnings 0/0
- **Subtopics:** triage, severity, false positives, evidence gathering, timelines, affected user, affected host, process trees, command lines, network connections, hashes, log sources, escalation, containment questions, incident notes, what a SOC analyst should ask
- **Notes:** Passed validation on the first run (no rebalancing needed). Eight near-duplicate prompts were rewritten during authoring to keep closely related subtopics distinct.

### Cloud & DevOps

- **File:** questions-cloud-devops.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** cloud-devops-001 through cloud-devops-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 87 / max 117 chars) · Errors/Warnings 0/0
- **Subtopics:** cloud basics, shared responsibility, IAM, storage buckets, containers, Docker basics, Kubernetes basics, CI/CD, Git, secrets in pipelines, infrastructure as code, monitoring, logs, environment variables, least privilege, deployment risks, rollback basics, image scanning, container registry basics, production vs development environments
- **Notes:** Passed validation on the first run. Four near-duplicate prompts were rewritten during authoring (region/AZ, IaC tooling, pre-deploy backup, image signing) and one shared-responsibility prompt was made distinct.

### AI & Automation Safety

- **File:** questions-ai-automation-safety.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** ai-automation-safety-001 through ai-automation-safety-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 83 / max 104 chars) · Errors/Warnings 0/0
- **Subtopics:** AI coding assistant risks, AI agent permissions, prompt injection, data leakage, secret exposure, shadow AI, hallucinated commands, unsafe automation, human approval gates, AI-generated insecure code, tool access control, logs from AI tool misuse, deterministic validation, confidence vs evidence, AI in SOC workflows, automation vs accountability, approval workflows, AI output verification, least privilege for AI tools, auditing AI actions
- **Notes:** Passed validation on the first run. Several near-duplicate prompts in the closely related approval-workflow / output-verification / least-privilege subtopics were rewritten during authoring to keep them distinct.

---

### Identity & Logins

- **File:** questions-identity-logins.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** identity-logins-001 through identity-logins-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 80 / max 110 chars) · Errors/Warnings 0/0
- **Subtopics:** authentication, authorization, MFA, passwords, password managers, account lockout, privilege, roles, groups, service accounts, OAuth basics, SSO basics, sessions, tokens, credential theft, brute force, password spraying, least privilege, conditional access, login monitoring
- **Notes:** One option reorder on `-068` fixed a 26/24 imbalance and a single consecutive-index warning. Several near-duplicate prompts in overlapping subtopics (MFA, least privilege, roles, credential theft) rewritten during authoring.

### Malware Basics

- **File:** questions-malware-basics.js
- **Status:** PASS
- **Questions:** 100
- **ID range:** malware-basics-001 through malware-basics-100
- **Correct answer distribution:** A/0: 25 · B/1: 25 · C/2: 25 · D/3: 25
- **Tier distribution:** Beginner 50 · Intermediate 35 · Advanced 15
- **Validation:** Unique IDs PASS · Required fields PASS · Exactly 4 options PASS · Correct index 0–3 PASS · Duplicate prompts 0 · Duplicate options 0 · Certification names 0 · Consecutive same correct index 0 · Explanation length PASS (avg 79 / max 104 chars) · Errors/Warnings 0/0
- **Subtopics:** viruses, worms, trojans, ransomware, spyware, keyloggers, droppers, loaders, persistence, process behavior, suspicious files, hashes, sandboxing, command and control, phishing attachments, macros/scripts, indicators of compromise, containment basics, suspicious PowerShell, safe analysis basics
- **Notes:** One tier label adjusted (Advanced 16 → 15). Several near-duplicate prompts in tightly related subtopics (droppers/loaders, macros/attachments, C2, safe analysis) rewritten during authoring.

## All topic files complete

_All eight topic files are generated and validated — 800/800 questions. Nothing is merged into questions.js yet._

---

## Validator tool

Reusable validator (browser + Node + CLI; does not depend on the game):

- `tools/validate-questions.js` — the validator engine (`validateQuestions(batch, options)`)
- `tools/validate-questions.html` — browser UI: paste a batch, get a PASS/FAIL report
- `tools/README.md` — usage instructions

**How a batch is validated (browser):** open `http://localhost:3900/tools/validate-questions.html`,
paste the batch (bare array or `const NAME = [...]`), set Expected Topic + ID Prefix, click Validate.

**Checks performed:**

- total count
- unique IDs
- required fields (id, tier, topic, prompt, options, correct, explain, reward)
- exactly 4 options
- correct index 0–3
- balanced correct-answer distribution
- tier distribution
- topic distribution
- duplicate prompts
- near-duplicate prompts (normalized comparison)
- duplicate option text
- banned certification names
- empty strings
- explanation length sanity
- ID prefix format

---

## Question generation rules

Every topic file must have:

- exactly **100** questions
- **50 Beginner**, **35 Intermediate**, **15 Advanced**
- correct distribution **25 / 25 / 25 / 25** across indexes 0 / 1 / 2 / 3
- no duplicate or near-duplicate prompts
- no repeated correct-answer pattern (no long runs / consecutive repeats)
- no official certification names (CCNA, Network+, Security+, OSCP, Pentest+, CompTIA, CEH, CISSP)
- beginner-friendly explanations
- plausible wrong answers
- no ambiguous trick questions
- topic string set exactly to the Learning Path name
- IDs in the form `topic-prefix-001` … `topic-prefix-100`

---

## Workflow

Use this workflow for every topic:

1. Generate one topic file.
2. Validate it with the validator.
3. Fix any validation issues.
4. Re-run validation.
5. Only mark the topic complete after **PASS**.
6. Do **not** merge into `questions.js` until explicitly requested.

---

## Next step

**All 8 topic files are complete and validated (800/800 questions). No remaining topics to generate.**

**Recommended next step (when you choose to proceed):** Merge the eight standalone
`questions-<topic>.js` files into the game. This is a separate, explicitly-requested step
and has NOT been done. Merging will involve deciding how the 8 new topic strings
("Networking Basics", "Defending Systems", "Attacking Concepts", "Alert Investigation",
"Cloud & DevOps", "AI & Automation Safety", "Identity & Logins", "Malware Basics")
are wired into `questions.js`, the Topic dropdown in `index.html`, and the Learning Path
filters / `TOPIC_ORDER` / `STUDY_RECS` in `app.js`. Re-run the validator on any file before merging.

---

## Guardrails

- Do **not** merge into `questions.js` yet.
- Do **not** touch game logic.
- Do **not** touch `mission.js`, `app.js`, `index.html`, `style.css`, or `questions.js` unless explicitly asked.
