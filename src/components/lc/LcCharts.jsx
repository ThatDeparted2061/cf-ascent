// LeetCode charts — readiness gauge, difficulty donut, section mastery bars.

import { fmtInt } from '../../lib/constants.js'
import { useInView, CountUp } from '../../fx/Fx.jsx'

const TONE = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' }

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)]
}

/* ── Readiness gauge (sweeping semicircle) ──────────────────────────────── */
export function ReadinessGauge({ score, band }) {
  const [ref, inView] = useInView(0.3)
  const cx = 120
  const cy = 118
  const r = 92
  const f = Math.max(0, Math.min(1, score / 100))
  const [lx, ly] = polar(cx, cy, r, 180)
  const color = TONE[band.tone] || 'var(--gold)'
  const halfC = Math.PI * r

  return (
    <div className="chart-wrap gauge-center" ref={ref}>
      <svg className="svg-chart" viewBox="0 0 240 150" role="img" aria-label="Readiness" style={{ maxWidth: 320, margin: '0 auto' }}>
        {[0.25, 0.5, 0.75].map((m) => {
          const [tx, ty] = polar(cx, cy, r + 14, 180 - 180 * m)
          return (
            <text key={m} x={tx} y={ty} textAnchor="middle" fontSize="8" fill="var(--muted-2)">
              {Math.round(m * 100)}
            </text>
          )
        })}
        <path
          d={`M ${lx} ${ly} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(194,168,120,0.12)"
          strokeWidth="14"
        />
        <path
          d={`M ${lx} ${ly} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          pathLength="1"
          strokeDasharray={`${f} 1`}
          strokeDashoffset={inView ? 0 : f}
          style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(.19,1,.22,1) .2s' }}
        />
        <text x={cx} y={cy - 22} textAnchor="middle" fontSize="44" fontWeight="700" fill={color} fontFamily="var(--display)">
          {score}
        </text>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="var(--muted-2)" letterSpacing="2">
          / 100 READINESS
        </text>
      </svg>
      <div style={{ marginTop: 8 }}>
        <span className="pill" style={{ color, borderColor: 'currentColor', fontSize: 10.5 }}>
          {band.label}
        </span>
        <div className="muted" style={{ fontSize: 14.5, marginTop: 10, fontStyle: 'italic' }}>
          {band.note}
        </div>
      </div>
    </div>
  )
}

/* ── Difficulty donut ───────────────────────────────────────────────────── */
export function DifficultyDonut({ byDifficulty, totalSolved }) {
  const [ref, inView] = useInView(0.3)
  const cx = 80
  const cy = 80
  const r = 60
  const C = 2 * Math.PI * r
  const segs = [
    { key: 'Easy', count: byDifficulty.Easy.solved, color: 'var(--green)' },
    { key: 'Medium', count: byDifficulty.Medium.solved, color: 'var(--amber)' },
    { key: 'Hard', count: byDifficulty.Hard.solved, color: 'var(--red)' },
  ]
  const sum = segs.reduce((a, s) => a + s.count, 0) || 1
  let acc = 0

  return (
    <div
      className="chart-wrap"
      ref={ref}
      style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
    >
      <svg width="170" height="170" viewBox="0 0 160 160" role="img" aria-label="Difficulty distribution">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(194,168,120,0.1)" strokeWidth="16" />
        {segs.map((s) => {
          const frac = s.count / sum
          const dash = frac * C
          const el = (
            <circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${inView ? dash : 0} ${inView ? C - dash : C}`}
              strokeDashoffset={-acc * C}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(.19,1,.22,1) .2s' }}
            />
          )
          acc += frac
          return el
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--cream)" fontFamily="var(--display)">
          {fmtInt(totalSolved)}
        </text>
        <text x={cx} y={cy + 17} textAnchor="middle" fontSize="8.5" fill="var(--muted-2)" letterSpacing="2">
          SOLVED
        </text>
      </svg>
      <div className="donut-legend">
        {segs.map((s) => (
          <div className="dl" key={s.key}>
            <i style={{ background: s.color }} />
            <span style={{ width: 64 }}>{s.key}</span>
            <b>
              <CountUp value={s.count} />
            </b>
            <span className="dim">/ {fmtInt(byDifficulty[s.key].total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Section mastery bars ───────────────────────────────────────────────── */
export function SectionBars({ sections }) {
  const [ref, inView] = useInView(0.12)
  const color = (m) => (m >= 0.7 ? 'var(--green)' : m >= 0.4 ? 'var(--amber)' : 'var(--red)')
  return (
    <div ref={ref} className={inView ? 'in' : ''}>
      {sections.map((s, i) => {
        const pct = Math.round(s.mastery * 100)
        return (
          <div className="sbar" key={s.id}>
            <span className="nm">
              {s.name}
              {s.importance >= 1 && <span className="dim mono" style={{ fontSize: 9, marginLeft: 8, letterSpacing: '0.2em' }}>CORE</span>}
            </span>
            <span className="track">
              <i style={{ width: `${Math.max(2, pct)}%`, background: color(s.mastery), '--d': `${i * 50}ms` }} />
            </span>
            <span className="pc">
              {s.solved}/{s.target} · {pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
