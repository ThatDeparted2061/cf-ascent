import { fmtInt } from '../../lib/constants.js'

const TONE = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' }

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)]
}

/* ---------------- Readiness gauge (semicircle) ---------------- */
export function ReadinessGauge({ score, band }) {
  const cx = 120
  const cy = 116
  const r = 92
  const f = Math.max(0, Math.min(1, score / 100))
  const endAngle = 180 - 180 * f
  const [ex, ey] = polar(cx, cy, r, endAngle)
  const [lx, ly] = polar(cx, cy, r, 180)
  const color = TONE[band.tone] || 'var(--cyan)'

  return (
    <div className="chart-wrap" style={{ textAlign: 'center' }}>
      <svg className="svg-chart" viewBox="0 0 240 140" role="img" aria-label="Readiness">
        <path d={`M ${lx} ${ly} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" />
        <path d={`M ${lx} ${ly} A ${r} ${r} 0 0 0 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
        <text x={cx} y={cy - 26} textAnchor="middle" fontSize="42" fontWeight="800" fill={color} fontFamily="var(--mono)">
          {score}
        </text>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="var(--muted)">
          / 100 readiness
        </text>
      </svg>
      <div style={{ marginTop: 4 }}>
        <span className="rank-pill" style={{ color }}>
          {band.label}
        </span>
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {band.note}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Difficulty donut ---------------- */
export function DifficultyDonut({ byDifficulty, totalSolved }) {
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
    <div className="chart-wrap" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Difficulty distribution">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
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
              strokeWidth="18"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-acc * C}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )
          acc += frac
          return el
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--text)" fontFamily="var(--mono)">
          {fmtInt(totalSolved)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="var(--muted)">
          solved
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {segs.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            <span style={{ width: 64 }}>{s.key}</span>
            <span className="mono" style={{ color: 'var(--muted)' }}>
              {s.count}
              <span className="dim"> / {byDifficulty[s.key].total}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Section mastery bars ---------------- */
export function SectionBars({ sections }) {
  return (
    <div className="tag-bars">
      {sections.map((s) => {
        const pct = Math.round(s.mastery * 100)
        const color =
          s.mastery >= 0.7 ? 'linear-gradient(90deg,var(--green),var(--lime))' : s.mastery >= 0.4 ? 'linear-gradient(90deg,var(--amber),var(--lime))' : 'linear-gradient(90deg,var(--red),var(--amber))'
        return (
          <div className="tag-bar" key={s.id}>
            <div className="top">
              <span>
                {s.name}
                {s.importance >= 1 && <span className="dim" style={{ fontSize: 11 }}> · core</span>}
              </span>
              <span className="r">
                {s.solved}/{s.target} · {pct}%
              </span>
            </div>
            <div className="track" style={{ position: 'relative' }}>
              <i style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
