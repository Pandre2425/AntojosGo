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
  let logos
  const client = { rpc: async (name, args) => {
    if (name === 'get_public_restaurant_images') { logos = args; return { data: [{ id: row.restaurant_id, logo_path: 'r/brand/a.jpg' }], error: null } }
    if (name === 'get_restaurant_ratings') return { data: [{ restaurant_id: row.restaurant_id, rating_avg: '4.50', rating_count: 2 }], error: null }
    call = { name, args }; return { data: [row], error: null } } }
  const items = await listPublishedCatalog(client, { query: '  pepian ', limit: 500, location: { latitude: 14.8, longitude: -91.5, radiusKm: 2.5 }, tags: ['picante'], without: ['mani'], avoid: ['Cebolla', 'x.*'] })
  assert.equal(call.name, 'search_catalog_v3')
  assert.deepEqual(call.args.p_groups, [{ re: '\\m(pepian)', tags: [] }, { re: '', tags: ['picante'] }])
  assert.equal(call.args.p_require_all, true); assert.deepEqual(call.args.p_without, ['mani'])
  assert.equal(call.args.p_avoid, '\\m(cebolla)') // unsafe "x.*" dropped, text sanitized
  assert.equal(call.args.p_radius_m, 2500); assert.equal(call.args.p_limit, 50)
  assert.equal(items.length, 1)
  assert.equal(items[0].dish, null)
  if (row.restaurant_id) { assert.deepEqual(logos.p_ids, [row.restaurant_id]); assert.equal(items[0].logo_url, 'r/brand/a.jpg'); assert.deepEqual(items[0].rating, { rating_avg: 4.5, rating_count: 2 }) }
})

test('catalog errors are not reported as empty results', async () => {
  const client = { rpc: async () => ({ data: null, error: { code: '42501' } }) }
  await assert.rejects(listPublishedCatalog(client), error => error.cause?.code === '42501')
})

test('public menu converts prices and skips malformed ids', async () => {
  const { getPublicMenu } = require('../modules/catalog/data/public-catalog.ts')
  const client = { rpc: async (name, args) => ({ data: name === 'get_public_dishes_v3' && args.p_branch_id ? [{ id: 'd', name: 'Pepián', price: '42.00', category: null, description: null, is_available: false }] : null, error: null }) }
  assert.equal((await getPublicMenu(client, '9d5ed486-e10f-4c76-8ce4-a9465d748724'))[0].price, 42)
  assert.deepEqual(await getPublicMenu({ rpc: async () => { throw new Error('should not query') } }, 'x'), [])
})

test('branch detail rejects malformed ids without querying', async () => {
  const client = { rpc: async () => { throw new Error('should not query') } }
  assert.equal(await getPublishedBranch(client, 'not-a-uuid'), null)
})

test('price range and «No me interesa» reach the search function', async () => {
  let args
  const client = { rpc: async (name, a) => { if (name === 'search_catalog_v3') args = a; return { data: [], error: null } } }
  const id = '11111111-1111-4111-8111-111111111111'
  await listPublishedCatalog(client, { minPrice: 10, maxPrice: 50, hide: [id] })
  assert.equal(args.p_min_price, 10); assert.equal(args.p_max_price, 50); assert.deepEqual(args.p_exclude_restaurants, [id])
  const { catalogQuerySchema } = require('../shared/contracts/catalog-query.ts')
  assert.equal(catalogQuerySchema.safeParse({ minPrice: '60', maxPrice: '20' }).success, false)
  assert.equal(catalogQuerySchema.safeParse({ hide: 'no-es-uuid' }).success, false)
  const parsed = catalogQuerySchema.parse({ minPrice: '', maxPrice: '35', hide: id })
  assert.equal(parsed.minPrice, undefined); assert.equal(parsed.maxPrice, 35); assert.deepEqual(parsed.hide, [id])
})

test('Sorpréndeme picks among the results and avoids repeating the last one', () => {
  const { pickSurprise, PRICE_RANGES } = require('../shared/contracts/catalog-query.ts')
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.equal(pickSurprise([], null), null)
  assert.equal(pickSurprise([{ id: 'a' }], 'a').id, 'a') // only option: repeat rather than nothing
  for (const r of [0, 0.5, 0.99]) assert.notEqual(pickSurprise(items, 'b', () => r).id, 'b')
  assert.ok(PRICE_RANGES.every(p => (p.min ?? 0) < (p.max ?? Infinity)))
})
