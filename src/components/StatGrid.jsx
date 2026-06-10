import { ratingTier, fmtInt, fmtPct } from '../lib/constants.js'
import { CountUp, Reveal } from '../fx/Fx.jsx'

function Stat({ label, value, sub, color, raw }) {
  return (
    <div className="stat-cell">
      <div className="l">{label}</div>
      <div className="v" style={color ? { color } : undefined}>
        {raw != null ? raw : <CountUp value={value} />}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export default function StatGrid({ a }) {
  const wl = ratingTier(a.workingLevel)
  const hard = ratingTier(a.percentiles.maxSolved)
  const confPct = Math.round(a.levelEstimate.confidence * 100)

  return (
    <Reveal className="section" style={{ marginTop: 44 }}>
      <div className="stat-strip">
        <Stat
          label="True working level"
          value={a.workingLevel}
          color={wl.color}
          sub={`${confPct}% confidence · ${a.levelEstimate.trend}`}
        />
        <Stat
          label="Problems solved"
          value={a.totalSolved}
          sub={`${fmtInt(a.totalAttemptedDistinct)} attempted · ${fmtInt(a.recentSolves30)} in 30d`}
        />
        <Stat
          label="Hardest crack"
          value={a.percentiles.maxSolved ?? 0}
          raw={a.percentiles.maxSolved == null ? '—' : undefined}
          color={hard.color}
          sub={a.avgAttemptsToSolve ? `${a.avgAttemptsToSolve.toFixed(1)} tries per solve` : '—'}
        />
        <Stat
          label="First-try rate"
          raw={fmtPct(a.firstTryRate)}
          sub={`${fmtPct(a.solveAccuracy)} of all submissions AC`}
        />
        <Stat
          label="Contest blood"
          raw={fmtPct(a.contestShare)}
          sub={`${fmtInt(a.contestSolves)} live · ${fmtInt(a.practiceSolves)} practice`}
        />
        <Stat
          label="Consistency"
          raw={`${Math.round(a.consistency * 100)}%`}
          sub={`active ${Math.round(a.consistency * 8)}/8 recent weeks`}
        />
      </div>
    </Reveal>
  )
}
