import { fmtInt, fmtPct } from '../../lib/constants.js'

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

export default function LcStatGrid({ a }) {
  const d = a.byDifficulty
  return (
    <div className="stat-grid section">
      <Stat
        label="Problems solved"
        value={fmtInt(a.totalSolved)}
        sub={`${d.Easy.solved} E · ${d.Medium.solved} M · ${d.Hard.solved} H`}
      />
      <Stat
        label="Big-tech readiness"
        value={a.readiness.score}
        color="var(--cyan)"
        sub={a.readiness.band.label}
      />
      <Stat
        label="Acceptance"
        value={fmtPct(a.acceptanceRate)}
        sub="accepted / total submissions"
      />
      <Stat
        label="Active days"
        value={fmtInt(a.totalActiveDays)}
        sub={`${a.streak} day streak`}
      />
    </div>
  )
}
