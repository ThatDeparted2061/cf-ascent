// LeetCode analysis engine.
//
// Turns the public LeetCode profile data into an interview-readiness picture:
// difficulty mix, per-section mastery measured against the big-tech blueprint,
// weak vs. strong sections, a composite readiness score, and contest context.

import { clamp, clamp01 } from './constants.js'
import { SECTIONS } from './interviewBlueprint.js'

function diffMap(arr) {
  const m = {}
  for (const e of arr || []) m[e.difficulty] = e
  return m
}

function readinessBand(score) {
  if (score < 35) return { label: 'Foundations', tone: 'red', note: 'Building core data-structure fluency.' }
  if (score < 55) return { label: 'Developing', tone: 'amber', note: 'Real progress — keep widening coverage.' }
  if (score < 70) return { label: 'Interview-approaching', tone: 'amber', note: 'Close. Tighten the weak sections below.' }
  if (score < 85) return { label: 'Interview-ready', tone: 'green', note: 'Strong all-rounder for big-tech loops.' }
  return { label: 'Strong-hire ready', tone: 'green', note: 'Senior-level breadth and depth.' }
}

export function analyzeLeetCode({ username, profile, contest, recent }) {
  const mu = profile.matchedUser
  const ac = diffMap(mu.submitStatsGlobal?.acSubmissionNum)
  const totalSub = diffMap(mu.submitStatsGlobal?.totalSubmissionNum)
  const totals = diffMap(profile.allQuestionsCount)

  const byDifficulty = {
    Easy: { solved: ac.Easy?.count || 0, total: totals.Easy?.count || 0 },
    Medium: { solved: ac.Medium?.count || 0, total: totals.Medium?.count || 0 },
    Hard: { solved: ac.Hard?.count || 0, total: totals.Hard?.count || 0 },
  }
  const totalSolved = ac.All?.count || byDifficulty.Easy.solved + byDifficulty.Medium.solved + byDifficulty.Hard.solved

  const acSubs = ac.All?.submissions || 0
  const allSubs = totalSub.All?.submissions || 0
  const acceptanceRate = allSubs ? acSubs / allSubs : null

  // ---- merge per-tag solved counts ----
  const tagSolved = new Map()
  const tpc = mu.tagProblemCounts || {}
  for (const bucket of ['fundamental', 'intermediate', 'advanced']) {
    for (const t of tpc[bucket] || []) {
      tagSolved.set(t.tagSlug, (tagSolved.get(t.tagSlug) || 0) + (t.problemsSolved || 0))
    }
  }

  // ---- per-section mastery ----
  const sections = SECTIONS.map((s) => {
    let solved = 0
    for (const slug of s.lcTags) solved = Math.max(solved, tagSolved.get(slug) || 0)
    solved = Math.min(solved, Math.round(s.target * 1.6)) // cap runaway tag counts
    const mastery = clamp01(solved / s.target)
    return {
      id: s.id,
      name: s.name,
      tier: s.tier,
      importance: s.importance,
      target: s.target,
      blurb: s.blurb,
      solved,
      mastery,
      gapScore: s.importance * (1 - mastery),
    }
  })

  const sumImp = sections.reduce((a, s) => a + s.importance, 0)
  const sectionReadiness = sumImp ? sections.reduce((a, s) => a + s.importance * s.mastery, 0) / sumImp : 0

  // difficulty factor: interviews live in Medium, with some Hard
  const difficultyFactor = 0.7 * clamp01(byDifficulty.Medium.solved / 120) + 0.3 * clamp01(byDifficulty.Hard.solved / 40)

  // contest factor (LeetCode rating ~1400 baseline → ~2200 strong)
  const cr = contest?.userContestRanking
  const hasContest = cr && cr.rating
  const contestFactor = hasContest ? clamp01((cr.rating - 1400) / 800) : 0

  let score
  if (hasContest) score = 100 * (0.68 * sectionReadiness + 0.22 * difficultyFactor + 0.1 * contestFactor)
  else score = 100 * (0.76 * sectionReadiness + 0.24 * difficultyFactor)
  score = Math.round(clamp(score, 0, 100))
  const band = readinessBand(score)

  const weakSections = sections
    .filter((s) => s.importance >= 0.6 && s.mastery < 0.6)
    .sort((a, b) => b.gapScore - a.gapScore)
  const strongSections = sections.filter((s) => s.mastery >= 0.7).sort((a, b) => b.mastery - a.mastery)

  // focus order = weak (by gap) first, then the rest by importance
  const weakIds = new Set(weakSections.map((s) => s.id))
  const focusOrder = [
    ...weakSections,
    ...sections.filter((s) => !weakIds.has(s.id)).sort((a, b) => b.importance - a.importance),
  ]

  // radar: the 9 most interview-important sections
  const radar = [...sections]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 9)
    .map((s) => ({ tag: s.name, skill: s.mastery, importance: s.importance }))

  // contest history (attended only)
  const history = (contest?.userContestRankingHistory || [])
    .filter((h) => h.attended)
    .map((h, i) => ({ index: i, rating: Math.round(h.rating), title: h.contest?.title, time: h.contest?.startTime }))

  const recentSolvedSlugs = new Set((recent || []).map((r) => r.titleSlug))

  const easyShare = totalSolved ? byDifficulty.Easy.solved / totalSolved : 0
  const easyHeavy = easyShare > 0.55 && byDifficulty.Medium.solved < 80

  return {
    username,
    profile: mu.profile || {},
    ranking: mu.profile?.ranking || null,
    totalSolved,
    byDifficulty,
    easyShare,
    easyHeavy,
    acceptanceRate,
    streak: mu.userCalendar?.streak || 0,
    totalActiveDays: mu.userCalendar?.totalActiveDays || 0,
    tagSolved,
    sections,
    sectionReadiness,
    weakSections,
    strongSections,
    focusOrder,
    radar,
    readiness: { score, band, sectionReadiness, difficultyFactor, contestFactor, hasContest },
    contest: hasContest
      ? {
          rating: Math.round(cr.rating),
          globalRanking: cr.globalRanking,
          topPercentage: cr.topPercentage,
          attended: cr.attendedContestsCount,
          history,
        }
      : { rating: null, history },
    recentSolvedSlugs,
  }
}
