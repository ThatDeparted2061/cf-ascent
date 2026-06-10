import { useCallback, useEffect, useRef, useState } from 'react'
import { loadEverything as loadCf } from './api/codeforces.js'
import { loadEverything as loadLc } from './api/leetcode.js'
import { analyzeProfile } from './lib/analysis.js'
import { generateChase, adaptChase } from './lib/recommender.js'
import { analyzeLeetCode } from './lib/lcAnalysis.js'
import { generateLcPlan } from './lib/lcRecommender.js'
import { clamp, round100 } from './lib/constants.js'
import {
  getLastHandle,
  setLastHandle,
  saveSession,
  loadSession,
  clearSession,
  getDone,
  attachCloud,
  detachCloud,
} from './lib/storage.js'
import { watchAuth, signInWithGoogle, signOutUser } from './lib/firebase.js'

import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import HandleForm from './components/HandleForm.jsx'
import Loader from './components/Loader.jsx'
import CfDashboard from './components/CfDashboard.jsx'
import LcDashboard from './components/lc/LcDashboard.jsx'

function defaultCfParams(a) {
  const start = a.suggestedStart
  const target = clamp(round100(start + 400), start + 100, 3500)
  return { start, target, days: 30, perDay: 3, ramp: 'gentle', createdAt: Date.now() }
}
const defaultLcParams = () => ({ level: 'foundation', days: 30 })

// Compute which plan problems the user has ALREADY solved on Codeforces —
// these get auto-checked (the engine refuses to assign busywork).
function computeAutoDone(plan, analysis) {
  if (!plan || !analysis) return new Set()
  const out = new Set()
  for (const p of plan.totalList) if (analysis.solvedSet.has(p.id)) out.add(p.id)
  return out
}

// Immutable swap: replace a problem with one of its alternates everywhere in
// the plan (the original becomes an alternate, so swaps are reversible).
function swapInPlan(plan, id, altId) {
  let original = null
  let alt = null
  for (const d of plan.days) {
    for (const p of d.problems) {
      if (p.id === id && p.alts) {
        original = p
        alt = p.alts.find((a) => a.id === altId)
      }
    }
  }
  if (!original || !alt) return plan

  const replacement = {
    ...original,
    id: alt.id,
    contestId: alt.contestId,
    index: alt.index,
    name: alt.name,
    rating: alt.rating,
    solvedCount: alt.solvedCount,
    tags: alt.tags || original.tags,
    url: alt.url,
    alts: [
      {
        id: original.id,
        contestId: original.contestId,
        index: original.index,
        name: original.name,
        rating: original.rating,
        solvedCount: original.solvedCount,
        tags: original.tags,
        url: original.url,
      },
      ...original.alts.filter((a) => a.id !== altId),
    ].slice(0, 2),
  }

  const swapP = (p) => (p.id === id ? replacement : p)
  return {
    ...plan,
    days: plan.days.map((d) => ({ ...d, problems: d.problems.map(swapP) })),
    totalList: plan.totalList.map(swapP),
    byTopic: plan.byTopic.map((t) => ({ ...t, items: t.items.map(swapP) })),
  }
}

