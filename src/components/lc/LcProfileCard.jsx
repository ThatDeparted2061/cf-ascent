import { fmtInt } from '../../lib/constants.js'
import { CountUp, Reveal, CircleBadge } from '../../fx/Fx.jsx'

export default function LcProfileCard({ a }) {
  const p = a.profile || {}
  const place = [p.company, p.school, p.countryName].filter(Boolean).join(' · ')
  const tone = a.readiness.band.tone === 'green' ? 'var(--green)' : a.readiness.band.tone === 'red' ? 'var(--red)' : 'var(--amber)'

  return (
    <Reveal className="profile-band" style={{ paddingTop: 26 }}>
      <div className="avatar-frame">
        <img
          src={p.userAvatar || '/favicon.svg'}
          alt={a.username}
          onError={(e) => {
            e.currentTarget.src = '/favicon.svg'
          }}
        />
      </div>

      <div className="profile-who">
        <span className="tier-tag" style={{ color: tone }}>
          ✦ {a.readiness.band.label} — the interview ledger
        </span>
        <h1 className="handle">{a.username}</h1>
        <div className="meta">
          {p.realName ? `${p.realName} · ` : ''}
          {place || 'somewhere grinding'}
          {a.ranking ? ` · global #${fmtInt(a.ranking)}` : ''}
        </div>
      </div>

      <div className="profile-nums">
        <div className="pnum">
          <div className="n">
            <CountUp value={a.totalSolved} />
          </div>
          <div className="l">solved</div>
        </div>
        {a.contest.rating != null && (
          <div className="pnum">
            <div className="n" style={{ color: 'var(--cyan)' }}>
              <CountUp value={a.contest.rating} />
            </div>
            <div className="l">contest</div>
          </div>
        )}
        <div className="pnum">
          <div className="n" style={{ color: tone }}>
            <CountUp value={a.readiness.score} />
          </div>
          <div className="l">readiness</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CircleBadge text={`THE OFFER CHASE ✦ ${(a.username || '').toUpperCase().slice(0, 14)} ✦ `} symbol="◆" />
      </div>
    </Reveal>
  )
}
