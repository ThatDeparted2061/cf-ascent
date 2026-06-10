const BARS = 14

export default function Loader({ message }) {
  return (
    <div className="loader-stage">
      <div className="l-bars" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <i key={i} style={{ '--i': i }} />
        ))}
      </div>
      <div>
        <div className="l-msg">{message || 'Working…'}</div>
        <div className="l-sub" style={{ textAlign: 'center', marginTop: 14 }}>
          reading the mountain…
        </div>
      </div>
    </div>
  )
}
