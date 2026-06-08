// Client for the (unofficial but public) LeetCode GraphQL API.
//
// Calls go through a same-origin path that is the Netlify function in
// production and the Vite dev proxy locally — because leetcode.com/graphql is
// not CORS-enabled and can't be called directly from the browser.

const PROXY = '/.netlify/functions/leetcode'

export class LcError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LcError'
  }
}

async function gql(query, variables) {
  let res
  try {
    res = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
  } catch (e) {
    throw new LcError('Could not reach LeetCode. If running locally, use the dev server (npm run dev) or deploy to Netlify so the proxy is available.')
  }
  if (!res.ok) throw new LcError(`LeetCode request failed (HTTP ${res.status}).`)
  let json
  try {
    json = await res.json()
  } catch {
    throw new LcError('LeetCode returned an unexpected response.')
  }
  if (json.errors && json.errors.length) throw new LcError(json.errors[0].message)
  return json.data
}

const PROFILE_Q = `query profile($username: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $username) {
    username
    profile { realName ranking userAvatar countryName company school reputation }
    submitStatsGlobal { acSubmissionNum { difficulty count submissions } totalSubmissionNum { difficulty count submissions } }
    tagProblemCounts {
      advanced { tagName tagSlug problemsSolved }
      intermediate { tagName tagSlug problemsSolved }
      fundamental { tagName tagSlug problemsSolved }
    }
    userCalendar { streak totalActiveDays }
  }
}`

const CONTEST_Q = `query contest($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount rating globalRanking totalParticipants topPercentage
  }
  userContestRankingHistory(username: $username) {
    attended rating ranking trendDirection problemsSolved totalProblems
    contest { title startTime }
  }
}`

// The only public way to learn which specific problems a user has solved is the
// "recent accepted" list. We request a large limit so it covers the full solve
// history for the vast majority of users.
const SOLVED_Q = `query solved($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) { titleSlug }
}`

export async function getProfile(username) {
  const data = await gql(PROFILE_Q, { username })
  if (!data || !data.matchedUser) throw new LcError(`No LeetCode user found for "${username}".`)
  return data
}

export async function getContest(username) {
  try {
    return await gql(CONTEST_Q, { username })
  } catch {
    return { userContestRanking: null, userContestRankingHistory: [] }
  }
}

export async function getSolvedSlugs(username, limit = 2000) {
  try {
    const d = await gql(SOLVED_Q, { username, limit })
    const slugs = (d.recentAcSubmissionList || []).map((s) => s.titleSlug)
    return [...new Set(slugs)]
  } catch {
    return []
  }
}

export async function loadEverything(username, onProgress = () => {}) {
  onProgress('Fetching LeetCode profile…')
  const profile = await getProfile(username)

  onProgress('Fetching contest history…')
  const contest = await getContest(username)

  onProgress('Fetching your solved problems…')
  const solved = await getSolvedSlugs(username, 2000)

  return { username, profile, contest, solved }
}

export function lcProblemUrl(slug) {
  return `https://leetcode.com/problems/${slug}/`
}
