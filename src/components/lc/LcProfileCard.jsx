import { fmtInt } from '../../lib/constants.js'

export default function LcProfileCard({ a }) {
  const p = a.profile || {}
  const place = [p.company, p.school, p.countryName].filter(Boolean).join(' · ')

  return (
    <div className="card pad profile fade-up">
      <img
        className="avatar"
        src={p.userAvatar || '/favicon.svg'}
        alt={a.username}
        onError={(e) => {
          e.currentTarget.src = '/favicon.svg'
        }}
      />
      <div className="who">
        <h2>
          {a.username}
          <span className="rank-pill" style={{ color: 'var(--amber)' }}>
            LeetCode
          </span>
        </h2>
        <div className="meta">
          {p.realName ? p.realName + ' · ' : ''}
          {place || 'Location unknown'}
          {a.ranking ? ` · global rank #${fmtInt(a.ranking)}` : ''}
        </div>
      </div>
      <div className="rating-box">
        <div className="n">{fmtInt(a.totalSolved)}</div>
        <div className="l">Solved</div>
      </div>
      {a.contest.rating != null && (
        <div className="rating-box">
          <div className="n" style={{ color: 'var(--violet)' }}>
            {a.contest.rating}
          </div>
          <div className="l">Contest</div>
        </div>
      )}
      <div className="rating-box">
        <div className="n" style={{ color: 'var(--cyan)' }}>
          {a.readiness.score}
        </div>
        <div className="l">Readiness</div>
      </div>
    </div>
  )
}
