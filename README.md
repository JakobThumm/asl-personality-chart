# ASL Personality Chart

A fun "political-compass"-style test for the lab. Two axes:

- **Yapping ↔ Locked in** (horizontal)
- **Chaotic lab ↔ Clean lab** (vertical)

Participants enter a name, pick an emoji, answer Likert questions, and get placed
on a shared chart. The legend on the right maps emojis to names. At the bottom of
the results page, a **per-question breakdown** shows a diverging stacked bar chart
of how the lab answered.

## How it works

- Pure static site (HTML/CSS/vanilla JS), no build step. Hosted on GitHub Pages.
- The quiz runs entirely in the browser and computes an `(x, y)` position in `[-1, 1]`.
- On submit, the browser calls a Supabase RPC (`submit_result`). No login needed,
  no new tab, and the chart updates immediately.
- The chart reads the `results` table; the breakdown reads the `distributions` table.

### Privacy model

Individual answers are **never stored**. The `submit_result()` SQL function folds
your answers into anonymous per-question counts and discards them:

- `results` table holds only `{name, emoji, x, y}`.
- `distributions` table holds only per-question counts
  (`[strongly disagree, disagree, neutral, agree, strongly agree]`). Each
  question's total equals the number of participants (counted once, on first
  submission; retakes move the dot but do not change the distribution).
- The public `anon` key in [`js/config.js`](js/config.js) is meant to be public.
  Row Level Security blocks direct table writes, and there is no answer data to
  read, so the key cannot expose anything beyond the chart itself.

## Setup (one time)

### 1. Create the Supabase backend (free)

1. Create a project at <https://supabase.com> (free tier is plenty).
2. Open *SQL Editor → New query*, paste all of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   tables, the security policies, and the `submit_result` function.
3. Open *Project Settings → API* and copy the **Project URL** and the **anon
   public** key into [`js/config.js`](js/config.js):

   ```js
   window.CONFIG = {
     SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
     SUPABASE_ANON_KEY: "eyJ...your-anon-key...",
   };
   ```

Until both are filled in, the site runs in view-only mode (empty chart, submit
shows a friendly "sharing isn't set up yet" message).

### 2. Host on GitHub Pages

1. **Push this repo** to `github.com/JakobThumm/asl-personality-chart`
   (already the `origin` remote).
2. **Enable Pages**: *Settings → Pages → Build and deployment → Source: "Deploy
   from a branch" → Branch: `main` / `/ (root)`*.
   Site will be at `https://jakobthumm.github.io/asl-personality-chart/`.

That's it. Share the Pages URL with the lab.

> **Note:** `config.js` ships your anon key in a public repo. That is by design —
> Supabase anon keys are public client keys, and the schema's Row Level Security is
> what protects the data. Do **not** put the `service_role` key anywhere in this repo.

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

With Supabase configured, local submissions write to the same shared backend.

## Resetting / removing data

Use the Supabase *Table Editor* (or SQL Editor):

- Remove a person: delete their row from `results`.
- Reset everything: `truncate results; truncate distributions;`
- **If you change the questions**, also `truncate distributions;` so the counts
  realign with the new question list (the distribution is indexed by question
  position).
