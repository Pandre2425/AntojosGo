const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename)
}
const { requestJSON, ServiceError } = require('../lib/http.ts')

test('a stalled service times out without blocking another service', async () => {
  const original = global.fetch
  global.fetch = async (url, options) => url === '/menu'
    ? new Response(JSON.stringify([{ name: 'Pepian' }]))
    : new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))))
  try {
    const stalled = assert.rejects(requestJSON('/analytics', {}, 20), (error) => error.code === 'timeout')
    assert.equal((await requestJSON('/menu'))[0].name, 'Pepian')
    await stalled
  } finally { global.fetch = original }
})

test('failed mutations are not retried and errors do not expose backend details', async () => {
  const original = global.fetch
  let calls = 0
  global.fetch = async () => { calls++; return new Response('private backend details', { status: 503 }) }
  try {
    await assert.rejects(requestJSON('/dishes', { method: 'POST' }), (error) =>
      error instanceof ServiceError && error.status === 503 && !error.message.includes('private'))
    assert.equal(calls, 1)
  } finally { global.fetch = original }
})

test('invalid JSON and empty responses are handled explicitly', async () => {
  const original = global.fetch
  try {
    global.fetch = async () => new Response('<html>error</html>')
    await assert.rejects(requestJSON('/menu'), (error) => error.code === 'invalid-response')
    global.fetch = async () => new Response(null, { status: 204 })
    assert.equal(await requestJSON('/dishes', { method: 'DELETE' }), undefined)
  } finally { global.fetch = original }
})

test('deadline also covers stalled response bodies', async () => {
  const original = global.fetch
  global.fetch = async (_, options) => ({ ok: true, status: 200,
    json: () => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) })
  try { await assert.rejects(requestJSON('/menu', {}, 20), (error) => error.code === 'timeout') }
  finally { global.fetch = original }
})

test('client adapters can be loaded without server-only or server credentials', () => {
  for (const name of ['menu-management', 'restaurant-profile', 'restaurant-auth', 'restaurant-analytics']) {
    assert.doesNotThrow(() => require(`../lib/${name}.ts`))
  }
})
