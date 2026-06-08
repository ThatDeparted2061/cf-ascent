import { useCallback, useEffect, useState } from 'react'
import { loadEverything as loadCf } from './api/codeforces.js'
import { loadEverything as loadLc } from './api/leetcode.js'
import { analyzeProfile } from './lib/analysis.js'
import { generatePlan } from './lib/recommender.js'
import { analyzeLeetCode } from './lib/lcAnalysis.js'
import { generateLcPlan } from './lib/lcRecommender.js'
import { clamp, round100 } from './lib/constants.js'
import { getLastHandle, setLastHandle, saveSession, loadSession, clearSession } from './lib/storage.js'

import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import HandleForm from './components/HandleForm.jsx'
import Loader from './components/Loader.jsx'
import CfDashboard from './components/CfDashboard.jsx'
import LcDashboard from './components/lc/LcDashboard.jsx'

function defaultCfParams(a) {
  const start = a.suggestedStart
  const target = clamp(round100(start + 400), start + 100, 3500)
  return { start, target, days: 30, perDay: 3, ramp: 'gentle' }
}
const defaultLcParams = () => ({ level: 'foundation', days: 30 })

export default function App() {
  const [platform, setPlatform] = useState('cf')
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState(null)
  const [resultPlatform, setResultPlatform] = useState('cf')

  const [cf, setCf] = useState(null) // { analysis, problems, params, plan }
  const [lc, setLc] = useState(null) // { analysis, data, params, plan }

  // ---- restore the last session on refresh ----
  useEffect(() => {
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
          setLoadingMsg('Restoring your last session…')
          const data = await loadCf(s.handle, setLoadingMsg)
          const analysis = analyzeProfile(data)
          const params = s.params || defaultCfParams(analysis)
          const plan = generatePlan(analysis, data.problems, params)
          setCf({ analysis, problems: data.problems, params, plan })
          setResultPlatform('cf')
          setStatus('ready')
        }
      } catch {
        setStatus('idle')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const analyze = useCallback(
    async (handle) => {
      setStatus('loading')
      setError(null)
      try {
        if (platform === 'cf') {
          const data = await loadCf(handle, setLoadingMsg)
          setLoadingMsg('Analyzing profile…')
          const analysis = analyzeProfile(data)
          const params = defaultCfParams(analysis)
          let plan = null
          try {
            plan = generatePlan(analysis, data.problems, params)
          } catch {
            plan = null
          }
          setCf({ analysis, problems: data.problems, params, plan })
          setResultPlatform('cf')
          saveSession({ platform: 'cf', handle, params }) // re-fetch on restore (problemset is large)
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
          saveSession({ platform: 'lc', handle, data, params }) // cache data for instant restore
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

  const onGenerateCf = useCallback(
    (draft) => {
      if (!cf) return
      const params = {
        start: Number(draft.start),
        target: Number(draft.target),
        days: Number(draft.days),
        perDay: Number(draft.perDay),
        ramp: draft.ramp,
      }
      let plan = null
      try {
        plan = generatePlan(cf.analysis, cf.problems, params)
      } catch {
        plan = null
      }
      setCf((prev) => ({ ...prev, params, plan }))
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

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    clearSession()
  }, [])

  return (
    <>
      <Nav onReset={reset} showReset={status === 'ready'} />

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
        <CfDashboard analysis={cf.analysis} plan={cf.plan} planParams={cf.params} onGeneratePlan={onGenerateCf} />
      )}

      {status === 'ready' && resultPlatform === 'lc' && lc && (
        <LcDashboard analysis={lc.analysis} plan={lc.plan} planParams={lc.params} onGeneratePlan={onGenerateLc} />
      )}

      <Footer />
    </>
  )
}
