// ═══ THE CHASE ═══
// Target, days, problems/day → a staged expedition. Three views: the
// curriculum (by topic, in prerequisite order), the day-by-day climb, and the
// full manifest. Live progress, swap-able problems, spaced reviews, and a
// re-sync that lets the engine re-plan the remaining days from reality.

import { useEffect, useMemo, useState } from 'react'
import { prettyTag, ratingColor, ratingTier, fmtInt } from '../lib/constants.js'
import { getDone, setDone as persistDone } from '../lib/storage.js'
import { Reveal, ProgressRing, PlanRidge, Marquee, CountUp } from '../fx/Fx.jsx'
import FullList from './FullList.jsx'

const RAMPS = [
  { value: 'gentle', label: 'Gentle — long, smooth climb' },
  { value: 'moderate', label: 'Moderate — balanced' },
  { value: 'steep', label: 'Steep — aggressive, +200 overshoot' },
]

const FEAS_COLOR = {
  comfortable: 'var(--green)',
  realistic: 'var(--green)',
  ambitious: 'var(--amber)',
  aggressive: 'var(--red)',
}

/* ── a single problem row ────────────────────────────────────────────────── */
export function ProblemRow({ p, isDone, toggle, onSwap, dense }) {
  return (
    <div className={'prob' + (isDone ? ' done' : '')}>
      <input
        type="checkbox"
        className="chk"
        checked={isDone}
        onChange={() => toggle(p.id)}
        aria-label={`Mark ${p.name} done`}
      />
      <div className="body">
        <a className="name" href={p.url} target="_blank" rel="noreferrer">
          {p.contestId}
          {p.index} · {p.name}
        </a>
        {!dense && <div className="why">{p.reason}</div>}
        <div className="pills">
          <span className="rchip" style={{ color: ratingColor(p.rating) }}>
            ◆ {p.rating}
          </span>
          {p.role && <span className={`pill role-${p.role}`}>{p.role}</span>}
          {p.ladderStep && (
            <span className="pill">
              step {p.ladderStep}/{p.ladderTotal}
            </span>
          )}
          {p.weakArea && <span className="pill weak">weak area</span>}
          {(p.tags || []).slice(0, dense ? 2 : 3).map((t) => (
            <span className="pill" key={t}>
              {prettyTag(t)}
            </span>
          ))}
          {onSwap && p.alts && p.alts.length > 0 && (
            <details className="swap">
              <summary title="Swap for an alternate problem">⇄</summary>
              <div className="swap-menu">
                <div className="lbl">Swap for…</div>
                {p.alts.map((alt) => (
                  <button
                    className="alt"
                    key={alt.id}
                    onClick={(e) => {
                      e.preventDefault()
                      onSwap(p.id, alt.id)
                      e.target.closest('details')?.removeAttribute('open')
                    }}
                  >
                    {alt.contestId}
                    {alt.index} · {alt.name}
                    <small>
                      {alt.rating} · {fmtInt(alt.solvedCount)} solvers
                    </small>
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── controls ────────────────────────────────────────────────────────────── */
function Controls({ params, target, onGenerate, suggestedStart, feasibility }) {
  const [draft, setDraft] = useState({ ...params, target })

  useEffect(() => {
    setDraft((d) => ({ ...d, ...params, target }))
  }, [params, target])

  const num = (k, v) => setDraft((d) => ({ ...d, [k]: v === '' ? '' : Number(v) }))

  const start = Number(draft.start)
  const tgt = Number(draft.target)
  const days = Number(draft.days)
  const perDay = Number(draft.perDay)
  const valid =
    Number.isFinite(start) &&
    Number.isFinite(tgt) &&
    tgt >= start + 100 &&
    days >= 1 &&
    days <= 365 &&
    perDay >= 1 &&
    perDay <= 8

  return (
    <div>
      <div className="controls-grid">
        <div className="nfield">
          <label>Start rating</label>
          <input type="number" step="100" value={draft.start} onChange={(e) => num('start', e.target.value)} />
          <div className="hint">engine suggests {suggestedStart}</div>
        </div>
        <div className="nfield">
          <label>Target rating</label>
          <input type="number" step="100" value={draft.target} onChange={(e) => num('target', e.target.value)} />
          <div className="hint" style={{ color: ratingTier(tgt).color }}>
            {ratingTier(tgt).name} territory
          </div>
        </div>
        <div className="nfield">
          <label>Days</label>
          <input type="number" min="1" max="365" value={draft.days} onChange={(e) => num('days', e.target.value)} />
          <div className="hint">{valid ? `${days * perDay} problems total` : ' '}</div>
        </div>
        <div className="nfield">
          <label>Problems / day</label>
          <input type="number" min="1" max="8" value={draft.perDay} onChange={(e) => num('perDay', e.target.value)} />
          <div className="hint">3 is the honest default</div>
        </div>
        <div className="nfield">
          <label>Ramp</label>
          <select className="select" value={draft.ramp} onChange={(e) => setDraft((d) => ({ ...d, ramp: e.target.value }))}>
            {RAMPS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn solid" disabled={!valid} onClick={() => onGenerate(draft)}>
          Stage the chase →
        </button>
        {!valid && (
          <span className="dim" style={{ fontStyle: 'italic', fontSize: 14 }}>
            target ≥ start+100 · days 1–365 · 1–8 problems/day
          </span>
        )}
      </div>

      {feasibility && (
        <div className="feas">
          <span className="tag" style={{ color: FEAS_COLOR[feasibility.status] }}>
            {feasibility.status}
          </span>
          <span className="txt">{feasibility.note}</span>
          <span className="m">
            gap <b>+{feasibility.gap}</b> · needs ≈<b>{feasibility.needed}</b> problems · you planned{' '}
            <b>{feasibility.capacity}</b> · ≈<b>{feasibility.hoursPerDay}h</b>/day
            {feasibility.capacity < feasibility.needed ? (
              <>
                {' '}
                · suggested <b>{feasibility.suggestedDays}</b> days
              </>
            ) : null}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── by-topic curriculum view ───────────────────────────────────────────── */
function TopicView({ plan, done, toggle, onSwap }) {
  return (
    <div>
      {plan.byTopic.map((t, i) => {
        const doneCount = t.items.filter((p) => done.has(p.id)).length
        const pct = t.items.length ? doneCount / t.items.length : 0
        return (
          <Reveal className="topic-block" key={t.tag} delay={Math.min(i * 60, 300)}>
            <details open={i < 2}>
              <summary className="topic-head" style={{ listStyle: 'none' }}>
                <span className="nm">
                  {i + 1 < 10 ? `0${i + 1}` : i + 1} · {t.pretty}
                  {t.weak ? <span className="pill weak" style={{ marginLeft: 10, verticalAlign: 'middle' }}>priority gap</span> : null}
                </span>
                <span className="route">
                  {t.tag === '__mixed__' ? (
                    <>woven through the climb</>
                  ) : (
                    <>
                      ladder <b>{t.from}</b> → <b>{t.to}</b>
                      {t.required ? <> · required ~{t.required}</> : null}
                    </>
                  )}
                </span>
                <span className="spacer" />
                <span className="topic-prog">
                  <span className="topic-bar">
                    <i style={{ width: `${pct * 100}%` }} />
                  </span>
                  {doneCount}/{t.items.length}
                </span>
              </summary>
              <div className="topic-items">
                {t.items.map((p) => (
                  <ProblemRow key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} onSwap={onSwap} />
                ))}
              </div>
            </details>
          </Reveal>
        )
      })}
    </div>
  )
}

/* ── by-day expedition view ─────────────────────────────────────────────── */
function DayView({ plan, done, toggle, onSwap }) {
  return (
    <div>
      {plan.phases.map((ph) => (
        <div className="phase" key={ph.name}>
          <Reveal className="phase-head">
            <span className="badge">{ph.name}</span>
            <p>{ph.desc}</p>
          </Reveal>
          <div className="days-grid">
            {plan.days
              .filter((d) => d.day >= ph.from && d.day <= ph.to)
              .map((d, i) => {
                const allDone = d.problems.length > 0 && d.problems.every((p) => done.has(p.id))
                return (
                  <Reveal className="day-card" key={d.day} delay={Math.min(i * 40, 240)}>
                    <div className="day-head">
                      <span className="d">
                        DAY {d.day} {allDone ? '✦' : ''}
                      </span>
                      <span className="c">
                        center ~{d.center}
                        {d.theme?.length ? ` · ${d.theme.map(prettyTag).join(' / ')}` : ''}
                      </span>
                    </div>
                    {d.problems.map((p) => (
                      <ProblemRow key={p.id} p={p} isDone={done.has(p.id)} toggle={toggle} onSwap={onSwap} />
                    ))}
                  </Reveal>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── the section ────────────────────────────────────────────────────────── */
export default function Chase({ plan, params, target, onGenerate, onSwap, onResync, resyncState, suggestedStart, autoDone }) {
  const [tab, setTab] = useState('topics')
  const [done, setDoneState] = useState(() => (plan ? getDone(plan.signature) : new Set()))

  useEffect(() => {
    if (!plan) return
    const stored = getDone(plan.signature)
    // fold in problems already solved on CF (auto-detected on sync)
    let merged = stored
    if (autoDone && autoDone.size) {
      merged = new Set(stored)
      for (const id of autoDone) merged.add(id)
      if (merged.size !== stored.size) persistDone(plan.signature, merged)
    }
    setDoneState(merged)
  }, [plan?.signature, autoDone])

  const toggle = (id) => {
    setDoneState((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistDone(plan.signature, next)
      return next
    })
  }

  const doneInPlan = useMemo(
    () => (plan ? plan.totalList.filter((p) => done.has(p.id)).length : 0),
    [plan, done],
  )
  const progress = plan && plan.meta.total ? doneInPlan / plan.meta.total : 0

  return (
    <section className="section" id="chase">
      <Reveal className="sec-head">
        <span className="num">04 — THE PLAN</span>
        <h2 className="display" style={{ fontFamily: 'var(--display)', fontWeight: 800, letterSpacing: '0.06em' }}>
          THE CHASE
        </h2>
        <p className="sub">
          {plan
            ? plan.meta.narrative
            : 'Set the target, the window, and the daily load — the engine stages the expedition.'}
        </p>
      </Reveal>

      <Reveal className="card pad corner" style={{ marginBottom: 18 }}>
        <div className="card-label">
          <span className="tick">✦</span> Expedition parameters
        </div>
        <Controls
          params={params}
          target={target}
          onGenerate={onGenerate}
          suggestedStart={suggestedStart}
          feasibility={plan?.feasibility}
        />
      </Reveal>

      {!plan ? (
        <div className="warn">Couldn&apos;t stage a chase with those settings — widen the window or lower the target.</div>
      ) : (
        <>
          <Marquee
            items={[
              `${plan.meta.start} → ${plan.meta.target}`,
              `${plan.meta.days} DAYS`,
              `${plan.meta.total} PROBLEMS`,
              `${plan.byTopic.length} TOPICS`,
              plan.meta.targetBand.toUpperCase(),
              `GEN ${plan.meta.generation}`,
            ]}
            duration={26}
          />

          <Reveal className="card pad" style={{ marginTop: 18 }}>
            <div className="chase-overview">
              <ProgressRing pct={progress} label="conquered" sub={`${doneInPlan}/${plan.meta.total}`} big />
              <div style={{ minWidth: 0 }}>
                <div className="card-label">
                  <span className="tick">✦</span> The climb, drawn — each bar one day
                </div>
                <PlanRidge days={plan.days} lo={plan.meta.start} hi={plan.meta.end} done={done} height={120} />
                <div className="pills" style={{ marginTop: 14 }}>
                  {plan.focusTags.slice(0, 8).map((f) => (
                    <span className={'pill' + (f.weak ? ' weak' : '')} key={f.tag} title={`ladder ${f.from} → ${f.to}`}>
                      {prettyTag(f.tag)} {f.from}→{f.to}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <hr className="rule" style={{ margin: '24px 0' }} />

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn sm" onClick={onResync} disabled={resyncState === 'busy'}>
                {resyncState === 'busy' ? 'Consulting the mountain…' : '⟳ Re-sync & adapt'}
              </button>
              <span className="dim" style={{ fontSize: 13.5, fontStyle: 'italic', flex: 1, minWidth: 200 }}>
                {resyncState && resyncState !== 'busy'
                  ? resyncState
                  : 'Re-reads your submissions, auto-checks anything you solved on Codeforces, and re-plans the remaining days from your real pace.'}
              </span>
              <div className="tabs">
                <button className={tab === 'topics' ? 'active' : ''} onClick={() => setTab('topics')}>
                  By topic
                </button>
                <button className={tab === 'days' ? 'active' : ''} onClick={() => setTab('days')}>
                  By day
                </button>
                <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
                  Manifest
                </button>
              </div>
            </div>
          </Reveal>

          {plan.meta.adaptedNote && <div className="warn" style={{ borderColor: 'var(--line-2)', color: 'var(--gold-2)' }}>⟲ {plan.meta.adaptedNote}</div>}

          {plan.warnings.length > 0 && (
            <div className="warn">
              {plan.warnings.length} day(s) ran short of fresh problems near their rating — closest difficulties were substituted.
            </div>
          )}

          <div style={{ marginTop: 28 }}>
            {tab === 'topics' && <TopicView plan={plan} done={done} toggle={toggle} onSwap={onSwap} />}
            {tab === 'days' && <DayView plan={plan} done={done} toggle={toggle} onSwap={onSwap} />}
            {tab === 'list' && <FullList plan={plan} done={done} toggle={toggle} />}
          </div>
        </>
      )}
    </section>
  )
}
