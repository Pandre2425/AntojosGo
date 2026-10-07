const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { interpret, searchGroups, contextLabel, emptyContext, assistantContextSchema } = require('../shared/contracts/assistant.ts')

test('the three example cravings are understood without AI', () => {
  let r = interpret('Quiero comer algo picante')
  assert.equal(r.action, 'search'); assert.deepEqual(r.context.concepts, ['picante']); assert.deepEqual(r.context.words, [])
  r = interpret('Quiero desayunar algo que esté cerca')
  assert.deepEqual(r.context.concepts, ['desayuno']); assert.equal(r.context.near, true); assert.equal(r.context.openNow, true)
  r = interpret('Me gustaría un postre frío')
  assert.deepEqual(r.context.concepts.sort(), ['frio', 'postre'])
})

test('"para el frío" means warm food, not a cold dessert', () => {
  assert.deepEqual(interpret('algo para el frío').context.concepts, ['caliente'])
})

test('follow-ups keep the topic: closer, cheaper, another one, the menu', () => {
  const first = interpret('quiero algo picante').context
  const closer = interpret('¿y algo más cerca?', first)
  assert.equal(closer.action, 'search'); assert.deepEqual(closer.context.concepts, ['picante']); assert.equal(closer.context.near, true)
  const cheaper = interpret('algo más barato', closer.context)
  assert.equal(cheaper.action, 'search'); assert.equal(cheaper.context.cheap, true); assert.equal(cheaper.context.near, true)
  const shown = { ...cheaper.context, shown: ['1f0e5c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b'], lastBranchId: '1f0e5c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b' }
  assert.equal(interpret('otra opción', shown).action, 'more')
  assert.equal(interpret('¿qué tienen en el menú?', shown).action, 'menu')
  const next = interpret('ahora quiero pizza', shown)
  assert.deepEqual(next.context.concepts, ['pizza']); assert.equal(next.context.near, true); assert.equal(next.context.cheap, false)
})

test('unknown words become free search terms; nonsense goes to the AI fallback', () => {
  const r = interpret('quiero shawarma')
  assert.equal(r.action, 'search'); assert.deepEqual(r.context.words, ['shawarma'])
  assert.equal(interpret('???').action, 'unknown')
  assert.equal(interpret('hola').action, 'hello')
  assert.equal(interpret('muchas gracias').action, 'thanks')
})

test('search groups are server-built and only contain safe characters', () => {
  const ctx = assistantContextSchema.parse({ concepts: ['picante'], words: ['shawarma'] })
  const groups = searchGroups(ctx)
  assert.equal(groups.length, 2)
  for (const g of groups) assert.ok(g.re.startsWith('\\m(') && /^[a-z0-9 |]+\)$/.test(g.re.slice(3)), g.re)
  assert.deepEqual(groups[0].tags, ['picante'])
  assert.equal(assistantContextSchema.safeParse({ words: ['a.*(b'] }).success, false) // client cannot inject regex
  assert.equal(contextLabel(ctx), 'algo picante y «shawarma»')
  assert.equal(contextLabel(assistantContextSchema.parse({ words: ['asdf', 'qwer'] })), '«asdf qwer»')
  assert.equal(contextLabel(emptyContext()), 'lugares')
})
