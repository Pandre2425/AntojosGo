const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { createClient } = require('@supabase/supabase-js')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { createBoundedFetch } = require('../lib/bounded-fetch.ts')
const { authErrorMessage } = require('../lib/auth-validation.ts')
const credentials = { email: 'test@example.invalid', password: 'Synthetic password 123' }
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' },
})
function client(transport) {
  return createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createBoundedFetch(50, transport) },
  })
}

test('real SDK preserves mail quota failure, creates no session and sends only once', async () => {
  let calls = 0
  const db = client(async () => { calls++; return json({ code: 'over_email_send_rate_limit', message: 'quota' }, 429) })
  const result = await db.auth.signUp(credentials)
  assert.equal(result.error.code, 'over_email_send_rate_limit')
  assert.equal(result.data.session, null)
  assert.match(authErrorMessage(result.error), /límite de correos/)
  assert.equal(calls, 1)
})

test('real SDK distinguishes server outage from network failure', async () => {
  const db = client(async () => json({ message: 'private server detail' }, 503))
  const { error } = await db.auth.signInWithPassword(credentials)
  assert.equal(error.status, 503)
  assert.equal(error.name, 'AuthRetryableFetchError')
  assert.match(authErrorMessage(error), /Intenta más tarde/)
  assert.doesNotMatch(authErrorMessage(error), /Revisa tu conexión|private/)
})

test('a stalled sign-in ends without blocking an independent successful request', async () => {
  let calls = 0
  const db = client((_input, init) => new Promise((_resolve, reject) => {
    calls++
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
  }))
  const fast = createBoundedFetch(50, async () => json({ available: true }))
  const [result, response] = await Promise.all([db.auth.signInWithPassword(credentials), fast('https://example.invalid')])
  assert.equal(result.data.session, null)
  assert.match(authErrorMessage(result.error), /conectar/)
  assert.equal((await response.json()).available, true)
  assert.equal(calls, 1)
})

test('confirmation-required registration never becomes an authenticated session', async () => {
  const db = client(async () => json({ id: 'test-user', email: credentials.email, aud: 'authenticated', created_at: new Date().toISOString() }))
  const result = await db.auth.signUp(credentials)
  assert.equal(result.error, null)
  assert.equal(result.data.user.id, 'test-user')
  assert.equal(result.data.session, null)
  assert.equal((await db.auth.getSession()).data.session, null)
})

test('successful sign-in restores its in-memory session and sign-out clears it', async () => {
  const user = { id: 'test-user', email: credentials.email, aud: 'authenticated', created_at: new Date().toISOString() }
  const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'synthetic'].join('.')
  const db = client(async (input) => String(input).includes('/logout') ? new Response(null, { status: 204 }) : json({ access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user }))
  const result = await db.auth.signInWithPassword(credentials)
  assert.equal(result.error, null)
  assert.equal((await db.auth.getSession()).data.session.user.id, user.id)
  assert.equal((await db.auth.signOut()).error, null)
  assert.equal((await db.auth.getSession()).data.session, null)
})