export default function App() {
  const [platform, setPlatform] = useState('cf')
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState(null)
  const [resultPlatform, setResultPlatform] = useState('cf')

  const [cf, setCf] = useState(null) // { analysis, problems, params, plan, autoDone }
  const [lc, setLc] = useState(null) // { analysis, data, params, plan }
  const [cfTarget, setCfTarget] = useState(1600)

  const [user, setUser] = useState(null)
  const [resyncState, setResyncState] = useState(null)
  const restoredRef = useRef(false)

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const un = watchAuth(async (u) => {
      setUser(u)
      if (u) {
        try {
          await attachCloud(u) // merges cloud progress into local
        } catch (e) {
          console.warn('cloud attach failed', e)
        }
      } else {
        detachCloud()
      }
    })
    return un
  }, [])

  const onSignIn = useCallback(async () => {
    try {
      await signInWithGoogle()
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user') console.warn('sign-in failed', e)
    }
  }, [])
  const onSignOut = useCallback(() => signOutUser().catch(() => {}), [])

  // ── restore last session ──────────────────────────────────────────────────
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const s = loadSession()
    if (!s) return
    setPlatform(s.platform)
    ;(async () => {
      try {
        if (s.platform === 'lc' && s.data) {
          const analysis = analyzeLeetCode({ username: s.handle, ...s.data })
          const params = s.params || defaultLcParams()
          const plan = generateLcPlan(analysis, params)
          setLc({ analysis, data: s.data, params, plan })
          setResultPlatform('lc')
          setStatus('ready')
        } else if (s.platform === 'cf') {
          setStatus('loading')
          setLoadingMsg('Restoring your expedition…')
          const data = await loadCf(s.handle, setLoadingMsg)
          const analysis = analyzeProfile(data)
          const params = s.params || defaultCfParams(analysis)
          let plan = null
          try {
            plan = generateChase(analysis, data.problems, params)
          } catch {
            plan = null
          }
          // silent adaptation: re-plan the remaining days from real progress
          if (plan) {
            const done = getDone(plan.signature)
            const auto = computeAutoDone(plan, analysis)
            for (const id of auto) done.add(id)
            const ad = adaptChase(plan, done, analysis, data.problems)
            if (ad.changed) plan = ad.plan
          }
          setCf({ analysis, problems: data.problems, params, plan, autoDone: computeAutoDone(plan, analysis) })
          setCfTarget(params.target)
          setResultPlatform('cf')
          setStatus('ready')
        }
      } catch {
        setStatus('idle')
      }
    })()
  }, [])

  // ── analyze ───────────────────────────────────────────────────────────────
  const analyze = useCallback(
    async (handle) => {
      setStatus('loading')
      setError(null)
      setResyncState(null)
      try {
        if (platform === 'cf') {
          const data = await loadCf(handle, setLoadingMsg)
          setLoadingMsg('Reading the mountain…')
          const analysis = analyzeProfile(data)
          const params = defaultCfParams(analysis)
          let plan = null
          try {
            plan = generateChase(analysis, data.problems, params)
          } catch {
            plan = null
          }
          setCf({ analysis, problems: data.problems, params, plan, autoDone: computeAutoDone(plan, analysis) })
          setCfTarget(params.target)
          setResultPlatform('cf')
          saveSession({ platform: 'cf', handle, params })
        } else {
          const data = await loadLc(handle, setLoadingMsg)
          setLoadingMsg('Scoring interview readiness…')
          const analysis = analyzeLeetCode(data)
          const params = defaultLcParams()
          let plan = null
          try {
            plan = generateLcPlan(analysis, params)
          } catch {
            plan = null
          }
          setLc({ analysis, data, params, plan })
          setResultPlatform('lc')
          saveSession({ platform: 'lc', handle, data, params })
        }
        setStatus('ready')
        setLastHandle(handle)
        window.scrollTo({ top: 0, behavior: 'auto' })
      } catch (e) {
        setError(e?.message || 'Could not load that profile. Double-check the spelling and try again.')
        setStatus('error')
      }
    },
    [platform],
  )

  // ── stage / restage the chase ────────────────────────────────────────────
  const onGenerateCf = useCallback(
    (draft) => {
      if (!cf) return
      const params = {
        start: Number(draft.start),
        target: Number(draft.target),
        days: Number(draft.days),
        perDay: Number(draft.perDay),
        ramp: draft.ramp,
        createdAt: Date.now(),
      }
      let plan = null
      try {
        plan = generateChase(cf.analysis, cf.problems, params)
      } catch {
        plan = null
      }
      setCf((prev) => ({ ...prev, params, plan, autoDone: computeAutoDone(plan, prev.analysis) }))
      setCfTarget(params.target)
      setResyncState(null)
      saveSession({ platform: 'cf', handle: cf.analysis.handle, params })
    },
    [cf],
  )

  const onGenerateLc = useCallback(
    (draft) => {
      if (!lc) return
      const params = { level: draft.level, days: Number(draft.days) }
      let plan = null
      try {
        plan = generateLcPlan(lc.analysis, params)
      } catch {
        plan = null
      }
      setLc((prev) => ({ ...prev, params, plan }))
      saveSession({ platform: 'lc', handle: lc.analysis.username, data: lc.data, params })
    },
    [lc],
  )

  // ── swap a problem for an alternate ──────────────────────────────────────
  const onSwap = useCallback((id, altId) => {
    setCf((prev) => (prev && prev.plan ? { ...prev, plan: swapInPlan(prev.plan, id, altId) } : prev))
  }, [])

  // ── re-sync with Codeforces & adapt the remaining days ───────────────────
  const onResync = useCallback(async () => {
    if (!cf || !cf.plan) return
    setResyncState('busy')
    try {
      const data = await loadCf(cf.analysis.handle, () => {})
      const analysis = analyzeProfile(data)
      const auto = computeAutoDone(cf.plan, analysis)
      const done = getDone(cf.plan.signature)
      for (const id of auto) done.add(id)
      const ad = adaptChase(cf.plan, done, analysis, data.problems)
      setCf((prev) => ({
        ...prev,
        analysis,
        problems: data.problems,
        plan: ad.changed ? ad.plan : prev.plan,
        autoDone: auto,
      }))
      setResyncState(
        `${auto.size ? `${auto.size} problem(s) auto-checked from your CF history. ` : ''}${ad.note || 'Synced.'}`,
      )
    } catch (e) {
      setResyncState('Sync failed — the mountain was unreachable. Try again in a moment.')
    }
  }, [cf])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setResyncState(null)
    clearSession()
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return (
    <>
      <Nav
        onReset={reset}
        showReset={status === 'ready'}
        user={user}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      {status === 'loading' && <Loader message={loadingMsg} />}

      {(status === 'idle' || status === 'error') && (
        <HandleForm
          platform={platform}
          setPlatform={setPlatform}
          onAnalyze={analyze}
          loading={false}
          initialHandle={getLastHandle()}
          error={error}
        />
      )}

      {status === 'ready' && resultPlatform === 'cf' && cf && (
        <CfDashboard
          analysis={cf.analysis}
          plan={cf.plan}
          planParams={cf.params}
          target={cfTarget}
          setTarget={setCfTarget}
          onGeneratePlan={onGenerateCf}
          onSwap={onSwap}
          onResync={onResync}
          resyncState={resyncState}
          autoDone={cf.autoDone}
        />
      )}

      {status === 'ready' && resultPlatform === 'lc' && lc && (
        <LcDashboard analysis={lc.analysis} plan={lc.plan} planParams={lc.params} onGeneratePlan={onGenerateLc} />
      )}

      <Footer />
    </>
  )
}
