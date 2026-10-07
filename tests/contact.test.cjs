const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { branchInputSchema, phoneUrl, whatsappUrl } = require('../shared/contracts/branches.ts')
const { businessProfileSchema } = require('../shared/contracts/restaurants.ts')

const base = { name: 'Centro', department: 'Quetzaltenango', municipality: 'Quetzaltenango', address: '4a calle zona 1' }

test('branch phone is normalized, optional, and clearable', () => {
  assert.equal(branchInputSchema.parse({ ...base, phone: '7765-4321' }).phone, '77654321')
  assert.equal(branchInputSchema.parse({ ...base, phone: '' }).phone, null) // clears
  assert.equal('phone' in branchInputSchema.parse(base), false) // omitted: not touched on update
  assert.equal(branchInputSchema.safeParse({ ...base, phone: '123' }).success, false)
  assert.equal(phoneUrl('7765 4321'), 'tel:+50277654321')
  assert.equal(whatsappUrl('+50277654321'), 'https://wa.me/50277654321')
})

test('category must come from the fixed list and is optional', () => {
  assert.equal(businessProfileSchema.safeParse({ name: 'Doña Mary', description: '', category: 'Mariscos' }).success, true)
  assert.equal(businessProfileSchema.safeParse({ name: 'Doña Mary', description: '', category: 'Sushi bar' }).success, false)
  assert.equal('category' in businessProfileSchema.parse({ name: 'Doña Mary', description: '' }), false)
})
