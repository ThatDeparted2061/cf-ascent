// Serverless proxy for the LeetCode GraphQL API.
//
// Unlike Codeforces, leetcode.com/graphql does NOT send permissive CORS
// headers, so a browser cannot call it directly from another origin. This
// function forwards the GraphQL request server-side (where CORS doesn't apply)
// and adds the Referer/Origin/User-Agent headers LeetCode expects.
//
// The client POSTs { query, variables } to /.netlify/functions/leetcode.

const CORS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...CORS, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' } }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ errors: [{ message: 'Method not allowed' }] }) }
  }

  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        Origin: 'https://leetcode.com',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      body: event.body,
    })
    const text = await res.text()
    return { statusCode: res.status, headers: CORS, body: text }
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ errors: [{ message: 'Proxy could not reach LeetCode: ' + String(err) }] }),
    }
  }
}
