import { useEffect, useState } from 'react'

const RAMPS = [
  { value: 'gentle', label: 'Gentle — smooth, longer climb' },
  { value: 'moderate', label: 'Moderate — balanced' },
  { value: 'steep', label: 'Steep — aggressive' },
]

export default function PlanControls({ params, onGenerate, currentRating, suggestedStart }) {
  const [draft, setDraft] = useState(params)

  useEffect(() => {
    setDraft(params)
  }, [params])

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const num = (k, v) => set(k, v === '' ? '' : Number(v))

  const start = Number(draft.start)
  const target = Number(draft.target)
  const days = Number(draft.days)
  const perDay = Number(draft.perDay)

  const valid =
    Number.isFinite(start) &&
    Number.isFinite(target) &&
    target >= start + 100 &&
    days >= 1 &&
    days <= 365 &&
    perDay >= 1 &&
    perDay <= 8

  const gain = currentRating != null ? target - currentRating : null

  return (
    <div className="card pad section fade-up">
      <div className="card-title">
        <span className="dot" /> Build your plan
      </div>
      <div className="controls">
        <div className="field">
          <label>Start rating</label>
          <input type="number" step="100" value={draft.start} onChange={(e) => num('start', e.target.value)} />
          <div className="hint">Suggested {suggestedStart} — editable</div>
        </div>
        <div className="field">
          <label>Target rating</label>
          <input type="number" step="100" value={draft.target} onChange={(e) => num('target', e.target.value)} />
          {gain != null && gain > 0 && (
            <div className="hint">
              <span className="gain-pill">▲ +{gain} goal</span>
            </div>
          )}
        </div>
        <div className="field">
          <label>Days</label>
          <input type="number" min="1" max="365" value={draft.days} onChange={(e) => num('days', e.target.value)} />
          <div className="hint">{valid ? `${perDay * days} problems total` : ' '}</div>
        </div>
        <div className="field">
          <label>Problems / day</label>
          <input type="number" min="1" max="8" value={draft.perDay} onChange={(e) => num('perDay', e.target.value)} />
          <div className="hint">&nbsp;</div>
        </div>
        <div className="field">
          <label>Ramp</label>
          <select className="select" value={draft.ramp} onChange={(e) => set('ramp', e.target.value)}>
            {RAMPS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" disabled={!valid} onClick={() => onGenerate(draft)}>
          Generate plan
        </button>
        {!valid && (
          <span className="hint" style={{ marginTop: 0 }}>
            Target must be at least 100 above start; days 1–365; problems/day 1–8.
          </span>
        )}
      </div>
    </div>
  )
}
