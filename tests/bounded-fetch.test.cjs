const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { createBoundedFetch } = require('../lib/bounded-fetch.ts')

test('Supabase request deadline covers body and does not retry a mutation', async () => {
  let calls = 0
  const request = createBoundedFetch(20, async (_input, init) => {
    calls++
    return new Response(new ReadableStream({ start(controller) {
      init.signal.addEventListener('abort', () => controller.error(init.signal.reason), { once: true })
    } }))
  })
  await assert.rejects(request('https://example.invalid', { method: 'POST' }), { name: 'TimeoutError' })
  assert.equal(calls, 1)
})

test('Supabase transport preserves error status/body and caller cancellation', async () => {
  const request = createBoundedFetch(100, async () => new Response('{"code":"over_email_send_rate_limit"}', { status: 429 }))
  const result = await request('https://example.invalid')
  assert.equal(result.status, 429)
  assert.equal((await result.json()).code, 'over_email_send_rate_limit')
  const controller = new AbortController()
  controller.abort()
  const cancelled = createBoundedFetch(100, async (_input, init) => { init.signal.throwIfAborted() })
  await assert.rejects(cancelled('https://example.invalid', { signal: controller.signal }), { name: 'AbortError' })
})

test('JSON with accents survives the re-wrap; binary stays byte-exact', async () => {
  const { createBoundedFetch } = require('../lib/bounded-fetch.ts')
  const json = createBoundedFetch(1000, async () => new Response(JSON.stringify({ reply: 'Encontré «PepianQA» · niño' }), { headers: { 'content-type': 'application/json' } }))
  assert.equal((await (await json('x')).json()).reply, 'Encontré «PepianQA» · niño')
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0x00])
  const bin = createBoundedFetch(1000, async () => new Response(png, { headers: { 'content-type': 'image/png' } }))
  assert.deepEqual([...new Uint8Array(await (await bin('x')).arrayBuffer())], [...png])
})
