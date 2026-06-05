# PROJECT_STATUS.md
# Cyber Defense Runner — project handoff document
# Paste this into a new Claude chat to resume without losing context.

---

## 1. Project name

**Cyber Defense Runner** (also called Packet Defender)

---

## 2. Project goal

A browser-based cybersecurity learning game that teaches networking, blue team, red team, and SOC investigation concepts through a question-and-answer gameplay loop. Runs entirely locally by opening `index.html`. No server, no login, no external dependencies.

---

## 3. Current file structure

```
CyberDefenseRunner/
├── index.html          — HTML structure, three screens
├── style.css           — Dark cyber/SOC theme, all visual styling
├── app.js              — All game logic, state, scoring, filtering, avatar
├── questions.js        — Question bank (40 questions, QUESTIONS array)
├── README.md           — How to run, how to add questions, filter docs
├── PROJECT_STATUS.md   — This file
└── .claude/
    └── launch.json     — Python HTTP server config (port 3900)
```

To run the preview server: `python -m http.server 3900 --directory <project-dir>`
Then open: `http://localhost:3900`

---

## 4. What each file does

**index.html**
Three `<div class="screen">` sections — only one has `class="active"` at a time:
- `#screen-start` — logo, description, mission parameter filters, start button
- `#screen-game` — HUD (health/wave/score/attacker), wave progress bar, question card, A/B/C/D options, feedback/explanation area, sidebar with avatar + upgrade chips
- `#screen-report` — final score, correct/wrong counts, strongest/weakest topic, upgrades collected, study recommendation, restart button

**style.css**
CSS custom properties in `:root`. Key sections:
- Base + reset
- Start screen (`.start-card`, `.filters-block`, `.fbtn`, `.filter-select`, `.filter-warning`)
- HUD (`.hud`, `.hud-panel`, `.health-bar`, `.wave-track`)
- Game content (`.question-card`, `.options-grid`, `.option-btn`, `.option-letter`, `.option-text`)
- Feedback (`.feedback-banner.correct/wrong`, `.explanation-box`)
- Sidebar (`.sidebar`, `.upgrade-chip`)
- Avatar (`.avatar`, `.avatar-ring`, `.avatar-svg`, `.av-body/eye/visor/node`, state classes, keyframes)
- Report screen
- Responsive at 740px breakpoint

**app.js**
All game logic. Key constants and functions:
- `CONFIG` — health, scoring, damage formula values
- `TOPIC_ORDER` — canonical topic order for tie-breaking
- `STUDY_RECS` — per-topic study recommendation text
- `CERT_TRACK_TOPICS` — maps **Learning Path** names to allowed topic arrays (internal const name kept; UI labels renamed)
- `TD_PATH` / `TD_SLOTS` / `TD_TOWER_DEFS` — tower-defense map data (Phase 1 Blue Team Bastion)
- `AVATAR_MESSAGES` — status line text per avatar state
- `initState(questions)` — resets all state; takes the filtered question array
- `buildFilteredQuestions()` — reads filter UI, applies cert/topic/tier filters, checks minimum count, returns sliced array or null
- `showFilterWarning() / hideFilterWarning()` — amber warning on start screen
- `updateHUD()` — syncs health bar, score, wave counter, attacker level, wave progress strip
- `loadQuestion()` — renders current question, rebuilds option buttons, resets avatar to idle
- `handleAnswer(chosen)` — deterministic correctness check, scoring/damage, feedback display, avatar trigger
- `addUpgradeChip(name)` — adds deduplicated chip to sidebar
- `triggerAvatarReaction(isCorrect)` — sets avatar state, auto-returns to idle after 2200ms
- `setAvatarState(name)` — sets `.avatar--{state}` class and status text
- `nextWave()` — advances wave or triggers win/showReport
- `showReport()` — calls `endTdWave()`, calculates strongest/weakest topic, renders final report, sets avatar to victory/defeat

Tower-defense functions (Phase 1 Blue Team Bastion):
- `startTdWave()` — spawns one enemy at Internet, starts the 500ms game loop
- `tdGameLoop()` — per-tick: moves enemies, runs tower attacks, handles DC breach, ends wave when clear
- `endTdWave()` — clears the interval, empties enemy array, refreshes display
- `selectTdTower(type)` — toggles a tower type for placement
- `tdSlotClick(slotId)` — places the selected tower on a slot if credits suffice (deducts cost)
- `renderTdMap()` — rebuilds the `#td-canvas` 11-column grid (path nodes + tower slots + enemy marker)
- `updateTdDisplay()` — refreshes map, enemy HP bar, integrity badge, wave/tower buttons

