// LocalStorage helpers for plan progress (checkbox state) and the last handle.
// All wrapped in try/catch so the app still works if storage is unavailable.

const PROGRESS_KEY = 'cf_ascent_progress_v1'
const HANDLE_KEY = 'cf_ascent_last_handle'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / unavailable */
  }
}

// Progress is stored as { [signature]: [problemId, ...] }.
export function getDone(signature) {
  const all = readJSON(PROGRESS_KEY, {})
  return new Set(all[signature] || [])
}

export function setDone(signature, doneSet) {
  const all = readJSON(PROGRESS_KEY, {})
  all[signature] = Array.from(doneSet)
  writeJSON(PROGRESS_KEY, all)
}

export function getLastHandle() {
  try {
    return localStorage.getItem(HANDLE_KEY) || ''
  } catch {
    return ''
  }
}

export function setLastHandle(handle) {
  try {
    localStorage.setItem(HANDLE_KEY, handle)
  } catch {
    /* ignore */
  }
}
