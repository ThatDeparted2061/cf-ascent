import { fmtInt, fmtPct } from '../../lib/constants.js'
import { CountUp, Reveal } from '../../fx/Fx.jsx'

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

export default function LcStatGrid({ a }) {
  const d = a.byDifficulty
  return (
    <Reveal className="section" style={{ marginTop: 44 }}>
      <div className="stat-strip">
        <Stat
          label="Problems solved"
          value={a.totalSolved}
          sub={`${d.Easy.solved} E · ${d.Medium.solved} M · ${d.Hard.solved} H`}
        />
        <Stat label="Readiness" value={a.readiness.score} color="var(--gold-2)" sub={a.readiness.band.label} />
        <Stat label="Acceptance" raw={fmtPct(a.acceptanceRate)} sub="accepted / total submissions" />
        <Stat
          label="Medium core"
          value={d.Medium.solved}
          color="var(--amber)"
          sub="where interviews live"
        />
        <Stat label="Active days" value={a.totalActiveDays} sub={`${a.streak} day streak`} />
        <Stat
          label="Sections solid"
          raw={`${a.strongSections.length}/${a.sections.length}`}
          sub={`${a.weakSections.length} flagged weak`}
        />
      </div>
    </Reveal>
  )
}
