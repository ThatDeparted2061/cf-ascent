export default function Loader({ message }) {
  return (
    <div className="loader">
      <div className="spinner" />
      <div className="msg">{message || 'Working…'}</div>
    </div>
  )
}
