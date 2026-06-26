// Main app: screen flow, scoring, results, and submission.
(function () {
  const { QUESTIONS } = window.QUIZ;
  const EMOJIS = window.EMOJIS;

  const LIKERT = [
    { label: "Strongly disagree", v: -1 },
    { label: "Disagree", v: -0.5 },
    { label: "Neutral", v: 0 },
    { label: "Agree", v: 0.5 },
    { label: "Strongly agree", v: 1 },
  ];

  const state = {
    name: "",
    emoji: "",
    answers: new Array(QUESTIONS.length).fill(null),
    qIndex: 0,
    results: [],     // loaded from Supabase (results table)
    dist: null,      // loaded from Supabase (distributions table)
    takenEmojis: new Set(),
  };

  // ---------- Screen management ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Data loading ----------
  async function loadResults() {
    try {
      const data = await window.API.getResults();
      state.results = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Could not load results:", e);
      state.results = [];
    }
    state.takenEmojis = new Set(state.results.map((r) => r.emoji));
  }

  async function loadDistributions() {
    try {
      state.dist = await window.API.getDistributions();
    } catch (e) {
      console.warn("Could not load distributions:", e);
      state.dist = null;
    }
  }

  // ---------- Intro ----------
  document.getElementById("btn-start").onclick = () => show("screen-name");
  document.getElementById("btn-skip").onclick = async () => {
    await Promise.all([loadResults(), loadDistributions()]);
    resetBreakdown();
    renderResults(null);
    show("screen-results");
  };

  // ---------- Back buttons (generic) ----------
  document.querySelectorAll("[data-back]").forEach((b) => {
    b.onclick = () => {
      const cur = document.querySelector(".screen.active").id;
      if (cur === "screen-name") show("screen-intro");
      else if (cur === "screen-emoji") show("screen-name");
    };
  });

  // ---------- Name ----------
  const nameInput = document.getElementById("input-name");
  const nameError = document.getElementById("name-error");
  function submitName() {
    const v = nameInput.value.trim();
    if (v.length < 1) { nameError.textContent = "Please enter a name."; return; }
    state.name = v;
    nameError.textContent = "";
    buildEmojiGrid();
    show("screen-emoji");
  }
  document.getElementById("btn-name-next").onclick = submitName;
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitName(); });

  // ---------- Emoji ----------
  function buildEmojiGrid() {
    const grid = document.getElementById("emoji-grid");
    grid.innerHTML = "";
    EMOJIS.forEach((emo) => {
      const b = document.createElement("button");
      b.textContent = emo;
      const taken = state.takenEmojis.has(emo) && emo !== state.emoji;
      if (taken) {
        b.classList.add("taken");
        b.title = "Already taken by someone else";
      }
      if (emo === state.emoji) b.classList.add("selected");
      b.onclick = () => {
        if (taken) return;
        state.emoji = emo;
        grid.querySelectorAll("button").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        document.getElementById("emoji-error").textContent = "";
      };
      grid.appendChild(b);
    });
  }
  document.getElementById("btn-emoji-next").onclick = () => {
    if (!state.emoji) {
      document.getElementById("emoji-error").textContent = "Pick an emoji to continue.";
      return;
    }
    state.qIndex = 0;
    renderQuestion();
    show("screen-quiz");
  };

  // ---------- Quiz ----------
  const likertEl = document.getElementById("likert");
  function renderQuestion() {
    const q = QUESTIONS[state.qIndex];
    document.getElementById("q-counter").textContent =
      `Question ${state.qIndex + 1} of ${QUESTIONS.length}`;
    document.getElementById("q-text").textContent = q.text;
    document.getElementById("progress-bar").style.width =
      `${(state.qIndex / QUESTIONS.length) * 100}%`;

    likertEl.innerHTML = "";
    LIKERT.forEach((opt) => {
      const b = document.createElement("button");
      b.dataset.v = opt.v;
      b.innerHTML = `<span class="dot"></span>${opt.label}`;
      b.onclick = () => answer(opt.v);
      likertEl.appendChild(b);
    });

    document.getElementById("btn-quiz-back").style.visibility =
      state.qIndex === 0 ? "hidden" : "visible";
  }

  function answer(v) {
    state.answers[state.qIndex] = v;
    if (state.qIndex < QUESTIONS.length - 1) {
      state.qIndex++;
      renderQuestion();
    } else {
      document.getElementById("progress-bar").style.width = "100%";
      finishQuiz();
    }
  }

  document.getElementById("btn-quiz-back").onclick = () => {
    if (state.qIndex > 0) { state.qIndex--; renderQuestion(); }
  };

  // ---------- Scoring ----------
  function computeScore() {
    let sx = 0, sy = 0, wx = 0, wy = 0;
    QUESTIONS.forEach((q, i) => {
      const m = state.answers[i];
      if (m === null) return;
      sx += m * (q.x || 0);
      sy += m * (q.y || 0);
      wx += Math.abs(q.x || 0);
      wy += Math.abs(q.y || 0);
    });
    const x = wx ? sx / wx : 0; // [-1, 1]
    const y = wy ? sy / wy : 0;
    return { x: round4(x), y: round4(y) };
  }
  function round4(n) { return Math.round(n * 10000) / 10000; }

  // ---------- Finish + results ----------
  async function finishQuiz() {
    const { x, y } = computeScore();
    state.score = { x, y };
    await Promise.all([loadResults(), loadDistributions()]);
    resetBreakdown();

    // Show "me" immediately, even before the submission round-trips.
    const meKey = `${state.name}|${state.emoji}`;
    const withMe = state.results.filter((r) => `${r.name}|${r.emoji}` !== meKey);
    withMe.push({ name: state.name, emoji: state.emoji, x, y });
    state.displayResults = withMe;

    openSubmitModal();
  }

  function renderResults(meKey) {
    const list = state.displayResults || state.results;
    window.CHART.render(list, meKey);
    document.getElementById("results-title").textContent =
      `The Lab (${list.length})`;
    document.getElementById("chart-hint").textContent =
      "Hover a marker to see who it is.";
  }

  // ---------- Submission modal ----------
  function openSubmitModal() {
    document.getElementById("modal-emoji").textContent = state.emoji;
    document.getElementById("submit-note").textContent = "";
    document.getElementById("submit-modal").classList.add("active");
  }
  function closeSubmitModal() {
    document.getElementById("submit-modal").classList.remove("active");
  }

  const submitBtn = document.getElementById("btn-submit-go");
  submitBtn.onclick = async () => {
    const { x, y } = state.score;
    const note = document.getElementById("submit-note");
    submitBtn.disabled = true;
    note.textContent = "Submitting…";
    try {
      await window.API.submit({
        name: state.name, emoji: state.emoji, x, y, answers: state.answers,
      });
      // Re-pull from the server so the chart + breakdown reflect everyone.
      await Promise.all([loadResults(), loadDistributions()]);
      const meKey = `${state.name}|${state.emoji}`;
      const withMe = state.results.filter((r) => `${r.name}|${r.emoji}` !== meKey);
      withMe.push({ name: state.name, emoji: state.emoji, x, y });
      state.displayResults = withMe;
      breakdownRendered = false; // re-render breakdown with fresh data on next open
      closeSubmitModal();
      renderResults(meKey);
      show("screen-results");
    } catch (e) {
      console.error(e);
      note.textContent = window.API.configured
        ? "Couldn't submit right now. You can still view the chart."
        : "Sharing isn't set up yet (no Supabase config). Showing your result locally.";
    } finally {
      submitBtn.disabled = false;
    }
  };
  document.getElementById("btn-submit-skip").onclick = () => {
    closeSubmitModal();
    renderResults(`${state.name}|${state.emoji}`);
    show("screen-results");
  };

  // ---------- Per-question breakdown ----------
  const breakdownEl = document.getElementById("breakdown");
  const breakdownBtn = document.getElementById("btn-breakdown");
  let breakdownRendered = false;

  function resetBreakdown() {
    breakdownEl.hidden = true;
    breakdownBtn.setAttribute("aria-expanded", "false");
    breakdownBtn.textContent = "Show per-question breakdown ▾";
    breakdownRendered = false;
  }

  breakdownBtn.onclick = () => {
    const open = breakdownEl.hidden;
    if (open) {
      if (!breakdownRendered) { window.BARS.render(state.dist); breakdownRendered = true; }
      breakdownEl.hidden = false;
      breakdownBtn.setAttribute("aria-expanded", "true");
      breakdownBtn.textContent = "Hide per-question breakdown ▴";
    } else {
      breakdownEl.hidden = true;
      breakdownBtn.setAttribute("aria-expanded", "false");
      breakdownBtn.textContent = "Show per-question breakdown ▾";
    }
  };

  // ---------- Restart ----------
  document.getElementById("btn-restart").onclick = () => {
    state.name = "";
    state.emoji = "";
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.qIndex = 0;
    state.displayResults = null;
    nameInput.value = "";
    show("screen-intro");
  };

  // Preload results so emoji "taken" state and skip-to-results are ready.
  loadResults();
})();
