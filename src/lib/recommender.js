// ────────────────────────────────────────────────────────────────────────────
//  THE CHASE — recommendation engine v2
//
//  Given the v2 profile analysis and a goal (target rating, days, problems per
//  day, ramp shape), this builds a staged expedition:
//
//   • FEASIBILITY — is the goal realistic in the time given? (heuristic:
//     climbing 100 points takes ~16 deliberate problems near/above level)
//   • CURRICULUM — the topics standing between you and the target, taken from
//     the requirement profile, ordered by prerequisites THEN by weighted gap,
//     each with its own difficulty LADDER (from your current topic rating up
//     to the level the target demands — not one global ramp for everything).
//   • SCHEDULE — day by day: a rotating focus topic climbing its ladder, a
//     breadth slot, consolidation/stretch roles, and spaced-repetition reviews
//     that revisit a finished topic days later to lock it in.
//   • ALTERNATES — every slot carries swap candidates.
//   • ADAPTATION — adaptChase() re-plans the remaining days from real progress
//     (ahead → harder, behind → consolidate + carry-over), so the plan is a
//     living thing, not a printout.
//
//  Only unsolved problems are recommended; popular (high-solve-count) problems
//  are preferred; everything is deterministic per handle+config+generation.
// ────────────────────────────────────────────────────────────────────────────

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
import { computeTagImportance, readinessFor } from './analysis.js'
import { bandFor, milestonesBetween, journeyNarrative, prereqRank } from './curriculum.js'
import { problemUrl } from '../api/codeforces.js'

const RAMP_PRESETS = {
  gentle: { exp: 1.12, buffer: 0 },
  moderate: { exp: 1.0, buffer: 100 },
  steep: { exp: 0.85, buffer: 200 },
}

export const PROBLEMS_PER_100 = 16 // folklore: ~15–20 deliberate solves per 100 pts

