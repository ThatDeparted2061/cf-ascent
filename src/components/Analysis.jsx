import { prettyTag, fmtPct, fmtInt, clamp01, daysAgo } from '../lib/constants.js'

function list(tags) {
  const names = tags.map((t) => prettyTag(t.tag))
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

function TagBars({ items, mode }) {
  if (!items.length)
    return <p className="muted" style={{ margin: 0, fontSize: 14 }}>Not enough data yet.</p>
  return (
    <div className="tag-bars">
      {items.map((t) => {
        const pct = mode === 'good' ? t.skill : 1 - t.skill
        return (
          <div className="tag-bar" key={t.tag}>
            <div className="top">
              <span>{prettyTag(t.tag)}</span>
              <span className="r">
                {t.solved} solved{t.maxRating ? ` · max ${t.maxRating}` : ''}
              </span>
            </div>
            <div className="track">
              <i className={mode === 'good' ? 'fill-good' : 'fill-weak'} style={{ width: `${clamp01(pct) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Analysis({ a }) {
  const p = a.percentiles
  const stretchesWell = p.maxSolved != null && p.maxSolved - a.workingLevel >= 200
  const last = daysAgo(a.lastActiveUnix)

  return (
    <div className="section fade-up">
      <div className="section-head">
        <div>
          <h2>Deep analysis</h2>
          <p>Everything below is computed from {fmtInt(a.totalSubmissions)} real submissions.</p>
        </div>
      </div>

      <div className="card pad narrative">
        <p>
          <strong>{a.handle}</strong> is {a.rank ? a.rank : 'currently unrated'}
          {a.currentRating != null ? (
            <>
              {' '}
              with a current rating of <strong>{a.currentRating}</strong>
              {a.maxRating != null ? <> (peak {a.maxRating})</> : null}
            </>
          ) : null}
          . They&apos;ve solved <strong>{fmtInt(a.totalSolved)}</strong> distinct problems out of{' '}
          {fmtInt(a.totalAttemptedDistinct)} attempted — an overall solve rate of{' '}
          <strong>{fmtPct(a.problemAccuracy)}</strong>. From the spread of difficulties they clear,
          their estimated true working level is <strong>{a.workingLevel}</strong>.
        </p>

        {p.p50 != null && (
          <p>
            Most solved problems sit around <strong>{p.p50}–{p.p85}</strong>, and the hardest cracked
            is <strong>{p.maxSolved}</strong>.{' '}
            {stretchesWell
              ? 'They already stretch well above their comfort zone — a healthy sign.'
              : 'There&apos;s room to push into harder territory more often; the plan deliberately schedules stretch problems.'}
          </p>
        )}

        <p>
          {a.strengths.length ? (
            <>
              Strongest areas: <strong>{list(a.strengths.slice(0, 3))}</strong>.{' '}
            </>
          ) : (
            <>No standout topic strengths yet — breadth is still developing. </>
          )}
          {a.weaknesses.length ? (
            <>
              The biggest opportunities are <strong>{list(a.weaknesses.slice(0, 4))}</strong> — common
              at this level but under-developed, so the plan front-loads them.
            </>
          ) : (
            <>No glaring topic gaps for this level; the plan will focus on steady difficulty progression.</>
          )}
        </p>

        {a.errorProfile.insights.length > 0 && (
          <>
            <p style={{ marginBottom: 8 }}>
              <strong>Where attempts fail.</strong>
            </p>
            <ul className="insights">
              {a.errorProfile.insights.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </>
        )}

        <p style={{ marginTop: a.errorProfile.insights.length ? 13 : 0 }}>
          In the last 30 days they&apos;ve solved <strong>{fmtInt(a.recentSolves30)}</strong> problems
          ({fmtInt(a.recentSolves90)} in 90).{' '}
          {last != null && last > 30
            ? 'Activity has cooled off recently — rebuilding a daily habit is the single highest-leverage change.'
            : 'Momentum looks good — keep the streak going.'}
        </p>
      </div>

      <div className="callouts" style={{ marginTop: 16 }}>
        <div className="card pad">
          <div className="card-title">
            <span className="dot" style={{ background: 'var(--green)', boxShadow: '0 0 10px var(--green)' }} />
            Strengths
          </div>
          <TagBars items={a.strengths} mode="good" />
        </div>
        <div className="card pad">
          <div className="card-title">
            <span className="dot" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />
            Focus areas (train these)
          </div>
          <TagBars items={a.weaknesses} mode="weak" />
        </div>
      </div>
    </div>
  )
}
