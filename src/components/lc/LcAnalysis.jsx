import { fmtInt, fmtPct } from '../../lib/constants.js'
import { Reveal, WordReveal } from '../../fx/Fx.jsx'
import { SectionBars } from './LcCharts.jsx'

function names(arr, n = 4) {
  const list = arr.slice(0, n).map((s) => s.name)
  if (!list.length) return ''
  if (list.length === 1) return list[0]
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]
}

export default function LcAnalysis({ a }) {
  const d = a.byDifficulty
  const sortedSections = [...a.sections].sort((x, y) => y.importance - x.importance || y.mastery - x.mastery)

  const verdict =
    `${a.username} has closed ${fmtInt(a.totalSolved)} problems — ${d.Easy.solved} easy, ${d.Medium.solved} medium, ${d.Hard.solved} hard — at ${fmtPct(a.acceptanceRate)} acceptance. ` +
    `Measured against the big-tech blueprint, readiness stands at ${a.readiness.score}/100: ${a.readiness.band.label.toLowerCase()}. ` +
    (a.easyHeavy
      ? 'The mix is Easy-heavy, and real loops live in the Medium band — shifting volume there is the single biggest win available. '
      : `The difficulty mix is healthy, with Mediums as the center of gravity. `) +
    (a.strongSections.length ? `Strongest sections: ${names(a.strongSections, 3)}. ` : 'No section is interview-solid yet. ') +
    (a.weakSections.length
      ? `The gaps that would sink a loop today: ${names(a.weakSections, 4)}.`
      : 'Coverage is balanced — the fight now is depth and speed.')

  return (
    <section className="section">
      <Reveal className="sec-head">
        <span className="num">02 — THE READING</span>
        <h2 className="display">
          Measured against <em>what they actually ask.</em>
        </h2>
      </Reveal>

      <Reveal className="card pad corner" style={{ marginBottom: 16 }}>
        <div className="card-label">
          <span className="tick">✦</span> The verdict
        </div>
        <WordReveal className="verdict" text={verdict} />
        <p className="dim" style={{ fontStyle: 'italic', fontSize: 14, margin: '18px 0 0' }}>
          {a.contest.rating != null
            ? `Contest rating ${a.contest.rating}${a.contest.topPercentage ? ` (top ${a.contest.topPercentage.toFixed(1)}%)` : ''} across ${a.contest.attended} contests — speed under pressure is being trained.`
            : 'No rated contests yet — weekly contests are the cheapest way to buy interview speed. Add one per week.'}
        </p>
      </Reveal>

      <Reveal className="card pad">
        <div className="card-label">
          <span className="tick">✦</span> Section by section — you vs the bar
        </div>
        <SectionBars sections={sortedSections} />
      </Reveal>

      <div className="charts-grid" style={{ marginTop: 16 }}>
        <Reveal className="card pad" delay={60}>
          <div className="card-label">
            <span className="tick" style={{ color: 'var(--green)' }}>✦</span> Carried strengths
          </div>
          {a.strongSections.length ? (
            <div className="ledger">
              {a.strongSections.slice(0, 6).map((s) => (
                <div className="row" key={s.id}>
                  <span className="nm">{s.name}</span>
                  <span className="why">{s.blurb}</span>
                  <span className="val" style={{ color: 'var(--green)' }}>
                    {Math.round(s.mastery * 100)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: 'italic', margin: 0 }}>
              Nothing fully solid yet — the plan below builds it.
            </p>
          )}
        </Reveal>

        <Reveal className="card pad" delay={140}>
          <div className="card-label">
            <span className="tick" style={{ color: 'var(--red)' }}>✦</span> Close these to get hired
          </div>
          {a.weakSections.length ? (
            <div className="ledger">
              {a.weakSections.slice(0, 6).map((s) => (
                <div className="row" key={s.id}>
                  <span className="nm">{s.name}</span>
                  <span className="why">{s.blurb}</span>
                  <span className="val" style={{ color: 'var(--red)' }}>
                    {s.solved}/{s.target}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: 'italic', margin: 0 }}>
              No major gaps — shift to depth, speed, and Hards.
            </p>
          )}
        </Reveal>
      </div>
    </section>
  )
}
