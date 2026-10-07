const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { mapPublishedBranch, getPublishedBranch, listPublishedCatalog } = require('../modules/catalog/data/public-catalog.ts')

const row = { id: 'b1', restaurant_id: 'r1', name: 'Negocio', branch_name: 'Centro', description: null, address: 'Zona 1', municipality: 'Quetzaltenango', department: 'Quetzaltenango', latitude: 14.84, longitude: -91.52 }

test('catalog rows map meters to km and omit distance without origin', () => {
  assert.equal(mapPublishedBranch({ ...row, distance_m: 1500 }).distanceKm, 1.5)
  assert.equal('distanceKm' in mapPublishedBranch({ ...row, distance_m: null }), false)
  assert.equal('distance_m' in mapPublishedBranch({ ...row, distance_m: 10 }), false)
})

test('catalog search delegates filters to the database function', async () => {
  let call
  const client = { rpc: async (name, args) => { call = { name, args }; return { data: [row], error: null } } }
  const items = await listPublishedCatalog(client, { query: '  pepian ', limit: 500, location: { latitude: 14.8, longitude: -91.5, radiusKm: 2.5 } })
  assert.equal(call.name, 'search_public_catalog')
  assert.deepEqual(call.args, { p_query: 'pepian', p_lat: 14.8, p_lng: -91.5, p_radius_m: 2500, p_limit: 100 })
  assert.equal(items.length, 1)
})

test('catalog errors are not reported as empty results', async () => {
  const client = { rpc: async () => ({ data: null, error: { code: '42501' } }) }
  await assert.rejects(listPublishedCatalog(client), error => error.cause?.code === '42501')
})

test('public menu converts prices and skips malformed ids', async () => {
  const { getPublicMenu } = require('../modules/catalog/data/public-catalog.ts')
  const client = { rpc: async (name, args) => ({ data: name === 'get_public_dishes' && args.p_branch_id ? [{ id: 'd', name: 'Pepián', price: '42.00', category: null, description: null, is_available: false }] : null, error: null }) }
  assert.equal((await getPublicMenu(client, '9d5ed486-e10f-4c76-8ce4-a9465d748724'))[0].price, 42)
  assert.deepEqual(await getPublicMenu({ rpc: async () => { throw new Error('should not query') } }, 'x'), [])
})

test('branch detail rejects malformed ids without querying', async () => {
  const client = { rpc: async () => { throw new Error('should not query') } }
  assert.equal(await getPublishedBranch(client, 'not-a-uuid'), null)
})
