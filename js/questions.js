/*
 * Quiz configuration: axes + questions.
 *
 * HOW SCORING WORKS
 * -----------------
 * Each question pushes the participant along the two axes when they AGREE with it.
 *   - `x`: effect on the horizontal axis. Positive = toward the POSITIVE x label, negative = toward the NEGATIVE x label.
 *   - `y`: effect on the vertical axis. Positive = toward the POSITIVE y label, negative = toward the NEGATIVE y label.
 *
 * The Likert answer becomes a multiplier:
 *   Strongly disagree = -1, Disagree = -0.5, Neutral = 0, Agree = +0.5, Strongly agree = +1.
 * Contribution of a question = multiplier * x (and * y). We sum over all questions and
 * normalize by the total absolute weight per axis, so the final placement lands in [-1, 1].
 *
 * More extreme per-question scores (e.g. 3 or 4) make the chart more spread out / more fun.
 */

const AXES = {
  // Horizontal axis
  x: {
    negative: "Yapping",   // shown on the LEFT
    positive: "Locked in", // shown on the RIGHT
  },
  // Vertical axis
  y: {
    negative: "Chaotic lab", // shown at the BOTTOM
    positive: "Clean lab",   // shown at the TOP
  },
};

/*
 * Replace these placeholder questions with the real ones.
 * `x` and `y` are how strongly AGREEING pushes each axis (use 0 if a question
 * does not affect that axis). Suggested range: -4 .. +4.
 */
const QUESTIONS = [
  {
    text: "If I'm playing 1 on 1 against Marco in Tennis, I would let him win.",
    x: -3, // chill & social over competitive focus -> yapping
    y: 0,
  },
  {
    text: "If someone offered to switch me from my desk to a random desk, I would do it.",
    x: -1,
    y: -3, // unattached, go-with-the-flow -> chaotic lab
  },
  {
    text: "Snacks are an integral part of the lab society.",
    x: -3, // communal chatter -> yapping
    y: -2, // crumbs everywhere -> chaotic lab
  },
  {
    text: "I clean elements of the kitchen less often than under my bed.",
    x: 0,
    y: -4, // pure chaos
  },
  {
    text: "My coffee pressure is always in the perfect range.",
    x: 2,  // precision & care -> locked in
    y: 3,  // dialed-in & tidy -> clean lab
  },
  {
    text: "I come in early / late to enjoy a few hours on my own in the lab.",
    x: 4, // deep solo focus time -> locked in
    y: 0,
  },
  {
    text: "The lab should get long-range walkie-talkies.",
    x: -4, // constant chatter -> yapping
    y: -1,
  },
  {
    text: "If my robot does not do as I want, I swear at it until it abides to its master.",
    x: -3, // loud venting -> yapping
    y: -1,
  },
  {
    text: "There are things on my desk that I don't even know what they are.",
    x: 0,
    y: -4, // pure chaos
  },
];

// Make available to other scripts (loaded via <script> tags, no modules).
window.QUIZ = { AXES, QUESTIONS };
