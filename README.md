# Cyber Defense Runner

A browser-based cybersecurity learning game. No server, no login, no dependencies.

## How to run

Open `index.html` in any modern browser. That's it.

No build step. No npm install. No server required.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | HTML structure and screen layout |
| `style.css` | Dark SOC theme, layout, responsive rules |
| `app.js` | All game logic — state, scoring, damage, report |
| `questions.js` | The question bank (40 questions) |
| `README.md` | This file |

---

## Game loop

1. Choose mission parameters (cert track, topic, tier, wave count)
2. Click **Start Mission**
3. Read the scenario / question
4. Pick A, B, C, or D — watch the defender figure react
5. See the result and explanation
6. Click **Next Wave** to continue
7. Clear all waves with health above 0 to win
8. Final report shows your performance and what to study
9. Click **Return to Start** to adjust filters and replay

---

## Scoring rules (deterministic)

| Event | Effect |
|---|---|
| Correct answer | +100 score + (attacker level × 10) bonus |
| Correct answer | +4 health (capped at 100) |
| Correct answer | Earn one defensive upgrade |
| Wrong answer | −(12 + 6 × attacker level) health |
| Wrong answer | Attacker level +1 |
| Health reaches 0 | Game over — mission failed |
| All 40 waves cleared | Mission accomplished |

Attacker level starts at 1. It only ever goes up (wrong answers increase it). This means the game gets harder the more mistakes you make.

---

## How to add new questions

Open `questions.js` and add a new object to the `QUESTIONS` array. Follow this structure exactly:

```js
{
  id: "unique-id",          // must be unique across all questions
  tier: "Beginner",         // Beginner | Intermediate | Advanced
  topic: "Networking",      // see valid topics below
  prompt: "Question text",
  options: [
    "Answer A",
    "Answer B",
    "Answer C",
    "Answer D"
  ],
  correct: 0,               // index 0-3 pointing to the correct option
  explain: "Short explanation of why the correct answer is correct.",
  reward: "Firewall Hardening"  // name of the upgrade earned
}
```

**Valid topics:** Networking, Ports, DNS, Firewall, Subnetting, Blue Team, Red Team, SOC Investigation, Malware, Identity

**Valid tiers:** Beginner, Intermediate, Advanced

**Rules:**
- `id` must be unique
- `options` must have exactly 4 items
- `correct` must be 0, 1, 2, or 3
- `topic` must exactly match one of the valid topics (case-sensitive)
- `tier` must exactly match one of the valid tiers (case-sensitive)

---

## Final report logic

- **Strongest topic:** highest accuracy (correct / total) among topics attempted
- **Weakest topic:** lowest accuracy among topics attempted
- **Tie-break:** if two topics have the same accuracy, the topic that appears earlier in the fixed topic list wins (Networking → Ports → DNS → Firewall → Subnetting → Blue Team → Red Team → SOC Investigation → Malware → Identity)
- **Study recommendation:** based on the weakest topic
- **Upgrades:** deduplicated; each unique upgrade name shown once

---

## Mission parameter filters

Four filters appear on the start screen. They combine — a question must pass every active filter to be included.

### Cert Track

Restricts the question pool to topics relevant for a specific certification or role:

| Track | Topics included |
|---|---|
| Mixed | All topics (no restriction) |
| Network+ | Networking, Ports, DNS, Firewall, Subnetting |
| CCNA | Networking, Ports, Subnetting, Firewall |
| Blue Team | Blue Team, SOC Investigation, Malware, Identity |
| Pentest+ | Red Team, Malware, Ports, Networking |
| OSCP-Style | Red Team, Networking, Ports, Subnetting, Malware |

### Topic

Narrows to a single topic within whatever cert track is selected. Selecting `CCNA` + `Subnetting` gives only subnetting questions from the CCNA pool.

### Tier

Restricts to a difficulty level: All, Beginner, Intermediate, or Advanced.

### Wave Count

Sets the number of questions in the session: 10, 20, or 40. Questions are drawn in their original bank order up to this limit.

### What happens if there are not enough matching questions

If the combined filters produce fewer questions than the selected wave count, a warning message appears and the game does not start. Example: `CCNA` track + `SOC Investigation` topic = 0 matches (SOC Investigation is not in CCNA's topic list).

Adjust the filters until the warning clears, then click Start Mission.

---

## Digital defender figure

A shield-shaped avatar sits at the top of the sidebar during gameplay. It reacts to every answer:

| State | Trigger | Appearance |
|---|---|---|
| Idle | Question loaded or reaction timer expired | Cyan glow, "Monitoring traffic..." |
| Correct | Right answer chosen | Green flash + scale pop, "Threat contained." |
| Wrong | Wrong answer chosen | Red shake, "Breach pressure rising." |
| Victory | All waves cleared | Gold pulsing glow, "Network secured." |
| Defeat | Health reached 0 | Dimmed red, "Defenses failed." |

Correct and wrong states automatically return to idle after 2.2 seconds. Victory and defeat states persist on the report screen.

The figure is implemented as an inline SVG with CSS class-based state switching. No images are loaded — it works fully offline.

---

## Future features (not in this build)

- Timer per wave
- Per-topic accuracy bars on report
- localStorage high scores
- Sound effects
- Mobile layout improvements
- More questions
- Shuffle mode for repeat play
