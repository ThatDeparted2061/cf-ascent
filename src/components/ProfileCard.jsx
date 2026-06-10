import { ratingTier, fmtInt } from '../lib/constants.js'
import { CountUp, Reveal, CircleBadge } from '../fx/Fx.jsx'

function avatarUrl(info) {
  let u = info?.titlePhoto || ''
  if (!u) return '/favicon.svg'
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('/')) return 'https://codeforces.com' + u
  return u
}

const titleCase = (s) => (s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function ProfileCard({ a }) {
  const tier = ratingTier(a.currentRating)
  const maxTier = ratingTier(a.maxRating)
  const place = [a.info?.city, a.info?.country].filter(Boolean).join(', ')

  return (
    <Reveal className="profile-band" style={{ paddingTop: 26 }}>
      <div className="avatar-frame">
        <img
          src={avatarUrl(a.info)}
          alt={a.handle}
          onError={(e) => {
            e.currentTarget.src = '/favicon.svg'
          }}
        />
      </div>

      <div className="profile-who">
        <span className="tier-tag" style={{ color: tier.color }}>
          ✦ {a.rank ? titleCase(a.rank) : 'Unrated'} — {a.band.name} · {a.band.tier}
        </span>
        <h1 className="handle">{a.handle}</h1>
        <div className="meta">
          {a.info?.organization ? `${a.info.organization} · ` : ''}
          {place || 'somewhere on the mountain'}
          {typeof a.info?.contribution === 'number' ? ` · contribution ${a.info.contribution}` : ''}
          {' · '}
          {a.levelEstimate.trend === 'rising' ? 'form: rising ↗' : a.levelEstimate.trend === 'cooling' ? 'form: cooling ↘' : 'form: holding →'}
        </div>
      </div>

      <div className="profile-nums">
        <div className="pnum">
          <div className="n" style={{ color: tier.color }}>
            {a.currentRating != null ? <CountUp value={a.currentRating} /> : '—'}
          </div>
          <div className="l">current</div>
        </div>
        <div className="pnum">
          <div className="n" style={{ color: maxTier.color }}>
            {a.maxRating != null ? <CountUp value={a.maxRating} /> : '—'}
          </div>
          <div className="l">peak</div>
        </div>
        <div className="pnum">
          <div className="n">
            <CountUp value={a.totalSolved} />
          </div>
          <div className="l">solved</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CircleBadge text={`THE ASCENT OF ${(a.handle || '').toUpperCase().slice(0, 14)} ✦ EST. LEVEL ${a.workingLevel} ✦ `} />
      </div>
    </Reveal>
  )
}
