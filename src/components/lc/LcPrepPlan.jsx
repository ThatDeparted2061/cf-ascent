// THE OFFER CHASE — the LeetCode prep plan, staged by pattern.

import { useEffect, useMemo, useState } from 'react'
import { fmtInt } from '../../lib/constants.js'
import { getDone, setDone as persistDone } from '../../lib/storage.js'
import { Reveal, ProgressRing, Marquee } from '../../fx/Fx.jsx'

const DCOLOR = { Easy: 'var(--green)', Medium: 'var(--amber)', Hard: 'var(--red)' }

function Chip({ difficulty }) {
  return (
    <span className="rchip" style={{ color: DCOLOR[difficulty] }}>
      ◆ {difficulty}
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
          <span className="pill" style={{ color: 'var(--green)', borderColor: 'rgba(163,184,127,0.4)' }}>solved ✓</span>
        </div>
      </div>
    </div>
  )
}

export default function LcPrepPlan({ plan, params, onGenerate }) {
  const [draft, setDraft] = useState(params)
  const [done, setDoneState] = useState(() => new Set())
  const [tab, setTab] = useState('curriculum')
  const [showSolved, setShowSolved] = useState(false)

  useEffect(() => setDraft(params), [params])
  useEffect(() => {
    setDoneState(getDone(plan.signature))
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
    link.download = `ascent-offer-chase-${plan.meta.level}-${plan.meta.username}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="section">
      <Reveal className="sec-head">
        <span className="num">03 — THE PLAN</span>
        <h2 className="display" style={{ fontFamily: 'var(--display)', fontWeight: 800, letterSpacing: '0.06em' }}>
          THE OFFER CHASE
        </h2>
        <p className="sub">
          Every pattern big tech tests, weak sections first, already-solved problems hidden, scheduled to your window.
        </p>
      </Reveal>

      <Reveal className="card pad corner" style={{ marginBottom: 18 }}>
        <div className="card-label">
          <span className="tick">✦</span> Expedition parameters
        </div>
        <div className="controls-grid" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
          <div className="nfield">
            <label>Preparation level</label>
            <select className="select" value={draft.level} onChange={(e) => set('level', e.target.value)}>
              <option value="foundation">Foundation — Easy → Medium build-up</option>
              <option value="advanced">Advanced — mostly Hard &amp; tough Medium</option>
            </select>
            <div className="hint">
              {draft.level === 'advanced'
                ? 'Finishing a topic at Advanced means you have truly covered it.'
                : 'Walks each pattern up from Easy to Medium — solid fundamentals.'}
            </div>
          </div>
          <div className="nfield">
            <label>Days to finish</label>
            <input type="number" min="1" max="365" value={draft.days} onChange={(e) => set('days', Number(e.target.value))} />
            <div className="hint">≈{plan.meta.perDay || '—'} problems/day at current size</div>
          </div>
          <div className="nfield" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn solid" onClick={() => onGenerate(draft)}>
              Stage it →
            </button>
          </div>
        </div>
      </Reveal>

      <Marquee
        items={[
          `${plan.meta.total} TO CONQUER`,
          `${plan.meta.days} DAYS`,
          `${plan.meta.totalSolvedInScope} ALREADY YOURS`,
          plan.meta.level.toUpperCase(),
          `${plan.sections.filter((s) => s.isWeak).length} PRIORITY SECTIONS`,
        ]}
        duration={26}
      />

      <Reveal className="card pad" style={{ marginTop: 18 }}>
        <div className="chase-overview">
          <ProgressRing pct={progress} label="conquered" sub={`${doneCount}/${plan.meta.total}`} big />
          <div>
            <div className="card-label">
              <span className="tick">✦</span> The war report
            </div>
            <p className="verdict" style={{ fontSize: 'clamp(17px,2vw,22px)', margin: 0 }}>
              <b>{fmtInt(plan.meta.total)}</b> problems stand between you and full blueprint coverage —{' '}
              <b>{fmtInt(plan.meta.totalSolvedInScope)}</b> are already behind you and hidden from the list.{' '}
              {plan.meta.total === 0
                ? 'Every problem in this track is done. Switch levels, or go collect the offer.'
                : `At ~${plan.meta.perDay}/day this closes in ${plan.meta.days} days.`}
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
              <div className="tabs">
                <button className={tab === 'curriculum' ? 'active' : ''} onClick={() => setTab('curriculum')}>
                  By topic
                </button>
                <button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
                  By day
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  className="chk"
                  style={{ marginTop: 0, width: 16, height: 16 }}
                  checked={showSolved}
                  onChange={(e) => setShowSolved(e.target.checked)}
                />
                show solved
              </label>
              <button className="btn ghost sm" onClick={exportCsv}>
                ↓ Export CSV
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {plan.meta.total === 0 && (
        <div className="warn" style={{ marginTop: 16 }}>
          You&apos;ve already conquered every problem in this track — switch to{' '}
          {plan.meta.level === 'foundation' ? 'Advanced' : 'Foundation'}, or flip on “show solved” to admire the bodies.
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        {tab === 'curriculum' ? (
          <div>
            {plan.sections.map((s, i) => {
              const total = s.todo.length
              const sd = s.todo.filter((p) => done.has(p.id)).length
              const pct = total ? sd / total : 1
              return (
                <Reveal className="topic-block" key={s.id} delay={Math.min(i * 50, 280)}>
                  <details open={s.isWeak && total > 0}>
                    <summary className="topic-head" style={{ listStyle: 'none' }}>
                      <span className="nm">
                        {i + 1 < 10 ? `0${i + 1}` : i + 1} · {s.name}
                        {s.isWeak && <span className="pill weak" style={{ marginLeft: 10, verticalAlign: 'middle' }}>priority gap</span>}
                        {s.complete && (
                          <span className="pill" style={{ marginLeft: 10, verticalAlign: 'middle', color: 'var(--green)', borderColor: 'rgba(163,184,127,0.4)' }}>
                            complete ✓
                          </span>
                        )}
                      </span>
                      <span className="route">
                        {s.tier} · mastery <b>{Math.round(s.mastery * 100)}%</b>
                        {s.solvedCount > 0 ? ` · ${s.solvedCount} already solved` : ''}
                      </span>
                      <span className="spacer" />
                      <span className="topic-prog">
                        <span className="topic-bar">
                          <i style={{ width: `${pct * 100}%` }} />
                        </span>
                        {sd}/{total}
                      </span>
                    </summary>
                    <div className="topic-items">
                      <p className="dim" style={{ fontStyle: 'italic', fontSize: 14, margin: '10px 0 4px' }}>
                        {s.blurb}
                      </p>
                      {s.todo.map((p) => (
                        <TodoItem key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
                      ))}
                      {showSolved && s.solved.map((p) => <SolvedItem key={p.id} p={p} />)}
                      {!s.todo.length && !showSolved && (
                        <div className="dim" style={{ fontSize: 14, fontStyle: 'italic', padding: '8px 0' }}>
                          All {s.solvedCount} problems in this track already conquered.
                        </div>
                      )}
                    </div>
                  </details>
                </Reveal>
              )
            })}
          </div>
        ) : (
          <div className="days-grid">
            {plan.days.map((d, i) => (
              <Reveal className="day-card" key={d.day} delay={Math.min(i * 30, 240)}>
                <div className="day-head">
                  <span className="d">DAY {d.day}</span>
                  <span className="c">{d.sectionNames.slice(0, 2).join(' · ')}</span>
                </div>
                {d.items.map((p) => (
                  <TodoItem key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
                ))}
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
