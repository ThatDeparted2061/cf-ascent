// Shared SVG/CSS charts — all animate into view, all hand-built.

import { prettyTag, ratingColor, clamp, clamp01 } from '../lib/constants.js'
import { useInView } from '../fx/Fx.jsx'

/* ── Rating distribution (engraved bars) ─────────────────────────────────── */
export function RatingBars({ distribution, start, target }) {
  const [ref, inView] = useInView(0.25)
  let lastNonZero = 800
  for (const d of distribution) if (d.count > 0) lastNonZero = d.rating
  const showMax = clamp(Math.max(lastNonZero, (target || 0) + 100, start || 0), 800, 3500)
  const shown = distribution.filter((d) => d.rating >= 800 && d.rating <= showMax)
  const maxCount = Math.max(1, ...shown.map((d) => d.count))

  return (
    <div className="chart-wrap">
      <div ref={ref} className={`dist${inView ? ' in' : ''}`}>
        {shown.map((d, i) => {
          const inBand = start != null && target != null && d.rating >= start && d.rating <= target
          return (
            <div className="col" key={d.rating} title={`${d.rating}: ${d.count} solved`}>
              <div
                className={'bar' + (inBand ? ' band' : '')}
                style={{ height: `${Math.max(2, (d.count / maxCount) * 100)}%`, '--d': `${i * 30}ms` }}
              />
              <span className="xl">{d.rating % 400 === 0 ? d.rating : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--gold-hi)' }} /> Chase band {start}–{target}
        </span>
        <span>
          <i style={{ background: 'var(--gold-dim)' }} /> Solved elsewhere
        </span>
      </div>
    </div>
  )
}

/* ── Rating history (drawing line) ───────────────────────────────────────── */
const BAND_LINES = [1200, 1400, 1600, 1900, 2100, 2400]

export function RatingHistoryChart({ history, currentRating, target }) {
  const [ref, inView] = useInView(0.25)
  if (!history || history.length < 2) {
    return (
      <div className="empty-chart">
        No rated contests yet — the line starts the day you enter the arena.
      </div>
    )
  }
  const W = 860
  const H = 240
  const padL = 44
  const padR = 18
  const padT = 18
  const padB = 26

  const ratings = history.map((h) => h.rating)
  let lo = Math.min(...ratings)
  let hi = Math.max(...ratings, target || 0)
  const span = Math.max(150, hi - lo)
  lo = Math.max(0, lo - span * 0.12)
  hi = hi + span * 0.12

  const n = history.length
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR)
  const y = (r) => padT + (1 - (r - lo) / (hi - lo)) * (H - padT - padB)

  const linePts = history.map((h, i) => `${x(i).toFixed(1)},${y(h.rating).toFixed(1)}`).join(' ')
  const areaPts = `${padL},${H - padB} ${linePts} ${(W - padR).toFixed(1)},${H - padB}`
  const last = history[n - 1]
  const peak = Math.max(...ratings)

  return (
    <div className="chart-wrap" ref={ref}>
      <svg className="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rating history">
        <defs>
          <linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c2a878" stopOpacity="0.28" />
            <stop offset="1" stopColor="#c2a878" stopOpacity="0" />
          </linearGradient>
        </defs>

        {BAND_LINES.filter((v) => v > lo && v < hi).map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={ratingColor(v)} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill={ratingColor(v)} fillOpacity="0.7">
              {v}
            </text>
          </g>
        ))}

        {target && target > lo && target < hi && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke="var(--gold-2)" strokeOpacity="0.5" strokeWidth="1" />
            <text x={W - padR} y={y(target) - 5} textAnchor="end" fontSize="9.5" fill="var(--gold-2)">
              TARGET {target}
            </text>
          </g>
        )}

        <polygon points={areaPts} fill="url(#histFill)" opacity={inView ? 1 : 0} style={{ transition: 'opacity 1.4s ease 0.5s' }} />
        <polyline
          points={linePts}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={inView ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 2.2s cubic-bezier(.4,0,.2,1) 0.15s' }}
        />
        <circle cx={x(n - 1)} cy={y(last.rating)} r="4.5" fill={ratingColor(currentRating ?? last.rating)} stroke="var(--bg)" strokeWidth="2">
          <animate attributeName="r" values="4.5;6.5;4.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="legend">
        <span className="dim">
          {n} rated contests · peak {peak} · last “{(last.name || '').slice(0, 44)}” ({last.delta >= 0 ? '+' : ''}
          {last.delta})
        </span>
      </div>
    </div>
  )
}

/* ── Topic radar ─────────────────────────────────────────────────────────── */
export function TagRadar({ radar }) {
  const [ref, inView] = useInView(0.3)
  if (!radar || radar.length < 3) {
    return <div className="empty-chart">Not enough solves to map the terrain yet.</div>
  }
  const W = 380
  const H = 330
  const cx = 190
  const cy = 166
  const R = 112
  const n = radar.length

  const polar = (r, k) => {
    const ang = ((-90 + (k * 360) / n) * Math.PI) / 180
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]
  }
  const poly = (vals) =>
    vals.map((v, k) => polar(clamp(v, 0.02, 1) * R, k).map((c) => c.toFixed(1)).join(',')).join(' ')

  const rings = [0.25, 0.5, 0.75, 1]
  const skillPts = poly(radar.map((d) => d.skill))
  const impPts = poly(radar.map((d) => d.importance))

  return (
    <div className="chart-wrap" ref={ref}>
      <svg className="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Topic radar">
        {rings.map((lvl, i) => (
          <polygon
            key={i}
            points={radar.map((_, k) => polar(lvl * R, k).map((c) => c.toFixed(1)).join(',')).join(' ')}
            fill="none"
            stroke="var(--line)"
            strokeWidth="1"
          />
        ))}
        {radar.map((_, k) => {
          const [ex, ey] = polar(R, k)
          return <line key={k} x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--line)" strokeWidth="1" />
        })}

        <g
          style={{
            transform: inView ? 'scale(1)' : 'scale(0.05)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 1.4s cubic-bezier(.19,1,.22,1) .1s',
          }}
        >
          <polygon points={impPts} fill="none" stroke="var(--muted-2)" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.9" />
          <polygon points={skillPts} fill="rgba(194,168,120,0.22)" stroke="var(--gold)" strokeWidth="1.8" />
          {radar.map((d, k) => {
            const [px, py] = polar(clamp(d.skill, 0.02, 1) * R, k)
            return <circle key={k} cx={px} cy={py} r="2.6" fill="var(--gold-2)" />
          })}
        </g>

        {radar.map((d, k) => {
          const [lx, ly] = polar(R + 16, k)
          const anchor = lx > cx + 6 ? 'start' : lx < cx - 6 ? 'end' : 'middle'
          const label = prettyTag(d.tag)
          const short = label.length > 15 ? label.slice(0, 14) + '…' : label
          return (
            <text key={k} x={lx} y={ly + 3} textAnchor={anchor} fontSize="9.5" fill="var(--muted)">
              {short}
            </text>
          )
        })}
      </svg>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--gold)' }} /> Your evidence
        </span>
        <span>
          <i style={{ background: 'var(--muted-2)' }} /> Topic density at your level
        </span>
      </div>
    </div>
  )
}

