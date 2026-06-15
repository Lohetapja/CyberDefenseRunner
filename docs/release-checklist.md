# Cyber Defense Lab — Release Checklist

A pre-push / pre-release checklist to keep changes safe and consistent. It exists to catch
regressions, accidental question-bank edits, stale docs, scope creep, and broken GitHub
Pages demos before anything goes public.

## When to use this checklist

Run through this before:

- committing a completed feature
- pushing to `origin`
- updating GitHub Pages
- sharing a project link publicly
- posting a project update on LinkedIn

---

## 1. Scope check
- [ ] The change has one clear purpose.
- [ ] The change matches `CLAUDE.md`.
- [ ] No unrelated files were changed.
- [ ] No giant rewrite happened.
- [ ] No new backend, account system, database, or external service was added.
- [ ] No real SIEM / EDR / cloud / threat-intel / AI integration was added.
- [ ] No secrets or API keys were added.
- [ ] Safe simulated-data boundaries are preserved.

## 2. Question bank protection
- [ ] No `questions-*.js` files changed unless the task explicitly required it.
- [ ] `questions.js` was not changed unless explicitly required.
- [ ] If question banks were intentionally changed, validation was run before commit.
- [ ] No duplicate IDs, malformed questions, or unbalanced answer positions were introduced.
- [ ] No certification-brand claims or copyrighted lab answers were added.

## 3. App smoke test
- [ ] Main landing page loads.
- [ ] Start Quiz Training works.
- [ ] A correct answer works.
- [ ] An incorrect answer works.
- [ ] Explanation displays correctly.
- [ ] Return to Menu works.
- [ ] No visible dead/disabled controls appear in the main quiz flow.

## 4. Analyst Companion check
- [ ] Companion panel renders.
- [ ] Energy / credits / streak / accuracy update after answers.
- [ ] Companion name/type display correctly.
- [ ] Customize Companion modal opens.
- [ ] Companion portrait stays contained.
- [ ] Reset Companion Progress works only after confirmation.
- [ ] localStorage persistence still works after reload.

## 5. SOC Dashboard check
- [ ] SOC Dashboard opens.
- [ ] A shift can start.
- [ ] Incidents/questions appear.
- [ ] Correct/wrong responses work.
- [ ] Timer / health / escalation display correctly.
- [ ] After-Action Report opens or generates correctly.
- [ ] Return/menu navigation works.

## 6. Analyst Tools check

All six tools:
- [ ] SOAR-Lite Alert Triage opens and sample analysis works.
- [ ] KQL Detection Assistant opens and sample generation works.
- [ ] SOC Alert Report Generator opens and sample report works.
- [ ] Incident Timeline Builder opens and sample timeline works.
- [ ] Log Parser / SIEM Demo opens and sample parsing works.
- [ ] AI Misuse Detection Demo opens and sample analysis works.

Also check:
- [ ] Load Sample buttons still work.
- [ ] Load File buttons still work where present.
- [ ] Copy Markdown / Copy JSON / Copy KQL buttons still work.
- [ ] Clear buttons still work.
- [ ] Intended-use boxes still make sense.
- [ ] No tool claims real SIEM / EDR / threat-intel connectivity.

## 7. Experimental Game Modes check
- [ ] Experimental Game Modes section opens.
- [ ] Defense Mission opens if linked.
- [ ] Network Defense Mission opens if linked.
- [ ] These modes remain clearly marked experimental / BETA.
- [ ] They do not dominate the main portfolio path.

## 8. Documentation check
- [ ] `README.md` still reflects the current state.
- [ ] `TESTING.md` still matches the menu/tools.
- [ ] `ROADMAP.md` is not contradicted by the change.
- [ ] `docs/architecture.md` still reflects the architecture if architecture changed.
- [ ] `docs/decisions.md` is updated if a major product/scope decision changed.
- [ ] `docs/demo-flow.md` still matches the recommended demo path.
- [ ] Screenshots are updated if the UI changed significantly.

## 9. Browser / GitHub Pages check
- [ ] Hard refresh was tested locally.
- [ ] GitHub Pages link was checked after push if public UI changed.
- [ ] No horizontal overflow on normal desktop width.
- [ ] No obvious broken image paths.
- [ ] No broken relative links in README / docs.
- [ ] Browser console has no errors.

## 10. Git check
- [ ] `git status` reviewed.
- [ ] Changed files match the intended task.
- [ ] No unexpected generated files included.
- [ ] No temporary files included.
- [ ] No private notes / secrets / logs included.
- [ ] Commit message is clear.
- [ ] Commit description explains what changed and what did not change.

## 11. Post-release note

```
Commit summary:
[short action phrase]

Commit description:
- What changed
- Why it matters
- Files/areas affected
- What was verified
- What was intentionally not changed
```

---

## Final rule

If a change cannot pass this checklist, do not push it publicly yet. Fix the regression,
narrow the scope, or move the unfinished idea to `ROADMAP.md`.
