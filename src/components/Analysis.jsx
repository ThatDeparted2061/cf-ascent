import { prettyTag, fmtPct, fmtInt, daysAgo } from '../lib/constants.js'
import { Reveal, WordReveal } from '../fx/Fx.jsx'
import { ActivityHeatmap } from './Charts.jsx'

function listNames(tags) {
  const names = tags.map((t) => prettyTag(t.tag))
  if (!names.length) return ''
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

export default function Analysis({ a }) {
  const p = a.percentiles
  const last = daysAgo(a.lastActiveUnix)

  const verdict =
    `${a.handle} operates at a true level of about ${a.workingLevel} — ${a.band.name}, ${a.band.tier}. ` +
    `${fmtInt(a.totalSolved)} problems conquered from ${fmtInt(a.totalAttemptedDistinct)} attempted, with most kills between ${p.p50 ?? '—'} and ${p.p85 ?? '—'} and the hardest at ${p.maxSolved ?? '—'}. ` +
    (a.strengths.length ? `The weapons: ${listNames(a.strengths.slice(0, 3))}. ` : 'No standout weapons yet — breadth is still forming. ') +
    (a.weaknesses.length
      ? `Standing between this profile and the next band: ${listNames(a.weaknesses.slice(0, 3))}.`
      : 'No glaring topic gaps for this band — the fight is volume and nerve.')

  return (
    <section className="section">
      <Reveal className="sec-head">
        <span className="num">02 — THE READING</span>
        <h2 className="display">
          What {fmtInt(a.totalSubmissions)} submissions <em>confess.</em>
        </h2>
      </Reveal>

      <Reveal className="card pad corner" style={{ marginBottom: 16 }}>
        <div className="card-label">
          <span className="tick">✦</span> The verdict
        </div>
        <WordReveal className="verdict" text={verdict} />
      </Reveal>

      <div className="charts-grid">
        <Reveal className="card pad" delay={60}>
          <div className="card-label">
            <span className="tick">✦</span> Weapons — carried strengths
          </div>
          {a.strengths.length ? (
            <div className="ledger">
              {a.strengths.map((s) => (
                <div className="row" key={s.tag}>
                  <span className="nm">{prettyTag(s.tag)}</span>
                  <span className="why">{s.why}</span>
                  <span className="val">~{s.topicRating}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: 'italic', margin: 0 }}>
              Not enough evidence for declared strengths yet — solve on.
            </p>
          )}
        </Reveal>

        <Reveal className="card pad" delay={140}>
          <div className="card-label">
            <span className="tick" style={{ color: 'var(--red)' }}>✦</span> The gaps — train these first
          </div>
          {a.weaknesses.length ? (
            <div className="ledger">
              {a.weaknesses.map((w) => (
                <div className="row" key={w.tag}>
                  <span className="nm">{prettyTag(w.tag)}</span>
                  <span className="why">{w.why}</span>
                  <span className="val" style={{ color: 'var(--red)' }}>
                    −{w.gapPts}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: 'italic', margin: 0 }}>
              Nothing screams. The plan will sharpen everything evenly.
            </p>
          )}
        </Reveal>
      </div>

      <div className="charts-grid" style={{ marginTop: 16 }}>
        <Reveal className="card pad" delay={80}>
          <div className="card-label">
            <span className="tick">✦</span> Where attempts die
          </div>
          {a.errorProfile.insights.length ? (
            <ul className="insight-list">
              {a.errorProfile.insights.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontStyle: 'italic', margin: 0 }}>
              No dominant failure pattern — clean record.
            </p>
          )}
          <div className="legend" style={{ marginTop: 16 }}>
            <span className="dim">
              WA {fmtInt(a.errorProfile.wa)} · TLE {fmtInt(a.errorProfile.tle)} · RE {fmtInt(a.errorProfile.re)} · failed
              attempts {fmtInt(a.errorProfile.nonOk)}
            </span>
          </div>
          {a.failedOpenProblems.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="card-label" style={{ marginBottom: 10 }}>
                <span className="tick" style={{ color: 'var(--amber)' }}>✦</span> Unfinished business
              </div>
              <div className="pills">
                {a.failedOpenProblems.slice(0, 5).map((f) => (
                  <span className="pill" key={f.key} title={`${f.attempts} attempts, never solved`}>
                    {f.name.slice(0, 26)} {f.rating ? `· ${f.rating}` : ''} · ×{f.attempts}
                  </span>
                ))}
              </div>
              <p className="dim" style={{ fontSize: 13, fontStyle: 'italic', margin: '10px 0 0' }}>
                Problems attempted repeatedly and never closed. Revenge is a valid training plan.
              </p>
            </div>
          )}
        </Reveal>

        <Reveal className="card pad" delay={160}>
          <div className="card-label">
            <span className="tick">✦</span> The habit — 52 weeks
          </div>
          <ActivityHeatmap weeklyActivity={a.weeklyActivity} currentStreak={a.currentStreak} longestStreak={a.longestStreak} />
          <p className="muted" style={{ fontSize: 14.5, fontStyle: 'italic', margin: '16px 0 0' }}>
            {fmtInt(a.recentSolves30)} solves in 30 days, {fmtInt(a.recentSolves90)} in 90.{' '}
            {last != null && last > 30
              ? 'The forge has gone cold — rebuilding the daily habit is the single highest-leverage move available.'
              : 'Momentum is alive. The Chase below is built to keep it that way.'}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
