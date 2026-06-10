// ────────────────────────────────────────────────────────────────────────────
//  THE CURRICULUM — what each Codeforces rating band actually demands.
//
//  This is the knowledge base of the recommendation engine. It encodes the
//  well-established competitive-programming training ladder (Codeforces
//  folklore, USACO-guide ordering, Errichto/um_nik practice doctrine) as data:
//
//    • BANDS — for every rating band: the topics that matter there, how much
//      they matter (weight 0..1), and the difficulty offset at which you're
//      expected to handle them (relative to the target rating).
//    • PREREQ_RANK — a partial order over topics so plans teach things in a
//      sane sequence (you meet BFS before shortest paths, DP before digit DP).
//    • Helpers to turn a target rating into a concrete requirement profile.
//
//  All offsets are in rating points relative to the *target* rating.
//  off = 0   → "you must be comfortable with this topic AT your target level"
//  off = -100→ "one notch below target is enough"
//  off = +100→ "this must be a weapon — above your own level"
// ────────────────────────────────────────────────────────────────────────────

import { clamp, round100, RATING_MIN, RATING_MAX } from './constants.js'

export const BANDS = [
  {
    key: 'b800',
    lo: 800,
    hi: 1199,
    name: 'Base Camp',
    tier: 'Newbie → Pupil',
    motto: 'Zero-bug simple code, written fast.',
    unlock: 'Reading a statement and producing a correct simulation without drama.',
    skills: [
      'Translate any statement into working code in one pass',
      'Loops, arrays, sorting as reflexes — no syntax friction',
      'Spot the single greedy observation A/B problems hide',
      'Respect edge cases: n = 1, duplicates, 64-bit overflow',
    ],
    topics: {
      implementation: { w: 1.0, off: 100 },
      math: { w: 0.85, off: 0 },
      greedy: { w: 0.8, off: 0 },
      'brute force': { w: 0.7, off: 0 },
      sortings: { w: 0.65, off: 0 },
      strings: { w: 0.5, off: -100 },
      'constructive algorithms': { w: 0.45, off: -100 },
    },
  },
  {
    key: 'b1200',
    lo: 1200,
    hi: 1399,
    name: 'The Approach',
    tier: 'Pupil → Specialist',
    motto: 'Your first real algorithms.',
    unlock: 'Problems stop being "just code it" — structure appears.',
    skills: [
      'Binary search, including "binary search on the answer"',
      'Two pointers and prefix sums without thinking',
      'BFS/DFS on graphs and grids',
      'Basic modular arithmetic, divisibility, GCD',
      'Sort-then-sweep greedy patterns',
    ],
    topics: {
      'binary search': { w: 0.9, off: 0 },
      'dfs and similar': { w: 0.8, off: 0 },
      'two pointers': { w: 0.75, off: 0 },
      greedy: { w: 0.85, off: 0 },
      math: { w: 0.8, off: 0 },
      'constructive algorithms': { w: 0.7, off: 0 },
      implementation: { w: 0.7, off: 100 },
      'data structures': { w: 0.65, off: -100 },
      graphs: { w: 0.65, off: -100 },
      dp: { w: 0.6, off: -100 },
      'number theory': { w: 0.6, off: -100 },
      sortings: { w: 0.6, off: 0 },
      strings: { w: 0.5, off: 0 },
      'brute force': { w: 0.5, off: 0 },
    },
  },
  {
    key: 'b1400',
    lo: 1400,
    hi: 1599,
    name: 'The Wall',
    tier: 'Specialist → Expert',
    motto: 'DP and graphs become weapons.',
    unlock: 'The infamous 1400 wall — most climbers stall here. DP is the way through.',
    skills: [
      'Classic DP: knapsack, LIS, grid paths, prefix DP',
      'Shortest paths: Dijkstra, 0-1 BFS, multi-source BFS',
      'DSU and tree traversals, rooting a tree',
      'Bitmask enumeration over subsets',
      'Combinatorics with factorials under a modulus',
    ],
    topics: {
      dp: { w: 1.0, off: 0 },
      graphs: { w: 0.9, off: 0 },
      'binary search': { w: 0.85, off: 100 },
      'data structures': { w: 0.8, off: 0 },
      greedy: { w: 0.8, off: 100 },
      trees: { w: 0.7, off: -100 },
      'number theory': { w: 0.7, off: 0 },
      'constructive algorithms': { w: 0.7, off: 0 },
      'two pointers': { w: 0.7, off: 100 },
      combinatorics: { w: 0.65, off: -100 },
      implementation: { w: 0.65, off: 100 },
      dsu: { w: 0.6, off: -100 },
      bitmasks: { w: 0.6, off: -100 },
      'shortest paths': { w: 0.6, off: -100 },
      math: { w: 0.75, off: 0 },
      'dfs and similar': { w: 0.7, off: 100 },
      strings: { w: 0.5, off: 0 },
    },
  },
  {
    key: 'b1600',
    lo: 1600,
    hi: 1899,
    name: 'High Camp',
    tier: 'Expert → Candidate Master',
    motto: 'Data structures, proofs, and depth.',
    unlock: 'You stop pattern-matching and start proving. Solutions get composed from parts.',
    skills: [
      'Segment trees and BITs (point update / range query)',
      'Harder DP: state design, transitions over structures',
      'LCA via binary lifting; tree DP',
      'String hashing, KMP / Z-function',
      'Sieve-based number theory, modular inverses',
      'Exchange-argument proofs for greedy',
    ],
    topics: {
      'data structures': { w: 1.0, off: 0 },
      dp: { w: 1.0, off: 0 },
      graphs: { w: 0.85, off: 0 },
      trees: { w: 0.85, off: 0 },
      'constructive algorithms': { w: 0.75, off: 0 },
      greedy: { w: 0.8, off: 0 },
      combinatorics: { w: 0.75, off: 0 },
      'number theory': { w: 0.7, off: 0 },
      'binary search': { w: 0.8, off: 100 },
      'shortest paths': { w: 0.65, off: 0 },
      bitmasks: { w: 0.6, off: 0 },
      strings: { w: 0.6, off: 0 },
      hashing: { w: 0.5, off: -100 },
      'divide and conquer': { w: 0.55, off: -100 },
      dsu: { w: 0.6, off: 0 },
      games: { w: 0.4, off: -100 },
      interactive: { w: 0.4, off: -100 },
      math: { w: 0.7, off: 0 },
      'dfs and similar': { w: 0.65, off: 100 },
    },
  },
  {
    key: 'b1900',
    lo: 1900,
    hi: 2099,
    name: 'The Ridge',
    tier: 'Candidate Master → Master',
    motto: 'Composition under pressure.',
    unlock: 'Single-technique problems vanish. Everything is two ideas glued together.',
    skills: [
      'Lazy-propagation segment trees, merge-sort tree ideas',
      'DP on trees, digits, and bitmask-over-subsets',
      'Small-to-large merging, offline query tricks',
      'Game theory: Grundy numbers, Nim-values',
      'Probability and expected value',
      'Heavier constructive arguments and invariants',
    ],
    topics: {
      dp: { w: 1.0, off: 0 },
      'data structures': { w: 1.0, off: 0 },
      trees: { w: 0.9, off: 0 },
      graphs: { w: 0.85, off: 0 },
      'constructive algorithms': { w: 0.85, off: 0 },
      combinatorics: { w: 0.8, off: 0 },
      'number theory': { w: 0.7, off: 0 },
      'divide and conquer': { w: 0.65, off: 0 },
      games: { w: 0.55, off: 0 },
      probabilities: { w: 0.55, off: -100 },
      'shortest paths': { w: 0.6, off: 0 },
      hashing: { w: 0.55, off: 0 },
      strings: { w: 0.65, off: 0 },
      bitmasks: { w: 0.65, off: 0 },
      greedy: { w: 0.8, off: 100 },
      'binary search': { w: 0.75, off: 100 },
      interactive: { w: 0.5, off: 0 },
      'dsu': { w: 0.6, off: 0 },
      'ternary search': { w: 0.4, off: -100 },
      'meet-in-the-middle': { w: 0.4, off: -100 },
      geometry: { w: 0.45, off: -100 },
      matrices: { w: 0.4, off: -100 },
    },
  },
  {
    key: 'b2100',
    lo: 2100,
    hi: 2399,
    name: 'The Death Zone',
    tier: 'Master → International Master',
    motto: 'Speed at depth.',
    unlock: 'Everyone here is good. Rating comes from speed, breadth, and nerve.',
    skills: [
      'Flows and bipartite matchings (when modeling demands it)',
      'Suffix arrays / automata for hard string problems',
      'FFT for convolution counting',
      'DP optimizations: divide & conquer, Knuth, convex hull trick',
      '2-SAT, SCC condensation, bridges and articulation points',
      'Matrix exponentiation, Burnside-lite counting',
    ],
    topics: {
      dp: { w: 1.0, off: 100 },
      'data structures': { w: 1.0, off: 0 },
      graphs: { w: 0.9, off: 0 },
      'constructive algorithms': { w: 0.9, off: 0 },
      combinatorics: { w: 0.85, off: 0 },
      trees: { w: 0.85, off: 0 },
      math: { w: 0.8, off: 0 },
      'number theory': { w: 0.75, off: 0 },
      strings: { w: 0.7, off: 0 },
      'string suffix structures': { w: 0.5, off: -100 },
      flows: { w: 0.5, off: -100 },
      'graph matchings': { w: 0.45, off: -100 },
      fft: { w: 0.4, off: -100 },
      'divide and conquer': { w: 0.7, off: 0 },
      probabilities: { w: 0.65, off: 0 },
      games: { w: 0.55, off: 0 },
      geometry: { w: 0.5, off: 0 },
      matrices: { w: 0.5, off: 0 },
      '2-sat': { w: 0.4, off: -100 },
      'meet-in-the-middle': { w: 0.45, off: 0 },
      bitmasks: { w: 0.65, off: 0 },
      hashing: { w: 0.55, off: 0 },
      interactive: { w: 0.5, off: 0 },
    },
  },
  {
    key: 'b2400',
    lo: 2400,
    hi: RATING_MAX,
    name: 'The Summit Push',
    tier: 'Grandmaster and beyond',
    motto: 'There is no curriculum here. Only volume, taste, and time.',
    unlock: 'Every topic, composed freely, under brutal time pressure.',
    skills: [
      'All of the above, faster than almost everyone alive',
      'Research-grade ad-hoc: invent the technique in-contest',
      'Full string/geometry/flow toolkits on call',
      'Polynomial tricks, advanced counting, structures over structures',
    ],
    topics: {
      dp: { w: 1.0, off: 0 },
      'constructive algorithms': { w: 1.0, off: 0 },
      'data structures': { w: 0.95, off: 0 },
      graphs: { w: 0.9, off: 0 },
      combinatorics: { w: 0.9, off: 0 },
      math: { w: 0.9, off: 0 },
      trees: { w: 0.85, off: 0 },
      strings: { w: 0.75, off: 0 },
      'number theory': { w: 0.75, off: 0 },
      flows: { w: 0.6, off: 0 },
      'string suffix structures': { w: 0.6, off: 0 },
      fft: { w: 0.55, off: 0 },
      probabilities: { w: 0.7, off: 0 },
      'divide and conquer': { w: 0.75, off: 0 },
      geometry: { w: 0.6, off: 0 },
      games: { w: 0.6, off: 0 },
      'graph matchings': { w: 0.55, off: 0 },
      matrices: { w: 0.55, off: 0 },
      'meet-in-the-middle': { w: 0.5, off: 0 },
      '2-sat': { w: 0.45, off: 0 },
      bitmasks: { w: 0.7, off: 0 },
      hashing: { w: 0.6, off: 0 },
    },
  },
]