**questions.js**
Exports a single global array `QUESTIONS`. Each object follows the question format below. 40 questions total, 4 per topic.

---

## 5. Current game features

- Start screen with mission parameter filters (**Learning Path**, topic, tier, wave count)
- Filter validation — warns and blocks start if pool < wave count
- Dark cyber/SOC dashboard theme
- HUD with health bar (color-coded), wave counter, score, attacker level
- Wave progress strip below HUD
- Question card with topic chip and tier chip
- Single-column A/B/C/D options with letter badge + text
- Correct/wrong answer highlighting with green/red states
- Explanation box after every answer
- Defensive upgrade chips collected in sidebar
- Digital defender avatar (inline SVG shield face) with 5 states + animations
- Avatar status line ("Monitoring traffic...", "Threat contained.", etc.)
- Final report: score, correct/wrong counts, strongest/weakest topic, upgrades, study recommendation
- Restart returns to start screen (filters preserved)
- **Blue Team Bastion tower-defense map** (Phase 1 — see section 16)

---

## 5b. Learning Path rename (was "Cert Track")

To keep this a hobby/portfolio project free of official certification branding, the
visible UI labels and internal `CERT_TRACK_TOPICS` keys were renamed:

| Old (removed) | New |
|---|---|
| Mixed | Mixed |
| Network+ | Network Foundations |
| CCNA | *(folded into Network Foundations)* |
| Blue Team | Blue Team Defense |
| Pentest+ | Red Team Concepts |
| OSCP-Style | *(folded into Red Team Concepts)* |
| — | SOC Ops *(new)* |
| — | Malware Basics *(new)* |
| — | Identity & Access *(new)* |

- Start screen filter label: `CERT TRACK` → `LEARNING PATH`
- Meta stat: `6 Cert Tracks` → `7 Learning Paths`
- Internal const **name** `CERT_TRACK_TOPICS` kept (low-risk); only its keys + UI changed
- Topic→pool mapping preserved so filtering still works; validated 40/40 questions load

---

## 16. Phase 1 — Blue Team Bastion (tower defense)

A DOM/CSS/JS tower-defense layer added below the existing attacker lane on the game
screen. Questions remain the economy: correct answers earn credits, credits buy towers.

**Map:** `#td-map` panel → `#td-canvas` 11-column CSS grid.
- Path (6 nodes): Internet → Edge Router → Firewall → Int. Switch → Server → Domain Controller
- 4 fixed tower slots (T1–T4) above the path, near nodes 0/2/3/4
- DC Integrity badge (starts 3/3), Start Defense Wave button, Firewall Tower buy button

**Enemy:** "Phishing Packet", HP 100, moves one node every ~3s (6 ticks × 500ms).
Reaching the Domain Controller costs **−20 health** and **−1 DC Integrity**, then the wave ends.

**Tower — Firewall Tower:** cost 50 CR, damage 25, range 1 node, fires every ~2s (4 ticks).
Slot flashes when it fires. With one tower in range, the enemy dies before the DC.

**New state fields (in `initState`):**
`tdSelectedTower`, `tdTowers`, `tdEnemies`, `tdWaveActive`, `tdLoopId`,
`tdIntegrity` (3), `tdEnemyCounter`.

**Interaction:** select Firewall Tower → click an empty slot to place → Start Defense Wave.
Tower placement and waves are manual; the quiz loop runs independently and is unaffected.

**Files touched for Phase 1:**
- `index.html` — Learning Path buttons + meta stat; added `#td-map` panel
- `app.js` — `CERT_TRACK_TOPICS` keys; `TD_PATH`/`TD_SLOTS`/`TD_TOWER_DEFS`; TD state fields;
  7 new TD functions; hook-ins in `loadQuestion`, `showReport`, start-button listener; 2 new listeners
- `style.css` — Blue Team Bastion section (~200 lines)
- `questions.js` — **unchanged**

