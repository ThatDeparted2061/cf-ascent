// THE SUMMIT MAP — pick any target rating and see precisely what it demands:
// which topics, at what depth, how far your evidence reaches, and the
// milestones you'd cross on the way. Fully live — recomputes as you change
// the target.

import { useMemo } from 'react'
import { readinessFor } from '../lib/analysis.js'
import { bandFor, milestonesBetween } from '../lib/curriculum.js'
import { ratingTier } from '../lib/constants.js'
import { Reveal, ProgressRing } from '../fx/Fx.jsx'
import { GapLedger } from './Charts.jsx'

const TARGET_CHIPS = [1200, 1400, 1600, 1900, 2100, 2400]

export default function SummitMap({ a, target, setTarget }) {
  const readiness = useMemo(() => readinessFor(a, target), [a, target])
  const band = bandFor(target)
  const tier = ratingTier(target)
  const milestones = milestonesBetween(a.workingLevel, target)

  return (
    <section className="section">
      <Reveal className="sec-head">
        <span className="num">03 — THE SUMMIT MAP</span>
        <h2 className="display">
          What <em>{target}</em> demands.
        </h2>
        <p className="sub">Choose a summit. The map recomputes what stands between you and it.</p>
      </Reveal>

      <Reveal className="card pad corner">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tier-chips" role="tablist" aria-label="Target rating">
            {TARGET_CHIPS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={target === t}
                className={`tier-chip${target === t ? ' active' : ''}`}
                style={target === t ? undefined : { color: ratingTier(t).color }}
                onClick={() => setTarget(t)}
                disabled={t <= a.workingLevel - 200}
                title={ratingTier(t).name}
              >
                {t} · {ratingTier(t).name}
              </button>
            ))}
          </div>
          <div className="nfield" style={{ width: 130 }}>
            <label>Custom</label>
            <input
              type="number"
              step="100"
              min="900"
              max="3500"
              value={target}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v)) setTarget(Math.max(900, Math.min(3500, v)))
              }}
            />
          </div>
        </div>

        <hr className="rule" style={{ margin: '26px 0' }} />

        <div className="chase-overview">
          <ProgressRing pct={readiness.pct / 100} label="ready" sub={`for ${target}`} big />
          <div>
            <div className="card-label" style={{ marginBottom: 10 }}>
              <span className="tick">✦</span> {band.name} — {band.tier}
            </div>
            <p className="verdict" style={{ fontSize: 'clamp(18px,2.1vw,24px)', margin: 0 }}>
              {band.motto} <span className="muted" style={{ fontStyle: 'italic' }}>{readiness.note}</span>
            </p>
            <div className="pills" style={{ marginTop: 14 }}>
              <span className="pill" style={{ color: 'var(--green)' }}>
                {readiness.counts.met} met
              </span>
              <span className="pill" style={{ color: 'var(--amber)' }}>
                {readiness.counts.close} close
              </span>
              <span className="pill" style={{ color: 'var(--red)' }}>
                {readiness.counts.missing} missing
              </span>
              <span className="pill">{tier.name} territory</span>
            </div>
          </div>
        </div>

        {milestones.length > 0 && (
          <>
            <hr className="rule" style={{ margin: '28px 0 34px' }} />
            <div className="milestones">
              <div className="mstone lit">
                <div className="r">{a.workingLevel}</div>
                <div className="nm">you are here</div>
              </div>
              {milestones.map((m) => (
                <div className="mstone" key={m.key}>
                  <div className="r" style={{ color: ratingTier(m.rating).color }}>
                    {m.rating}
                  </div>
                  <div className="nm">{m.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Reveal>

      <div className="charts-grid" style={{ marginTop: 16 }}>
        <Reveal className="card pad" delay={80}>
          <div className="card-label">
            <span className="tick">✦</span> The requirement ledger — topic by topic
          </div>
          <GapLedger items={readiness.items} max={12} />
        </Reveal>

        <Reveal className="card pad paper" delay={160}>
          <div className="card-label">
            <span className="tick">✦</span> What you must be able to do at {target}
          </div>
          <ul className="insight-list" style={{ color: 'var(--paper-ink)' }}>
            {band.skills.map((s, i) => (
              <li key={i} style={{ color: 'rgba(26,24,19,0.85)', borderColor: 'rgba(26,24,19,0.15)' }}>
                {s}
              </li>
            ))}
          </ul>
          <p style={{ fontStyle: 'italic', margin: '16px 0 0', color: 'rgba(26,24,19,0.65)', fontSize: 15 }}>
            “{band.unlock}”
          </p>
        </Reveal>
      </div>
    </section>
  )
}
