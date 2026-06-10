# ▲ ASCENT — where the climb begins

**Ascent** reads a Codeforces or LeetCode profile, measures the competitor's *true*
level topic by topic, shows exactly what a target rating demands, and stages
**The Chase** — a living, day-by-day training expedition that re-plans itself as
you make (or miss) progress.

Two modes, switchable from the landing page:

- **Codeforces** — handle → deep analysis → The Summit Map → The Chase.
- **LeetCode** — username → big-tech readiness score → section gaps → The Offer
  Chase (Foundation / Advanced tracks, already-solved problems hidden).

Optional **Google sign-in (Firebase)** mirrors progress and your last session to
Firestore, so the expedition follows you across devices. Without sign-in,
everything still works locally in the browser.

---

## The engine (v2)

### The Reading — `src/lib/analysis.js`
From every submission ever made:

- **Per-topic ratings.** For each topic, a recency-weighted 80th-percentile of
  solved difficulty, Bayesian-shrunk toward a conservative prior when evidence
  is thin. Output is a *rating* per topic ("DP at ~1180"), not a vague score,
  with an evidence string ("8 solved (max 1300) · untouched 210d · 2.0 tries/solve").
- **Level estimate.** Blends contest rating (freshness-discounted), sustained
  practice ceiling, and 90-day form — with a confidence value and a trend
  (rising / flat / cooling).
- **Strengths & weaknesses** measured against the curriculum's requirement
  profile for the *next* band — each with the "why".
- **Habits**: 52-week heatmap, streaks, consistency, contest-vs-practice mix.
- **Error profile**: WA/TLE/RE shares → concrete advice, plus "unfinished
  business" (problems attempted repeatedly, never solved).

### The Curriculum — `src/lib/curriculum.js`
The training ladder encoded as data: for each rating band (800 → 2400+), the
topics that matter there, their weights, the depth offsets at which they must
be handled, the human-readable skills you must possess, and a prerequisite
order over topics (BFS before shortest paths, DP before digit DP…).

### The Summit Map — `readinessFor(analysis, target)`
For any target: a readiness %, plus a per-topic ledger — required level vs your
evidenced level, status met / close / missing — and the band milestones you'd
cross on the way.

### The Chase — `src/lib/recommender.js`
Given target + days + problems/day + ramp:

- **Feasibility** check first (folklore: ~16 deliberate problems per 100 pts):
  comfortable / realistic / ambitious / aggressive, with a suggested window.
- **Topic ladders.** Each gap topic gets its own difficulty ladder from *its*
  current evidence level up to what the target demands — not one global ramp.
  Topics are ordered by prerequisites, then weighted gap.
- **Day assembly.** A rotating focus topic climbs its ladder; a breadth slot
  keeps the toolkit wide; first slot warms up below the day's center, last slot
  stretches above it; **spaced-repetition reviews** resurface a finished topic
  days later.
- **Alternates.** Every problem carries swap candidates (⇄) — swaps are
  reversible.
- **Adaptation** — `adaptChase()`. On re-sync (or on restore after ≥2 days),
  Ascent re-reads your submissions, **auto-checks anything you solved on
  Codeforces**, measures your pace, and regenerates the remaining days one
  notch harder (ahead) or easier (behind). Past days are preserved; progress
  stays attached to the same plan signature.

Only unsolved problems are recommended; popular/canonical problems are
preferred; plans are deterministic per handle + config + generation.

---

## The design

A duotone, engraved-print world — deep warm charcoal + antique gold — built
around the bar-halftone "ridge" motif (the climb, literally drawn). All motion
is hand-rolled (IntersectionObserver + rAF + CSS): per-letter hero rise,
procedural ridge parallax, count-up numbers, draw-in charts, word-by-word
verdicts, marquee strips, rotating badges. Zero UI dependencies.
`prefers-reduced-motion` is respected throughout.

Fonts: Cinzel (display), Cormorant Garamond (editorial), IBM Plex Mono (data).

---

## Cloud sync (Firebase)

`src/lib/firebase.js` holds the web config (public by design — security lives
in Firestore rules). The SDK is **lazy-loaded** only when sign-in is used.

One-time setup in the [Firebase console](https://console.firebase.google.com):

1. **Authentication → Sign-in method** → enable **Google**.
2. **Authentication → Settings → Authorized domains** → add `localhost` and
   your deployed domain (e.g. `your-site.netlify.app`).
3. **Firestore Database** → create, then set **Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Data layout: `users/{uid}` → `{ session, progress: { [planSignature]: [ids] } }`.
Merging is union-based — progress checked on any device is never lost.

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

The dev server proxies LeetCode requests (its GraphQL API isn't CORS-enabled);
Codeforces is called directly with a Netlify-function fallback.

```bash
npm run build    # outputs to dist/
npm run preview
```

---

## Project structure

```
cf-ascent/
├── netlify/functions/         # cf.js (CORS fallback), leetcode.js (GraphQL proxy)
├── src/
│   ├── App.jsx                # orchestration: auth, sessions, re-sync, swaps
│   ├── api/                   # codeforces.js, leetcode.js
│   ├── lib/
│   │   ├── curriculum.js      # band requirements + prerequisite order
│   │   ├── analysis.js        # the Reading (per-topic ratings, level, habits)
│   │   ├── recommender.js     # the Chase (ladders, reviews, adaptation)
│   │   ├── interviewBlueprint.js  # LC sections + curated problems
│   │   ├── lcAnalysis.js / lcRecommender.js
│   │   ├── firebase.js        # lazy Google auth + Firestore sync
│   │   └── storage.js         # local-first persistence, cloud-mirrored
│   ├── fx/Fx.jsx              # Reveal, CountUp, RidgeLine, Marquee, rings…
│   └── components/            # landing, dashboards, charts, the Chase
└── README.md
```

---

## Notes & limitations

- All scores are heuristics encoding training folklore — a strong guide, not an
  oracle. CF tags are coarse; per-topic ratings inherit that coarseness.
- LeetCode's solved list comes from the public "recent accepted" endpoint
  (large limit) — extremely long histories may be truncated.
- Not affiliated with Codeforces or LeetCode. Reads only public data.
