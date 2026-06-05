# Question Batch Validator

A standalone utility for checking Cyber Defense Runner question batches **before**
they are merged into `questions.js`. It does not touch or depend on the game.

## Files
- `validate-questions.js` — the reusable validator (browser + Node + CLI).
- `validate-questions.html` — a browser UI: paste a batch, get a PASS/FAIL report.

## How to use (browser — recommended, no Node needed)
1. Serve the project (e.g. `python -m http.server 3900`) and open
   `http://localhost:3900/tools/validate-questions.html`
   (or just open the HTML file directly in a browser).
2. Paste your batch into the box — either a bare array `[ {…}, … ]`
   or a declaration `const NETWORKING_BASICS_QUESTIONS = [ … ];`.
   (Or click **Load .js file…** to pick a batch file.)
3. Optionally set **Expected Topic** (e.g. `Networking Basics`) and
   **Expected ID Prefix** (e.g. `networking-basics`) to enforce them.
4. Click **Validate**. A green **PASS** means zero errors (safe to merge);
   red **FAIL** lists the errors to fix. Warnings are advisory only.

## How to use (programmatic)
```js
const validateQuestions = require("./tools/validate-questions.js"); // Node
// or include validate-questions.js via <script> in a browser, then use window.validateQuestions

const result = validateQuestions(BATCH, {
  topic: "Networking Basics",
  idPrefix: "networking-basics",
  maxExplainChars: 240
});
console.log(result.ok, result.errors, result.warnings);
```

## How to use (Node CLI — if Node is installed)
```
node tools/validate-questions.js path/to/batch.js --topic="Networking Basics" --prefix="networking-basics"
```
The batch file may `module.exports = [ … ]` or declare `const NAME = [ … ];`.
Exit code is `0` on PASS, `1` on FAIL.

## Checks performed
1. Total question count
2. All IDs unique
3. Required fields present: `id, tier, topic, prompt, options, correct, explain, reward`
4. Exactly 4 options per question
5. `correct` is an integer 0–3
6. Balanced correct-answer distribution across A/B/C/D
7. No two consecutive questions sharing a correct index (warning)
8. No duplicate / near-duplicate prompts (normalized comparison)
9. No duplicate option text within a question
10. Topic matches the expected topic
11. Tier is one of `Beginner`, `Intermediate`, `Advanced`
12. Explanations present and reasonably short (warning if too long)
13. No certification names (CCNA, Network+, Security+, OSCP, Pentest+, CompTIA, CEH, CISSP, …)
14. No obvious answer-position pattern (error if one index dominates)
15. No empty strings
16. IDs follow the expected prefix format (e.g. `networking-basics-001`)

## Output summary
total count · unique IDs · correct distribution · tier distribution ·
topic distribution · duplicate-prompt findings · option-duplicate findings ·
certification-name findings · errors · warnings · **PASS/FAIL**.

**PASS = zero errors.** Warnings do not block a merge but are worth reviewing.
