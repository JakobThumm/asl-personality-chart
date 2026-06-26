// Diverging stacked bar chart of the Likert distribution per question.
// `dist` is an array aligned to QUESTIONS; each entry is 5 counts:
//   [strongly disagree, disagree, neutral, agree, strongly agree]
// Bars diverge from a center line (0): disagree categories extend left,
// agree categories extend right, neutral straddles the center.

(function () {
  const CATS = [
    { key: "sd", label: "Strongly disagree", color: "#c0461f" },
    { key: "d",  label: "Disagree",          color: "#f0a868" },
    { key: "n",  label: "Neutral",           color: "#b8bcc8" },
    { key: "a",  label: "Agree",             color: "#8fb8e0" },
    { key: "sa", label: "Strongly agree",    color: "#2e5e9e" },
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function renderLegend(el) {
    el.innerHTML = CATS.map(
      (c) => `<span class="bl-item"><span class="bl-swatch" style="background:${c.color}"></span>${c.label}</span>`
    ).join("");
  }

  // Returns {left, right} extents around the center for a 5-count row.
  function extents(c) {
    const n = c[2] || 0;
    return {
      left: (c[0] || 0) + (c[1] || 0) + n / 2,
      right: n / 2 + (c[3] || 0) + (c[4] || 0),
    };
  }

  function render(dist) {
    const { QUESTIONS } = window.QUIZ;
    const barsEl = document.getElementById("bars");
    renderLegend(document.getElementById("bars-legend"));

    const rows = QUESTIONS.map((q, i) => {
      const c = (dist && dist[i]) || [0, 0, 0, 0, 0];
      return { text: q.text, counts: c, total: c.reduce((a, b) => a + (b || 0), 0) };
    });

    const totalAnswers = rows.reduce((m, r) => Math.max(m, r.total), 0);
    if (totalAnswers === 0) {
      barsEl.innerHTML = `<p class="bars-empty">No answers recorded yet. Once people take the test, their answers show up here.</p>`;
      return;
    }

    // Symmetric domain [-M, +M] so the zero line sits at 50%.
    const M = Math.max(
      1,
      ...rows.map((r) => { const e = extents(r.counts); return Math.max(e.left, e.right); })
    );
    const span = 2 * M;
    const pct = (v) => (v / span) * 100;

    barsEl.innerHTML = rows
      .map((r) => {
        const e = extents(r.counts);
        const spacer = pct(M - e.left); // distance from domain-left to start of first segment
        const segs = CATS.map((cat, ci) => {
          const w = pct(r.counts[ci] || 0);
          if (w <= 0) return "";
          const title = `${cat.label}: ${r.counts[ci]}`;
          return `<div class="seg" style="width:${w}%;background:${cat.color}" title="${title}"></div>`;
        }).join("");
        return `
          <div class="bar-row">
            <div class="bar-q">${escapeHtml(r.text)}</div>
            <div class="bar-track">
              <div class="bar-zero"></div>
              <div class="bar-fill">
                <div class="seg-spacer" style="width:${spacer}%"></div>
                ${segs}
              </div>
            </div>
          </div>`;
      })
      .join("");

    // Axis: a few symmetric tick labels under the bars.
    const ticks = [-M, -M / 2, 0, M / 2, M].map((t) => Math.round(t));
    document.getElementById("bars").insertAdjacentHTML(
      "beforeend",
      `<div class="bar-axis">
        <div class="bar-q"></div>
        <div class="bar-track axis-ticks">
          ${ticks.map((t, i) => `<span class="tick" style="left:${(i / (ticks.length - 1)) * 100}%">${Math.abs(t)}</span>`).join("")}
          <div class="axis-caption">Number of answers</div>
        </div>
      </div>`
    );
  }

  window.BARS = { render };
})();
