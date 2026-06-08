import { useEffect, useMemo, useState } from 'react'
import { prettyTag, ratingColor, fmtInt } from '../lib/constants.js'
import { getDone, setDone as persistDone } from '../lib/storage.js'
import FullList from './FullList.jsx'

function ProblemRow({ p, isDone, toggle }) {
  return (
    <div className={'prob' + (isDone ? ' done' : '')}>
      <input type="checkbox" className="chk" checked={isDone} onChange={() => toggle(p.id)} aria-label={`Mark ${p.name} done`} />
      <div className="body">
        <a className="name" href={p.url} target="_blank" rel="noreferrer">
          {p.contestId}
          {p.index} · {p.name}
        </a>
        <div className="why">{p.reason}</div>
        <div className="pills">
          <span className="rchip" style={{ color: ratingColor(p.rating) }}>
            {p.rating}
          </span>
          <span className="pill role">{p.role}</span>
          {p.weakArea && <span className="pill weak">weak area</span>}
          {p.tags.slice(0, 3).map((t) => (
            <span className="pill" key={t}>
              {prettyTag(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayCard({ d, done, toggle }) {
  return (
    <div className="card day">
      <div className="day-head">
        <span className="d">Day {d.day}</span>
        <span className="c">focus ~{d.center}</span>
      </div>
      {d.problems.map((p) => (
        <ProblemRow key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} />
      ))}
    </div>
  )
}

function SummaryStat({ label, value, color }) {
  return (
    <div className="card stat">
      <div className="l">{label}</div>
      <div className="v" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  )
}

export default function StudyPlan({ plan }) {
  const [done, setDoneState] = useState(() => getDone(plan.signature))
  const [tab, setTab] = useState('plan')

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

  const allIds = useMemo(() => new Set(plan.totalList.map((p) => p.id)), [plan])
  const doneInPlan = useMemo(() => plan.totalList.filter((p) => done.has(p.id)).length, [plan, done])
  const progress = plan.meta.total ? doneInPlan / plan.meta.total : 0

  // ramp visualization heights
  const lo = plan.meta.start
  const hi = Math.max(plan.meta.end, plan.meta.start + 100)

  return (
    <div className="section fade-up">
      <div className="section-head">
        <div>
          <h2>Your climb: {plan.meta.start} → {plan.meta.target}</h2>
          <p>
            {plan.meta.total} hand-picked, unsolved problems over {plan.meta.days} days. Difficulty
            ramps gradually and front-loads your weak areas.
          </p>
        </div>
        <div className="tabs">
          <button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>
            Daily plan
          </button>
          <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
            Full list
          </button>
        </div>
      </div>

      <div className="plan-summary">
        <SummaryStat label="Start" value={plan.meta.start} color={ratingColor(plan.meta.start)} />
        <SummaryStat label="Target" value={plan.meta.target} color={ratingColor(plan.meta.target)} />
        <SummaryStat label="Days" value={plan.meta.days} />
        <SummaryStat label="Total problems" value={fmtInt(plan.meta.total)} />
      </div>

      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>
          <span className="dot" /> Progress
        </div>
        <div className="progress-wrap">
          <div className="progress-bar">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="progress-num">
            {doneInPlan}/{plan.meta.total} · {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="ramp-vis" title="Difficulty ramp across days">
          {plan.days.map((d) => {
            const h = ((d.center - lo) / (hi - lo)) * 100
            return <i key={d.day} style={{ height: `${Math.max(6, h)}%` }} />
          })}
        </div>
        <div className="legend" style={{ marginTop: 8 }}>
          <span className="dim">Each bar = one day&apos;s difficulty, climbing from {lo} to {hi}.</span>
        </div>

        {plan.focusTags.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
              Topic focus (weighted toward weak + important areas):
            </div>
            <div className="pills">
              {plan.focusTags.slice(0, 10).map((f) => (
                <span className={'pill' + (f.weak ? ' weak' : '')} key={f.tag}>
                  {prettyTag(f.tag)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {plan.warnings.length > 0 && (
        <div className="warn">
          Heads up: {plan.warnings.length} day(s) had fewer fresh problems than requested near those
          ratings (you may have already solved most popular ones). The plan filled the closest
          available difficulties.
        </div>
      )}

      {tab === 'plan' ? (
        <div>
          {plan.phases.map((ph) => (
            <div className="phase" key={ph.name}>
              <div className="phase-head">
                <span className="badge">{ph.name}</span>
                <p>{ph.desc}</p>
              </div>
              <div className="days">
                {plan.days
                  .filter((d) => d.day >= ph.from && d.day <= ph.to)
                  .map((d) => (
                    <DayCard key={d.day} d={d} done={done} toggle={toggle} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FullList plan={plan} done={done} toggle={toggle} />
      )}
    </div>
  )
}