// Lower rank = should be learned earlier. Used to order curricula so plans
// always teach prerequisites before the topics that build on them.
export const PREREQ_RANK = {
  implementation: 0,
  math: 0,
  'brute force': 0,
  greedy: 1,
  sortings: 1,
  strings: 1,
  'constructive algorithms': 2,
  'two pointers': 2,
  'binary search': 3,
  'dfs and similar': 3,
  'data structures': 3,
  'number theory': 4,
  graphs: 4,
  dp: 5,
  trees: 5,
  dsu: 5,
  bitmasks: 5,
  hashing: 6,
  combinatorics: 6,
  'shortest paths': 6,
  'expression parsing': 6,
  'divide and conquer': 7,
  'ternary search': 7,
  games: 7,
  probabilities: 7,
  interactive: 7,
  geometry: 8,
  matrices: 8,
  'chinese remainder theorem': 8,
  'meet-in-the-middle': 8,
  'string suffix structures': 8,
  '2-sat': 9,
  flows: 9,
  'graph matchings': 9,
  schedules: 9,
  fft: 10,
}

export const prereqRank = (tag) => (PREREQ_RANK[tag] != null ? PREREQ_RANK[tag] : 6)

export function bandFor(rating) {
  const r = clamp(rating ?? RATING_MIN, RATING_MIN, RATING_MAX)
  for (let i = BANDS.length - 1; i >= 0; i--) if (r >= BANDS[i].lo) return BANDS[i]
  return BANDS[0]
}

