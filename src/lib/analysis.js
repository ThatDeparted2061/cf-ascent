// ────────────────────────────────────────────────────────────────────────────
//  PROFILE ANALYSIS ENGINE  v2
//
//  Turns raw Codeforces data (user.info, user.status, user.rating, problemset)
//  into a rich, evidence-backed model of a competitor:
//
//   • A per-topic RATING (not just a 0-1 score): a recency-weighted, Bayesian-
//     shrunk estimate of the difficulty each topic is mastered at, with
//     evidence strings explaining the verdict.
//   • A LEVEL ESTIMATE blending three signals — contest rating, sustained
//     practice ceiling, and the recent-form window — with a confidence value
//     and a trend direction.
//   • Strengths & weaknesses measured against the curriculum's requirement
//     profile, each with the "why".
//   • Readiness toward any target rating: % + per-topic gap ledger.
//   • Habits: weekly activity (52w heatmap), streaks, consistency, contest
//     vs practice mix, and an error profile with concrete advice.
//
//  Everything is derived from real submissions. Nothing is guessed.
// ────────────────────────────────────────────────────────────────────────────

import {
  pkey,
  clamp,
  clamp01,
  round100,
  RATING_BUCKETS,
  RATING_MIN,
  RATING_MAX,
  NON_TOPIC_TAGS,
  prettyTag,
} from './constants.js'
import { bandFor, requirementsFor, prereqRank } from './curriculum.js'

