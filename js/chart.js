// Renders the scatter chart of all participants + the legend.
// Coordinates in results are in [-1, 1]. We map them onto the square chart,
// leaving an inset margin so markers near the edge stay readable.

(function () {
  const INSET = 7; // percent margin on each side

  function toPct(v) {
    // v in [-1,1] -> [INSET, 100-INSET] percent
    const clamped = Math.max(-1, Math.min(1, v));
    return INSET + ((clamped + 1) / 2) * (100 - 2 * INSET);
  }

  // Deterministic tiny jitter from a string, so overlapping points fan out
  // but stay stable across reloads.
  function jitter(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const a = ((h % 1000) / 1000 - 0.5) * 4.5;       // up to +/-2.25%
    const b = (((h >> 10) % 1000) / 1000 - 0.5) * 4.5;
    return [a, b];
  }

  function buildAxes(chartEl) {
    const { AXES } = window.QUIZ;
    chartEl.innerHTML = `
      <div class="quadrant-tint q-tl"></div>
      <div class="quadrant-tint q-tr"></div>
      <div class="quadrant-tint q-bl"></div>
      <div class="quadrant-tint q-br"></div>
      <div class="axis axis-x"></div>
      <div class="axis axis-y"></div>
      <div class="axis-label lbl-top">${AXES.y.positive}</div>
      <div class="axis-label lbl-bottom">${AXES.y.negative}</div>
      <div class="axis-label lbl-left">${AXES.x.negative}</div>
      <div class="axis-label lbl-right">${AXES.x.positive}</div>
    `;
  }

  // results: [{name, emoji, x, y}], meKey: optional "name|emoji" to highlight
  function render(results, meKey) {
    const chartEl = document.getElementById("chart");
    const legendEl = document.getElementById("legend");
    buildAxes(chartEl);

    results.forEach((r) => {
      const key = `${r.name}|${r.emoji}`;
      const [jx, jy] = jitter(key);
      const left = toPct(r.x) + jx;
      // y positive = top, so invert
      const top = 100 - toPct(r.y) + jy;

      const m = document.createElement("div");
      m.className = "marker" + (meKey && key === meKey ? " me" : "");
      m.style.left = left + "%";
      m.style.top = top + "%";
      m.innerHTML = `${escapeHtml(r.emoji)}<span class="tip">${escapeHtml(r.name)}</span>`;
      chartEl.appendChild(m);
    });

    // Legend
    legendEl.innerHTML = "";
    if (results.length === 0) {
      legendEl.innerHTML = `<p class="legend-empty">No one has taken the test yet. Be the first!</p>`;
      return;
    }
    results.forEach((r) => {
      const key = `${r.name}|${r.emoji}`;
      const item = document.createElement("div");
      item.className = "legend-item" + (meKey && key === meKey ? " me" : "");
      item.innerHTML = `<span class="e">${escapeHtml(r.emoji)}</span><span class="n">${escapeHtml(r.name)}</span>`;
      legendEl.appendChild(item);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  window.CHART = { render };
})();