export function bandIndexFor(rating) {
  const b = bandFor(rating)
  return BANDS.findIndex((x) => x.key === b.key)
}

export function nextBand(rating) {
  const i = bandIndexFor(rating)
  return BANDS[Math.min(i + 1, BANDS.length - 1)]
}

// ── Requirement profile for a target rating ────────────────────────────────
// Returns [{ tag, weight, required }] — the topics that matter when chasing
// `target`, with the absolute rating you should handle each topic at.
export function requirementsFor(target) {
  const band = bandFor(target)
  const out = []
  for (const [tag, spec] of Object.entries(band.topics)) {
    const required = clamp(round100(target + spec.off), RATING_MIN, RATING_MAX)
    out.push({ tag, weight: spec.w, required, off: spec.off })
  }
  out.sort((a, b) => b.weight - a.weight || prereqRank(a.tag) - prereqRank(b.tag))
  return out
}

// Band boundaries crossed when climbing start → target (the milestones).
export function milestonesBetween(start, target) {
  const marks = []
  for (const b of BANDS) {
    if (b.lo > start && b.lo <= target) {
      marks.push({ rating: b.lo, name: b.name, tier: b.tier, motto: b.motto, key: b.key })
    }
  }
  return marks
}

// A short, human description of the whole journey.
export function journeyNarrative(start, target) {
  const from = bandFor(start)
  const to = bandFor(target)
  if (from.key === to.key) {
    return `This climb lives inside ${from.name} (${from.tier}). ${from.motto} Consolidation and pressure — no new world to enter, just this one to own.`
  }
  return `You're leaving ${from.name} and crossing into ${to.name} (${to.tier}). ${to.unlock}`
}
