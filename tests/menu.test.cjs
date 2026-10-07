const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { dishInputSchema } = require('../shared/contracts/menu.ts')

test('dish contract normalizes phone input to what the DB constraints accept', () => {
  const dish = dishInputSchema.parse({ name: '  Pepián ', price: '35,555', category: '', description: '  ' })
  assert.deepEqual(dish, { name: 'Pepián', price: 35.56, category: null, description: null })
  assert.equal(dishInputSchema.parse({ name: 'Café', price: 12 }).price, 12)
})

test('dish contract rejects values the DB would refuse with a 500', () => {
  for (const input of [
    { name: '', price: '10' }, { name: 'x', price: '0' }, { name: 'x', price: '-1' }, { name: 'x', price: 'abc' },
    { name: 'x', price: '' }, { name: 'x', price: '100000' }, { name: 'x'.repeat(121), price: '1' },
    { name: 'x', price: '1', category: 'c'.repeat(61) }, { name: 'x', price: '1', description: 'd'.repeat(501) },
  ]) assert.equal(dishInputSchema.safeParse(input).success, false, JSON.stringify(input))
})

test('partial dish patches leave omitted fields untouched', () => {
  assert.deepEqual(dishInputSchema.partial().parse({ price: '20' }), { price: 20 })
})

test('price is rounded before the range check (never reaches the DB as 0 or 100000)', () => {
  assert.equal(dishInputSchema.safeParse({ name: 'X', price: '0,001' }).success, false)
  assert.equal(dishInputSchema.safeParse({ name: 'X', price: '99999,999' }).success, false)
  assert.equal(dishInputSchema.parse({ name: 'X', price: '0,005' }).price, 0.01)
})
