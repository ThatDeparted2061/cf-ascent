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
        p.tags.some((t) => t.toLowerCase().includes(needle)) ||
        String(p.rating).includes(needle)
      )
    })
  }, [plan, q, hideDone, done])

  const exportCsv = () => {
    const header = 'Day,Problem,Rating,Role,Tags,URL'
    const lines = plan.totalList.map((p) =>
      [
        p.day,
        `"${p.name.replace(/"/g, "'")}"`,
        p.rating,
        p.role,
        `"${p.tags.map(prettyTag).join('; ')}"`,
        p.url,
      ].join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascent-${plan.meta.handle}-${plan.meta.start}-to-${plan.meta.target}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card pad">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          className="input"
          style={{ maxWidth: 260, padding: '9px 13px', fontSize: 14 }}
          placeholder="Filter by name, tag, rating…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--muted)' }}>
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide completed
        </label>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }}>
          {rows.length} of {plan.totalList.length}
        </span>
        <button className="btn ghost sm" onClick={exportCsv}>
          ⬇ Export CSV
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
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isDone = done.has(p.id)
              return (
                <tr key={p.id} className={isDone ? 'done' : ''}>
                  <td>
                    <input type="checkbox" className="chk" checked={isDone} onChange={() => toggle(p.id)} />
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
                  <td style={{ textTransform: 'capitalize' }}>{p.role}</td>
                  <td className="tg">{p.tags.map(prettyTag).join(', ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
