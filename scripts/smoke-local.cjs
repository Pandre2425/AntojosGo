// Run against the local app only. No registration or outbound email requests.
const assert = require('node:assert/strict')
const base = 'http://127.0.0.1:3000'
const id = '00000000-0000-0000-0000-000000000001'
const checks = [
  ['/welcome', 200], ['/restaurant', 200], ['/', 200],
  [`/api/restaurants/${id}/menu`, 401],
  [`/api/restaurants/${id}/profile`, 401],
  [`/api/restaurants/${id}/analytics`, 401],
]
;(async () => {
  const results = await Promise.allSettled(checks.map(async ([path, expected]) => {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(15000), redirect: 'manual' })
    assert.equal(response.status, expected, path)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    if (path.startsWith('/api/')) assert.match(response.headers.get('cache-control') || '', /no-store/)
    if (expected === 401) assert.match((await response.json()).message, /sesión/)
    console.log(`PASS ${response.status} ${path}`)
  }))
  for (const result of results) if (result.status === 'rejected') { console.error(result.reason.message); process.exitCode = 1 }
})().catch((error) => { console.error(error.message); process.exitCode = 1 })
