# Cyber Defense Lab — Pre-commit manual test checklist

Run locally first (`start.bat` or `python -m http.server 3900` → http://localhost:3900).
**Hard-refresh (Ctrl+F5) before testing** — several files are cached aggressively.
Then re-check the live site after pushing.

## Main menu
- [ ] Page loads with dark theme, title shows **Cyber Defense Lab / Blue Team Training Simulator**
- [ ] Question count shows **3,200** (stat box and description line)
- [ ] Actions visible: Start Quiz Training · SOC Dashboard · Analyst Tools · Experimental Game Modes · How to Play
- [ ] **Analyst Tools** opens/closes; shows **7 live PROTOTYPE** tools (SOAR-Lite Alert Triage, KQL Detection Assistant, SOC Alert Report Generator, Incident Timeline Builder, Artifact Relationship View, Log Parser / SIEM Demo, AI Misuse Detection Demo)
- [ ] Each of the 7 Analyst Tools opens its page directly (no "planned" modal)
- [ ] **Recommended Analyst Workflow** strip shows 5 steps in order: Triage → Timeline → Artifact Map → Report → Detection, each linking to the correct page
- [ ] **Experimental Game Modes** opens/closes; shows **2 BETA** modes (Defense Mission, Network Defense Mission v2)
- [ ] How to Play opens; includes SOC Dashboard item (timers + after-action explanation); closes
- [ ] No errors in browser console (F12)

## Quiz Training
- [ ] Pick a Learning Path + tier + wave count → quiz starts
- [ ] Answering works; explanation shows; score/credits update
- [ ] ⟵ Return to Menu (confirm prompt) works mid-quiz
- [ ] Finish a short 10-wave run → report screen appears → Return to Start works

## SOC Dashboard
- [ ] Opens from menu; threats spawn; node pulses red
- [ ] Click threatened node → question appears (timer counts down from selected value)
- [ ] Correct answer: "Mitigation successful.", threat cleared, credits up
- [ ] Wrong answer: "Response failed.", node damage, escalation up
- [ ] Response timer select: 10s works; **No timer** shows ∞ and the engaged node freezes
- [ ] After-Action Report toggle ON by default

## After-Action Report
- [ ] Finish/lose a shift with ≥1 miss → report shows result, stats, weakest topics, missed questions with explanations
- [ ] Copy Report → "✔ COPIED"; paste produces clean Markdown
- [ ] Restart Shift and Back to Menu work
- [ ] Toggle AAR OFF → short overlay shows instead

## Experimental game modes
- [ ] Defense Mission (v1): opens, place a defense, start attack, abort/return works
- [ ] Network Defense Mission v2: packets move; build via question; matching threat intercepted; mismatch logs "Layer mismatch"; restart works

## SOC Alert Report Generator
- [ ] Opens from the Analyst Tools section (PROTOTYPE tag)
- [ ] Typing in any field updates the preview live
- [ ] **Load Sample Incident** fills the fictional Outlook/PowerShell scenario
- [ ] **Copy Report** → "✔ COPIED"; paste renders as proper Markdown (tables, bullets, code fence)
- [ ] **Clear Form** resets (date=today, severity=Medium, status=Open)
- [ ] Back to Menu works

## Artifact Relationship View
- [ ] Opens from Analyst Tools / the workflow strip (`artifact-map.html`, PROTOTYPE tag)
- [ ] All six lanes render: Identity & Users, Email Delivery, Execution, Network / Egress, Detection, Response
- [ ] Required nodes render (m.tamm, WS-TRAINING-07, Invoice 4471 email, Invoice_4471.docm, outlook.exe, powershell.exe, 203.0.113.66, files.example-cdn[.]test, TR-2031, Host isolated, Sessions revoked / password reset)
- [ ] Required edges render (received, carried, opened, executed in, spawned, attempted download, connected to, blocked by, triggered, contained by, secured by)
- [ ] Click a node → details panel shows type, label, and connections
- [ ] Click an edge → details panel shows relationship, timestamp, and supporting evidence
- [ ] **Missing Evidence** section is visible
- [ ] Safe simulated-data disclaimer is visible (no real SIEM/EDR/cloud/threat-intel, no live telemetry, browser-only)
- [ ] No errors in browser console
- [ ] No horizontal page overflow at normal desktop width

## GitHub Pages deployment (after push)
- [ ] Live URL loads; hard-refresh to bypass CDN/browser cache
- [ ] Title/branding shows Cyber Defense Lab
- [ ] Spot-check: one quiz question, SOC Dashboard opens, Report Generator sample+copy
- [ ] Console clean on the live site
- [ ] All nav between pages works with the Pages URL prefix (relative links only — no leading `/`)

> Tip: the most common failure after a push is **stale cache** — always hard-refresh
> before assuming something broke.
