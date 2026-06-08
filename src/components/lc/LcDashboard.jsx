import LcProfileCard from './LcProfileCard.jsx'
import LcStatGrid from './LcStatGrid.jsx'
import LcAnalysis from './LcAnalysis.jsx'
import LcPrepPlan from './LcPrepPlan.jsx'
import { ReadinessGauge, DifficultyDonut } from './LcCharts.jsx'
import { TagRadar, RatingHistoryChart } from '../Charts.jsx'

export default function LcDashboard({ analysis, plan, planParams, onGeneratePlan }) {
  const a = analysis
  return (
    <main className="container" style={{ paddingTop: 26, paddingBottom: 10 }}>
      <LcProfileCard a={a} />
      <LcStatGrid a={a} />

      <div className="section fade-up">
        <div className="section-head">
          <div>
            <h2>Readiness &amp; skill map</h2>
            <p>Your interview-readiness score, difficulty mix, and how each section compares to what big tech expects.</p>
          </div>
        </div>
        <div className="charts-grid">
          <div className="card pad">
            <div className="card-title">
              <span className="dot" /> Big-tech readiness
            </div>
            <ReadinessGauge score={a.readiness.score} band={a.readiness.band} />
          </div>
          <div className="card pad">
            <div className="card-title">
              <span className="dot" /> Difficulty distribution
            </div>
            <DifficultyDonut byDifficulty={a.byDifficulty} totalSolved={a.totalSolved} />
          </div>
        </div>
        <div className="charts-grid" style={{ marginTop: 16 }}>
          <div className="card pad">
            <div className="card-title">
              <span className="dot" /> Section mastery vs. expectation
            </div>
            <TagRadar radar={a.radar} />
          </div>
          <div className="card pad">
            <div className="card-title">
              <span className="dot" /> Contest rating history
            </div>
            <RatingHistoryChart history={a.contest.history} currentRating={a.contest.rating} />
          </div>
        </div>
      </div>

      <LcAnalysis a={a} />

      {plan ? (
        <LcPrepPlan plan={plan} params={planParams} onGenerate={onGeneratePlan} />
      ) : (
        <div className="warn">Couldn&apos;t build a prep plan — try different settings.</div>
      )}
    </main>
  )
}
