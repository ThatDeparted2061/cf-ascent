import { ratingTier, fmtInt, fmtPct } from '../lib/constants.js'

function Stat({ label, value, sub, color }) {
  return (
    <div className="card stat">
      <div className="l">{label}</div>
      <div className="v" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export default function StatGrid({ a }) {
  const wl = ratingTier(a.workingLevel)
  const hard = ratingTier(a.percentiles.maxSolved)
  return (
    <div className="stat-grid section">
      <Stat
        label="Problems solved"
        value={fmtInt(a.totalSolved)}
        sub={`${fmtInt(a.totalAttemptedDistinct)} attempted · ${fmtInt(a.recentSolves30)} in 30d`}
      />
      <Stat
        label="Working level"
        value={a.workingLevel}
        color={wl.color}
        sub="estimated true level"
      />
      <Stat
        label="Solve rate"
        value={fmtPct(a.problemAccuracy)}
        sub={`${fmtPct(a.solveAccuracy)} of submissions AC`}
      />
      <Stat
        label="Hardest solved"
        value={a.percentiles.maxSolved ?? '—'}
        color={hard.color}
        sub={
          a.avgAttemptsToSolve
            ? `${a.avgAttemptsToSolve.toFixed(1)} tries/solve avg`
            : '—'
        }
      />
    </div>
  )
}
