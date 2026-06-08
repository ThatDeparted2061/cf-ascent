# Ascent — Codeforces + LeetCode Practice & Interview-Prep Planner

**Ascent** analyzes a competitive-programming or interview profile and builds a
personalized plan to close the gap to your goal. It has two modes, switchable
from the landing page:

- **Codeforces** — enter a handle, pick a target rating and a number of days, and
  get a deep profile analysis plus a day-by-day problem set that ramps difficulty
  gradually and front-loads your weak topics.
- **LeetCode** — enter a username and get a **big-tech interview-readiness score**,
  a section-by-section comparison against the patterns top companies actually
  test, weak-section detection, and a **full prep plan** covering every topic
  (curriculum order or weak-first) with a day-by-day schedule.

Fully client-side React (no sign-in, no keys). Progress is saved locally; plans
export to CSV.

---

## Codeforces mode

### Profile analysis (`src/lib/analysis.js`)
From your full submission history: solved/attempted sets, accuracy, rating
distribution, an estimate of your *true working level* (a blend of contest rating
and the 85th-percentile difficulty you clear), per-topic mastery, strengths vs.
focus areas, and an error profile (Wrong Answer / TLE / Runtime mix → concrete
advice).

### Recommendation engine (`src/lib/recommender.js`)
A day-by-day plan whose difficulty climbs gradually from `start` to `target`.
Each day mixes a consolidation problem (just below level), core problems (at
level) and a stretch problem (a step above). Selection is weighted toward
weak-but-important topics, recommends only **unsolved** problems, prefers
canonical (high-solve-count) problems, and is deterministic per handle+config.

---

## LeetCode mode

### The "big-tech blueprint" (`src/lib/interviewBlueprint.js`)
Rather than naming companies (their banks are private/premium), Ascent models the
**patterns** big-tech SDE interviews test — the well-established Blind-75 /
NeetCode-150 / Grind model. ~17 sections (Arrays & Hashing, Two Pointers, Sliding
Window, Stack, Binary Search, Linked List, Trees, Heap, Backtracking, Tries,
Graphs, DP, Greedy, Intervals, Math, Bit Manipulation, Design), each with an
**importance weight**, a **readiness target**, LeetCode tag mappings, and a curated,
ordered set of canonical problems (~143 total).

### Analysis (`src/lib/lcAnalysis.js`)
- Difficulty mix (Easy/Medium/Hard) vs. a healthy interview profile.
- **Per-section mastery** from your solved-by-tag counts, measured against the
  blueprint targets.
- A composite **readiness score (0–100)** blending section mastery, difficulty mix
  and contest rating, with a readiness band.
- **Weak vs. strong sections**, ranked by `importance × (1 − mastery)`.
- Contest rating history and standing.

### Prep plan (`src/lib/lcRecommender.js`)
A full-coverage plan over every section — in **curriculum order** (foundational →
advanced) or **weak-first** (attack your gaps), optionally Easy/Medium only — with
a **day-by-day schedule** at a pace you set. Recently-solved problems are
pre-checked; progress is saved locally; everything exports to CSV.

> All scores are heuristics encoding common interview wisdom — a strong guide,
> not an oracle.

---

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/)
- Zero UI dependencies — custom CSS design system and hand-built SVG charts
  (rating distribution, topic radar, rating history, readiness gauge, difficulty
  donut, section bars)
- **Codeforces API** — called directly from the browser (CORS-enabled), with a
  Netlify proxy fallback.
- **LeetCode GraphQL** — *not* CORS-enabled, so it's always proxied: a Netlify
  function in production and the Vite dev-server proxy locally.

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

The dev server proxies LeetCode requests for you, so LeetCode mode works locally.
Codeforces works directly. Build a production bundle:

```bash
npm run build    # outputs to dist/
npm run preview
```

---

## Deploy

### Push to GitHub
```bash
git add -A
git commit -m "Ascent"
git branch -M main
git remote add origin https://github.com/<your-username>/cf-ascent.git
git push -u origin main
```

---

## Project structure

```
cf-ascent/
├── netlify/functions/
│   ├── cf.js                   # Codeforces CORS-fallback proxy
│   └── leetcode.js             # LeetCode GraphQL proxy (required)
├── vite.config.js              # dev proxy for the LeetCode endpoint
├── src/
│   ├── App.jsx                 # platform switch + orchestration
│   ├── api/
│   │   ├── codeforces.js
│   │   └── leetcode.js
│   ├── lib/
│   │   ├── analysis.js         # Codeforces profile analysis
│   │   ├── recommender.js      # Codeforces day-by-day plan
│   │   ├── interviewBlueprint.js  # big-tech sections + curated problems
│   │   ├── lcAnalysis.js       # LeetCode readiness analysis
│   │   ├── lcRecommender.js    # LeetCode prep plan
│   │   ├── constants.js
│   │   └── storage.js
│   └── components/
│       ├── HandleForm.jsx      # landing + platform toggle
│       ├── CfDashboard.jsx     # Codeforces view
│       ├── Charts.jsx          # shared SVG charts
│       └── lc/                 # LeetCode dashboard, charts, analysis, prep plan
└── README.md
```

---

## Notes & limitations

- LeetCode has no official public API; Ascent uses its public GraphQL endpoint
  through a proxy. Section mastery is estimated from per-tag solved counts, so
  it's a strong approximation, not an exact per-problem audit.
- Codeforces section "importance" and "skill", and LeetCode readiness, are
  heuristic.
- Not affiliated with Codeforces or LeetCode. Reads only public data.
```
