// The manifest — every problem in the chase, filterable, exportable.

import { useMemo, useState } from 'react'
import { prettyTag, ratingColor } from '../lib/constants.js'

export default function FullList({ plan, done, toggle }) {
  const [q, setQ] = useState('')
  const [hideDone, setHideDone] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return plan.totalList.filter((p) => {
      if (hideDone && done.has(p.id)) return false
      if (!needle) return true
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(needle)) ||
        String(p.rating).includes(needle) ||
        (p.role || '').includes(needle)
      )
    })
  }, [plan, q, hideDone, done])

  const exportCsv = () => {
    const header = 'Day,Problem,Rating,Role,Topic,Step,Tags,URL'
    const lines = plan.totalList.map((p) =>
      [
        p.day,
        `"${p.name.replace(/"/g, "'")}"`,
        p.rating,
        p.role || '',
        p.ladderTag ? prettyTag(p.ladderTag) : 'breadth',
        p.ladderStep ? `${p.ladderStep}/${p.ladderTotal}` : '',
        `"${(p.tags || []).map(prettyTag).join('; ')}"`,
        p.url,
      ].join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascent-chase-${plan.meta.handle}-${plan.meta.start}-to-${plan.meta.target}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card pad">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 280, padding: '10px 14px' }}
          placeholder="filter by name, tag, rating, role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', cursor: 'pointer' }}>
          <input type="checkbox" className="chk" style={{ marginTop: 0, width: 16, height: 16 }} checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          hide conquered
        </label>
        <div style={{ flex: 1 }} />
        <span className="mono dim" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
          {rows.length} / {plan.totalList.length}
        </span>
        <button className="btn ghost sm" onClick={exportCsv}>
          ↓ Export CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="list">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Day</th>
              <th>Problem</th>
              <th>Rating</th>
              <th>Role</th>
              <th>Topic</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isDone = done.has(p.id)
              return (
                <tr key={p.id} className={isDone ? 'done' : ''}>
                  <td>
                    <input type="checkbox" className="chk" style={{ marginTop: 0 }} checked={isDone} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="mono">{p.day}</td>
                  <td>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {p.contestId}
                      {p.index} · {p.name}
                    </a>
                  </td>
                  <td className="mono" style={{ color: ratingColor(p.rating) }}>
                    {p.rating}
                  </td>
                  <td className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                    {p.role || '—'}
                    {p.ladderStep ? ` ${p.ladderStep}/${p.ladderTotal}` : ''}
                  </td>
                  <td style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{p.ladderTag ? prettyTag(p.ladderTag) : 'breadth'}</td>
                  <td className="tg">{(p.tags || []).map(prettyTag).join(', ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
