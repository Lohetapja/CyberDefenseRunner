/*
 * validate-questions.js — reusable question-batch validator for Cyber Defense Runner
 * --------------------------------------------------------------------------------
 * Pure JS, no dependencies. Works in the browser (sets window.validateQuestions)
 * and in Node (module.exports), and can be run as a Node CLI.
 *
 * It does NOT touch the game. It only inspects a batch of question objects.
 *
 * --- USAGE (browser) -------------------------------------------------------------
 *   Open tools/validate-questions.html, paste a batch (a JS array or
 *   `const NAME = [...]`), set the expected Topic + ID prefix, click Validate.
 *
 * --- USAGE (programmatic) --------------------------------------------------------
 *   const result = validateQuestions(BATCH, {
 *     topic: "Networking Basics",     // expected topic string (optional)
 *     idPrefix: "networking-basics",  // expected id prefix    (optional)
 *     maxExplainChars: 240            // explanation length warning threshold
 *   });
 *   console.log(result.ok, result.errors);
 *
 * --- USAGE (Node CLI, if Node is available) --------------------------------------
 *   node tools/validate-questions.js path/to/batch.js --topic="Networking Basics" --prefix="networking-basics"
 *   (batch file may `module.exports = [...]` or declare `const NAME = [ ... ];`)
 *
 * The result object contains: ok, total, uniqueIds, correctDistribution,
 * tierDistribution, topicDistribution, duplicatePromptFindings,
 * optionDuplicateFindings, certificationFindings, optionQualityFindings,
 * errors[], warnings[].
 *
 * optionQualityFindings are ADVISORY warnings (prefixed "OPTION QUALITY:") that flag
 * obvious-answer / lopsided-option smells. They never become errors and never block a merge.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.validateQuestions = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VALID_TIERS = ["Beginner", "Intermediate", "Advanced"];
  var REQUIRED = ["id", "tier", "topic", "prompt", "options", "correct", "explain", "reward"];
  // Certification names to reject (word-boundary aware, tolerant of spacing)
  var CERT_RE = /\b(CCNA|CCNP|CCIE|Network\s*\+|Net\s*\+|Security\s*\+|Sec\s*\+|A\s*\+|CompTIA|OSCP|OSEP|Pentest\s*\+|PenTest\s*\+|CEH|CISSP|CISM|GIAC|GSEC)\b/i;

  function normalizePrompt(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  }

  // ── Option-quality helpers (advisory only) ──────────────────────────────────
  function optStr(o) { return String(o == null ? "" : o).trim(); }
  function optWordCount(o) { var s = optStr(o); return s ? s.split(/\s+/).length : 0; }
  function optFirstWord(o) {
    var s = optStr(o).toLowerCase().replace(/^[^a-z0-9]+/, "");
    var m = s.match(/^[a-z0-9'+]+/);
    return m ? m[0] : "";
  }
  function mean(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }

  // Adds advisory "OPTION QUALITY" warnings for obvious-answer / lopsided-option smells.
  // Never produces errors, so it never blocks a merge.
  function checkOptionQuality(q, id, warn) {
    if (!Array.isArray(q.options) || q.options.length !== 4) return;
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) return;

    var opts  = q.options.map(optStr);
    var lens  = opts.map(function (o) { return o.length; });
    var words = opts.map(optWordCount);
    var firsts = opts.map(optFirstWord);
    var ci = q.correct;

    var correctLen = lens[ci];
    var wrongLens  = lens.filter(function (_, k) { return k !== ci; });
    var avgWrong   = mean(wrongLens);

    // (Q1) correct answer much longer than the average wrong answer
    if (avgWrong > 0 && correctLen >= avgWrong * 1.8 && (correctLen - avgWrong) >= 25) {
      warn(id, "OPTION QUALITY: correct option (" + correctLen + " chars) is much longer than the average wrong option (" + Math.round(avgWrong) + " chars) — may give away the answer");
    }

    // (Q2) one option much longer than the others (only when it is NOT the correct one; that case is Q1)
    var longestIdx = lens.indexOf(Math.max.apply(null, lens));
    if (longestIdx !== ci) {
      var othersAvg = mean(lens.filter(function (_, k) { return k !== longestIdx; }));
      if (othersAvg > 0 && lens[longestIdx] >= othersAvg * 2.0 && (lens[longestIdx] - othersAvg) >= 30) {
        warn(id, "OPTION QUALITY: option " + longestIdx + " is much longer than the others (" + lens[longestIdx] + " vs ~" + Math.round(othersAvg) + " chars)");
      }
    }

    // (Q3) three very short options + one long definition-style option
    var shortCount = lens.filter(function (L) { return L <= 22; }).length;
    var longIdxs = [];
    lens.forEach(function (L, k) { if (L >= 55) longIdxs.push(k); });
    if (shortCount === 3 && longIdxs.length === 1) {
      warn(id, "OPTION QUALITY: three short options and one long definition-style option" + (longIdxs[0] === ci ? " (the long one is the correct answer)" : ""));
    }

    // (Q4) duplicate opening words across options — only the *useful* asymmetric case:
    // the three wrong options share an opening word that the correct one does not.
    // (All four sharing an opener is usually intentional parallel structure, so it is NOT flagged.)
    var wrongFirsts = firsts.filter(function (_, k) { return k !== ci; });
    var wrongsSameFirst = wrongFirsts[0] && wrongFirsts.every(function (w) { return w === wrongFirsts[0]; });
    if (wrongsSameFirst && firsts[ci] !== wrongFirsts[0]) {
      warn(id, "OPTION QUALITY: the three wrong options all start with '" + wrongFirsts[0] + "' but the correct one starts with '" + firsts[ci] + "' — may telegraph the answer");
    }

    // (Q5) one-word distractors while the correct option is a full sentence
    var wrongWords = words.filter(function (_, k) { return k !== ci; });
    if (words[ci] >= 6 && wrongWords.every(function (w) { return w <= 2; })) {
      warn(id, "OPTION QUALITY: correct option is a full sentence (" + words[ci] + " words) while all wrong options are 1-2 words");
    }
  }

  function validateQuestions(batch, options) {
    options = options || {};
    var expectedTopic = options.topic || null;
    var idPrefix = options.idPrefix || null;
    var maxExplainChars = options.maxExplainChars || 240;

    var issues = [];
    function err(id, msg) { issues.push({ level: "error", id: id, msg: msg }); }
    function warn(id, msg) { issues.push({ level: "warning", id: id, msg: msg }); }

    if (!Array.isArray(batch)) {
      return { ok: false, fatal: "Batch is not an array.", total: 0, issues: [], errors: [], warnings: [] };
    }

    var total = batch.length;
    var ids = [];
    var idxDist = [0, 0, 0, 0];
    var tierDist = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    var topicDist = {};
    var promptSeen = {};
    var explLens = [];
    var consecutiveSame = 0;
    var prevCorrect = null;

    batch.forEach(function (q, i) {
      q = q || {};
      var id = q.id ? q.id : "[index " + i + "]";

      // (3) required fields present
      REQUIRED.forEach(function (f) {
        if (!(f in q) || q[f] === undefined || q[f] === null) err(id, "missing field: " + f);
      });

      // (15) no empty strings on text fields
      ["id", "tier", "topic", "prompt", "explain", "reward"].forEach(function (f) {
        if (typeof q[f] === "string" && q[f].trim() === "") err(id, "empty string: " + f);
      });

      if (q.id) ids.push(q.id);

      // (16) id prefix format e.g. networking-basics-001
      if (idPrefix && q.id) {
        var safe = String(idPrefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp("^" + safe + "-\\d{3,}$").test(q.id)) {
          warn(id, "id does not match expected format '" + idPrefix + "-NNN'");
        }
      }

      // (4) exactly 4 options  +  (9) duplicate option text  +  (15) empty option
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        err(id, "must have exactly 4 options (has " + (Array.isArray(q.options) ? q.options.length : "none") + ")");
      } else {
        q.options.forEach(function (o, oi) {
          if (String(o).trim() === "") err(id, "empty option at index " + oi);
        });
        var lc = q.options.map(function (o) { return String(o).toLowerCase().trim(); });
        var uniq = {};
        lc.forEach(function (o) { uniq[o] = 1; });
        if (Object.keys(uniq).length !== lc.length) err(id, "duplicate option text within question");
      }

      // (5) correct integer 0..3   +   (7) consecutive same index
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
        err(id, "correct must be an integer 0-3 (got " + q.correct + ")");
      } else {
        idxDist[q.correct]++;
        if (prevCorrect !== null && q.correct === prevCorrect) {
          consecutiveSame++;
          warn(id, "same correct index (" + q.correct + ") as the previous question");
        }
        prevCorrect = q.correct;
      }

      // (10) topic matches
      if (expectedTopic && q.topic !== expectedTopic) err(id, "topic '" + q.topic + "' != expected '" + expectedTopic + "'");
      if (q.topic) topicDist[q.topic] = (topicDist[q.topic] || 0) + 1;

      // (11) tier valid
      if (VALID_TIERS.indexOf(q.tier) === -1) err(id, "invalid tier '" + q.tier + "'");
      else tierDist[q.tier]++;

      // (12) explanation length / quality
      if (typeof q.explain === "string") {
        explLens.push(q.explain.length);
        if (q.explain.trim().length < 10) warn(id, "explanation very short");
        if (q.explain.length > maxExplainChars) warn(id, "explanation long (" + q.explain.length + " chars > " + maxExplainChars + ")");
      }

      // (13) no certification names anywhere
      var blob = [q.prompt, q.explain].concat(q.options || []).join(" || ");
      if (CERT_RE.test(blob)) err(id, "certification name reference detected");

      // (8) duplicate / near-duplicate prompt
      if (q.prompt) {
        var n = normalizePrompt(q.prompt);
        if (promptSeen[n] !== undefined) err(id, "duplicate/near-duplicate prompt of " + promptSeen[n]);
        else promptSeen[n] = q.id || id;
      }

      // (17) option-quality advisory checks (warnings only, never block)
      checkOptionQuality(q, id, warn);
    });

    // (2) unique ids
    var uniqueIds = (function () { var s = {}; ids.forEach(function (x) { s[x] = 1; }); return Object.keys(s).length; })();
    var dupIds = ids.filter(function (v, i) { return ids.indexOf(v) !== i; });
    var dupIdSet = [];
    dupIds.forEach(function (d) { if (dupIdSet.indexOf(d) === -1) dupIdSet.push(d); });
    dupIdSet.forEach(function (d) { err(d, "duplicate id"); });

    // (6) balance  +  (14) obvious position pattern
    var counted = idxDist[0] + idxDist[1] + idxDist[2] + idxDist[3];
    if (counted > 0) {
      var expected = counted / 4;
      var tol = options.balanceTolerance != null ? options.balanceTolerance : Math.max(2, Math.ceil(expected * 0.4));
      idxDist.forEach(function (c, ix) {
        if (Math.abs(c - expected) > tol) warn(null, "index " + ix + " count " + c + " is far from balanced (~" + expected.toFixed(1) + " expected)");
      });
      idxDist.forEach(function (c, ix) {
        if (counted >= 8 && c / counted > 0.6) err(null, "answer-position pattern: index " + ix + " holds " + Math.round(c / counted * 100) + "% of answers");
      });
    }

    var errors = issues.filter(function (x) { return x.level === "error"; });
    var warnings = issues.filter(function (x) { return x.level === "warning"; });

    return {
      ok: errors.length === 0,
      total: total,
      uniqueIds: uniqueIds,
      duplicateIds: dupIdSet,
      correctDistribution: { A0: idxDist[0], B1: idxDist[1], C2: idxDist[2], D3: idxDist[3] },
      tierDistribution: tierDist,
      topicDistribution: topicDist,
      consecutiveSameCount: consecutiveSame,
      explain: explLens.length
        ? { avg: Math.round(explLens.reduce(function (a, b) { return a + b; }, 0) / explLens.length), max: Math.max.apply(null, explLens) }
        : { avg: 0, max: 0 },
      duplicatePromptFindings: errors.filter(function (e) { return /duplicate.*prompt/.test(e.msg); }),
      optionDuplicateFindings: errors.filter(function (e) { return /duplicate option/.test(e.msg); }),
      certificationFindings: errors.filter(function (e) { return /certification/.test(e.msg); }),
      optionQualityFindings: warnings.filter(function (w) { return /OPTION QUALITY/.test(w.msg); }),
      errors: errors,
      warnings: warnings,
      issues: issues
    };
  }

  // Pretty one-line-per-section console summary (used by the CLI and optional in browser)
  validateQuestions.formatSummary = function (r) {
    if (r.fatal) return "FATAL: " + r.fatal;
    var lines = [];
    lines.push("Total:            " + r.total);
    lines.push("Unique IDs:       " + r.uniqueIds + (r.duplicateIds.length ? "  (DUPLICATES: " + r.duplicateIds.join(", ") + ")" : ""));
    lines.push("Correct dist:     A=" + r.correctDistribution.A0 + " B=" + r.correctDistribution.B1 + " C=" + r.correctDistribution.C2 + " D=" + r.correctDistribution.D3);
    lines.push("Tier dist:        " + JSON.stringify(r.tierDistribution));
    lines.push("Topic dist:       " + JSON.stringify(r.topicDistribution));
    lines.push("Explanations:     avg " + r.explain.avg + " / max " + r.explain.max + " chars");
    lines.push("Dup prompts:      " + r.duplicatePromptFindings.length);
    lines.push("Dup options:      " + r.optionDuplicateFindings.length);
    lines.push("Cert names:       " + r.certificationFindings.length);
    lines.push("Consecutive same: " + r.consecutiveSameCount);
    lines.push("Option quality:   " + (r.optionQualityFindings ? r.optionQualityFindings.length : 0) + " advisory");
    lines.push("Errors:           " + r.errors.length);
    lines.push("Warnings:         " + r.warnings.length);
    lines.push("STATUS:           " + (r.ok ? "PASS" : "FAIL"));
    return lines.join("\n");
  };

  return validateQuestions;
});

// ── Node CLI ───────────────────────────────────────────────────────────────────
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  var validate = module.exports;
  var fs = require("fs");
  var path = require("path");
  var args = process.argv.slice(2);
  var file = args.filter(function (a) { return a.indexOf("--") !== 0; })[0];
  function opt(k, d) {
    var a = args.filter(function (x) { return x.indexOf("--" + k + "=") === 0; })[0];
    return a ? a.split("=").slice(1).join("=") : d;
  }
  if (!file) {
    console.error("Usage: node tools/validate-questions.js <batch-file> [--topic=\"...\"] [--prefix=\"...\"]");
    process.exit(2);
  }
  var abs = path.resolve(file);
  var batch;
  try {
    batch = require(abs); // works if the file does module.exports = [...]
  } catch (e) { batch = undefined; }
  if (!Array.isArray(batch)) {
    var code = fs.readFileSync(abs, "utf8");
    var m = code.match(/=\s*(\[[\s\S]*?\])\s*;?\s*$/);
    if (m) { try { batch = eval("(" + m[1] + ")"); } catch (e2) {} }
  }
  if (!Array.isArray(batch)) {
    console.error("Could not load an array from " + file + ". Export it via module.exports = [...] or `const NAME = [...]`.");
    process.exit(2);
  }
  var res = validate(batch, { topic: opt("topic", null), idPrefix: opt("prefix", null) });
  console.log(validate.formatSummary(res));
  if (!res.ok) {
    console.log("\nERRORS:");
    res.errors.forEach(function (e) { console.log("  - " + (e.id ? e.id + ": " : "") + e.msg); });
  }
  if (res.warnings.length) {
    console.log("\nWARNINGS:");
    res.warnings.forEach(function (w) { console.log("  - " + (w.id ? w.id + ": " : "") + w.msg); });
  }
  process.exit(res.ok ? 0 : 1);
}
