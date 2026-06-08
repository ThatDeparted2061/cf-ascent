// Serverless proxy for the Codeforces API.
//
// The browser calls the Codeforces API directly (it sends
// `Access-Control-Allow-Origin: *`, so CORS normally works). This function is
// only an automatic fallback the client uses if a direct call is ever blocked
// by a network/CORS edge case. It simply forwards the request server-side,
// where CORS does not apply.
//
// Client calls:  /.netlify/functions/cf?method=user.info&handles=tourist
// Proxied to:    https://codeforces.com/api/user.info?handles=tourist

const CORS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
}

const json = (statusCode, obj) => ({ statusCode, headers: CORS, body: JSON.stringify(obj) })

export const handler = async (event) => {
  const params = { ...(event.queryStringParameters || {}) }
  const method = params.method
  delete params.method

  if (!method || !/^[a-zA-Z.]+$/.test(method)) {
    return json(400, { status: 'FAILED', comment: 'Missing or invalid "method" query parameter.' })
  }

  const qs = new URLSearchParams(params).toString()
  const url = `https://codeforces.com/api/${method}${qs ? `?${qs}` : ''}`

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'cf-ascent-proxy' } })
    const body = await res.text()
    return { statusCode: res.status, headers: CORS, body }
  } catch (err) {
    return json(502, { status: 'FAILED', comment: 'Proxy could not reach Codeforces: ' + String(err) })
  }
}
