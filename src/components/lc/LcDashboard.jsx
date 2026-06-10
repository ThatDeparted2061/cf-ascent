import LcProfileCard from './LcProfileCard.jsx'
import LcStatGrid from './LcStatGrid.jsx'
import LcAnalysis from './LcAnalysis.jsx'
import LcPrepPlan from './LcPrepPlan.jsx'
import { ReadinessGauge, DifficultyDonut } from './LcCharts.jsx'
import { TagRadar, RatingHistoryChart } from '../Charts.jsx'
import { Reveal, Marquee } from '../../fx/Fx.jsx'

export default function LcDashboard({ analysis, plan, planParams, onGeneratePlan }) {
  const a = analysis
  return (
    <main style={{ paddingTop: 86 }}>
      <div className="container">
        <LcProfileCard a={a} />
        <LcStatGrid a={a} />
      </div>

      <Marquee
        items={[
          `READINESS ${a.readiness.score}/100`,
          a.readiness.band.label.toUpperCase(),
          `${a.totalSolved} SOLVED`,
          `${a.weakSections.length} GAPS FLAGGED`,
          a.contest.rating != null ? `CONTEST ${a.contest.rating}` : 'NO CONTESTS YET',
        ]}
        duration={30}
      />

      <div className="container">
        <section className="section">
          <Reveal className="sec-head">
            <span className="num">01 — THE MEASURE</span>
            <h2 className="display">
              How close is <em>the offer?</em>
            </h2>
          </Reveal>

          <div className="charts-grid">
            <Reveal className="card pad" delay={40}>
              <div className="card-label">
                <span className="tick">✦</span> Big-tech readiness
              </div>
              <ReadinessGauge score={a.readiness.score} band={a.readiness.band} />
            </Reveal>
            <Reveal className="card pad" delay={120}>
              <div className="card-label">
                <span className="tick">✦</span> Difficulty mix
              </div>
              <DifficultyDonut byDifficulty={a.byDifficulty} totalSolved={a.totalSolved} />
            </Reveal>
          </div>

          <div className="charts-grid" style={{ marginTop: 16 }}>
            <Reveal className="card pad" delay={60}>
              <div className="card-label">
                <span className="tick">✦</span> Section mastery vs expectation
              </div>
              <TagRadar radar={a.radar} />
            </Reveal>
            <Reveal className="card pad" delay={140}>
              <div className="card-label">
                <span className="tick">✦</span> Contest rating arc
              </div>
              <RatingHistoryChart history={a.contest.history} currentRating={a.contest.rating} />
            </Reveal>
          </div>
        </section>

        <LcAnalysis a={a} />

        {plan ? (
          <LcPrepPlan plan={plan} params={planParams} onGenerate={onGeneratePlan} />
        ) : (
          <div className="warn">Couldn&apos;t stage a prep plan — try different settings.</div>
        )}
      </div>
    </main>
  )
}
