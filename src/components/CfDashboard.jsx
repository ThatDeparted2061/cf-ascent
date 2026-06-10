import ProfileCard from './ProfileCard.jsx'
import StatGrid from './StatGrid.jsx'
import Analysis from './Analysis.jsx'
import SummitMap from './SummitMap.jsx'
import Chase from './Chase.jsx'
import { Reveal, Marquee } from '../fx/Fx.jsx'
import { RatingBars, RatingHistoryChart, TagRadar } from './Charts.jsx'

export default function CfDashboard({
  analysis,
  plan,
  planParams,
  target,
  setTarget,
  onGeneratePlan,
  onSwap,
  onResync,
  resyncState,
  autoDone,
}) {
  return (
    <main style={{ paddingTop: 86 }}>
      <div className="container">
        <ProfileCard a={analysis} />
        <StatGrid a={analysis} />
      </div>

      <Marquee
        items={[
          `LEVEL ${analysis.workingLevel}`,
          analysis.band.name.toUpperCase(),
          `${analysis.totalSolved} SOLVED`,
          `${analysis.recentSolves30} THIS MONTH`,
          analysis.levelEstimate.trend.toUpperCase(),
          `STREAK ${analysis.currentStreak}D`,
        ]}
        duration={30}
      />

      <div className="container">
        <section className="section">
          <Reveal className="sec-head">
            <span className="num">01 — SKILL TERRAIN</span>
            <h2 className="display">
              The shape of <em>everything you&apos;ve solved.</em>
            </h2>
          </Reveal>

          <div className="charts-grid">
            <Reveal className="card pad" delay={40}>
              <div className="card-label">
                <span className="tick">✦</span> Solves by difficulty
              </div>
              <RatingBars distribution={analysis.distribution} start={planParams?.start} target={target} />
            </Reveal>
            <Reveal className="card pad" delay={120}>
              <div className="card-label">
                <span className="tick">✦</span> Topic radar — evidence vs the field
              </div>
              <TagRadar radar={analysis.radar} />
            </Reveal>
          </div>

          <Reveal className="card pad" style={{ marginTop: 16 }} delay={80}>
            <div className="card-label">
              <span className="tick">✦</span> The rating arc
            </div>
            <RatingHistoryChart history={analysis.history} currentRating={analysis.currentRating} target={target} />
          </Reveal>
        </section>

        <Analysis a={analysis} />

        <SummitMap a={analysis} target={target} setTarget={setTarget} />

        <Chase
          plan={plan}
          params={planParams}
          target={target}
          onGenerate={onGeneratePlan}
          onSwap={onSwap}
          onResync={onResync}
          resyncState={resyncState}
          suggestedStart={analysis.suggestedStart}
          autoDone={autoDone}
        />
      </div>
    </main>
  )
}
