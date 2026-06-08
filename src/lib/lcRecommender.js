// LeetCode prep-plan generator.
//
// Builds a plan for the patterns big-tech interviews test, at one of two levels:
//
//   • Foundation — Easy → Medium build-up to learn each pattern.
//   • Advanced   — mostly Hard + above-average Mediums, for full depth.
//
// Problems you've ALREADY solved on LeetCode are excluded from the to-do list
// (so nothing you've done shows up as an open task) but surfaced separately,
// pre-marked, so you can see your coverage. Important/weak topics come first, and
// everything is scheduled to fit within the number of days you choose.

import { SECTIONS, problemsForLevel, lcProblemUrl } from './interviewBlueprint.js'
import { clamp } from './constants.js'

const SECTION_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]))

export function generateLcPlan(analysis, params) {
  const username = analysis.username || 'anon'
  const level = params.level === 'advanced' ? 'advanced' : 'foundation'
  const days = clamp(Math.round(params.days || 30), 1, 365)
  const solvedSlugs = analysis.solvedSlugs || new Set()

  // order: weak/important topics first (analysis.focusOrder already does this)
  const orderedSections = analysis.focusOrder.length
    ? analysis.focusOrder
    : analysis.sections

  const masteryById = new Map(analysis.sections.map((s) => [s.id, s]))
  const weakIds = new Set(analysis.weakSections.map((s) => s.id))

  const seen = new Set()
  const sectionsPlan = []
  const allTodo = []
  let totalInScope = 0
  let totalSolvedInScope = 0

  const mk = (p, s) => ({
    id: p.slug,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    url: lcProblemUrl(p.slug),
    sectionId: s.id,
    sectionName: s.name,
  })

  for (const ord of orderedSections) {
    const s = SECTION_BY_ID.get(ord.id)
    if (!s) continue
    const levelProblems = problemsForLevel(s, level)
    const todo = []
    const solved = []
    for (const p of levelProblems) {
      if (seen.has(p.slug)) continue
      seen.add(p.slug)
      const item = mk(p, s)
      if (solvedSlugs.has(p.slug)) {
        solved.push({ ...item, solved: true })
      } else {
        todo.push(item)
        allTodo.push(item)
      }
    }
    totalInScope += todo.length + solved.length
    totalSolvedInScope += solved.length

    const m = masteryById.get(s.id)
    sectionsPlan.push({
      id: s.id,
      name: s.name,
      tier: s.tier,
      importance: s.importance,
      blurb: s.blurb,
      mastery: m ? m.mastery : 0,
      isWeak: weakIds.has(s.id),
      levelTotal: todo.length + solved.length,
      solvedCount: solved.length,
      todo,
      solved,
      complete: todo.length === 0 && todo.length + solved.length > 0,
    })
  }

  // schedule the to-do problems to fit within `days`
  const total = allTodo.length
  const perDay = total ? Math.max(1, Math.ceil(total / days)) : 0
  const planDays = []
  for (let i = 0; i < total; i += perDay || 1) {
    const items = allTodo.slice(i, i + (perDay || 1))
    if (!items.length) break
    planDays.push({
      day: planDays.length + 1,
      items,
      sectionNames: [...new Set(items.map((it) => it.sectionName))],
    })
  }

  const signature = `lc|${username}|${level}|${days}`

  return {
    meta: {
      username,
      level,
      days: planDays.length || days,
      requestedDays: days,
      perDay,
      total,
      totalInScope,
      totalSolvedInScope,
    },
    sections: sectionsPlan,
    days: planDays,
    allItems: allTodo,
    signature,
  }
}
