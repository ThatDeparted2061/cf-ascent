// ────────────────────────────────────────────────────────────────────────────
//  PERSISTENCE — local-first, cloud-mirrored.
//
//  Everything writes to localStorage instantly (the app never blocks on the
//  network). When a user is signed in, the same state is mirrored to
//  Firestore (debounced), and on sign-in the cloud copy is merged back in:
//  progress sets are UNION-merged per plan signature, the session is
//  last-write-wins by timestamp. Nothing a user checked off is ever lost.
// ────────────────────────────────────────────────────────────────────────────

import { fetchCloudState, pushCloudState } from './firebase.js'

const PROGRESS_KEY = 'cf_ascent_progress_v1'
const HANDLE_KEY = 'cf_ascent_last_handle'
const SESSION_KEY = 'cf_ascent_session_v1'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 21 // 21 days

let cloudUid = null

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

function mirrorToCloud() {
  if (!cloudUid) return
  const progress = readJSON(PROGRESS_KEY, {})
  const session = readJSON(SESSION_KEY, null)
  const cloudSession = session
    ? { platform: session.platform, handle: session.handle, params: session.params || null, ts: session.ts }
    : null
  pushCloudState(cloudUid, { progress, session: cloudSession })
}

// ── progress (checkbox state per plan signature) ────────────────────────────

export function getDone(signature) {
  const all = readJSON(PROGRESS_KEY, {})
  return new Set(all[signature] || [])
}

export function setDone(signature, doneSet) {
  const all = readJSON(PROGRESS_KEY, {})
  all[signature] = Array.from(doneSet)
  writeJSON(PROGRESS_KEY, all)
  mirrorToCloud()
}

// ── last session ────────────────────────────────────────────────────────────

export function saveSession(session) {
  writeJSON(SESSION_KEY, { ...session, ts: Date.now() })
  mirrorToCloud()
}

export function loadSession() {
  const s = readJSON(SESSION_KEY, null)
  if (!s || !s.ts || Date.now() - s.ts > SESSION_TTL_MS) return null
  return s
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  mirrorToCloud()
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

// ── cloud attach / detach ───────────────────────────────────────────────────

// Called on sign-in. Pulls the cloud copy, merges it into local state
// (progress = union per signature; session = newest wins), then mirrors the
// merged result back up. Returns { session } — the session to restore, if the
// cloud one was fresher than local.
export async function attachCloud(user) {
  cloudUid = user.uid
  let cloud = null
  try {
    cloud = await fetchCloudState(user.uid)
  } catch (e) {
    console.warn('Could not fetch cloud state:', e)
  }

  const localProgress = readJSON(PROGRESS_KEY, {})
  const cloudProgress = (cloud && cloud.progress) || {}
  const merged = { ...localProgress }
  for (const [sig, ids] of Object.entries(cloudProgress)) {
    merged[sig] = Array.from(new Set([...(merged[sig] || []), ...(ids || [])]))
  }
  writeJSON(PROGRESS_KEY, merged)

  const localSession = readJSON(SESSION_KEY, null)
  const cloudSession = cloud && cloud.session
  let adopted = null
  if (cloudSession && cloudSession.ts && (!localSession || cloudSession.ts > localSession.ts)) {
    if (Date.now() - cloudSession.ts <= SESSION_TTL_MS) {
      writeJSON(SESSION_KEY, cloudSession)
      adopted = cloudSession
      if (cloudSession.handle) setLastHandle(cloudSession.handle)
    }
  }

  mirrorToCloud()
  return { session: adopted }
}

export function detachCloud() {
  cloudUid = null
}

export const isCloudAttached = () => cloudUid != null