**Phase 1 manual test steps:**
1. Open the game — start screen shows "LEARNING PATH" + 7 buttons + "7 Learning Paths" stat; no CCNA/Network+/Pentest+/OSCP-Style anywhere.
2. Start Mission → Blue Team Bastion map visible (INET→…→DC path, slots T1–T4, DC Integrity 3/3).
3. Answer correct questions → credits rise in HUD; at ≥50 CR the Firewall Tower button enables.
4. Click Firewall Tower (it glows, hint appears) → click slot T2 → 🔵 placed, 50 CR deducted.
5. Start Defense Wave → ▲ enemy appears at INET, advances node by node.
6. Enemy enters T2 range → slot flashes, enemy HP bar drops, enemy dies before DC; wave ends.
7. No-tower wave → enemy reaches DC → health −20, DC Integrity 3→2, wave ends.
8. Quiz answering still works throughout; report screen opens cleanly and stops the TD loop.

---

## 6. Current game loop

```
Start screen
  → Player selects cert track / topic / tier / wave count
  → Click Start Mission
  → buildFilteredQuestions() filters pool, slices to wave count
  → If pool too small: show warning, block start
  → initState(questions) resets all state

Game screen (repeats per wave)
  → loadQuestion() renders question, sets avatar to idle
  → Player clicks A/B/C/D
  → handleAnswer() checks correctness (index comparison, deterministic)
    → Correct: +score, +health (capped), earn upgrade, avatar correct state
    → Wrong: -health (formula), attacker level +1, avatar wrong state
  → Avatar auto-returns to idle after 2.2s
  → Show feedback banner + explanation + Next Wave button
  → If health ≤ 0: change button to "VIEW REPORT →", set gameOver
  → Player clicks Next Wave
    → If gameOver: showReport()
    → If all waves done: won = true, showReport()
    → Else: loadQuestion() for next wave

Report screen
  → Avatar set to victory or defeat state
  → Show final stats, upgrades, weakest-topic study recommendation
  → Click "Return to Start" → back to start screen (no state reset yet)
```

---

## 7. Current question object format

```js
{
  id: "unique-id",          // string, must be unique across all questions
  tier: "Beginner",         // "Beginner" | "Intermediate" | "Advanced"
  topic: "Networking",      // must match one of the 10 valid topics (case-sensitive)
  prompt: "Question text",
  options: [
    "Answer A",             // exactly 4 options
    "Answer B",
    "Answer C",
    "Answer D"
  ],
  correct: 0,               // integer 0–3, index of the correct option
  explain: "Explanation text shown after answer.",
  reward: "Upgrade Name"    // string, name of the defensive upgrade earned
}
```

Rules: `id` unique, `options` exactly 4, `correct` 0–3, `topic` and `tier` must match valid values exactly.

---

## 8. Current topics (10 total)

Exact strings used in question objects and filter logic — case-sensitive:

```
Networking
Ports
DNS
Firewall
Subnetting
Blue Team
Red Team
SOC Investigation
Malware
Identity
```

Current distribution: 4 questions per topic = 40 total.

---

## 9. Current difficulty tiers

```
Beginner       — basic concepts
Intermediate   — practical SOC/network reasoning
Advanced       — nuanced decisions, still understandable
```

Current split: ~19 Beginner, ~17 Intermediate, 4 Advanced.

---

## 10. Current scoring rules (deterministic, do not change without discussion)

| Event | Effect |
|---|---|
| Correct answer | `+100 + (attackerLevel × 10)` score |
| Correct answer | `+4` health, capped at 100 |
| Correct answer | Earn the question's `reward` upgrade (deduplicated) |
| Wrong answer | `-(12 + 6 × attackerLevel)` health |
| Wrong answer | `attackerLevel += 1` |
| Health ≤ 0 | Mission failed (gameOver, won = false) |
| All waves cleared | Mission accomplished (won = true) |

Starting values: health = 100, attackerLevel = 1.
At level 1, a wrong answer costs 18 HP. At level 5, it costs 42 HP.
Correctness is decided by `chosen === q.correct` (index comparison). No AI, no randomness.

---

## 11. Current validation status

Last validated via PowerShell regex checks:
- ✅ 40 questions, 40 unique IDs
- ✅ 4 questions per topic, all 10 topics covered
- ✅ Correct index distribution: exactly 10 at index 0, 10 at 1, 10 at 2, 10 at 3
- ✅ All correct values in range 0–3
- ✅ Brace balance verified
- ✅ Filter warning tested: CCNA + SOC Investigation = 0 matches, warning fires
- ✅ Avatar states tested: `avatar--wrong` confirmed at click time, `avatar--correct` confirmed via green highlight
- ✅ Scoring confirmed: +110 on first correct answer (100 + 10 × lvl 1), −18 on first wrong (12 + 6 × 1)
- ✅ Preview server running at http://localhost:3900

