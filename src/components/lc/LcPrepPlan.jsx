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

function TodoItem({ p, isDone, toggle }) {
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
        </div>
      </div>
    </div>
  )
}

function SolvedItem({ p }) {
  return (
    <div className="prob done">
      <input type="checkbox" className="chk" checked readOnly aria-label={`${p.title} already solved`} />
      <div className="body">
        <a className="name" href={p.url} target="_blank" rel="noreferrer">
          {p.title}
        </a>
        <div className="pills">
          <Chip difficulty={p.difficulty} />
          <span className="pill" style={{ color: 'var(--green)', borderColor: 'rgba(52,211,153,0.4)' }}>solved ✓</span>
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
  const [showSolved, setShowSolved] = useState(false)

  useEffect(() => setDraft(params), [params])

  useEffect(() => {
    setDoneState(getDone(plan.signature))
    setExpanded(new Set(plan.sections.filter((s) => s.isWeak && s.todo.length).map((s) => s.id)))
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
    link.download = `leetcode-${plan.meta.level}-prep-${plan.meta.username}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const levelLabel = plan.meta.level === 'advanced' ? 'Advanced' : 'Foundation'

  return (
    <div className="section fade-up">
      <div className="section-head">
        <div>
          <h2>Interview prep plan</h2>
          <p>
            The patterns big tech tests — only the problems you haven&apos;t solved yet, ordered with
            your weak topics first, scheduled to fit your timeline.
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="card pad">
        <div className="card-title">
          <span className="dot" /> Build your prep plan
        </div>
        <div className="controls" style={{ gridTemplateColumns: '1.4fr 1fr auto' }}>
          <div className="field">
            <label>Preparation level</label>
            <select className="select" value={draft.level} onChange={(e) => set('level', e.target.value)}>
              <option value="foundation">Foundation — Easy → Medium build-up</option>
              <option value="advanced">Advanced — mostly Hard &amp; tough Medium</option>
            </select>
          </div>
          <div className="field">
            <label>Days to finish</label>
            <input type="number" min="1" max="365" value={draft.days} onChange={(e) => set('days', Number(e.target.value))} />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn" onClick={() => onGenerate(draft)}>
              Generate
            </button>
          </div>
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          {plan.meta.level === 'advanced'
            ? 'Advanced gives you mostly Hard and above-average Medium problems so that finishing a topic means you’ve truly covered it.'
            : 'Foundation walks each pattern up from Easy to Medium to build solid fundamentals.'}
        </div>
      </div>

      {/* summary + progress */}
      <div className="plan-summary" style={{ marginTop: 18 }}>
        <div className="card stat">
          <div className="l">To-do ({levelLabel})</div>
          <div className="v">{fmtInt(plan.meta.total)}</div>
        </div>
        <div className="card stat">
          <div className="l">Over</div>
          <div className="v">{plan.meta.days}d</div>
          <div className="sub">~{plan.meta.perDay}/day</div>
        </div>
        <div className="card stat">
          <div className="l">Already solved</div>
          <div className="v" style={{ color: 'var(--green)' }}>
            {fmtInt(plan.meta.totalSolvedInScope)}
          </div>
          <div className="sub">hidden from plan</div>
        </div>
        <div className="card stat">
          <div className="l">Checked off</div>
          <div className="v" style={{ color: 'var(--cyan)' }}>
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
              By topic
            </button>
            <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
              Day-by-day
            </button>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--muted)' }}>
              <input type="checkbox" checked={showSolved} onChange={(e) => setShowSolved(e.target.checked)} /> Show solved
            </label>
            <button className="btn ghost sm" onClick={exportCsv}>
              ⬇ Export CSV
            </button>
          </div>
        </div>
      </div>

      {plan.meta.total === 0 && (
        <div className="warn" style={{ marginTop: 16 }}>
          You&apos;ve already solved every problem in this track — switch to{' '}
          {plan.meta.level === 'foundation' ? 'Advanced' : 'Foundation'} for more, or turn on “Show solved”.
        </div>
      )}

      {tab === 'curriculum' ? (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plan.sections.map((s) => {
            const total = s.todo.length
            const sd = s.todo.filter((p) => done.has(p.id)).length
            const isOpen = expanded.has(s.id)
            return (
              <div className="card pad" key={s.id}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
                  onClick={() => toggleSection(s.id)}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span>
                  {s.isWeak && <span className="pill weak">focus</span>}
                  {s.complete && <span className="pill" style={{ color: 'var(--green)', borderColor: 'rgba(52,211,153,0.4)' }}>complete ✓</span>}
                  <span className="pill" style={{ textTransform: 'capitalize' }}>{s.tier}</span>
                  {s.solvedCount > 0 && <span className="dim" style={{ fontSize: 12 }}>{s.solvedCount} solved</span>}
                  <div style={{ flex: 1 }} />
                  <span className="progress-num">
                    {sd}/{total} to-do
                  </span>
                  <div className="progress-bar" style={{ width: 110 }}>
                    <i style={{ width: `${total ? (sd / total) * 100 : 100}%` }} />
                  </div>
                  <span className="dim" style={{ fontSize: 18, width: 16, textAlign: 'center' }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <>
                    <div className="why" style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 4px' }}>{s.blurb}</div>
                    <div>
                      {s.todo.map((p) => (
                        <TodoItem key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
                      ))}
                      {showSolved && s.solved.map((p) => <SolvedItem key={p.id} p={p} />)}
                      {!s.todo.length && !showSolved && (
                        <div className="dim" style={{ fontSize: 13, padding: '6px 0' }}>
                          All {s.solvedCount} problems in this track are done. 🎉
                        </div>
                      )}
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
                <TodoItem key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
