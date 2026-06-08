import { useEffect, useMemo, useState } from 'react'
import { fmtInt } from '../../lib/constants.js'
import { getDone, setDone as persistDone } from '../../lib/storage.js'

const DCOLOR = { Easy: 'var(--green)', Medium: 'var(--amber)', Hard: 'var(--red)' }

function Chip({ difficulty }) {
  return (
    <span className="rchip" style={{ color: DCOLOR[difficulty] }}>
      {difficulty}
    </span>
  )
}

function ProblemItem({ p, isDone, toggle }) {
  return (
    <div className={'prob' + (isDone ? ' done' : '')}>
      <input type="checkbox" className="chk" checked={isDone} onChange={() => toggle(p.id)} aria-label={`Mark ${p.title}`} />
      <div className="body">
        <a className="name" href={p.url} target="_blank" rel="noreferrer">
          {p.title}
        </a>
        <div className="pills">
          <Chip difficulty={p.difficulty} />
          <span className="pill">{p.sectionName}</span>
          {p.recentlyDone && <span className="pill" style={{ color: 'var(--green)', borderColor: 'rgba(52,211,153,0.4)' }}>recent ✓</span>}
        </div>
      </div>
    </div>
  )
}

export default function LcPrepPlan({ plan, params, onGenerate }) {
  const [draft, setDraft] = useState(params)
  const [done, setDoneState] = useState(() => new Set())
  const [tab, setTab] = useState('curriculum')
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => setDraft(params), [params])

  useEffect(() => {
    const stored = getDone(plan.signature)
    const set = new Set(stored)
    if (stored.size === 0) for (const it of plan.allItems) if (it.recentlyDone) set.add(it.id)
    setDoneState(set)
    setExpanded(new Set(plan.sections.filter((s) => s.isWeak).map((s) => s.id)))
  }, [plan.signature])

  const toggle = (id) => {
    setDoneState((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistDone(plan.signature, next)
      return next
    })
  }

  const toggleSection = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const doneCount = useMemo(() => plan.allItems.filter((i) => done.has(i.id)).length, [plan, done])
  const progress = plan.meta.total ? doneCount / plan.meta.total : 0
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  const dayBySlug = useMemo(() => {
    const m = new Map()
    for (const d of plan.days) for (const it of d.items) m.set(it.id, d.day)
    return m
  }, [plan])

  const exportCsv = () => {
    const header = 'Order,Day,Section,Problem,Difficulty,URL'
    const lines = plan.allItems.map((p, i) =>
      [i + 1, dayBySlug.get(p.id) || '', `"${p.sectionName}"`, `"${p.title.replace(/"/g, "'")}"`, p.difficulty, p.url].join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leetcode-prep-${plan.meta.username}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="section fade-up">
      <div className="section-head">
        <div>
          <h2>Interview prep plan</h2>
          <p>Every section the big-tech blueprint covers — in order, with a daily pace you set.</p>
        </div>
      </div>

      {/* controls */}
      <div className="card pad">
        <div className="card-title">
          <span className="dot" /> Build your prep plan
        </div>
        <div className="controls" style={{ gridTemplateColumns: 'repeat(3,1fr) auto' }}>
          <div className="field">
            <label>Order</label>
            <select className="select" value={draft.order} onChange={(e) => set('order', e.target.value)}>
              <option value="curriculum">Curriculum (foundational → advanced)</option>
              <option value="weakfirst">Weak-first (attack my gaps)</option>
            </select>
          </div>
          <div className="field">
            <label>Problems / day</label>
            <input type="number" min="1" max="15" value={draft.perDay} onChange={(e) => set('perDay', Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Include Hard</label>
            <select className="select" value={draft.includeHard ? 'yes' : 'no'} onChange={(e) => set('includeHard', e.target.value === 'yes')}>
              <option value="yes">Yes — full coverage</option>
              <option value="no">No — Easy/Medium only</option>
            </select>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn" onClick={() => onGenerate(draft)}>
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* summary + progress */}
      <div className="plan-summary" style={{ marginTop: 18 }}>
        <div className="card stat">
          <div className="l">Total problems</div>
          <div className="v">{fmtInt(plan.meta.total)}</div>
        </div>
        <div className="card stat">
          <div className="l">At {plan.meta.perDay}/day</div>
          <div className="v">{plan.meta.days}d</div>
        </div>
        <div className="card stat">
          <div className="l">Sections</div>
          <div className="v">{plan.sections.length}</div>
        </div>
        <div className="card stat">
          <div className="l">Completed</div>
          <div className="v" style={{ color: 'var(--green)' }}>
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 16 }}>
        <div className="progress-wrap">
          <div className="progress-bar">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="progress-num">
            {doneCount}/{plan.meta.total}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="tabs">
            <button className={tab === 'curriculum' ? 'active' : ''} onClick={() => setTab('curriculum')}>
              Curriculum
            </button>
            <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
              Day-by-day
            </button>
          </div>
          <button className="btn ghost sm" onClick={exportCsv}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {tab === 'curriculum' ? (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plan.sections.map((s) => {
            const total = s.problems.length
            const sd = s.problems.filter((p) => done.has(p.id)).length
            const isOpen = expanded.has(s.id)
            return (
              <div className="card pad" key={s.id}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
                  onClick={() => toggleSection(s.id)}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span>
                  {s.isWeak && <span className="pill weak">focus</span>}
                  <span className="pill" style={{ textTransform: 'capitalize' }}>{s.tier}</span>
                  <div style={{ flex: 1 }} />
                  <span className="progress-num">
                    {sd}/{total}
                  </span>
                  <div className="progress-bar" style={{ width: 120 }}>
                    <i style={{ width: `${total ? (sd / total) * 100 : 0}%` }} />
                  </div>
                  <span className="dim" style={{ fontSize: 18, width: 16, textAlign: 'center' }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <>
                    <div className="why" style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 4px' }}>{s.blurb}</div>
                    <div>
                      {s.problems.map((p) => (
                        <ProblemItem key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="days" style={{ marginTop: 16 }}>
          {plan.days.map((d) => (
            <div className="card day" key={d.day}>
              <div className="day-head">
                <span className="d">Day {d.day}</span>
                <span className="c">{d.sectionNames.join(' · ')}</span>
              </div>
              {d.items.map((p) => (
                <ProblemItem key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
