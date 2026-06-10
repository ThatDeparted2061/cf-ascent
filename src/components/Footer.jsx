import { Marquee, RidgeLine } from '../fx/Fx.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <Marquee big items={['KEEP CLIMBING', 'ASCENT', 'THE CHASE']} duration={52} />
      <div className="footer-art" aria-hidden="true">
        <RidgeLine seed={23} bars={140} height={130} peakAt={0.3} amp={0.7} parallax={0} style={{ height: 130 }} />
      </div>
      <div className="container">
        <div className="footer-inner">
          <div className="fcol" style={{ maxWidth: 420 }}>
            <div className="h">Ascent</div>
            <span>
              Reads public data from the{' '}
              <a href="https://codeforces.com/apiHelp" target="_blank" rel="noreferrer">
                Codeforces API
              </a>{' '}
              and LeetCode&apos;s public GraphQL endpoint. Affiliated with neither.
            </span>
            <span className="dim" style={{ marginTop: 8 }}>
              Analysis and plans are heuristics encoding training folklore — a strong guide, not gospel.
            </span>
          </div>
          <div className="fcol">
            <div className="h">Train</div>
            <a href="https://codeforces.com/problemset" target="_blank" rel="noreferrer">
              CF Problemset
            </a>
            <a href="https://leetcode.com/problemset/" target="_blank" rel="noreferrer">
              LeetCode Problems
            </a>
            <a href="https://usaco.guide" target="_blank" rel="noreferrer">
              USACO Guide
            </a>
          </div>
          <div className="fcol">
            <div className="h">Doctrine</div>
            <span>Solve problems slightly above your level.</span>
            <span>Read editorials after 30 honest minutes.</span>
            <span>Upsolve every contest. No exceptions.</span>
          </div>
        </div>
        <hr className="rule" />
        <div className="fine">
          <span>© {new Date().getFullYear()} ASCENT — where the climb begins</span>
          <span>built one problem at a time ▲</span>
        </div>
      </div>
    </footer>
  )
}
