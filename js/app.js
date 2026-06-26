// Main app: screen flow, scoring, results, and submission.
(function () {
  const { QUESTIONS } = window.QUIZ;
  const EMOJIS = window.EMOJIS;
  const CFG = window.CONFIG;

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
    results: [],     // loaded from data/results.json
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
      const res = await fetch(`${CFG.RESULTS_PATH}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.results = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Could not load results.json:", e);
      state.results = [];
    }
    state.takenEmojis = new Set(state.results.map((r) => r.emoji));
  }

  // ---------- Intro ----------
  document.getElementById("btn-start").onclick = () => show("screen-name");
  document.getElementById("btn-skip").onclick = async () => {
    await loadResults();
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
    await loadResults();

    // Show "me" immediately even before the result is committed to the repo.
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

  function buildIssueUrl() {
    const { x, y } = state.score;
    const payload = { name: state.name, emoji: state.emoji, x, y };
    const body =
      "Submitting my ASL Personality Chart result. " +
      "Click **Create** below and a bot will add me to the chart.\n\n" +
      "<!-- ASL-RESULT -->\n" +
      "```json\n" + JSON.stringify(payload) + "\n```\n";
    const title = `result: ${state.name} ${state.emoji}`;
    const base = `https://github.com/${CFG.REPO}/issues/new`;
    const params = new URLSearchParams({
      labels: CFG.RESULT_LABEL,
      title,
      body,
    });
    return `${base}?${params.toString()}`;
  }

  document.getElementById("btn-submit-github").onclick = () => {
    window.open(buildIssueUrl(), "_blank", "noopener");
    document.getElementById("submit-note").textContent =
      "Thanks! Click \"Create\" on the GitHub page. Your spot appears on the shared chart within a minute.";
    closeSubmitModal();
    renderResults(`${state.name}|${state.emoji}`);
    show("screen-results");
  };
  document.getElementById("btn-submit-skip").onclick = () => {
    closeSubmitModal();
    renderResults(`${state.name}|${state.emoji}`);
    show("screen-results");
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
