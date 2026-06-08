import ProfileCard from './ProfileCard.jsx'
import StatGrid from './StatGrid.jsx'
import { RatingBars, RatingHistoryChart, TagRadar } from './Charts.jsx'
import Analysis from './Analysis.jsx'
import PlanControls from './PlanControls.jsx'
import StudyPlan from './StudyPlan.jsx'

export default function CfDashboard({ analysis, plan, planParams, onGeneratePlan }) {
  return (
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
            <RatingBars distribution={analysis.distribution} start={planParams?.start} target={planParams?.target} />
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
        onGenerate={onGeneratePlan}
        currentRating={analysis.currentRating}
        suggestedStart={analysis.suggestedStart}
      />

      {plan ? (
        <StudyPlan plan={plan} />
      ) : (
        <div className="warn">Couldn&apos;t build a plan with those settings — try a different target or more days.</div>
      )}
    </main>
  )
}
