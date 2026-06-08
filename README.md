# Ascent — Codeforces Practice Planner

**Ascent** analyzes any Codeforces handle and builds a personalized, day-by-day
practice plan to climb from your current rating toward a target you choose — with
a difficulty ramp that never jumps too far, and problem selection weighted toward
the topics you're weakest at.

It's a fully client-side React app (no backend, no API keys, no sign-in). Drop in
a handle, set a target rating and a number of days, and get:

- A **deep, data-driven profile analysis** — rating distribution, per-topic
  mastery, accuracy, an error profile, and an estimate of your *true* working
  level (not just your contest rating).
- A **day-by-day plan** of unsolved problems that ramps gradually from your level
  to your target, mixing consolidation / at-level / stretch problems each day.
- A **full list** view with progress checkboxes (saved locally) and CSV export.

---

## How it works

### 1. Profile analysis (`src/lib/analysis.js`)

From your full submission history (`user.status`) plus `user.info` and
`user.rating`, Ascent computes:

- **Solved / attempted sets** and submission-level + problem-level accuracy.
- **Rating distribution** of everything you've solved.
- **Working-level estimate** — a blend of your contest rating and the 85th
  percentile of the difficulties you actually clear. This is the honest answer to
  "what can you reliably solve right now?" and it's where the ramp starts.
- **Per-topic mastery** — for every tag, a skill score derived from how many you've
  solved and the hardest you've cleared, compared against how *important* that tag
  is at your level (its frequency in the problem set around your rating).
- **Strengths vs. focus areas** — important-but-underdeveloped tags surface as the
  things to train.
- **Error profile** — the mix of Wrong Answer / TLE / Runtime errors becomes
  concrete advice (correctness vs. complexity vs. implementation hygiene).

### 2. Recommendation engine (`src/lib/recommender.js`)

Given `start`, `target`, `days`, `problems/day`, and a ramp shape:

- The **day's center difficulty** climbs from `start` toward `target` along a
  tunable curve (gentle / moderate / steep), so the jump between days stays small.
- Each day mixes a **consolidation** problem (just below the day's level), one or
  more **core** problems (at level), and a **stretch** problem (a step above).
- **Topic selection is weighted** toward weak-but-important tags, while keeping
  variety so no single day is monotonous.
- Only problems you **haven't solved** are recommended, and **popular / canonical**
  problems (high solved count) are preferred.
- The plan is **deterministic** for a given handle + settings (seeded RNG), so your
  progress checkboxes stay meaningful across reloads.

> These are heuristics, not an oracle — they encode common competitive-programming
> wisdom (practice slightly above your level, train weaknesses, ramp gradually).

---

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/)
- Zero UI dependencies — custom CSS design system and hand-built SVG charts
- Public [Codeforces API](https://codeforces.com/apiHelp), called directly from the
  browser (CORS-enabled), with a Netlify serverless proxy as an automatic fallback

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a production bundle:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the build locally
```

---

## Deploy

### Push to GitHub

```bash
git init                       # already done if you cloned this folder
git add -A
git commit -m "Ascent: Codeforces practice planner"
git branch -M main
git remote add origin https://github.com/<your-username>/cf-ascent.git
git push -u origin main
```

## Project structure

```
cf-ascent/
├── index.html
├── netlify.toml                # build + SPA routing + functions config
├── netlify/functions/cf.js     # CORS-fallback proxy for the Codeforces API
├── src/
│   ├── App.jsx                 # state + page orchestration
│   ├── api/codeforces.js       # API client (direct → proxy fallback)
│   ├── lib/
│   │   ├── analysis.js         # profile analysis engine
│   │   ├── recommender.js      # day-by-day plan generator
│   │   ├── constants.js        # rating tiers, tag labels, helpers, seeded RNG
│   │   └── storage.js          # localStorage (progress + last handle)
│   └── components/             # Nav, HandleForm, ProfileCard, Charts, Analysis,
│                                 PlanControls, StudyPlan, FullList, …
└── README.md
```

---

## Notes & limitations

- Topic "importance" and "skill" are heuristic proxies; treat the analysis as a
  strong guide, not an exact science.
- Very high target ratings have fewer available problems — the planner widens the
  difficulty window and warns you if a day couldn't be fully filled.
- Not affiliated with Codeforces. Reads only public data.