// ── Feasibility ─────────────────────────────────────────────────────────────
export function assessFeasibility(start, target, days, perDay) {
  const gap = Math.max(0, target - start)
  const needed = Math.max(12, Math.round((gap / 100) * PROBLEMS_PER_100))
  const capacity = days * perDay
  const ratio = capacity / needed
  const minutesPer = 25 + ((start + target) / 2 - 800) * 0.022 * 60 / 60 // ~25→60 min as level rises
  const hoursPerDay = (perDay * Math.max(25, Math.min(75, minutesPer))) / 60

  let status, note
  if (ratio >= 1.2) {
    status = 'comfortable'
    note = 'There is breathing room — expect spare capacity for upsolving contests on top of the plan.'
  } else if (ratio >= 0.85) {
    status = 'realistic'
    note = 'Tuned right. The volume matches what this climb historically takes.'
  } else if (ratio >= 0.55) {
    status = 'ambitious'
    note = 'Doable, but only with high completion — every skipped day compounds.'
  } else {
    status = 'aggressive'
    note = 'The math says this window is short for the gap. The plan will prioritize the highest-leverage topics first.'
  }
  return {
    gap,
    needed,
    capacity,
    ratio,
    status,
    note,
    suggestedDays: Math.ceil(needed / Math.max(1, perDay)),
    hoursPerDay: Math.round(hoursPerDay * 10) / 10,
  }
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

// ── The Chase ───────────────────────────────────────────────────────────────
export function generateChase(analysis, problems, params) {
  const handle = analysis.handle || 'anon'
  const start = clamp(round100(params.start), RATING_MIN, RATING_MAX)
  const target = clamp(round100(params.target), RATING_MIN, RATING_MAX)
  const days = clamp(Math.round(params.days), 1, 365)
  const perDay = clamp(Math.round(params.perDay), 1, 10)
  const ramp = RAMP_PRESETS[params.ramp] || RAMP_PRESETS.gentle
  const generation = params.generation || 0
  const exclude = params.exclude || new Set()

  const warnings = []
  const end = clamp(Math.max(target + ramp.buffer, start + 100), RATING_MIN, RATING_MAX)
  const totalSlots = days * perDay

  const feasibility = assessFeasibility(analysis.workingLevel ?? start, target, days, perDay)

  // ── requirement gaps → curriculum ─────────────────────────────────────────
  const readiness = readinessFor(analysis, target)
  const gapsAll = readiness.items.filter((i) => i.status !== 'met' && i.weight >= 0.45)

  // order: prerequisites first, then weighted gap
  const ordered = [...gapsAll].sort(
    (a, b) => a.rank - b.rank || b.weight * b.gapPts - a.weight * a.gapPts,
  )
  const MAX_TOPICS = clamp(Math.round(totalSlots / 7) + 3, 3, 10)
  let curriculumTopics = ordered.slice(0, MAX_TOPICS)

  // strong profile, nothing missing → consolidation curriculum at target band
  if (!curriculumTopics.length) {
    curriculumTopics = readiness.items
      .filter((i) => i.weight >= 0.6)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6)
      .map((i) => ({ ...i, gapPts: 100 }))
  }

  // ── per-topic ladders ──────────────────────────────────────────────────────
  // Each topic climbs from (its own current evidence level) to (what the
  // target demands of it) — NOT one global ramp for all topics.
  const mixedShare = perDay >= 3 ? 1 / perDay : perDay === 2 ? 0.25 : 0.15
  const reviewBudget = Math.min(days >= 10 ? Math.floor(days / 5) : 0, 12)
  const currSlots = Math.max(
    curriculumTopics.length * 2,
    Math.round(totalSlots * (1 - mixedShare)) - reviewBudget,
  )

  const sumScore = curriculumTopics.reduce((a, t) => a + t.weight * Math.max(80, t.gapPts), 0) || 1
  const ladders = curriculumTopics.map((t) => {
    const from = clamp(
      round100(Math.min(Math.max(t.current, start - 200), t.required - 100)),
      RATING_MIN,
      RATING_MAX,
    )
    const to = clamp(round100(Math.min(t.required, end + 100)), from, RATING_MAX)
    const steps = Math.max(1, (to - from) / 100 + 1)
    const share = (t.weight * Math.max(80, t.gapPts)) / sumScore
    let count = Math.round(currSlots * share)
    count = clamp(count, Math.min(2, currSlots), Math.ceil(steps * 2.5))
    return { ...t, from, to, steps, count }
  })

  // ── candidate pools ────────────────────────────────────────────────────────
  const byRating = new Map()
  for (const p of problems) {
    if (p.rating == null) continue
    const key = pkey(p)
    if (analysis.solvedSet.has(key) || exclude.has(key)) continue
    if (!byRating.has(p.rating)) byRating.set(p.rating, [])
    byRating.get(p.rating).push(p)
  }
  for (const arr of byRating.values()) arr.sort((a, b) => b.solvedCount - a.solvedCount)

  const seedStr = `${handle}|${start}|${target}|${days}|${perDay}|${params.ramp}|g${generation}`
  const rng = mulberry32(hashString(seedStr))
  const chosen = new Set()

  const candidates = (rating, tag) => {
    const bucket = byRating.get(rating) || []
    return bucket.filter((p) => !chosen.has(pkey(p)) && (!tag || p.tags.includes(tag)))
  }

  // pick → { pick, alts } with graceful rating fallback
  const trySelect = (rating, tag) => {
    for (const delta of [0, -100, 100, -200, 200, -300, 300]) {
      const r = rating + delta
      if (r < RATING_MIN || r > RATING_MAX) continue
      const c = candidates(r, tag)
      if (c.length) {
        const window = Math.min(8, c.length)
        const idx = Math.floor(rng() * window)
        const pick = c[idx]
        const alts = c.filter((_, i) => i !== idx).slice(0, 2)
        return { pick, alts }
      }
    }
    return null
  }

  // importance weights for breadth slots
  const importance = computeTagImportance(problems, start, end)
  const maxImp = Math.max(1, ...importance.values())
  const breadthWeights = []
  for (const [tag, count] of importance.entries()) {
    if (NON_TOPIC_TAGS.has(tag)) continue
    const imp = count / maxImp
    if (imp >= 0.12) breadthWeights.push({ key: tag, weight: imp })
  }

  const primaryTag = (p, preferred) => {
    if (preferred && p.tags.includes(preferred)) return preferred
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

  // ── build per-topic problem queues along each ladder ─────────────────────
  const weaknessSet = new Set(curriculumTopics.filter((t) => t.status === 'missing').map((t) => t.tag))

  for (const lad of ladders) {
    lad.queue = []
    const perStep = lad.count / lad.steps
    let carry = 0
    for (let s = 0; s < lad.steps; s++) {
      const rating = clamp(lad.from + s * 100, RATING_MIN, RATING_MAX)
      carry += perStep
      let take = Math.floor(carry)
      carry -= take
      if (s === lad.steps - 1) take = Math.max(take, lad.count - lad.queue.length)
      for (let k = 0; k < take && lad.queue.length < lad.count; k++) {
        const res = trySelect(rating, lad.tag)
        if (!res) continue
        chosen.add(pkey(res.pick))
        lad.queue.push({
          ...mkProblem(res.pick, lad.tag, importance, maxImp),
          ladderTag: lad.tag,
          ladderStep: lad.queue.length + 1,
          ladderTotal: lad.count,
          targetRating: rating,
          alts: res.alts.map((a) => mkAlt(a)),
        })
      }
    }
    if (lad.queue.length < Math.min(2, lad.count)) {
      warnings.push(`Few unsolved ${prettyTag(lad.tag)} problems near ${lad.from}–${lad.to} — topic underfilled.`)
    }
  }

  // ── day-by-day assembly ───────────────────────────────────────────────────
  const centerFor = (i) => {
    if (days === 1) return clamp(round100((start + end) / 2), RATING_MIN, RATING_MAX)
    const p = i / (days - 1)
    return clamp(round100(start + (end - start) * Math.pow(p, ramp.exp)), RATING_MIN, RATING_MAX)
  }

  const reviews = [] // { dueDay, tag, rating }
  const planDays = []
  let activeIdx = 0 // pointer into ladders
  const liveLadders = ladders.filter((l) => l.queue.length)

  for (let i = 0; i < days; i++) {
    const center = centerFor(i)
    const gate = center + 150
    const dayProblems = []
    const themeTags = new Set()

    // 1) due spaced-repetition review?
    const dueIdx = reviews.findIndex((r) => r.dueDay <= i)
    if (dueIdx !== -1 && dayProblems.length < perDay) {
      const r = reviews.splice(dueIdx, 1)[0]
      const res = trySelect(r.rating, r.tag)
      if (res) {
        chosen.add(pkey(res.pick))
        dayProblems.push({
          ...mkProblem(res.pick, r.tag, importance, maxImp),
          role: 'review',
          alts: res.alts.map((a) => mkAlt(a)),
          reason: `Spaced repetition — ${prettyTag(r.tag)} resurfaces ${i + 1 > r.firstDay ? `${i - r.firstDay} days` : 'days'} after you climbed it, at ${res.pick.rating}. Retention is built on the second pass.`,
        })
        themeTags.add(r.tag)
      }
    }

    // 2) focus-topic slots from the current ladder(s)
    let guard = 0
    while (dayProblems.length < perDay - (perDay >= 3 ? 1 : 0) && liveLadders.length && guard++ < 24) {
      const lad = liveLadders[activeIdx % liveLadders.length]
      if (!lad.queue.length) {
        // topic completed → schedule a review pass a few days out
        if (reviewBudget > reviews.length && i + 3 < days) {
          reviews.push({ dueDay: i + 3, firstDay: i, tag: lad.tag, rating: Math.max(RATING_MIN, lad.to - 100) })
        }
        liveLadders.splice(activeIdx % liveLadders.length, 1)
        continue
      }
      // respect the global ramp gate: don't serve a 1900 DP problem on day 2
      if (lad.queue[0].targetRating > gate) {
        // try the next ladder; if all gated, break to mixed fill
        const anyServable = liveLadders.some((l) => l.queue.length && l.queue[0].targetRating <= gate)
        if (!anyServable) break
        activeIdx++
        continue
      }
      const item = lad.queue.shift()
      dayProblems.push({
        ...item,
        role: 'focus',
        reason: focusReason(item, lad, analysis),
      })
      themeTags.add(lad.tag)
      // rotate between two active ladders for variety
      if (dayProblems.length % 2 === 0) activeIdx++
    }

    // 3) breadth / consolidation / stretch fill
    while (dayProblems.length < perDay) {
      const slotNo = dayProblems.length
      const isFirst = slotNo === 0
      const isLast = slotNo === perDay - 1 && perDay > 1
      const off = isFirst ? -100 : isLast ? 100 : 0
      const rating = clamp(round100(center + off), RATING_MIN, Math.min(RATING_MAX, end + 100))
      const tag = weightedPick(rng, breadthWeights)
      const res = trySelect(rating, tag) || trySelect(rating, null)
      if (!res) break
      chosen.add(pkey(res.pick))
      const display = primaryTag(res.pick, tag)
      dayProblems.push({
        ...mkProblem(res.pick, display, importance, maxImp),
        role: isFirst ? 'consolidate' : isLast ? 'stretch' : 'breadth',
        alts: res.alts.map((a) => mkAlt(a)),
        reason: isFirst
          ? `Warm-up ${prettyTag(display)} at ${res.pick.rating} — just under the day's level, to start with a win.`
          : isLast
            ? `Stretch ${prettyTag(display)} at ${res.pick.rating} — a deliberate step above today's center. Struggle is the point.`
            : `Breadth — ${prettyTag(display)} at ${res.pick.rating} keeps the toolkit wide while the focus topics climb.`,
      })
      themeTags.add(display)
    }

    // order the day: easiest first, stretch last
    dayProblems.sort((a, b) => (a.rating || 0) - (b.rating || 0))

    if (dayProblems.length < perDay) {
      warnings.push(`Day ${i + 1}: only ${dayProblems.length}/${perDay} fresh problems available near ${center}.`)
    }

    planDays.push({
      day: i + 1,
      center,
      theme: [...themeTags].slice(0, 3),
      problems: dayProblems,
    })
  }

  // ── phases from milestones ────────────────────────────────────────────────
  const phases = buildPhases(planDays, start, target)

  const totalList = []
  for (const d of planDays) for (const p of d.problems) totalList.push({ ...p, day: d.day })

  // ── by-topic view (curriculum order) ──────────────────────────────────────
  const ladderByTag = new Map(ladders.map((l) => [l.tag, l]))
  const byTopicMap = new Map()
  for (const p of totalList) {
    const key = p.ladderTag || '__mixed__'
    if (!byTopicMap.has(key)) byTopicMap.set(key, [])
    byTopicMap.get(key).push(p)
  }
  const byTopic = []
  for (const lad of ladders) {
    const items = byTopicMap.get(lad.tag) || []
    if (!items.length) continue
    byTopic.push({
      tag: lad.tag,
      pretty: prettyTag(lad.tag),
      from: lad.from,
      to: lad.to,
      required: lad.required,
      current: lad.current,
      weight: lad.weight,
      weak: weaknessSet.has(lad.tag),
      count: items.length,
      items: items.sort((a, b) => (a.rating || 0) - (b.rating || 0) || a.day - b.day),
    })
  }
  const mixedItems = byTopicMap.get('__mixed__') || []
  if (mixedItems.length) {
    byTopic.push({
      tag: '__mixed__',
      pretty: 'Breadth & consolidation',
      from: start,
      to: end,
      count: mixedItems.length,
      weak: false,
      items: mixedItems.sort((a, b) => a.day - b.day),
    })
  }

  const focusTags = ladders.map((l) => ({
    tag: l.tag,
    weight: l.weight,
    gap: l.gapPts,
    importance: l.weight,
    skill: clamp01(1 - l.gapPts / 500),
    weak: weaknessSet.has(l.tag),
    from: l.from,
    to: l.to,
  }))

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
      generation,
      createdAt: params.createdAt || Date.now(),
      narrative: journeyNarrative(start, target),
      targetBand: bandFor(target).name,
      targetTier: bandFor(target).tier,
    },
    feasibility,
    readiness,
    milestones: milestonesBetween(start, target),
    phases,
    days: planDays,
    totalList,
    byTopic,
    focusTags,
    weaknessSet: [...weaknessSet],
    signature: seedStr,
    warnings,
  }
}

