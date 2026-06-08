// LeetCode prep-plan generator.
//
// Produces a full-coverage interview-prep plan from the blueprint:
//   • a curriculum (sections in learning order, or weak-first), and
//   • a day-by-day schedule at a chosen pace.
// Problems already solved recently are pre-checked; the rest is tracked locally.

import { SECTIONS, lcProblemUrl } from './interviewBlueprint.js'
import { clamp } from './constants.js'

const SECTION_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]))

export function generateLcPlan(analysis, params) {
  const username = analysis.username || 'anon'
  const order = params.order === 'weakfirst' ? 'weakfirst' : 'curriculum'
  const perDay = clamp(Math.round(params.perDay || 4), 1, 15)
  const includeHard = params.includeHard !== false

  // section order
  const orderedIds =
    order === 'weakfirst'
      ? analysis.focusOrder.map((s) => s.id)
      : SECTIONS.map((s) => s.id)

  const masteryById = new Map(analysis.sections.map((s) => [s.id, s]))
  const recent = analysis.recentSolvedSlugs || new Set()

  const seen = new Set()
  const sectionsPlan = []
  const allItems = []

  for (const id of orderedIds) {
    const s = SECTION_BY_ID.get(id)
    if (!s) continue
    const items = []
    for (const p of s.problems) {
      if (!includeHard && p.difficulty === 'Hard') continue
      if (seen.has(p.slug)) continue
      seen.add(p.slug)
      const item = {
        id: p.slug,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        url: lcProblemUrl(p.slug),
        sectionId: s.id,
        sectionName: s.name,
        recentlyDone: recent.has(p.slug),
      }
      items.push(item)
      allItems.push(item)
    }
    const m = masteryById.get(id)
    sectionsPlan.push({
      id: s.id,
      name: s.name,
      tier: s.tier,
      importance: s.importance,
      blurb: s.blurb,
      target: s.target,
      mastery: m ? m.mastery : 0,
      solvedTagged: m ? m.solved : 0,
      isWeak: analysis.weakSections.some((w) => w.id === s.id),
      problems: items,
    })
  }

  // day-by-day schedule (problems flow in the chosen order)
  const days = []
  for (let i = 0; i < allItems.length; i += perDay) {
    const items = allItems.slice(i, i + perDay)
    const sectionNames = [...new Set(items.map((it) => it.sectionName))]
    days.push({ day: days.length + 1, items, sectionNames })
  }

  const total = allItems.length
  const estimatedDays = Math.max(1, Math.ceil(total / perDay))
  const signature = `lc|${username}|${order}|${perDay}|${includeHard ? 'H' : 'noH'}`

  return {
    meta: { username, order, perDay, includeHard, total, days: estimatedDays },
    sections: sectionsPlan,
    days,
    allItems,
    signature,
  }
}
