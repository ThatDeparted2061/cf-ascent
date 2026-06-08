import { ratingTier, fmtInt } from '../lib/constants.js'

function avatarUrl(info) {
  let u = info?.titlePhoto || ''
  if (!u) return '/favicon.svg'
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('/')) return 'https://codeforces.com' + u
  return u
}

function titleCase(s) {
  return (s || '').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ProfileCard({ a }) {
  const tier = ratingTier(a.currentRating)
  const maxTier = ratingTier(a.maxRating)
  const place = [a.info?.city, a.info?.country].filter(Boolean).join(', ')

  return (
    <div className="card pad profile fade-up">
      <img
        className="avatar"
        src={avatarUrl(a.info)}
        alt={a.handle}
        onError={(e) => {
          e.currentTarget.src = '/favicon.svg'
        }}
      />
      <div className="who">
        <h2>
          {a.handle}
          {a.rank && (
            <span className="rank-pill" style={{ color: tier.color }}>
              {titleCase(a.rank)}
            </span>
          )}
        </h2>
        <div className="meta">
          {a.info?.organization ? a.info.organization + ' · ' : ''}
          {place || 'Location unknown'}
          {typeof a.info?.contribution === 'number' ? ` · contribution ${a.info.contribution}` : ''}
        </div>
      </div>
      <div className="rating-box">
        <div className="n" style={{ color: tier.color }}>
          {a.currentRating ?? '—'}
        </div>
        <div className="l">Current</div>
      </div>
      <div className="rating-box">
        <div className="n" style={{ color: maxTier.color }}>
          {a.maxRating ?? '—'}
        </div>
        <div className="l">Peak</div>
      </div>
      <div className="rating-box">
        <div className="n">{fmtInt(a.totalSolved)}</div>
        <div className="l">Solved</div>
      </div>
    </div>
  )
}
