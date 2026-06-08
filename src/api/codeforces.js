// Thin client for the public Codeforces API.
//
// Strategy: call codeforces.com/api directly from the browser (CORS-enabled).
// If a direct call fails for a network/CORS reason, transparently retry through
// the bundled Netlify function proxy at /.netlify/functions/cf.

const BASE = 'https://codeforces.com/api'
const MIN_GAP_MS = 350 // be polite to the CF API / avoid "call limit exceeded"

export class CfError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CfError'
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let _lastCall = 0
async function spaced() {
  const wait = Math.max(0, _lastCall + MIN_GAP_MS - Date.now())
  if (wait) await sleep(wait)
  _lastCall = Date.now()
}

async function callDirect(method, params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}/${method}${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json()
  if (data.status === 'OK') return data.result
  // A structured CF error (bad handle, etc.) — meaningful, don't bother proxying.
  throw new CfError(cleanComment(data.comment) || `Codeforces API error (${method})`)
}

async function callProxy(method, params) {
  const qs = new URLSearchParams({ ...params, method }).toString()
  const res = await fetch(`/.netlify/functions/cf?${qs}`)
  let data
  try {
    data = await res.json()
  } catch {
    throw new CfError(
      'Could not reach the Codeforces API. Check your connection, or try again in a moment.',
    )
  }
  if (data.status === 'OK') return data.result
  throw new CfError(cleanComment(data.comment) || `Codeforces API error (${method})`)
}

async function call(method, params = {}) {
  await spaced()
  try {
    return await callDirect(method, params)
  } catch (err) {
    if (err instanceof CfError) throw err // real CF error — surface as-is
    // network / CORS failure → try the proxy fallback
    return await callProxy(method, params)
  }
}

function cleanComment(c) {
  if (!c) return ''
  // CF messages look like: "handles: User with handle xxx not found"
  return c.replace(/^handles?:\s*/i, '').replace(/^handle:\s*/i, '')
}

// ---- Endpoints ----------------------------------------------------------

export async function getUserInfo(handle) {
  const arr = await call('user.info', { handles: handle })
  if (!arr || !arr.length) throw new CfError(`No user found for "${handle}".`)
  return arr[0]
}

export async function getUserStatus(handle) {
  // count is intentionally huge so we get the full submission history
  return call('user.status', { handle, from: 1, count: 100000 })
}

export async function getUserRating(handle) {
  try {
    return await call('user.rating', { handle })
  } catch {
    return [] // unrated users / no contests
  }
}

// Full problem set (~10k problems). Cached in-memory for the session.
let _problemsCache = null
export async function getProblemset() {
  if (_problemsCache) return _problemsCache
  const result = await call('problemset.problems')
  const solvedBy = new Map()
  for (const s of result.problemStatistics || []) {
    solvedBy.set(`${s.contestId}-${s.index}`, s.solvedCount)
  }
  _problemsCache = (result.problems || [])
    .filter((p) => p.contestId != null && p.index != null)
    .map((p) => ({
      contestId: p.contestId,
      index: p.index,
      name: p.name,
      rating: typeof p.rating === 'number' ? p.rating : null,
      tags: p.tags || [],
      solvedCount: solvedBy.get(`${p.contestId}-${p.index}`) || 0,
    }))
  return _problemsCache
}

// Orchestrates the full load with progress callbacks for a nice UX.
export async function loadEverything(handle, onProgress = () => {}) {
  onProgress('Fetching profile…')
  const info = await getUserInfo(handle)

  onProgress('Fetching submission history…')
  const submissions = await getUserStatus(handle)

  onProgress('Fetching rating history…')
  const ratingHistory = await getUserRating(handle)

  onProgress('Loading the Codeforces problem set…')
  const problems = await getProblemset()

  return { info, submissions, ratingHistory, problems }
}

// Build a Codeforces problem URL.
export function problemUrl(contestId, index) {
  return `https://codeforces.com/problemset/problem/${contestId}/${index}`
}