// Back-compat alias
export const generatePlan = generateChase

function mkProblem(p, displayTag, importance, maxImp) {
  return {
    id: pkey(p),
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating,
    tags: p.tags.filter((t) => !NON_TOPIC_TAGS.has(t)).slice(0, 4),
    solvedCount: p.solvedCount,
    url: problemUrl(p.contestId, p.index),
    focusTag: displayTag,
  }
}

function mkAlt(p) {
  return {
    id: pkey(p),
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating,
    solvedCount: p.solvedCount,
    tags: (p.tags || []).filter((t) => !NON_TOPIC_TAGS.has(t)).slice(0, 4),
    url: problemUrl(p.contestId, p.index),
  }
}

function focusReason(item, lad, analysis) {
  const pt = prettyTag(lad.tag)
  const stepTxt = `step ${item.ladderStep}/${item.ladderTotal}`
  if (item.targetRating <= lad.from + 100 && lad.current < lad.required - 150) {
    return `${pt} ladder, ${stepTxt} — starting near your demonstrated level (~${lad.current}) before the climb to ${lad.to}. Biggest gap for ${lad.required}.`
  }
  if (item.targetRating >= lad.to - 100) {
    return `${pt} ladder, ${stepTxt} — this is the level your target demands (~${lad.required}). Solve it and the topic is officially closed.`
  }
  return `${pt} ladder, ${stepTxt} — climbing ${lad.from} → ${lad.to} in 100-point steps. ${analysis && analysis.weaknessSet ? '' : ''}Required at ~${lad.required} for your target.`
}

