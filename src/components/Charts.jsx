import { prettyTag, ratingColor, clamp } from '../lib/constants.js'

/* ---------------- Rating distribution (CSS bars) ---------------- */
export function RatingBars({ distribution, start, target }) {
  let lastNonZero = 800
  for (const d of distribution) if (d.count > 0) lastNonZero = d.rating
  const showMax = clamp(Math.max(lastNonZero, (target || 0) + 100, start || 0), 800, 3500)
  const shown = distribution.filter((d) => d.rating >= 800 && d.rating <= showMax)
  const maxCount = Math.max(1, ...shown.map((d) => d.count))

  return (
    <div className="chart-wrap">
      <div className="bars">
        {shown.map((d) => {
          const inBand = start != null && target != null && d.rating >= start && d.rating <= target
          return (
            <div className="bar-col" key={d.rating} title={`${d.rating}: ${d.count} solved`}>
              <div
                className={'bar' + (inBand ? ' in-band' : '')}
                style={{ height: `${(d.count / maxCount) * 100}%` }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--mono)',
                  color: 'var(--muted-2)',
                  height: 12,
                }}
              >
                {d.rating % 200 === 0 ? d.rating : ''}
              </span>
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--cyan)' }} /> Your target band ({start}–{target})
        </span>
        <span>
          <i style={{ background: 'rgba(148,161,189,0.5)' }} /> Solved elsewhere
        </span>
      </div>
    </div>
  )
}

/* ---------------- Rating history (SVG line) ---------------- */
export function RatingHistoryChart({ history, currentRating }) {
  if (!history || history.length < 2) {
    return <div className="empty-chart">No rated contest history yet.<br />Practice now, rate later.</div>
  }
  const W = 640
  const H = 210
  const padL = 38
  const padR = 14
  const padT = 16
  const padB = 24

  const ratings = history.map((h) => h.rating)
  let lo = Math.min(...ratings)
  let hi = Math.max(...ratings)
  const span = Math.max(100, hi - lo)
  lo = Math.max(0, lo - span * 0.15)
  hi = hi + span * 0.15

  const n = history.length
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR)
  const y = (r) => padT + (1 - (r - lo) / (hi - lo)) * (H - padT - padB)

  const linePts = history.map((h, i) => `${x(i).toFixed(1)},${y(h.rating).toFixed(1)}`).join(' ')
  const areaPts = `${padL},${H - padB} ${linePts} ${(W - padR).toFixed(1)},${H - padB}`

  const gridVals = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v))
  const last = history[n - 1]

  return (
    <div className="chart-wrap">
      <svg className="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rating history">
        <defs>
          <linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="histLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4c8dff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#65718f" fontFamily="var(--mono)">
              {v}
            </text>
          </g>
        ))}
        <polygon points={areaPts} fill="url(#histFill)" />
        <polyline
          points={linePts}
          fill="none"
          stroke="url(#histLine)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x(n - 1)} cy={y(last.rating)} r="4.5" fill={ratingColor(currentRating ?? last.rating)} stroke="#090d18" strokeWidth="2" />
      </svg>
      <div className="legend">
        <span className="dim">{n} rated contests · peak {Math.max(...ratings)}</span>
      </div>
    </div>
  )
}

/* ---------------- Tag radar (SVG) ---------------- */
export function TagRadar({ radar }) {
  if (!radar || radar.length < 3) {
    return <div className="empty-chart">Not enough solved problems to map topics yet.</div>
  }
  const W = 360
  const H = 320
  const cx = 180
  const cy = 158
  const R = 108
  const n = radar.length

  const polar = (r, k) => {
    const ang = ((-90 + (k * 360) / n) * Math.PI) / 180
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]
  }
  const poly = (vals) => vals.map((v, k) => polar(clamp(v, 0, 1) * R, k).map((c) => c.toFixed(1)).join(',')).join(' ')

  const rings = [0.25, 0.5, 0.75, 1]
  const skillPts = poly(radar.map((d) => d.skill))
  const impPts = poly(radar.map((d) => d.importance))

  return (
    <div className="chart-wrap">
      <svg className="svg-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Topic radar">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4c8dff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {rings.map((lvl, i) => (
          <polygon
            key={i}
            points={radar.map((_, k) => polar(lvl * R, k).map((c) => c.toFixed(1)).join(',')).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {radar.map((_, k) => {
          const [ex, ey] = polar(R, k)
          return <line key={k} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        })}

        {/* topic density (where the field is dense) */}
        <polygon points={impPts} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
        {/* the user's skill */}
        <polygon points={skillPts} fill="url(#radarFill)" stroke="#22d3ee" strokeWidth="2" />

        {radar.map((d, k) => {
          const [lx, ly] = polar(R + 14, k)
          const anchor = lx > cx + 6 ? 'start' : lx < cx - 6 ? 'end' : 'middle'
          const label = prettyTag(d.tag)
          const short = label.length > 13 ? label.slice(0, 12) + '…' : label
          return (
            <text key={k} x={lx} y={ly + 3} textAnchor={anchor} fontSize="9.5" fill="#94a1bd">
              {short}
            </text>
          )
        })}
      </svg>
      <div className="legend">
        <span>
          <i style={{ background: '#22d3ee' }} /> Your skill
        </span>
        <span>
          <i style={{ background: '#a78bfa' }} /> Topic density at your level
        </span>
      </div>
    </div>
  )
}
