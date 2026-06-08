import { fmtInt, fmtPct } from '../../lib/constants.js'
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

  return (
    <div className="section fade-up">
      <div className="section-head">
        <div>
          <h2>Big-tech readiness analysis</h2>
          <p>Your profile measured against the patterns top-company SDE interviews actually test.</p>
        </div>
      </div>

      <div className="card pad narrative">
        <p>
          <strong>{a.username}</strong> has solved <strong>{fmtInt(a.totalSolved)}</strong> problems
          ({d.Easy.solved} easy, {d.Medium.solved} medium, {d.Hard.solved} hard) at a{' '}
          <strong>{fmtPct(a.acceptanceRate)}</strong> acceptance rate
          {a.ranking ? <> (global rank #{fmtInt(a.ranking)})</> : null}. Measured against the big-tech
          interview blueprint, overall readiness is <strong>{a.readiness.score}/100</strong> —{' '}
          {a.readiness.band.label.toLowerCase()}.
        </p>

        <p>
          {a.easyHeavy ? (
            <>
              The mix is <strong>Easy-heavy</strong>. Real interviews live in the Medium band (and a
              few Hards), so the single biggest win is shifting volume toward Mediums.
            </>
          ) : (
            <>
              Difficulty mix looks healthy — a solid base of Mediums ({d.Medium.solved}) with{' '}
              {d.Hard.solved} Hards. Keep Mediums as the center of gravity.
            </>
          )}
        </p>

        <p>
          {a.strongSections.length ? (
            <>
              Strongest sections: <strong>{names(a.strongSections, 4)}</strong>.{' '}
            </>
          ) : (
            <>No section is interview-solid yet — breadth is still forming. </>
          )}
          {a.weakSections.length ? (
            <>
              The highest-leverage gaps for big-tech loops are{' '}
              <strong>{names(a.weakSections, 4)}</strong> — important, frequently-tested topics where
              your coverage is thin. Close these first.
            </>
          ) : (
            <>Coverage across the important sections is balanced — focus now shifts to depth and speed.</>
          )}
        </p>

        <p>
          {a.contest.rating != null ? (
            <>
              Contest rating <strong>{a.contest.rating}</strong>
              {a.contest.topPercentage ? <> (top {a.contest.topPercentage.toFixed(1)}%)</> : null} across{' '}
              {a.contest.attended} contests — a good measure of speed under time pressure.
            </>
          ) : (
            <>
              No rated contests yet. LeetCode weekly contests are the best way to build the speed
              interviews demand — worth adding one a week.
            </>
          )}{' '}
          The prep plan below covers every section; switch it to <strong>weak-first</strong> to attack
          your gaps before anything else.
        </p>
      </div>

      <div className="card pad" style={{ marginTop: 16 }}>
        <div className="card-title">
          <span className="dot" /> How you stack up, section by section
        </div>
        <SectionBars sections={sortedSections} />
      </div>

      <div className="callouts" style={{ marginTop: 16 }}>
        <div className="card pad">
          <div className="card-title">
            <span className="dot" style={{ background: 'var(--green)', boxShadow: '0 0 10px var(--green)' }} />
            Strong sections
          </div>
          {a.strongSections.length ? (
            <div className="tag-bars">
              {a.strongSections.slice(0, 6).map((s) => (
                <div className="tag-bar" key={s.id}>
                  <div className="top">
                    <span>{s.name}</span>
                    <span className="r">{Math.round(s.mastery * 100)}% · {s.solved}/{s.target}</span>
                  </div>
                  <div className="track">
                    <i className="fill-good" style={{ width: `${Math.round(s.mastery * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Nothing fully solid yet — the plan will get you there.</p>
          )}
        </div>

        <div className="card pad">
          <div className="card-title">
            <span className="dot" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />
            Focus areas (close these to get hired)
          </div>
          {a.weakSections.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {a.weakSections.slice(0, 5).map((s) => (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                    <span>{s.name}</span>
                    <span className="r mono" style={{ color: 'var(--amber)', fontSize: 12 }}>
                      {Math.round(s.mastery * 100)}% · {s.solved}/{s.target}
                    </span>
                  </div>
                  <div className="why" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                    {s.blurb}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>No major gaps — shift to depth, speed, and Hards.</p>
          )}
        </div>
      </div>
    </div>
  )
}