function buildPhases(planDays, start, target) {
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

  const milestones = milestonesBetween(start, target)
  if (n <= 4 || !milestones.length) {
    if (n <= 4) {
      const [lo, hi] = spanOf(0, n - 1)
      return [
        {
          name: 'Focused sprint',
          from: 1,
          to: n,
          lo,
          hi,
          desc: `A short, concentrated block around ${lo}–${hi}. Hit the focus ladders hard and review every miss.`,
        },
      ]
    }
    const b1 = Math.ceil(n * 0.3)
    const b2 = Math.ceil(n * 0.7)
    const mk = (name, from, to, descFn) => {
      const [lo, hi] = spanOf(from, to)
      return { name, from: from + 1, to: to + 1, lo, hi, desc: descFn(lo, hi) }
    }
    return [
      mk('Foundation', 0, b1 - 1, (lo, hi) => `Days 1–${b1}: consistency at ${lo}–${hi}. Close the fundamentals before climbing.`),
      mk('The Climb', b1, b2 - 1, (lo, hi) => `Days ${b1 + 1}–${b2}: the main ascent through ${lo}–${hi}. Focus ladders get steeper.`),
      mk('Peak Push', b2, n - 1, (lo, hi) => `Days ${b2 + 1}–${n}: peak intensity at ${lo}–${hi}, right at your target. Time yourself — simulate the contest.`),
    ]
  }

  // milestone-based phases: a phase per band crossed
  const phases = []
  let fromIdx = 0
  for (let m = 0; m <= milestones.length; m++) {
    const boundary = m < milestones.length ? milestones[m].rating : Infinity
    let toIdx = n - 1
    for (let i = fromIdx; i < n; i++) {
      if (planDays[i].center >= boundary) {
        toIdx = i - 1
        break
      }
    }
    if (m === milestones.length) toIdx = n - 1
    if (toIdx < fromIdx) continue
    const [lo, hi] = spanOf(fromIdx, toIdx)
    const label = m === 0 ? `Base — own ${lo}` : `${milestones[m - 1].name} — break ${milestones[m - 1].rating}`
    const motto = m === 0 ? 'Stabilize the platform you launch from.' : milestones[m - 1].motto
    phases.push({
      name: label,
      from: fromIdx + 1,
      to: toIdx + 1,
      lo,
      hi,
      desc: `Days ${fromIdx + 1}–${toIdx + 1} · ${lo}–${hi}. ${motto}`,
    })
    fromIdx = toIdx + 1
    if (fromIdx >= n) break
  }
  return phases.length ? phases : buildPhases(planDays, start, start + 100)
}

