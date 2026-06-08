// Recommendation engine.
//
// Given a profile analysis and a goal (start rating, target rating, number of
// days, problems/day, ramp shape), this builds a day-by-day practice plan:
//
//  • Difficulty ramps gradually from `start` to ~`target` so the jump is never
//    too big (each day mixes one consolidation problem just below the day's
//    level, core problems at level, and one stretch problem just above).
//  • Topic selection is weighted toward the user's weak-but-important areas,
//    while keeping variety.
//  • Only problems the user has NOT solved are recommended.
//  • Popular/canonical problems (high solved count) are preferred.
//  • The plan is deterministic for a given handle+config (seeded RNG), so the
//    progress checkboxes stay meaningful across reloads.

import {
  pkey,
  clamp,
  clamp01,
  round100,
  RATING_MIN,
  RATING_MAX,
  NON_TOPIC_TAGS,
  prettyTag,
  hashString,
  mulberry32,
} from './constants.js'
import { computeTagImportance } from './analysis.js'
import { problemUrl } from '../api/codeforces.js'

const RAMP_PRESETS = {
  gentle: { exp: 1.12, buffer: 0 },
  moderate: { exp: 1.0, buffer: 100 },
  steep: { exp: 0.85, buffer: 200 },
}

function roleOffsets(perDay) {
  if (perDay <= 1) return [{ role: 'core', off: 0 }]
  if (perDay === 2)
    return [
      { role: 'core', off: 0 },
      { role: 'stretch', off: 100 },
    ]
  const arr = [{ role: 'consolidate', off: -100 }]
  for (let i = 0; i < perDay - 2; i++) arr.push({ role: 'core', off: 0 })
  arr.push({ role: 'stretch', off: 100 })
  return arr
}

function weightedPick(rng, entries) {
  const total = entries.reduce((a, e) => a + e.weight, 0)
  if (total <= 0) return null
  let r = rng() * total
  for (const e of entries) {
    r -= e.weight
    if (r <= 0) return e.key
  }
  return entries[entries.length - 1].key
}

function reasonFor(role, tag, rating) {
  const pt = prettyTag(tag)
  if (role === 'consolidate')
    return `Consolidate ${pt} at ${rating} — just below your day target, to lock in fundamentals.`
  if (role === 'stretch')
    return `Stretch ${pt} at ${rating} — a deliberate step above your level to grow.`
  return `Core ${pt} practice at ${rating}.`
}

