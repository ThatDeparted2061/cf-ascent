// ────────────────────────────────────────────────────────────────────────────
//  FX — hand-rolled motion primitives. No animation libraries: just
//  IntersectionObserver, requestAnimationFrame, CSS transitions, and SVG.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'

// ── useInView: adds reveal behaviour ────────────────────────────────────────
export function useInView(threshold = 0.18, once = true) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            if (once) obs.disconnect()
          } else if (!once) setInView(false)
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, once])
  return [ref, inView]
}

// ── <Reveal>: fade-rise-unblur wrapper ──────────────────────────────────────
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' in' : ''} ${className}`}
      style={{ '--d': `${delay}ms`, ...(rest.style || {}) }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// ── <CountUp>: numbers that climb ───────────────────────────────────────────
export function CountUp({ value, duration = 1500, format, className, style }) {
  const [ref, inView] = useInView(0.4)
  const [shown, setShown] = useState(0)
  const target = Number(value) || 0

  useEffect(() => {
    if (!inView) return
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setShown(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, duration])

  const out = format ? format(shown) : Math.round(shown).toLocaleString('en-US')
  return (
    <span ref={ref} className={className} style={style}>
      {out}
    </span>
  )
}

// ── <Marquee>: the looping strip ────────────────────────────────────────────
export function Marquee({ items, big = false, duration = 38 }) {
  const content = (key) => (
    <div className="marquee-track" key={key} aria-hidden={key === 1}>
      {[...items, ...items].map((it, i) => (
        <span key={i}>
          {it} <b>✦</b>{' '}
        </span>
      ))}
    </div>
  )
  return (
    <div className={`marquee${big ? ' big' : ''}`} style={{ '--mq-dur': `${duration}s` }}>
      {content(0)}
    </div>
  )
}

// ── seeded tiny rng ─────────────────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── <RidgeLine>: the signature halftone mountain, built from vertical bars ──
//  Procedural: layered sines + seeded noise form a ridge; each bar rises with
//  a stagger when it enters view; subtle vertical parallax on scroll.
export function RidgeLine({
  seed = 7,
  bars = 110,
  height = 420,
  peakAt = 0.62,
  amp = 1,
  className = '',
  parallax = 0.06,
  style,
}) {
  const [ref, inView] = useInView(0.05)
  const wrapRef = useRef(null)

  const heights = useMemo(() => {
    const r = rng(seed * 7919 + 13)
    const phase1 = r() * Math.PI * 2
    const phase2 = r() * Math.PI * 2
    const out = []
    for (let i = 0; i < bars; i++) {
      const x = i / (bars - 1)
      // mountain mass centered at peakAt
      const peak = Math.exp(-Math.pow((x - peakAt) * 2.6, 2))
      const ridge =
        0.62 * peak +
        0.16 * Math.sin(x * 9 + phase1) * peak +
        0.1 * Math.sin(x * 23 + phase2) * Math.max(0.15, peak) +
        0.07 * r()
      out.push(Math.max(0.015, Math.min(1, ridge * amp)))
    }
    return out
  }, [seed, bars, peakAt, amp])

  // gentle parallax
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !parallax) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translateY(${window.scrollY * parallax}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [parallax])

  const W = 1200
  const bw = W / bars
  return (
    <div ref={ref} className={className} style={style}>
      <div ref={wrapRef} style={{ height: '100%' }}>
        <svg
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="xMidYMax slice"
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-hidden="true"
        >
          {heights.map((h, i) => (
            <rect
              key={i}
              x={i * bw + bw * 0.22}
              width={bw * 0.56}
              y={height - h * height}
              height={h * height}
              fill="var(--gold)"
              opacity={0.16 + h * 0.5}
              style={{
                transform: inView ? 'scaleY(1)' : 'scaleY(0)',
                transformOrigin: `0 ${height}px`,
                transition: `transform 1.3s cubic-bezier(.19,1,.22,1) ${i * 9}ms`,
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

// ── <PlanRidge>: same engraved-bar language, but driven by REAL data ────────
//  Each bar = one day of the plan, height = difficulty center. The climb,
//  literally drawn.
export function PlanRidge({ days, lo, hi, done = new Set(), height = 120 }) {
  const [ref, inView] = useInView(0.2)
  if (!days?.length) return null
  const W = Math.max(420, days.length * 14)
  const bw = W / days.length
  const span = Math.max(100, hi - lo)
  return (
    <div ref={ref} style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${height + 26}`}
        style={{ width: '100%', minWidth: 420, display: 'block' }}
        role="img"
        aria-label="Difficulty ramp across the plan"
      >
        {days.map((d, i) => {
          const h = 0.18 + (0.82 * (d.center - lo)) / span
          const dayDone =
            d.problems.length > 0 && d.problems.every((p) => done.has(p.id))
          return (
            <g key={d.day}>
              <rect
                x={i * bw + bw * 0.2}
                width={bw * 0.6}
                y={height - h * height}
                height={h * height}
                fill={dayDone ? 'var(--gold-hi)' : 'var(--gold)'}
                opacity={dayDone ? 0.95 : 0.3 + h * 0.45}
                style={{
                  transform: inView ? 'scaleY(1)' : 'scaleY(0)',
                  transformOrigin: `0 ${height}px`,
                  transition: `transform 1.1s cubic-bezier(.19,1,.22,1) ${i * 18}ms`,
                }}
              >
                <title>{`Day ${d.day} — center ${d.center}${dayDone ? ' · complete' : ''}`}</title>
              </rect>
              {(i === 0 || i === days.length - 1) && (
                <text
                  x={i * bw + bw / 2}
                  y={height + 17}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="var(--muted-2)"
                >
                  {d.center}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── <CircleBadge>: slow-rotating circular text stamp ────────────────────────
export function CircleBadge({ text = 'THE ASCENT ✦ THE CHASE ✦ ', symbol = '▲' }) {
  const id = useMemo(() => `cb${Math.random().toString(36).slice(2, 8)}`, [])
  return (
    <div className="cbadge" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs>
          <path id={id} d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        </defs>
        <text>
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </svg>
      <div className="core">{symbol}</div>
    </div>
  )
}

// ── <WordReveal>: scroll-lit word-by-word quote ─────────────────────────────
export function WordReveal({ text, className = '', style }) {
  const ref = useRef(null)
  const [lit, setLit] = useState(0)
  const words = useMemo(() => String(text).split(/\s+/), [text])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      // progress: 0 when the block enters, 1 when its middle passes ~38% of vp
      const p = (vh * 0.82 - r.top) / (r.height + vh * 0.4)
      setLit(Math.floor(Math.max(0, Math.min(1, p)) * words.length * 1.15))
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [words.length])

  return (
    <div ref={ref} className={`wreveal ${className}`} style={style}>
      {words.map((w, i) => (
        <span key={i} className={`w${i < lit ? ' lit' : ''}`}>
          {w}{' '}
        </span>
      ))}
    </div>
  )
}

// ── <ProgressRing>: circular completion meter ──────────────────────────────
export function ProgressRing({ pct = 0, label = 'complete', big, sub }) {
  const [ref, inView] = useInView(0.3)
  const R = 70
  const C = 2 * Math.PI * R
  const p = Math.max(0, Math.min(1, pct))
  return (
    <div className="ring" ref={ref} style={big ? { width: 190, height: 190 } : undefined}>
      <svg viewBox="0 0 158 158" width="100%" height="100%">
        <circle className="track" cx="79" cy="79" r={R} />
        <circle
          className="val"
          cx="79"
          cy="79"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={inView ? C * (1 - p) : C}
        />
      </svg>
      <div className="center">
        <div className="n">
          <CountUp value={Math.round(p * 100)} />
          <span style={{ fontSize: '0.5em' }}>%</span>
        </div>
        <div className="l">{label}</div>
        {sub && <div className="l" style={{ color: 'var(--gold-dim)' }}>{sub}</div>}
      </div>
    </div>
  )
}