---

## 12. Known limitations

- Questions are served in original bank order within filtered pool — no shuffle yet
- Wave count is capped by pool size — no question repeating
- If player clicks Next Wave before the 2.2s avatar timer fires, the animation is cleanly interrupted (clearTimeout) but the visual effect is cut short
- Report screen avatar (victory/defeat) uses the game sidebar avatar, which becomes invisible once the report screen is shown — the avatar state is set but not visible on the report screen itself
- Tier split is not balanced: ~47% Beginner, ~42% Intermediate, ~10% Advanced
- No localStorage — scores reset on every session
- Mobile layout is basic (responsive at 740px but not optimised for small screens)

**Phase 1 tower-defense limitations:**
- One enemy type, one tower type, one enemy per wave (no multi-spawn waves yet)
- Towers cannot be sold, upgraded, or moved once placed
- No pathfinding — enemy follows the fixed node order
- Tower range/damage/timing are fixed constants; no balancing pass done
- TD map and the older linear "defense lane" both exist on screen (some visual redundancy)
- Screenshots in the preview environment time out; behaviour verified via DOM/eval instead

---

## 13. Features discussed but not yet implemented

These were mentioned in project conversation but are deliberately deferred:

- **Shuffle / randomised question order** — currently deterministic order only
- **Timer per wave** — countdown clock per question
- **Per-topic accuracy bars** on the report screen (progress bars instead of just text)
- **localStorage high scores** — persist best score across sessions
- **Sound effects** — correct/wrong/victory audio
- **More questions** — expand bank beyond 40; architecture already supports it
- **Tower-defense visual layer** — a map showing attacker progress (was a future idea)
- **Multiplayer** — explicitly out of scope

---

## 14. Recommended next iterations (priority order)

1. **Shuffle questions within filtered pool** — prevents memorisation on replay; one line of `sort(() => Math.random() - 0.5)` on the pool before slicing (breaks strict determinism of order, but scoring rules stay deterministic)
2. **Per-topic accuracy bars on report** — progress bars showing X/4 per topic; already have the data in `state.topicStats`
3. **More questions** — expand to 80–120 questions; question object format is already defined; needs technical accuracy review before adding
4. **Timer per wave** — countdown (e.g. 30s), if it expires treat as wrong answer; adds pressure to replay
5. **localStorage high score** — one `localStorage.setItem` call at game end; show personal best on start screen
6. **Avatar on report screen** — show the avatar on the final report card, not just the game sidebar
7. **Sound effects** — short beeps for correct/wrong/victory; Web Audio API, no external files needed
8. **Advanced question content review** — only 4 Advanced questions currently; consider promoting some Intermediate questions or writing new Advanced ones

**Phase 2+ tower-defense iterations (priority order):**
1. **Multi-enemy waves** — spawn several enemies per wave on a stagger timer
2. **Second tower type** — e.g. IDS Tower (slows enemies) or EDR Tower (higher damage)
3. **Tower sell/upgrade** — click an occupied slot to refund or level up
4. **Auto-wave option** — start a wave automatically every N questions
5. **Balancing pass** — tune cost/damage/range/speed for a real difficulty curve
6. **Unify the lanes** — replace the old linear defense lane with the new TD map, or clearly separate their roles
7. **Game-over on integrity 0** — currently DC breach drains health; consider integrity itself as a loss condition

---

## 15. Important design principles (must be respected in all future work)

- **Deterministic game rules** — `chosen === q.correct` decides correctness. No AI, no randomness in answer checking, no probabilities in scoring or damage.
- **No backend** — everything runs in the browser from static files.
- **No database** — no server-side storage. localStorage for scores is acceptable.
- **No external APIs** — no fetch calls during gameplay. Threat intel, questions, and logic are all local.
- **No AI inside the running game** — Claude (or any AI) can help write code and questions, but the running game makes all decisions itself.
- **No dependencies** — no npm, no frameworks, no CDN links. Pure HTML/CSS/JS.
- **Keep files separated** — game state in `app.js`, question data in `questions.js`, styles in `style.css`, structure in `index.html`.
- **Do not over-engineer** — small clean changes preferred over large rewrites.
- **Questions must be technically accurate** — wrong answers should be plausible but clearly wrong after explanation; no trick questions; no ambiguity.
