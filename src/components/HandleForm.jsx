import { useState } from 'react'

const COPY = {
  cf: {
    eyebrow: '▲ Climb your Codeforces rating with a plan',
    title: (
      <>
        From where you are to <span className="grad-text">where you want to be.</span>
      </>
    ),
    lead:
      'Enter any handle. Ascent reads your full submission history, finds your weak spots, and builds a personalized day-by-day problem set with a difficulty ramp that never jumps too far.',
    placeholder: 'Your Codeforces handle…',
    examples: ['tourist', 'Benq', 'jiangly', 'Errichto'],
    features: [
      { ic: '🔬', h: 'Deep profile analysis', p: 'Rating distribution, per-topic mastery, accuracy and an error profile — from your real submissions.' },
      { ic: '🎯', h: 'Weak-area targeting', p: 'The plan weights problems toward the topics that matter for your goal but that you haven’t mastered yet.' },
      { ic: '📈', h: 'Gradual difficulty ramp', p: 'Each day mixes consolidation, at-level and stretch problems, climbing smoothly toward your target.' },
    ],
  },
  lc: {
    eyebrow: '◆ Are you ready for big tech?',
    title: (
      <>
        Find every gap between you and <span className="grad-text">your dream offer.</span>
      </>
    ),
    lead:
      'Enter your LeetCode username. Ascent scores your interview-readiness against the patterns big-tech SDE loops actually test, pinpoints your weak sections, and builds a full prep plan covering every topic.',
    placeholder: 'Your LeetCode username…',
    examples: ['lee215', 'votrubac', 'awice'],
    features: [
      { ic: '📊', h: 'Big-tech readiness score', p: 'A 0–100 score measured against the canonical interview blueprint — sections, difficulty mix, and contests.' },
      { ic: '🧭', h: 'Weak-section detection', p: 'See exactly which patterns (DP, graphs, intervals…) are holding you back, and why each matters to hire.' },
      { ic: '🗺️', h: 'Full prep plan', p: 'A topic-by-topic curriculum plus a day-by-day schedule that covers everything you need to crack the loop.' },
    ],
  },
}

export default function HandleForm({ platform, setPlatform, onAnalyze, loading, initialHandle, error }) {
  const [handle, setHandle] = useState(initialHandle || '')
  const c = COPY[platform]

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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
          <div className="tabs">
            <button className={platform === 'cf' ? 'active' : ''} onClick={() => setPlatform('cf')}>
              Codeforces
            </button>
            <button className={platform === 'lc' ? 'active' : ''} onClick={() => setPlatform('lc')}>
              LeetCode
            </button>
          </div>
        </div>

        <span className="eyebrow">{c.eyebrow}</span>
        <h1>{c.title}</h1>
        <p className="lead">{c.lead}</p>

        <form className="handle-row" onSubmit={submit}>
          <input
            className="input"
            placeholder={c.placeholder}
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
          {c.examples.map((h, i) => (
            <span key={h}>
              <button type="button" onClick={() => pick(h)}>
                {h}
              </button>
              {i < c.examples.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="features">
          {c.features.map((f) => (
            <div className="card feature" key={f.h}>
              <div className="ic">{f.ic}</div>
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
