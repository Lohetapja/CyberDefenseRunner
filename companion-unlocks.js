// companion-unlocks.js — shared, dependency-free helper for tool-based
// Analyst Companion badges. Loaded by each analyst tool page.
//
// Writes earned badges into the SAME companion localStorage object the Main
// Quiz uses (key: cdl_companion_v1), under a dedicated `toolUnlocks` array so
// it never collides with quiz progress. Pure client-side: no backend, no API.
// It only records an achievement — it does not change any tool's behaviour.

(function () {
  "use strict";

  var KEY = "cdl_companion_v1";

  // Add a badge if not already earned; shows a small toast on first unlock.
  window.unlockCompanionBadge = function (id, label) {
    if (!id) return;
    var c = {};
    try { c = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { c = {}; }
    if (!Array.isArray(c.toolUnlocks)) c.toolUnlocks = [];

    var already = c.toolUnlocks.some(function (u) { return u && u.id === id; });
    if (already) return;                                 // avoid duplicates

    c.toolUnlocks.push({ id: id, label: label || id });
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { return; }
    showToast("Companion unlock earned: " + (label || id));
  };

  // Minimal self-contained toast (matches the dark SOC palette).
  function showToast(msg) {
    try {
      var t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText =
        "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);" +
        "background:#0d1420;color:#38d39f;border:1px solid #38d39f;border-radius:8px;" +
        "padding:10px 16px;font:12px Consolas,\"Courier New\",monospace;letter-spacing:.5px;" +
        "z-index:9999;box-shadow:0 4px 18px rgba(0,0,0,.55);opacity:0;transition:opacity .25s";
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.style.opacity = "1"; });
      setTimeout(function () {
        t.style.opacity = "0";
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
      }, 2200);
    } catch (e) { /* DOM not ready — silently skip the toast */ }
  }
})();