// ────────────────────────────────────────────────────────────────────────────
//  ADAPTATION — the plan re-plans itself from real progress.
//
//  Call with the current plan, the set of done problem ids, and fresh analysis
//  (e.g. after re-syncing submissions). Past days are preserved; future days
//  are regenerated at an adjusted level. Deterministic via generation counter.
// ────────────────────────────────────────────────────────────────────────────
export function adaptChase(plan, doneIds, analysis, problems) {
  const { meta } = plan
  const elapsedDays = clamp(
    Math.floor((Date.now() - (meta.createdAt || Date.now())) / 86400000),
    0,
    meta.days,
  )
  if (elapsedDays < 2 || elapsedDays >= meta.days) {
    return { plan, changed: false, pace: null, note: elapsedDays >= meta.days ? 'Plan window complete.' : 'Too early to adapt — give it a couple of days.' }
  }

  const pastDays = plan.days.filter((d) => d.day <= elapsedDays)
  const pastProblems = pastDays.flatMap((d) => d.problems)
  const expected = pastProblems.length
  const done = pastProblems.filter((p) => doneIds.has(p.id)).length
  const pace = expected ? done / expected : 1

  let shift = 0
  let note
  if (pace >= 1.0 && expected >= 4) {
    shift = 100
    note = `You're at ${Math.round(pace * 100)}% completion — ahead of schedule. The remaining ${meta.days - elapsedDays} days shift one notch harder.`
  } else if (pace >= 0.7) {
    return { plan, changed: false, pace, note: `Pace ${Math.round(pace * 100)}% — on track. No adjustment needed.` }
  } else {
    shift = -100
    note = `Completion is at ${Math.round(pace * 100)}% — the engine is easing the remaining days down a notch and re-anchoring. Consistency beats intensity.`
  }

  const remainingDays = meta.days - elapsedDays
  const currentCenter = plan.days[elapsedDays - 1]?.center ?? meta.start
  const newStart = clamp(round100(currentCenter + shift), RATING_MIN, meta.target)

  const used = new Set(pastProblems.map((p) => p.id))
  for (const id of doneIds) used.add(id)

  const future = generateChase(analysis, problems, {
    start: newStart,
    target: meta.target,
    days: remainingDays,
    perDay: meta.perDay,
    ramp: meta.ramp,
    generation: (meta.generation || 0) + 1,
    exclude: used,
    createdAt: meta.createdAt,
  })

  const stitchedDays = [
    ...pastDays,
    ...future.days.map((d) => ({ ...d, day: d.day + elapsedDays })),
  ]
  const totalList = []
  for (const d of stitchedDays) for (const p of d.problems) totalList.push({ ...p, day: d.day })

  const adapted = {
    ...future,
    meta: {
      ...meta,
      generation: (meta.generation || 0) + 1,
      total: totalList.length,
      adaptedAt: Date.now(),
      adaptedNote: note,
    },
    phases: plan.phases, // keep the original story arc
    days: stitchedDays,
    totalList,
    signature: plan.signature, // progress stays attached
  }
  return { plan: adapted, changed: true, pace, note }
}
