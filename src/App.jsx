import { useCallback, useState } from 'react'
import { loadEverything } from './api/codeforces.js'
import { analyzeProfile } from './lib/analysis.js'
import { generatePlan } from './lib/recommender.js'
import { clamp, round100 } from './lib/constants.js'
import { getLastHandle, setLastHandle } from './lib/storage.js'

import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import HandleForm from './components/HandleForm.jsx'
import Loader from './components/Loader.jsx'
import ProfileCard from './components/ProfileCard.jsx'
import StatGrid from './components/StatGrid.jsx'
import { RatingBars, RatingHistoryChart, TagRadar } from './components/Charts.jsx'
import Analysis from './components/Analysis.jsx'
import PlanControls from './components/PlanControls.jsx'
import StudyPlan from './components/StudyPlan.jsx'

function defaultParams(a) {
  const start = a.suggestedStart
  const target = clamp(round100(start + 400), start + 100, 3500)
  return { start, target, days: 30, perDay: 3, ramp: 'gentle' }
}

export default function App() {
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState(null)

  const [analysis, setAnalysis] = useState(null)
  const [problems, setProblems] = useState(null)
  const [planParams, setPlanParams] = useState(null)
  const [plan, setPlan] = useState(null)

  const analyze = useCallback(async (handle) => {
    setStatus('loading')
    setError(null)
    try {
      const data = await loadEverything(handle, setLoadingMsg)
      setLoadingMsg('Analyzing profile…')
      const a = analyzeProfile(data)
      const params = defaultParams(a)
      let firstPlan = null
      try {
        firstPlan = generatePlan(a, data.problems, params)
      } catch (e) {
        firstPlan = null
      }
      setAnalysis(a)
      setProblems(data.problems)
      setPlanParams(params)
      setPlan(firstPlan)
      setStatus('ready')
      setLastHandle(handle)
      window.scrollTo({ top: 0, behavior: 'auto' })
    } catch (e) {
      setError(e?.message || 'Could not load this handle. Double-check the spelling and try again.')
      setStatus('error')
    }
  }, [])

  const onGenerate = useCallback(
    (draft) => {
      if (!analysis || !problems) return
      const params = {
        start: Number(draft.start),
        target: Number(draft.target),
        days: Number(draft.days),
        perDay: Number(draft.perDay),
        ramp: draft.ramp,
      }
      setPlanParams(params)
      try {
        setPlan(generatePlan(analysis, problems, params))
      } catch (e) {
        setPlan(null)
      }
    },
    [analysis, problems],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setAnalysis(null)
    setPlan(null)
    setPlanParams(null)
  }, [])

  return (
    <>
      <Nav onReset={reset} showReset={status === 'ready'} />

      {status === 'loading' && <Loader message={loadingMsg} />}

      {(status === 'idle' || status === 'error') && (
        <HandleForm onAnalyze={analyze} loading={false} initialHandle={getLastHandle()} error={error} />
      )}

      {status === 'ready' && analysis && (
        <main className="container" style={{ paddingTop: 26, paddingBottom: 10 }}>
          <ProfileCard a={analysis} />
          <StatGrid a={analysis} />

          <div className="section fade-up">
            <div className="section-head">
              <div>
                <h2>Skill map</h2>
                <p>Where your solves cluster, which topics you&apos;ve mastered, and your rating arc.</p>
              </div>
            </div>
            <div className="charts-grid">
              <div className="card pad">
                <div className="card-title">
                  <span className="dot" /> Solved by difficulty
                </div>
                <RatingBars
                  distribution={analysis.distribution}
                  start={planParams?.start}
                  target={planParams?.target}
                />
              </div>
              <div className="card pad">
                <div className="card-title">
                  <span className="dot" /> Topic radar
                </div>
                <TagRadar radar={analysis.radar} />
              </div>
            </div>
            <div className="card pad" style={{ marginTop: 16 }}>
              <div className="card-title">
                <span className="dot" /> Rating history
              </div>
              <RatingHistoryChart history={analysis.history} currentRating={analysis.currentRating} />
            </div>
          </div>

          <Analysis a={analysis} />

          <PlanControls
            params={planParams}
            onGenerate={onGenerate}
            currentRating={analysis.currentRating}
            suggestedStart={analysis.suggestedStart}
          />

          {plan ? (
            <StudyPlan plan={plan} />
          ) : (
            <div className="warn">Couldn&apos;t build a plan with those settings — try a different target or more days.</div>
          )}
        </main>
      )}

      <Footer />
    </>
  )
}
