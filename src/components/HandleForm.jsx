import { useState } from 'react'
import { Marquee, Reveal, RidgeLine, WordReveal, CountUp, CircleBadge } from '../fx/Fx.jsx'

const COPY = {
  cf: {
    eyebrow: 'Training intelligence for the climb',
    sub: (
      <>
        Enter a Codeforces handle. Ascent reads <b>every submission you ever made</b>, measures your true
        level topic by topic, shows what your target demands — and stages <b>The Chase</b>: a living,
        day-by-day expedition that adapts to your progress.
      </>
    ),
    placeholder: 'your codeforces handle…',
    examples: ['tourist', 'Benq', 'jiangly', 'Errichto'],
    cta: 'Begin the climb',
  },
  lc: {
    eyebrow: 'Interview readiness, measured honestly',
    sub: (
      <>
        Enter a LeetCode username. Ascent scores you against the <b>patterns big-tech loops actually
        test</b>, finds the sections that would sink you, and builds a prep plan that covers all of it —
        skipping what you&apos;ve already solved.
      </>
    ),
    placeholder: 'your leetcode username…',
    examples: ['lee215', 'votrubac', 'awice'],
    cta: 'Measure me',
  },
}

const METHOD = [
  {
    idx: '01',
    h: 'The Reading',
    p: 'Every submission, verdict and contest is read. Per-topic ratings, error patterns, habits, streaks — evidence, not vibes.',
  },
  {
    idx: '02',
    h: 'The Summit Map',
    p: 'Pick a target. See precisely what it demands: which topics, at what depth, and how far your current evidence reaches.',
  },
  {
    idx: '03',
    h: 'The Chase',
    p: 'A staged, day-by-day expedition — topic ladders, spaced reviews, stretch problems — that re-plans itself as you move.',
  },
]

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
    <>
      <section className="hero">
        <div className="hero-art" aria-hidden="true">
          <RidgeLine seed={11} bars={120} height={520} peakAt={0.64} style={{ position: 'absolute', inset: 0 }} parallax={0.08} />
          <RidgeLine
            seed={4}
            bars={150}
            height={300}
            peakAt={0.22}
            amp={0.65}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', opacity: 0.55 }}
            parallax={0.16}
          />
        </div>

        <div className="container hero-inner">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="hero-title" aria-label="ASCENT">
            {'ASCENT'.split('').map((ch, i) => (
              <span className="hl" style={{ '--i': i }} key={i}>
                {ch}
              </span>
            ))}
          </h1>
          <p className="hero-sub">{c.sub}</p>

          <div style={{ marginTop: 30 }}>
            <div className="seg" role="tablist" aria-label="Platform">
              <button role="tab" aria-selected={platform === 'cf'} className={platform === 'cf' ? 'active' : ''} onClick={() => setPlatform('cf')}>
                Codeforces
              </button>
              <button role="tab" aria-selected={platform === 'lc'} className={platform === 'lc' ? 'active' : ''} onClick={() => setPlatform('lc')}>
                LeetCode
              </button>
            </div>
          </div>

          <form className="chase-row" onSubmit={submit}>
            <input
              className="input"
              placeholder={c.placeholder}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoFocus
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Handle"
            />
            <button className="btn" type="submit" disabled={loading || !handle.trim()}>
              {loading ? 'Reading…' : c.cta} →
            </button>
          </form>

          <div className="examples">
            or watch it read a legend:{' '}
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
        </div>

        <div className="scroll-cue">descend</div>
      </section>

      <Marquee
        items={[
          'ANALYZE',
          'THE SUMMIT MAP',
          'THE CHASE',
          'ADAPT',
          'ASCEND',
          '10,000+ PROBLEMS INDEXED',
          '37 TOPICS TRACKED',
          '7 LEVELS MAPPED',
        ]}
      />

      <section className="section">
        <div className="container">
          <Reveal className="sec-head">
            <span className="num">— THE METHOD —</span>
            <h2 className="display">
              From <em>where you are</em> to where you swore you&apos;d be.
            </h2>
          </Reveal>
          <Reveal>
            <div className="method">
              {METHOD.map((m) => (
                <div className="method-item" key={m.idx}>
                  <span className="idx">{m.idx}</span>
                  <h3>{m.h}</h3>
                  <p>{m.p}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="bignum-strip">
              <div className="bignum">
                <div className="n">
                  <CountUp value={10000} />
                  <small>+</small>
                </div>
                <div className="l">problems indexed</div>
              </div>
              <div className="bignum">
                <div className="n">
                  <CountUp value={37} />
                </div>
                <div className="l">topics modelled</div>
              </div>
              <div className="bignum">
                <div className="n">
                  <CountUp value={7} />
                </div>
                <div className="l">rating bands mapped</div>
              </div>
              <div className="bignum">
                <div className="n">
                  <CountUp value={100} />
                  <small>%</small>
                </div>
                <div className="l">from your real submissions</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container quote-block">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
            <CircleBadge text="SOLVE ✦ REVIEW ✦ STRETCH ✦ REPEAT ✦ " symbol="▲" />
          </div>
          <WordReveal
            className="q"
            text="“Just practice. Solve problems, solve problems, and solve some more problems. The rating follows the work — never the other way around.”"
          />
          <Reveal className="who" delay={150}>
            — the only training secret there is
          </Reveal>
        </div>
      </section>
    </>
  )
}
