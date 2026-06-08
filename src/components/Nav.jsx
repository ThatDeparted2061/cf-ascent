export default function Nav({ onReset, showReset }) {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <div
          className="brand"
          style={{ cursor: 'pointer' }}
          onClick={onReset}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onReset()}
        >
          <span className="logo">
            <svg width="17" height="17" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M32 12 L52 50 H40 L32 33 L24 50 H12 Z" fill="#061018" />
            </svg>
          </span>
          <span>
            Ascent
            <small>Codeforces practice planner</small>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {showReset && (
            <button className="nav-link" onClick={onReset} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
              New analysis
            </button>
          )}
          <a className="nav-link" href="https://codeforces.com" target="_blank" rel="noreferrer">
            Codeforces ↗
          </a>
        </div>
      </div>
    </nav>
  )
}
