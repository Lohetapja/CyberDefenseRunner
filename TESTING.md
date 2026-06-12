# Cyber Defense Lab — Pre-commit manual test checklist

Run locally first (`start.bat` or `python -m http.server 3900` → http://localhost:3900).
**Hard-refresh (Ctrl+F5) before testing** — several files are cached aggressively.
Then re-check the live site after pushing.

## Main menu
- [ ] Page loads with dark theme, title shows **Cyber Defense Lab / Blue Team Training Simulator**
- [ ] Question count shows **3,200** (stat box and description line)
- [ ] Exactly 4 actions visible: Start Quiz Training · SOC Dashboard · Experimental Modes · How to Play
- [ ] Experimental Modes opens/closes; shows **Game Mode Experiments** (2 buttons) and **Analyst Tool Prototypes** (5 cards)
- [ ] A PLANNED card (e.g. KQL) opens the "prototype is planned" modal; closes via ✕ / backdrop / GOT IT
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
- [ ] Opens from Experimental Modes (PROTOTYPE tag)
- [ ] Typing in any field updates the preview live
- [ ] **Load Sample Incident** fills the fictional Outlook/PowerShell scenario
- [ ] **Copy Report** → "✔ COPIED"; paste renders as proper Markdown (tables, bullets, code fence)
- [ ] **Clear Form** resets (date=today, severity=Medium, status=Open)
- [ ] Back to Menu works

## GitHub Pages deployment (after push)
- [ ] Live URL loads; hard-refresh to bypass CDN/browser cache
- [ ] Title/branding shows Cyber Defense Lab
- [ ] Spot-check: one quiz question, SOC Dashboard opens, Report Generator sample+copy
- [ ] Console clean on the live site
- [ ] All nav between pages works with the Pages URL prefix (relative links only — no leading `/`)

> Tip: the most common failure after a push is **stale cache** — always hard-refresh
> before assuming something broke.
