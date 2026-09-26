const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Load the app's TypeScript modules with no database credentials.
process.env.NEXT_PUBLIC_SUPABASE_URL = ''
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  module._compile(outputText, filename)
}
const {
  searchRestaurants,
  getRestaurantById,
  searchSampleRestaurants,
  getSampleRestaurants,
  searchNearbyRestaurants,
  haversineMeters,
} = require('../lib/restaurants.ts')

test('public catalog is empty without credentials (no invented restaurants)', async () => {
  assert.deepEqual(await searchRestaurants(), [])
  assert.equal(await getRestaurantById('missing'), null)
  assert.deepEqual(await searchNearbyRestaurants(14.63, -90.5, 5000), [])
})

test('sample helpers remain available for isolated unit tests only', () => {
  const samples = getSampleRestaurants()
  assert.ok(samples.length > 0)
  const pizzas = searchSampleRestaurants('pizza')
  assert.equal(pizzas.length, 1)
  assert.equal(pizzas[0].cuisine_type, 'Italian')
  assert.equal(searchSampleRestaurants('no-such-food').length, 0)
  assert.equal(searchSampleRestaurants('', { rating: 5 }).length, 0)
  assert.equal(searchSampleRestaurants('', { cuisine: 'Italian' })[0].id, pizzas[0].id)
  assert.equal(searchSampleRestaurants('', { allergenFree: ['dairy'] }).length, 0)
  assert.equal(searchSampleRestaurants('', {}, 1).length, 1)
})

test('haversine returns zero for identical points', () => {
  assert.equal(haversineMeters(14.63, -90.5, 14.63, -90.5), 0)
})

test('restaurant demo persists profile and menu without using the API', () => {
  const cache = new Map()
  global.window = { localStorage: { getItem: (key) => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) } }
  try {
    const demo = require('../lib/demo-restaurant.ts')
    const id = demo.DEMO_RESTAURANT_ID
    demo.updateDemoProfile(id, { name: 'Restaurante de prueba' })
    assert.equal(demo.getDemoProfile(id).name, 'Restaurante de prueba')
    const count = demo.getDemoMenu(id).length
    const dish = demo.createDemoDish(id, { name: 'Tostadas', price: 20, category: 'Entrada', description: 'Demo', ingredients: ['Maiz'] })
    assert.equal(demo.getDemoMenu(id).length, count + 1)
    demo.updateDemoDish(id, dish.id, { price: 25, isAvailable: false })
    assert.equal(demo.getDemoMenu(id).find((item) => item.id === dish.id).price, 25)
    assert.equal(demo.getDemoAnalytics(id).activeDishes, count)
    demo.deleteDemoDish(id, dish.id)
    assert.equal(demo.getDemoMenu(id).length, count)
    assert.throws(() => demo.getDemoProfile('real-restaurant'))
    assert.throws(() => demo.createDemoDish(id, { name: 'Invalid', price: -1 }))
  } finally { delete global.window }
})