// Count, per tag, how many problems exist in [lo, hi] — a proxy for how
// "important" a topic is for someone training in that band.
export function computeTagImportance(problems, lo, hi) {
  const m = new Map()
  for (const p of problems) {
    if (p.rating == null || p.rating < lo || p.rating > hi) continue
    for (const t of p.tags) {
      if (NON_TOPIC_TAGS.has(t)) continue
      m.set(t, (m.get(t) || 0) + 1)
    }
  }
  return m
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

function percentile(sortedArr, p) {
  if (!sortedArr.length) return null
  const idx = clamp(Math.floor(p * sortedArr.length), 0, sortedArr.length - 1)
  return sortedArr[idx]
}

// Weighted percentile over [{ v, w }] (sorted by v ascending).
function weightedPercentile(items, p) {
  if (!items.length) return null
  const total = items.reduce((a, x) => a + x.w, 0)
  if (total <= 0) return items[items.length - 1].v
  let acc = 0
  for (const x of items) {
    acc += x.w
    if (acc >= p * total) return x.v
  }
  return items[items.length - 1].v
}

// Recency weight with a given half-life in days.
const recencyWeight = (ageDays, halfLifeDays) => Math.pow(0.5, Math.max(0, ageDays) / halfLifeDays)

// ────────────────────────────────────────────────────────────────────────────
export function analyzeProfile({ info, submissions, ratingHistory, problems }) {
  const nowSec = Date.now() / 1000

  const solved = new Map() // key -> { rating, tags, when, inContest, attempts }
  const attemptCount = new Map()
  const triedKeys = new Set()
  const verdictCounts = {}
  const attemptsToSolve = []
  const failedOpenByTag = new Map() // tag -> count of problems tried ≥2 times, never AC
  const failedOpenProblems = []

  let totalSubmissions = 0
  let acSubmissions = 0
  let lastActiveUnix = 0
  let contestSolves = 0
  let practiceSolves = 0

  const subs = [...submissions].sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds)

  let recentSolves30 = 0
  let recentSolves90 = 0

  for (const s of subs) {
    if (!s.problem || s.problem.contestId == null || s.problem.index == null) continue
    const key = pkey(s.problem)
    totalSubmissions++
    lastActiveUnix = Math.max(lastActiveUnix, s.creationTimeSeconds)
    verdictCounts[s.verdict] = (verdictCounts[s.verdict] || 0) + 1
    triedKeys.add(key)
    attemptCount.set(key, (attemptCount.get(key) || 0) + 1)

    if (s.verdict === 'OK') {
      acSubmissions++
      if (!solved.has(key)) {
        const inContest = s.author?.participantType === 'CONTESTANT'
        if (inContest) contestSolves++
        else practiceSolves++
        solved.set(key, {
          problem: s.problem,
          rating: typeof s.problem.rating === 'number' ? s.problem.rating : null,
          tags: s.problem.tags || [],
          when: s.creationTimeSeconds,
          attempts: attemptCount.get(key),
        })
        attemptsToSolve.push(attemptCount.get(key))
        const age = nowSec - s.creationTimeSeconds
        if (age <= 90 * 86400) recentSolves90++
        if (age <= 30 * 86400) recentSolves30++
      }
    }
  }

  // problems attempted ≥ 2 times and never solved → open frustrations
  const probMeta = new Map()
  for (const s of subs) {
    if (!s.problem || s.problem.contestId == null) continue
    probMeta.set(pkey(s.problem), s.problem)
  }
  for (const [key, n] of attemptCount.entries()) {
    if (n >= 2 && !solved.has(key)) {
      const p = probMeta.get(key)
      if (!p) continue
      failedOpenProblems.push({ key, name: p.name, rating: p.rating ?? null, attempts: n, tags: p.tags || [] })
      for (const t of p.tags || []) {
        if (NON_TOPIC_TAGS.has(t)) continue
        failedOpenByTag.set(t, (failedOpenByTag.get(t) || 0) + 1)
      }
    }
  }
  failedOpenProblems.sort((a, b) => b.attempts - a.attempts)

  const solvedArr = [...solved.values()]
  const solvedSet = new Set(solved.keys())
  const totalSolved = solvedArr.length
  const totalAttemptedDistinct = triedKeys.size

  // ── rating distribution of solved problems ────────────────────────────────
  const distMap = new Map(RATING_BUCKETS.map((b) => [b, 0]))
  let unratedSolved = 0
  const solvedRatings = []
  const ratedSolves = [] // { rating, when, ageDays }
  for (const x of solvedArr) {
    if (typeof x.rating === 'number') {
      const b = clamp(round100(x.rating), RATING_MIN, RATING_MAX)
      distMap.set(b, (distMap.get(b) || 0) + 1)
      solvedRatings.push(x.rating)
      ratedSolves.push({ rating: x.rating, when: x.when, ageDays: (nowSec - x.when) / 86400 })
    } else unratedSolved++
  }
  solvedRatings.sort((a, b) => a - b)
  const distribution = RATING_BUCKETS.map((rating) => ({ rating, count: distMap.get(rating) || 0 }))

  const percentiles = {
    p50: percentile(solvedRatings, 0.5),
    p75: percentile(solvedRatings, 0.75),
    p85: percentile(solvedRatings, 0.85),
    p90: percentile(solvedRatings, 0.9),
    maxSolved: solvedRatings.length ? solvedRatings[solvedRatings.length - 1] : null,
  }

  const currentRating = typeof info?.rating === 'number' ? info.rating : null
  const maxRating = typeof info?.maxRating === 'number' ? info.maxRating : null

  // ── LEVEL ESTIMATE: three signals, blended, with confidence ──────────────
  // signal 1 — contest: latest rating, freshness-discounted toward practice.
  // signal 2 — practice ceiling: recency-weighted p85 of solved difficulty.
  // signal 3 — recent form: p80 of the last-90-day solves.
  const weighted = ratedSolves
    .map((x) => ({ v: x.rating, w: recencyWeight(x.ageDays, 270) }))
    .sort((a, b) => a.v - b.v)
  const practiceCeiling = weightedPercentile(weighted, 0.85)

  const recent90 = ratedSolves.filter((x) => x.ageDays <= 90).map((x) => x.rating).sort((a, b) => a - b)
  const recentForm = percentile(recent90, 0.8)

  const lastContestSec = (ratingHistory || []).length
    ? ratingHistory[ratingHistory.length - 1].ratingUpdateTimeSeconds
    : null
  const contestAgeDays = lastContestSec ? (nowSec - lastContestSec) / 86400 : null

  let level
  const signals = { contest: currentRating, practice: practiceCeiling, recent: recentForm }
  {
    const parts = []
    if (currentRating != null) {
      // a rating from years ago says less than last month's
      const freshness = contestAgeDays != null ? recencyWeight(contestAgeDays, 365) : 0.5
      parts.push({ v: currentRating, w: 0.5 * (0.4 + 0.6 * freshness) * Math.min(1, (ratingHistory || []).length / 6) })
    }
    if (practiceCeiling != null && solvedRatings.length >= 10) parts.push({ v: practiceCeiling, w: 0.38 })
    if (recentForm != null && recent90.length >= 5) parts.push({ v: recentForm, w: 0.22 })
    if (!parts.length) level = RATING_MIN
    else level = parts.reduce((a, p) => a + p.v * p.w, 0) / parts.reduce((a, p) => a + p.w, 0)
  }
  const workingLevel = clamp(round100(level), RATING_MIN, RATING_MAX)

  // confidence: volume × agreement between available signals
  const sigVals = Object.values(signals).filter((v) => v != null)
  const spread = sigVals.length >= 2 ? Math.max(...sigVals) - Math.min(...sigVals) : 200
  const volumeFactor = clamp01(totalSolved / 150)
  const agreementFactor = clamp01(1 - (spread - 100) / 500)
  const confidence = clamp01(0.25 + 0.45 * volumeFactor + 0.3 * agreementFactor)

  // trend: contest deltas + recent practice difficulty drift
  const history = (ratingHistory || []).map((c, i) => ({
    index: i,
    rating: c.newRating,
    old: c.oldRating,
    delta: c.newRating - c.oldRating,
    name: c.contestName,
    rank: c.rank,
    time: c.ratingUpdateTimeSeconds,
  }))
  const recentTrend =
    history.length >= 2
      ? history[history.length - 1].rating - history[Math.max(0, history.length - 6)].rating
      : null
  const olderSolves = ratedSolves.filter((x) => x.ageDays > 90 && x.ageDays <= 270).map((x) => x.rating).sort((a, b) => a - b)
  const practiceDrift =
    recent90.length >= 5 && olderSolves.length >= 5
      ? percentile(recent90, 0.7) - percentile(olderSolves, 0.7)
      : null
  let trend = 'flat'
  const trendScore = (recentTrend ?? 0) + (practiceDrift ?? 0) * 0.7
  if (trendScore > 45) trend = 'rising'
  else if (trendScore < -45) trend = 'cooling'

  const levelEstimate = {
    level: workingLevel,
    confidence,
    trend,
    signals,
    explanation:
      currentRating != null
        ? `Blend of contest rating (${currentRating}), sustained practice ceiling (~${practiceCeiling ? Math.round(practiceCeiling) : '—'}) and 90-day form (~${recentForm ? Math.round(recentForm) : '—'}).`
        : `No rated contests yet — estimated from the difficulty profile of ${totalSolved} solves.`,
  }

  // ── accuracy / consistency ────────────────────────────────────────────────
  const solveAccuracy = totalSubmissions ? acSubmissions / totalSubmissions : null
  const problemAccuracy = totalAttemptedDistinct ? totalSolved / totalAttemptedDistinct : null
  const avgAttemptsToSolve = attemptsToSolve.length ? mean(attemptsToSolve) : null
  const firstTryRate = attemptsToSolve.length
    ? attemptsToSolve.filter((a) => a === 1).length / attemptsToSolve.length
    : null

  // ── PER-TOPIC RATINGS (the heart of the model) ────────────────────────────
  // For every topic: recency-weighted 80th-percentile of solved difficulty,
  // shrunk toward a conservative prior when evidence is thin.
  const tagSolves = new Map() // tag -> [{ rating, when, ageDays, attempts }]
  for (const x of solvedArr) {
    if (typeof x.rating !== 'number') continue
    for (const t of x.tags) {
      if (NON_TOPIC_TAGS.has(t)) continue
      if (!tagSolves.has(t)) tagSolves.set(t, [])
      tagSolves.get(t).push({ rating: x.rating, when: x.when, ageDays: (nowSec - x.when) / 86400, attempts: x.attempts })
    }
  }

  const bandNow = bandFor(workingLevel)
  const importance = computeTagImportance(
    problems,
    Math.max(RATING_MIN, workingLevel - 100),
    Math.min(RATING_MAX, workingLevel + 300),
  )
  const maxImportance = Math.max(1, ...importance.values())

  const PRIOR_K = 4
  const prior = Math.max(RATING_MIN, workingLevel - 250)

  const tagUniverse = new Set([...importance.keys(), ...tagSolves.keys()])
  const tagTable = []
  for (const t of tagUniverse) {
    const list = (tagSolves.get(t) || []).sort((a, b) => a.rating - b.rating)
    const items = list.map((x) => ({ v: x.rating, w: recencyWeight(x.ageDays, 360) }))
    const nEff = items.reduce((a, x) => a + x.w, 0)
    const p80 = weightedPercentile(items, 0.8)

    // Bayesian shrinkage toward the prior — thin evidence ⇒ conservative.
    const raw = p80 != null ? (nEff * p80 + PRIOR_K * prior) / (nEff + PRIOR_K) : prior
    const topicRating = clamp(Math.round(raw), RATING_MIN, RATING_MAX)

    const solvedCount = list.length
    const recentCount90 = list.filter((x) => x.ageDays <= 90).length
    const lastTouched = list.length ? Math.min(...list.map((x) => x.ageDays)) : null
    const maxR = list.length ? Math.max(...list.map((x) => x.rating)) : 0
    const avgTries = list.length ? mean(list.map((x) => x.attempts)) : null
    const openFails = failedOpenByTag.get(t) || 0

    const imp = (importance.get(t) || 0) / maxImportance
    // 0..1 skill for radar / quick visuals (rating-positioned + coverage)
    const ratingPart = clamp01((topicRating - (workingLevel - 400)) / 500)
    const countPart = clamp01(solvedCount / 14)
    const skill = clamp01(0.65 * ratingPart + 0.35 * countPart)

    // evidence string
    const bits = []
    if (solvedCount) {
      bits.push(`${solvedCount} solved (max ${maxR})`)
      if (recentCount90) bits.push(`${recentCount90} in 90d`)
      else if (lastTouched != null && lastTouched > 120) bits.push(`untouched ${Math.round(lastTouched)}d`)
      if (avgTries != null && avgTries > 1.8) bits.push(`${avgTries.toFixed(1)} tries/solve`)
    } else bits.push('no solves yet')
    if (openFails) bits.push(`${openFails} unfinished attempts`)

    tagTable.push({
      tag: t,
      solved: solvedCount,
      maxRating: maxR,
      topicRating,
      nEff: Math.round(nEff * 10) / 10,
      recentCount90,
      lastTouchedDays: lastTouched != null ? Math.round(lastTouched) : null,
      avgTries,
      openFails,
      importance: imp,
      skill,
      gap: imp * (1 - skill),
      evidence: bits.join(' · '),
    })
  }
  tagTable.sort((a, b) => b.importance - a.importance)

  const topicRatingByTag = new Map(tagTable.map((t) => [t.tag, t.topicRating]))
  const tagRowByTag = new Map(tagTable.map((t) => [t.tag, t]))

  // ── strengths & weaknesses vs the curriculum (current band) ───────────────
  const reqsNow = requirementsFor(Math.min(RATING_MAX, workingLevel + 200))
  const reqByTag = new Map(reqsNow.map((r) => [r.tag, r]))

  const strengths = tagTable
    .filter((t) => t.solved >= 6 && t.topicRating >= workingLevel - 50)
    .sort((a, b) => b.topicRating - a.topicRating || b.solved - a.solved)
    .slice(0, 6)
    .map((t) => ({
      ...t,
      why: `Handled at ~${t.topicRating} — ${t.topicRating >= workingLevel + 50 ? 'above' : 'at'} your level. ${t.evidence}.`,
    }))

  const weaknesses = reqsNow
    .map((r) => {
      const row = tagRowByTag.get(r.tag)
      const current = row ? row.topicRating : prior
      const gapPts = r.required - current
      return {
        tag: r.tag,
        required: r.required,
        current,
        gapPts,
        weight: r.weight,
        score: r.weight * Math.max(0, gapPts),
        solved: row ? row.solved : 0,
        openFails: row ? row.openFails : 0,
        lastTouchedDays: row ? row.lastTouchedDays : null,
        why: row && row.solved
          ? `Needed at ~${r.required} for the next band; your evidence tops out near ${current}. ${row.evidence}.`
          : `Required around ${r.required} soon, and there's almost no history here yet.`,
      }
    })
    .filter((x) => x.gapPts > 60 && x.weight >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)

  // radar: the 8 most important topics at this level
  const radar = [...tagTable]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8)
    .map((t) => ({ tag: t.tag, skill: t.skill, importance: t.importance }))

  // ── error profile ─────────────────────────────────────────────────────────
  const nonOk = totalSubmissions - acSubmissions
  const wa = verdictCounts['WRONG_ANSWER'] || 0
  const tle = verdictCounts['TIME_LIMIT_EXCEEDED'] || 0
  const re = verdictCounts['RUNTIME_ERROR'] || 0
  const mle = verdictCounts['MEMORY_LIMIT_EXCEEDED'] || 0
  const ce = verdictCounts['COMPILATION_ERROR'] || 0
  const insights = []
  if (nonOk > 0) {
    const waShare = wa / nonOk
    const tleShare = tle / nonOk
    const reShare = re / nonOk
    if (waShare >= 0.5)
      insights.push('Wrong Answer dominates your failures — the leak is correctness, not knowledge. Prove the idea on paper and test n=1/edge cases before submitting.')
    if (tleShare >= 0.25)
      insights.push('Time Limit Exceeded is a recurring theme — before coding, write the complexity down and check it against the constraints.')
    if (reShare >= 0.18)
      insights.push('Runtime errors appear often — array bounds, 64-bit overflow and uninitialized state deserve a pre-submit checklist.')
    if (mle / Math.max(1, nonOk) >= 0.1)
      insights.push('Memory limits get hit occasionally — reconsider data-structure footprint.')
    if (ce / Math.max(1, totalSubmissions) >= 0.08)
      insights.push('Compilation errors burn submissions — slow down before hitting submit; they cost contest penalties.')
  }
  if (firstTryRate != null && firstTryRate >= 0.75 && totalSolved >= 50)
    insights.push(`A ${Math.round(firstTryRate * 100)}% first-try rate is excellent — your implementations are clean. You can afford to attempt harder problems.`)
  const errorProfile = { wa, tle, re, mle, ce, nonOk, insights }

  // ── habits: weekly activity, streaks, consistency ─────────────────────────
  const WEEKS = 52
  const weekBuckets = new Array(WEEKS).fill(0)
  const daySet = new Set()
  for (const x of solvedArr) {
    const ageDays = (nowSec - x.when) / 86400
    const wk = Math.floor(ageDays / 7)
    if (wk >= 0 && wk < WEEKS) weekBuckets[WEEKS - 1 - wk]++
    daySet.add(Math.floor(x.when / 86400))
  }
  // streaks in active days
  const sortedDays = [...daySet].sort((a, b) => a - b)
  let longestStreak = 0
  let cur = 0
  for (let i = 0; i < sortedDays.length; i++) {
    cur = i > 0 && sortedDays[i] === sortedDays[i - 1] + 1 ? cur + 1 : 1
    longestStreak = Math.max(longestStreak, cur)
  }
  const today = Math.floor(nowSec / 86400)
  let currentStreak = 0
  if (daySet.has(today) || daySet.has(today - 1)) {
    let d = daySet.has(today) ? today : today - 1
    while (daySet.has(d)) {
      currentStreak++
      d--
    }
  }
  const activeWeeks8 = weekBuckets.slice(-8).filter((c) => c > 0).length
  const consistency = clamp01(activeWeeks8 / 8)
  const weeklyActivity = weekBuckets.map((count, i) => ({ week: i, count }))

  const contestShare = contestSolves + practiceSolves ? contestSolves / (contestSolves + practiceSolves) : 0

  return {
    info,
    handle: info?.handle,
    currentRating,
    maxRating,
    rank: info?.rank || null,
    maxRank: info?.maxRank || null,

    totalSolved,
    totalAttemptedDistinct,
    totalSubmissions,
    acSubmissions,
    unratedSolved,

    solveAccuracy,
    problemAccuracy,
    avgAttemptsToSolve,
    firstTryRate,

    workingLevel,
    suggestedStart: workingLevel,
    levelEstimate,
    band: { key: bandNow.key, name: bandNow.name, tier: bandNow.tier, motto: bandNow.motto },
    percentiles,
    distribution,
    solvedRatings,

    tagTable,
    topicRatingByTag,
    strengths,
    weaknesses,
    radar,
    failedOpenProblems: failedOpenProblems.slice(0, 12),

    errorProfile,
    verdictCounts,

    history,
    recentTrend,
    recentSolves30,
    recentSolves90,
    lastActiveUnix,

    weeklyActivity,
    currentStreak,
    longestStreak,
    consistency,
    contestSolves,
    practiceSolves,
    contestShare,

    solvedSet,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  READINESS toward an arbitrary target — the "what is required" ledger.
//  Pure function so the UI can re-compute live as the target slider moves.
// ────────────────────────────────────────────────────────────────────────────
export function readinessFor(analysis, target) {
  const reqs = requirementsFor(target)
  const items = reqs.map((r) => {
    const row = analysis.tagTable.find((t) => t.tag === r.tag)
    const current = row ? row.topicRating : Math.max(RATING_MIN, analysis.workingLevel - 250)
    const ratio = clamp01((current - (r.required - 400)) / 400) // 400 pts below = 0, at requirement = 1
    let status = 'missing'
    if (current >= r.required - 25) status = 'met'
    else if (current >= r.required - 150) status = 'close'
    return {
      tag: r.tag,
      pretty: prettyTag(r.tag),
      weight: r.weight,
      required: r.required,
      current,
      ratio,
      status,
      gapPts: Math.max(0, r.required - current),
      solved: row ? row.solved : 0,
      evidence: row ? row.evidence : 'no solves yet',
      rank: prereqRank(r.tag),
    }
  })

  const wSum = items.reduce((a, x) => a + x.weight, 0)
  const topicReadiness = wSum ? items.reduce((a, x) => a + x.weight * x.ratio, 0) / wSum : 0

  // volume: how much total work exists vs what the gap typically demands
  const gapPts = Math.max(0, target - analysis.workingLevel)
  const expectedProblems = Math.max(20, (gapPts / 100) * 16)
  const recentVolume = analysis.recentSolves90
  const volumeFactor = clamp01(0.35 + 0.65 * clamp01(recentVolume / Math.min(expectedProblems, 120)))

  const pct = Math.round(100 * clamp01(0.8 * topicReadiness + 0.2 * volumeFactor))

  const met = items.filter((i) => i.status === 'met').length
  const close = items.filter((i) => i.status === 'close').length
  const missing = items.filter((i) => i.status === 'missing').length

  return {
    target,
    pct,
    topicReadiness,
    volumeFactor,
    items: items.sort((a, b) => b.weight * b.gapPts - a.weight * a.gapPts),
    counts: { met, close, missing },
    note:
      pct >= 80
        ? 'The toolkit is essentially there — the gap is volume and contest nerve, not knowledge.'
        : pct >= 55
          ? 'A real but climbable gap. Close the red topics below and this target is yours.'
          : 'This is an expedition, not a sprint — the engine will stage the missing topics in prerequisite order.',
  }
}
