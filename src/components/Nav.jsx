export default function Nav({ onReset, showReset, user, syncing, onSignIn, onSignOut }) {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <div
          className="brand"
          onClick={onReset}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onReset()}
          title="Ascent — back to the start"
        >
          <span className="peak">▲</span>
          ASCENT
        </div>

        <div className="nav-side">
          {showReset && (
            <button className="nav-link" onClick={onReset}>
              New analysis
            </button>
          )}
          <a className="nav-link" href="https://codeforces.com" target="_blank" rel="noreferrer">
            Codeforces ↗
          </a>

          {user ? (
            <div className="user-chip" title={user.email || ''}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="peak" style={{ paddingLeft: 6 }}>✦</span>
              )}
              <span className="nm">{(user.displayName || user.email || 'climber').split(' ')[0]}</span>
              <span className="sync-dot" title={syncing ? 'Syncing…' : 'Progress synced to the cloud'} />
              <button className="nav-link" style={{ padding: '4px 2px 4px 6px' }} onClick={onSignOut} title="Sign out">
                ✕
              </button>
            </div>
          ) : (
            <button className="btn sm" onClick={onSignIn} title="Google sign-in: progress follows you across devices">
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