export function generatePlan(analysis, problems, params) {
  const handle = analysis.handle || 'anon'
  const start = clamp(round100(params.start), RATING_MIN, RATING_MAX)
  const target = clamp(round100(params.target), RATING_MIN, RATING_MAX)
  const days = clamp(Math.round(params.days), 1, 365)
  const perDay = clamp(Math.round(params.perDay), 1, 10)
  const ramp = RAMP_PRESETS[params.ramp] || RAMP_PRESETS.gentle

  const warnings = []
  const end = clamp(Math.max(target + ramp.buffer, start + 100), RATING_MIN, RATING_MAX)

  // ---- focus weights for the journey band [start, end] ----
  const importance = computeTagImportance(problems, start, end)
  const maxImp = Math.max(1, ...importance.values())
  const skillByTag = new Map(analysis.tagTable.map((t) => [t.tag, t.skill]))

  const focusWeights = []
  for (const [tag, count] of importance.entries()) {
    if (NON_TOPIC_TAGS.has(tag)) continue
    const imp = count / maxImp
    if (imp < 0.1) continue
    const skill = skillByTag.has(tag) ? skillByTag.get(tag) : 0
    const gap = imp * (1 - skill)
    focusWeights.push({ key: tag, weight: gap + 0.12, gap, imp, skill })
  }
  focusWeights.sort((a, b) => b.gap - a.gap)

  // Weak-but-relevant topics for *this journey band* (drives the "weak area"
  // highlight). Important tags the user hasn't mastered yet.
  const weaknessSet = new Set(
    focusWeights.filter((f) => f.skill < 0.6 && f.imp >= 0.18).slice(0, 8).map((f) => f.key),
  )

  const focusTags = focusWeights.slice(0, 12).map((f) => ({
    tag: f.key,
    weight: f.weight,
    gap: f.gap,
    importance: f.imp,
    skill: f.skill,
    weak: weaknessSet.has(f.key),
  }))

  // ---- unsolved problems indexed by exact rating, popular first ----
  const byRating = new Map()
  for (const p of problems) {
    if (p.rating == null) continue
    if (analysis.solvedSet.has(pkey(p))) continue
    if (!byRating.has(p.rating)) byRating.set(p.rating, [])
    byRating.get(p.rating).push(p)
  }
  for (const arr of byRating.values()) arr.sort((a, b) => b.solvedCount - a.solvedCount)

  const rng = mulberry32(hashString(`${handle}|${start}|${target}|${days}|${perDay}|${params.ramp}`))
  const chosen = new Set()

  const candidates = (rating, tag) => {
    const bucket = byRating.get(rating) || []
    return bucket.filter((p) => !chosen.has(pkey(p)) && (!tag || p.tags.includes(tag)))
  }

  const trySelect = (rating, tag) => {
    for (const delta of [0, -100, 100, -200, 200]) {
      const r = rating + delta
      if (r < RATING_MIN || r > RATING_MAX) continue
      const c = candidates(r, tag)
      if (c.length) {
        const window = Math.min(8, c.length)
        return c[Math.floor(rng() * window)]
      }
    }
    return null
  }

  const primaryTag = (p) => {
    let best = null
    let bestW = -1
    for (const t of p.tags) {
      if (NON_TOPIC_TAGS.has(t)) continue
      const w = (importance.get(t) || 0) / maxImp
      if (w > bestW) {
        bestW = w
        best = t
      }
    }
    return best || p.tags.find((t) => !NON_TOPIC_TAGS.has(t)) || 'implementation'
  }

  const pickFocusTag = (tagUsage) => {
    const adjusted = focusWeights.map((f) => ({
      key: f.key,
      weight: f.weight / (1 + 2 * (tagUsage[f.key] || 0)),
    }))
    return weightedPick(rng, adjusted)
  }

  // ---- center rating for each day (the ramp) ----
  const centerFor = (i) => {
    if (days === 1) return clamp(round100((start + end) / 2), RATING_MIN, RATING_MAX)
    const p = i / (days - 1)
    return clamp(round100(start + (end - start) * Math.pow(p, ramp.exp)), RATING_MIN, RATING_MAX)
  }

  const slots = roleOffsets(perDay)
  const planDays = []

  for (let i = 0; i < days; i++) {
    const center = centerFor(i)
    const tagUsage = {}
    const dayProblems = []

    for (const { role, off } of slots) {
      const slotRating = clamp(round100(center + off), RATING_MIN, Math.min(RATING_MAX, end + 100))
      let tag = pickFocusTag(tagUsage)
      let pick = trySelect(slotRating, tag)
      if (!pick) pick = trySelect(slotRating, null) // drop the tag constraint
      if (!pick) continue // genuinely exhausted near this rating

      chosen.add(pkey(pick))
      const displayTag = tag && pick.tags.includes(tag) ? tag : primaryTag(pick)
      tagUsage[displayTag] = (tagUsage[displayTag] || 0) + 1

      dayProblems.push({
        id: pkey(pick),
        contestId: pick.contestId,
        index: pick.index,
        name: pick.name,
        rating: pick.rating,
        tags: pick.tags.filter((t) => !NON_TOPIC_TAGS.has(t)).slice(0, 4),
        solvedCount: pick.solvedCount,
        url: problemUrl(pick.contestId, pick.index),
        role,
        focusTag: displayTag,
        weakArea: weaknessSet.has(displayTag),
        reason: reasonFor(role, displayTag, pick.rating),
      })
    }

    if (dayProblems.length < slots.length) {
      warnings.push(`Day ${i + 1}: only ${dayProblems.length}/${slots.length} problems available near rating ${center}.`)
    }

    planDays.push({ day: i + 1, center, problems: dayProblems })
  }

  // ---- phases ----
  const phases = buildPhases(planDays)

  // ---- flat list ("net questions") ----
  const totalList = []
  for (const d of planDays) for (const p of d.problems) totalList.push({ ...p, day: d.day })

  const signature = `${handle}|${start}|${target}|${days}|${perDay}|${params.ramp}`

  return {
    meta: {
      handle,
      start,
      target,
      end,
      days,
      perDay,
      ramp: params.ramp,
      total: totalList.length,
      ratingGain: target - (analysis.currentRating ?? start),
    },
    phases,
    days: planDays,
    totalList,
    focusTags,
    weaknessSet: [...weaknessSet],
    signature,
    warnings,
  }
}

function buildPhases(planDays) {
  const n = planDays.length
  const spanOf = (from, to) => {
    let lo = Infinity
    let hi = -Infinity
    for (let i = from; i <= to; i++) {
      lo = Math.min(lo, planDays[i].center)
      hi = Math.max(hi, planDays[i].center)
    }
    return [lo, hi]
  }
  if (n <= 4) {
    const [lo, hi] = spanOf(0, n - 1)
    return [
      {
        name: 'Focused sprint',
        from: 1,
        to: n,
        lo,
        hi,
        desc: `A short, concentrated block around ${lo}–${hi}. Hit weak areas hard and review every problem you miss.`,
      },
    ]
  }
  const b1 = Math.ceil(n * 0.3)
  const b2 = Math.ceil(n * 0.7)
  const make = (name, from, to, descFn) => {
    const [lo, hi] = spanOf(from, to)
    return { name, from: from + 1, to: to + 1, lo, hi, desc: descFn(lo, hi) }
  }
  return [
    make('Foundation', 0, b1 - 1, (lo, hi) => `Days 1–${b1}: build consistency at ${lo}–${hi}. Close gaps in fundamentals and your weakest tags before climbing.`),
    make('Build-up', b1, b2 - 1, (lo, hi) => `Days ${b1 + 1}–${b2}: the main climb, ${lo}–${hi}. Difficulty rises steadily; focus tags get harder reps.`),
    make('Peak push', b2, n - 1, (lo, hi) => `Days ${b2 + 1}–${n}: peak intensity at ${lo}–${hi}, right around your target. Simulate contest conditions and time yourself.`),
  ]
}