/* ── 52-week activity heatmap ────────────────────────────────────────────── */
export function ActivityHeatmap({ weeklyActivity, currentStreak, longestStreak }) {
  const [ref, inView] = useInView(0.25)
  const weeks = weeklyActivity || []
  const max = Math.max(1, ...weeks.map((w) => w.count))
  const cls = (c) => (c === 0 ? '' : c >= max * 0.66 ? 'h3' : c >= max * 0.33 ? 'h2' : 'h1')
  return (
    <div>
      <div ref={ref} className={`heatmap${inView ? ' in' : ''}`}>
        {weeks.map((w, i) => (
          <i key={i} className={cls(w.count)} style={{ '--d': `${i * 14}ms` }} title={`${w.count} solved · ${weeks.length - i} wk ago`} />
        ))}
      </div>
      <div className="legend" style={{ justifyContent: 'space-between' }}>
        <span className="dim">last 52 weeks · darker = more solves</span>
        <span className="dim">
          streak <b style={{ color: 'var(--gold-2)' }}>{currentStreak}d</b> · longest{' '}
          <b style={{ color: 'var(--gold-2)' }}>{longestStreak}d</b>
        </span>
      </div>
    </div>
  )
}

/* ── Requirement gap ledger (current → required per topic) ──────────────── */
const STATUS_COLOR = { met: 'var(--green)', close: 'var(--amber)', missing: 'var(--red)' }
const STATUS_WORD = { met: 'met', close: 'close', missing: 'gap' }

export function GapLedger({ items, max = 12 }) {
  const [ref, inView] = useInView(0.12)
  const shown = items.slice(0, max)
  return (
    <div ref={ref} className={inView ? 'in' : ''}>
      {shown.map((it, i) => {
        const base = it.required - 500
        const pos = clamp01((it.current - base) / (it.required - base || 1))
        return (
          <div className="gap-row" key={it.tag}>
            <div className="t">
              {it.pretty}
              <small>
                {it.solved ? `${it.solved} solved` : 'no history'} · weight {Math.round(it.weight * 100)}
              </small>
            </div>
            <div className="gap-track">
              <div
                className="fill"
                style={{
                  width: `${pos * 100}%`,
                  background: STATUS_COLOR[it.status],
                  '--d': `${i * 70}ms`,
                  opacity: 0.85,
                }}
              />
              <div className="req-mark" />
            </div>
            <div className="nums">
              <b>{it.current}</b> → {it.required}{' '}
              <span className={`status-${it.status}`} style={{ marginLeft: 8 }}>
                {STATUS_WORD[it.status]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
