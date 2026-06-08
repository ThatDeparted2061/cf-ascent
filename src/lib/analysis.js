// Profile analysis engine.
//
// Turns raw Codeforces data (user.info, user.status, user.rating, problemset)
// into a structured, data-driven picture of a competitor: what they've solved,
// how reliably, which topics they're strong/weak in, an estimate of their true
// working level, and an error profile. None of this is guessed — it's all
// derived from their actual submission history.

import {
  pkey,
  clamp,
  clamp01,
  round100,
  RATING_BUCKETS,
  RATING_MIN,
  RATING_MAX,
  NON_TOPIC_TAGS,
} from './constants.js'

// Count, per tag, how many problems exist in [lo, hi]. A proxy for how
// "important" a topic is for someone training in that rating band.
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

function percentile(sortedArr, p) {
  if (!sortedArr.length) return null
  const idx = clamp(Math.floor(p * sortedArr.length), 0, sortedArr.length - 1)
  return sortedArr[idx]
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export function analyzeProfile({ info, submissions, ratingHistory, problems }) {
  const solved = new Map() // key -> { problem, rating, tags, when }
  const attemptCount = new Map() // key -> running submission count
  const triedKeys = new Set()
  const verdictCounts = {}
  const attemptsToSolve = [] // attempts up to & including first AC, per solved problem

  let totalSubmissions = 0
  let acSubmissions = 0
  let lastActiveUnix = 0

  // chronological order so "first solve" / attempts-to-solve are correct
  const subs = [...submissions].sort(
    (a, b) => a.creationTimeSeconds - b.creationTimeSeconds,
  )

  const now = Date.now() / 1000
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
        solved.set(key, {
          problem: s.problem,
          rating: typeof s.problem.rating === 'number' ? s.problem.rating : null,
          tags: s.problem.tags || [],
          when: s.creationTimeSeconds,
        })
        attemptsToSolve.push(attemptCount.get(key))
        const age = now - s.creationTimeSeconds
        if (age <= 90 * 86400) recentSolves90++
        if (age <= 30 * 86400) recentSolves30++
      }
    }
  }

  const solvedArr = [...solved.values()]
  const solvedSet = new Set(solved.keys())
  const totalSolved = solvedArr.length
  const totalAttemptedDistinct = triedKeys.size

  // ---- rating distribution of solved problems ----
  const distMap = new Map(RATING_BUCKETS.map((b) => [b, 0]))
  let unratedSolved = 0
  const solvedRatings = []
  for (const x of solvedArr) {
    if (typeof x.rating === 'number') {
      const b = clamp(round100(x.rating), RATING_MIN, RATING_MAX)
      distMap.set(b, (distMap.get(b) || 0) + 1)
      solvedRatings.push(x.rating)
    } else {
      unratedSolved++
    }
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

  // ---- estimate the true "working level" ----
  // Blend the contest rating (if any) with the 85th-percentile of solved
  // difficulties. With little data, fall back to whichever signal exists.
  let base
  if (currentRating != null && solvedRatings.length >= 20) {
    base = 0.5 * currentRating + 0.5 * percentiles.p85
  } else if (currentRating != null) {
    base = currentRating
  } else if (percentiles.p85 != null) {
    base = percentiles.p85
  } else {
    base = RATING_MIN
  }
  const workingLevel = clamp(round100(base), RATING_MIN, RATING_MAX)
  const suggestedStart = workingLevel

  // ---- accuracy / consistency ----
  const solveAccuracy = totalSubmissions ? acSubmissions / totalSubmissions : null
  const problemAccuracy = totalAttemptedDistinct ? totalSolved / totalAttemptedDistinct : null
  const avgAttemptsToSolve = attemptsToSolve.length ? mean(attemptsToSolve) : null
  const firstTryRate = attemptsToSolve.length
    ? attemptsToSolve.filter((a) => a === 1).length / attemptsToSolve.length
    : null

  // ---- per-tag mastery ----
  const tagStats = new Map() // tag -> { solved, maxRating, sumRating, ratedCount }
  for (const x of solvedArr) {
    for (const t of x.tags) {
      if (NON_TOPIC_TAGS.has(t)) continue
      const ts = tagStats.get(t) || { solved: 0, maxRating: 0, sumRating: 0, ratedCount: 0 }
      ts.solved++
      if (typeof x.rating === 'number') {
        ts.maxRating = Math.max(ts.maxRating, x.rating)
        ts.sumRating += x.rating
        ts.ratedCount++
      }
      tagStats.set(t, ts)
    }
  }

  // Importance band around the working level: the topics that matter *now*.
  const bandLo = Math.max(RATING_MIN, workingLevel - 100)
  const bandHi = Math.min(RATING_MAX, workingLevel + 300)
  const importance = computeTagImportance(problems, bandLo, bandHi)
  const maxImportance = Math.max(1, ...importance.values())

  // skill_t in [0,1]: how well the user has mastered tag t for their level.
  function skillFor(ts) {
    if (!ts) return 0
    const ceil = workingLevel + 200
    const ratingPart = clamp01((ts.maxRating - RATING_MIN) / Math.max(1, ceil - RATING_MIN))
    const countPart = clamp01(ts.solved / 15)
    return 0.55 * ratingPart + 0.45 * countPart
  }

  // Build a unified tag table over every topic that's either important now or
  // that the user has touched.
  const tagUniverse = new Set([...importance.keys(), ...tagStats.keys()])
  const tagTable = []
  for (const t of tagUniverse) {
    const ts = tagStats.get(t)
    const imp = (importance.get(t) || 0) / maxImportance
    const skill = skillFor(ts)
    tagTable.push({
      tag: t,
      solved: ts ? ts.solved : 0,
      maxRating: ts ? ts.maxRating : 0,
      avgRating: ts && ts.ratedCount ? Math.round(ts.sumRating / ts.ratedCount) : null,
      skill,
      importance: imp,
      gap: imp * (1 - skill), // weakness score
    })
  }

  const strengths = tagTable
    .filter((t) => t.solved >= 5)
    .sort((a, b) => b.skill - a.skill || b.solved - a.solved)
    .slice(0, 6)

  const weaknesses = tagTable
    .filter((t) => t.importance >= 0.18 && t.skill < 0.62)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 6)

  // Radar = the 8 most important topics for this level, skill vs. importance.
  const radar = [...tagTable]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8)
    .map((t) => ({ tag: t.tag, skill: t.skill, importance: t.importance }))

  // ---- error profile ----
  const nonOk = totalSubmissions - acSubmissions
  const wa = verdictCounts['WRONG_ANSWER'] || 0
  const tle = verdictCounts['TIME_LIMIT_EXCEEDED'] || 0
  const re = verdictCounts['RUNTIME_ERROR'] || 0
  const mle = verdictCounts['MEMORY_LIMIT_EXCEEDED'] || 0
  const insights = []
  if (nonOk > 0) {
    const waShare = wa / nonOk
    const tleShare = tle / nonOk
    const reShare = re / nonOk
    if (waShare >= 0.5)
      insights.push(
        'Most failed attempts are Wrong Answer — correctness and edge cases are the main leak. Slow down on proofs and test small cases before submitting.',
      )
    if (tleShare >= 0.25)
      insights.push(
        'A notable share of failures are Time Limit Exceeded — work on choosing lower-complexity algorithms and tightening constant factors.',
      )
    if (reShare >= 0.18)
      insights.push(
        'Runtime errors show up often — watch array bounds, integer overflow (use 64-bit), and uninitialized state.',
      )
    if (mle > 0 && mle / nonOk >= 0.1)
      insights.push('Memory limits are occasionally hit — reconsider data-structure footprint.')
  }
  const errorProfile = { wa, tle, re, mle, nonOk, insights }

  // ---- rating history (for the chart) ----
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
    history.length >= 2 ? history[history.length - 1].rating - history[Math.max(0, history.length - 6)].rating : null

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
    suggestedStart,
    percentiles,
    distribution,
    solvedRatings,

    tagTable,
    strengths,
    weaknesses,
    radar,

    errorProfile,
    verdictCounts,

    history,
    recentTrend,
    recentSolves30,
    recentSolves90,
    lastActiveUnix,

    solvedSet, // consumed by the recommender
  }
}
