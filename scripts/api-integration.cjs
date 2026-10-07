// Integration test for /api/v1 against a running backend and a TEST Supabase project.
// Usage (PowerShell):
//   $env:API_URL='http://127.0.0.1:3000'; $env:QA_A_EMAIL='...'; $env:QA_A_PASSWORD='...'
//   $env:QA_B_EMAIL='...'; $env:QA_B_PASSWORD='...'; node scripts/api-integration.cjs
// Account A must own at least one restaurant; B must own none of A's data.
// Creates one temporary dish and deletes it; leaves publication state as it found it.
const fs = require('node:fs')
const assert = require('node:assert/strict')

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).map(l => l.match(/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim()]))
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const api = (process.env.API_URL || 'http://127.0.0.1:3000') + '/api/v1'

async function login(email, password) {
  const r = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  const j = await r.json(); if (!j.access_token) throw new Error(`login failed for ${email}`); return j.access_token
}
async function call(method, path, token, body, headers = {}) {
  const r = await fetch(api + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, body: await r.json().catch(() => null), requestId: r.headers.get('x-request-id') }
}

let passed = 0
async function check(name, fn) { await fn(); passed++; console.log('ok -', name) }

;(async () => {
  const A = await login(process.env.QA_A_EMAIL, process.env.QA_A_PASSWORD)
  const B = await login(process.env.QA_B_EMAIL, process.env.QA_B_PASSWORD)
  const mine = (await call('GET', '/me/restaurants', A)).body.items
  assert.ok(mine.length > 0, 'account A needs a restaurant')
  const rest = mine[0].id
  const branch = (await call('GET', `/restaurants/${rest}/branches`, A)).body.items.find(b => b.latitude !== null)
  let dish

  await check('no token -> 401 with request id', async () => {
    const r = await call('GET', '/me/restaurants'); assert.equal(r.status, 401); assert.equal(r.body.error.code, 'unauthenticated'); assert.ok(r.requestId)
  })
  await check('forged token -> 401', async () => assert.equal((await call('GET', '/me/restaurants', 'aaa.bbb.ccc')).status, 401))
  await check('B does not see A restaurants', async () => assert.ok(!(await call('GET', '/me/restaurants', B)).body.items.some(r => r.id === rest)))
  await check('B cannot read A profile -> 404', async () => assert.equal((await call('GET', `/restaurants/${rest}`, B)).status, 404))
  await check('B cannot rename A restaurant -> 404', async () => assert.equal((await call('PATCH', `/restaurants/${rest}`, B, { name: 'Hack', description: '' })).status, 404))
  await check('malformed id -> 400', async () => assert.equal((await call('GET', '/restaurants/not-a-uuid', A)).status, 400))
  await check('non-JSON body -> 415', async () => assert.equal((await fetch(`${api}/me/restaurants`, { method: 'POST', headers: { Authorization: `Bearer ${A}`, 'Content-Type': 'text/plain' }, body: 'x' })).status, 415))
  await check('branch creation requires Idempotency-Key', async () => assert.equal((await call('POST', `/restaurants/${rest}/branches`, A, { name: 'X', department: 'Quetzaltenango', municipality: 'Quetzaltenango', address: 'Calle 1 zona 1' })).status, 400))
  await check('A creates a dish (price "12,5" -> 12.5)', async () => {
    const r = await call('POST', `/restaurants/${rest}/dishes`, A, { name: 'QA integración', price: '12,5' }); assert.equal(r.status, 200); assert.equal(r.body.price, 12.5); dish = r.body
  })
  await check('price 0 rejected -> 400', async () => assert.equal((await call('POST', `/restaurants/${rest}/dishes`, A, { name: 'Gratis', price: 0 })).status, 400))
  await check('B cannot create dish in A restaurant -> 404', async () => assert.equal((await call('POST', `/restaurants/${rest}/dishes`, B, { name: 'Intruso', price: 5 })).status, 404))
  await check('B cannot edit A dish -> 404', async () => assert.equal((await call('PATCH', `/dishes/${dish.id}`, B, { price: 1 })).status, 404))
  await check('B cannot delete A dish -> 404', async () => assert.equal((await call('DELETE', `/dishes/${dish.id}`, B)).status, 404))
  await check('unknown fields are ignored (restaurant_id not movable)', async () => {
    const r = await call('PATCH', `/dishes/${dish.id}`, A, { restaurant_id: '00000000-0000-0000-0000-000000000000', price: 13 }); assert.equal(r.status, 200); assert.equal(r.body.restaurant_id, rest)
  })
  if (branch) {
    await check('B cannot (un)publish A branch -> 404', async () => assert.equal((await call('POST', `/branches/${branch.id}/unpublish`, B)).status, 404))
    await check('public detail returns branch + published menu only', async () => {
      const r = await call('GET', `/branches/${branch.id}/public`)
      if (branch.status === 'published') { assert.equal(r.status, 200); assert.ok(!r.body.menu.some(d => d.id === dish.id), 'draft dish must be hidden') }
      else assert.equal(r.status, 404)
    })
  }
  const upload = async (target, bytes) => (await fetch(target.signedUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: bytes })).status
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)])
  await check('B cannot request an upload URL for A dish -> 404', async () => assert.equal((await call('POST', `/dishes/${dish.id}/image/upload-url`, B, { contentType: 'image/jpeg' })).status, 404))
  await check('upload URL rejects non-image types -> 400', async () => assert.equal((await call('POST', `/dishes/${dish.id}/image/upload-url`, A, { contentType: 'text/html' })).status, 400))
  await check('fake JPEG (text bytes) is rejected after upload', async () => {
    const t = (await call('POST', `/dishes/${dish.id}/image/upload-url`, A, { contentType: 'image/jpeg' })).body
    assert.ok([200, 201].includes(await upload(t, Buffer.from('<script>alert(1)</script>'))))
    assert.equal((await call('PUT', `/dishes/${dish.id}/image`, A, { path: t.path })).status, 400)
  })
  await check('path outside the dish folder is rejected', async () => {
    assert.equal((await call('PUT', `/dishes/${dish.id}/image`, A, { path: `${rest}/dishes/00000000-0000-0000-0000-000000000000/abcdefgh12.jpg` })).status, 400)
  })
  await check('real JPEG upload links a public image URL', async () => {
    const t = (await call('POST', `/dishes/${dish.id}/image/upload-url`, A, { contentType: 'image/jpeg' })).body
    assert.ok([200, 201].includes(await upload(t, jpeg)))
    const r = await call('PUT', `/dishes/${dish.id}/image`, A, { path: t.path })
    assert.equal(r.status, 200); assert.match(r.body.image_url, /\/storage\/v1\/object\/public\/restaurant-media\//)
    assert.equal((await fetch(r.body.image_url)).status, 200)
    const listed = (await call('GET', `/restaurants/${rest}/dishes`, A)).body.items.find(d => d.id === dish.id)
    assert.equal(listed.image_url, r.body.image_url)
  })
  await check('public search works without token', async () => { const r = await call('GET', '/catalog/search?q=a'); assert.equal(r.status, 200); assert.ok(Array.isArray(r.body.items)) })
  await check('A deletes own dish; second delete -> 404', async () => {
    assert.equal((await call('DELETE', `/dishes/${dish.id}`, A)).status, 200); assert.equal((await call('DELETE', `/dishes/${dish.id}`, A)).status, 404)
  })
  console.log(`\n${passed} checks passed`)
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
