# ASL Personality Chart

A fun "political-compass"-style test for the lab. Two axes:

- **Yapping ↔ Locked in** (horizontal)
- **Chaotic lab ↔ Clean lab** (vertical)

Participants enter a name, pick an emoji, answer Likert questions, and get placed
on a shared chart. The legend on the right maps emojis to names. **Individual
answers are never stored or transmitted** — only the final name, emoji, and
position.

## How it works

- Pure static site (HTML/CSS/vanilla JS), no build step. Hosted on GitHub Pages.
- The quiz runs entirely in the browser and computes an `(x, y)` position in `[-1, 1]`.
- On submit, the site opens a **pre-filled GitHub issue** containing only
  `{name, emoji, x, y}`. The [`record-result`](.github/workflows/record-result.yml)
  Action parses it, appends to [`data/results.json`](data/results.json), commits,
  and closes the issue. No API keys live in the page.
- The chart reads `data/results.json` on load.

## Setup (one time)

1. **Push this repo** to `github.com/JakobThumm/asl-personality-chart`
   (already the `origin` remote). If you fork/rename, update `REPO` in
   [`js/config.js`](js/config.js).
2. **Enable GitHub Pages**: repo *Settings → Pages → Build and deployment →
   Source: "Deploy from a branch" → Branch: `main` / `/ (root)`*.
   Site will be at `https://jakobthumm.github.io/asl-personality-chart/`.
3. **Allow the Action to commit**: *Settings → Actions → General → Workflow
   permissions → "Read and write permissions"*. (The workflow also declares the
   needed permissions explicitly.)
4. *(Optional)* Create a label named `result` (*Issues → Labels → New label*).
   Not required — the workflow also matches issues whose title starts with
   `result:`.

That's it. Share the Pages URL with the lab.

## Editing the questions

Edit [`js/questions.js`](js/questions.js). Each question pushes the participant
along the axes when they **agree**:

```js
{ text: "I always tidy my bench.", x: 0, y: 3 }  // agreeing -> clean lab
```

- `x > 0` → toward **Locked in**, `x < 0` → toward **Yapping**.
- `y > 0` → toward **Clean lab**, `y < 0` → toward **Chaotic lab**.
- Use `0` if a question does not affect that axis. Bigger magnitudes (e.g. `±3`,
  `±4`) spread the chart out more — more fun.

The Likert answer is a multiplier (`strongly disagree = -1 … strongly agree = +1`).
Final scores are normalized per axis to `[-1, 1]`, so adding questions never
pushes anyone off the chart.

Axis labels live in the `AXES` object at the top of the same file.
Available emojis are in [`js/emojis.js`](js/emojis.js).

## Local preview

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Resetting / removing an entry

Edit [`data/results.json`](data/results.json) directly and commit. Each person
is keyed by name (case-insensitive); retaking the test overwrites their spot.
