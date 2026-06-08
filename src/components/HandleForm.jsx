import { useState } from 'react'

const EXAMPLES = ['tourist', 'Benq', 'jiangly', 'Errichto']

export default function HandleForm({ onAnalyze, loading, initialHandle, error }) {
  const [handle, setHandle] = useState(initialHandle || '')

  const submit = (e) => {
    e.preventDefault()
    const h = handle.trim()
    if (h) onAnalyze(h)
  }

  const pick = (h) => {
    setHandle(h)
    onAnalyze(h)
  }

  return (
    <section className="hero fade-up">
      <div className="container">
        <span className="eyebrow">▲ Climb your Codeforces rating with a plan</span>
        <h1>
          From where you are to <span className="grad-text">where you want to be.</span>
        </h1>
        <p className="lead">
          Enter any handle. Ascent reads your full submission history, finds your weak spots, and
          builds a personalized day-by-day problem set with a difficulty ramp that never jumps too
          far — so your rating actually moves.
        </p>

        <form className="handle-row" onSubmit={submit}>
          <input
            className="input"
            placeholder="Your Codeforces handle…"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoFocus
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button className="btn" type="submit" disabled={loading || !handle.trim()}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </form>

        <div className="examples">
          Try:{' '}
          {EXAMPLES.map((h, i) => (
            <span key={h}>
              <button type="button" onClick={() => pick(h)}>
                {h}
              </button>
              {i < EXAMPLES.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="features">
          <div className="card feature">
            <div className="ic">🔬</div>
            <h3>Deep profile analysis</h3>
            <p>
              Rating distribution, per-topic mastery, accuracy and an error profile — all derived
              from your real submissions, not guesses.
            </p>
          </div>
          <div className="card feature">
            <div className="ic">🎯</div>
            <h3>Weak-area targeting</h3>
            <p>
              The plan weights problems toward the topics that matter for your goal but that you
              haven&apos;t mastered yet.
            </p>
          </div>
          <div className="card feature">
            <div className="ic">📈</div>
            <h3>Gradual difficulty ramp</h3>
            <p>
              Each day mixes consolidation, at-level and stretch problems, climbing smoothly from
              your level toward your target.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
