export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p style={{ margin: 0 }}>
          Ascent reads public data from the{' '}
          <a href="https://codeforces.com/apiHelp" target="_blank" rel="noreferrer">
            Codeforces API
          </a>{' '}
          and the public{' '}
          <a href="https://leetcode.com" target="_blank" rel="noreferrer">
            LeetCode
          </a>{' '}
          GraphQL endpoint. Not affiliated with either.
        </p>
        <p style={{ margin: '6px 0 0' }} className="dim">
          Analysis and recommendations are heuristic — use them as a guide, not gospel. Happy climbing. ▲
        </p>
      </div>
    </footer>
  )
}
