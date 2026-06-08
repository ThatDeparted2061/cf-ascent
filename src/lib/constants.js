// Shared constants, math helpers, and Codeforces display helpers.

export const RATING_MIN = 800
export const RATING_MAX = 3500

export const RATING_BUCKETS = (() => {
  const out = []
  for (let r = RATING_MIN; r <= RATING_MAX; r += 100) out.push(r)
  return out
})()

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
export const clamp01 = (x) => clamp(x, 0, 1)
export const round100 = (x) => Math.round(x / 100) * 100
export const pkey = (p) => `${p.contestId}-${p.index}`

// Codeforces rank tiers by rating, with colors tuned for a dark background.
const TIERS = [
  { min: 0, name: 'Newbie', color: '#AEB6C4' },
  { min: 1200, name: 'Pupil', color: '#54D16A' },
  { min: 1400, name: 'Specialist', color: '#2DD4BF' },
  { min: 1600, name: 'Expert', color: '#5B8CFF' },
  { min: 1900, name: 'Candidate Master', color: '#C084FC' },
  { min: 2100, name: 'Master', color: '#FB9A3F' },
  { min: 2300, name: 'International Master', color: '#FB8B24' },
  { min: 2400, name: 'Grandmaster', color: '#FB5E5E' },
  { min: 2600, name: 'Intl. Grandmaster', color: '#F2384B' },
  { min: 3000, name: 'Legendary Grandmaster', color: '#E11D48' },
]

export function ratingTier(rating) {
  if (rating == null || Number.isNaN(rating)) return { name: 'Unrated', color: '#9AA6BF' }
  let tier = TIERS[0]
  for (const t of TIERS) if (rating >= t.min) tier = t
  return tier
}

export const ratingColor = (rating) => ratingTier(rating).color

// Friendlier labels for terse Codeforces tags.
const TAG_LABEL = {
  dp: 'Dynamic programming',
  dsu: 'DSU (union–find)',
  fft: 'FFT',
  '2-sat': '2-SAT',
  'dfs and similar': 'DFS & similar',
  'graph matchings': 'Graph matchings',
  'string suffix structures': 'Suffix structures',
  'meet-in-the-middle': 'Meet in the middle',
  'chinese remainder theorem': 'Chinese remainder thm',
  'ternary search': 'Ternary search',
  'two pointers': 'Two pointers',
  'divide and conquer': 'Divide & conquer',
  'constructive algorithms': 'Constructive',
  'binary search': 'Binary search',
  'number theory': 'Number theory',
  'shortest paths': 'Shortest paths',
  'data structures': 'Data structures',
  'brute force': 'Brute force',
  'disjoint set union': 'DSU (union–find)',
  'expression parsing': 'Expression parsing',
}

export function prettyTag(tag) {
  if (!tag) return ''
  if (TAG_LABEL[tag]) return TAG_LABEL[tag]
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

// Tags that aren't really "topics" to train — filtered out of focus analysis.
export const NON_TOPIC_TAGS = new Set(['*special problem', 'schedules'])

// ---- number / time formatting ----
export const fmtInt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
export const fmtPct = (x, digits = 0) => (x == null ? '—' : `${(x * 100).toFixed(digits)}%`)

export function daysAgo(unixSeconds) {
  if (!unixSeconds) return null
  return Math.floor((Date.now() / 1000 - unixSeconds) / 86400)
}

// ---- deterministic RNG (so a given handle+config yields a stable plan) ----
export function hashString(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
