const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { createBranch } = require('../modules/restaurants/data/branches.ts')

const ids = { restaurant: '9d5ed486-e10f-4c76-8ce4-a9465d748724', branch: '1f0e5c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b' }
const input = { name: 'Centro', department: 'Quetzaltenango', municipality: 'Quetzaltenango', address: '4a calle zona 1' }

/** Minimal Supabase stub: the row already exists (first attempt created it; its response was lost). */
function fakeDb(storedAddress) {
  const calls = []
  const row = () => ({ id: ids.branch, restaurant_id: ids.restaurant, ...input, address: storedAddress, status: 'draft', latitude: null, longitude: null, opening_hours: [], phone: null, whatsapp: false })
  const chain = (op, payload) => {
    calls.push(op)
    const q = { eq: () => q, select: () => q, single: async () => ({ data: op === 'update' ? { ...row(), ...payload } : row(), error: null }) }
    return Object.assign(Promise.resolve({ error: null }), q)
  }
  return { calls, from: () => ({ upsert: (v) => chain('upsert', v), select: () => chain('select'), update: (v) => chain('update', v) }) }
}

test('a retried branch creation with corrected data updates the row instead of keeping old values', async () => {
  const db = fakeDb('dirección vieja')
  const saved = await createBranch(db, ids.restaurant, ids.branch, input)
  assert.equal(saved.address, input.address)
  assert.ok(db.calls.includes('update'))
})

test('an identical retry does not issue an update', async () => {
  const db = fakeDb(input.address)
  await createBranch(db, ids.restaurant, ids.branch, input)
  assert.equal(db.calls.includes('update'), false)
})
