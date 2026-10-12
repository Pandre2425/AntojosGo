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

test('exclusions: allergens and ingredients are understood and persist across topics', () => {
  const { extractExclusions, interpret, contextLabel, queryGroups, avoidRegex } = require('../shared/contracts/assistant.ts')
  assert.deepEqual(extractExclusions('algo picante sin mani').without, ['mani'])
  assert.deepEqual(extractExclusions('soy alergico a los mariscos').without, ['mariscos'])
  assert.deepEqual(extractExclusions('no como cebolla ni tomate').avoid, ['cebolla', 'tomate'])
  // "sin mariscos" must not search FOR seafood
  const r = interpret('quiero algo sin mariscos')
  assert.deepEqual(r.context.concepts, []); assert.deepEqual(r.context.without, ['mariscos']); assert.equal(r.action, 'search')
  const a = interpret('soy alérgico al maní').context
  const b = interpret('quiero un postre', a).context
  assert.deepEqual(b.concepts, ['postre']); assert.deepEqual(b.without, ['mani']) // restriction kept
  assert.equal(contextLabel({ ...b, avoid: ['cebolla'] }), 'postres sin maní ni cebolla')
  assert.equal(avoidRegex(['cebolla']), '\\m(cebolla)')
  assert.deepEqual(queryGroups('pizza en Quetzaltenango').map(g => g.re), ['\\m(pizza)', '\\m(quetzaltenango)'])
})

test('menu contract: ingredients parse and allergen declaration rules', () => {
  const { parseIngredients, dishInputSchema, allergenStatus } = require('../shared/contracts/menu.ts')
  assert.deepEqual(parseIngredients('pollo, Chile pasa ,pollo;  tomate '), ['pollo', 'Chile pasa', 'tomate'])
  assert.equal(dishInputSchema.safeParse({ name: 'X', price: 10, allergens: ['ninguno', 'mani'] }).success, false)
  assert.equal(dishInputSchema.safeParse({ name: 'X', price: 10, allergens: ['mani', 'huevo'] }).success, true)
  assert.deepEqual(allergenStatus([]), { declared: false, contains: [], other: [] })        // not declared != safe
  assert.deepEqual(allergenStatus(['ninguno']), { declared: true, contains: [], other: [] })
  assert.deepEqual(allergenStatus(['mani']), { declared: true, contains: ['mani'], other: [] })
  assert.deepEqual(allergenStatus([], ['mostaza']), { declared: true, contains: [], other: ['mostaza'] }) // own allergens count as declared
})

test('home shortcuts: most searched first, default order otherwise; concepts detected without exclusions', () => {
  const { rankHomeOptions, HOME_OPTIONS } = require('../shared/contracts/home.ts')
  const { detectConcepts, extractExclusions, normalize } = require('../shared/contracts/assistant.ts')
  assert.deepEqual(rankHomeOptions({}, 3).map(o => o.concept), HOME_OPTIONS.slice(0, 3).map(o => o.concept))
  assert.deepEqual(rankHomeOptions({ mariscos: 5, cafe: 2 }, 3).map(o => o.concept), ['mariscos', 'cafe', 'pizza'])
  assert.deepEqual(detectConcepts(normalize('Quiero tacos y una pizza')), ['pizza', 'mexicana'])
  assert.deepEqual(detectConcepts(extractExclusions(normalize('algo sin mariscos')).rest), [])
})

test('dish form rules: categories drive tags and summary; one ingredient at a time; price formatting', () => {
  const m = require('../shared/contracts/menu.ts')
  assert.deepEqual(m.tagsForCategories(['Hamburguesa', 'picante', 'Sopa o caldo', 'Shucos']), ['picante', 'caliente'])
  assert.equal(m.categorySummary(['Hamburguesa', 'Comida rápida']), 'Hamburguesa, Comida rápida')
  assert.ok(m.categorySummary(Array(10).fill('Especialidad de la casa')).length <= 60)
  assert.equal(m.ingredientProblem('pan, queso', []), 'Agrega un ingrediente a la vez (sin comas ni «y»).')
  assert.equal(m.ingredientProblem('Pollo', ['pollo']), 'Ese ingrediente ya está en la lista.')
  assert.equal(m.ingredientProblem('chile pasa', []), '')
  assert.equal(m.formatPriceInput('45'), '45.00'); assert.equal(m.formatPriceInput('45,5'), '45.50'); assert.equal(m.formatPriceInput('abc'), 'abc')
  const parsed = m.dishInputSchema.parse({ name: 'X', price: '35', dish_types: ['Pizza', 'pizza'], cuisines: ['Colombiana'] })
  assert.deepEqual(parsed.dish_types, ['Pizza']); assert.deepEqual(parsed.cuisines, ['Colombiana'])
  assert.equal(m.dishInputSchema.safeParse({ name: 'X', price: '35', cuisines: ['a,b'] }).success, false)
  assert.equal(m.dishInputSchema.safeParse({ name: 'X', price: '35', allergens: ['ninguno'], allergens_other: ['Mostaza'] }).success, false)
  // Dishes saved before the split are sorted into groups from their old category and tags.
  assert.deepEqual(m.dishDetails({ categories: ['Plato fuerte', 'Colombiana', 'Picante', 'Shucos'] }),
    { dish_types: ['Plato fuerte', 'Shucos'], cuisines: ['Colombiana'], features: ['Picante'] })
  assert.deepEqual(m.dishDetails({ category: 'Platos fuertes', tags: ['picante'] }), { dish_types: ['Platos fuertes'], cuisines: [], features: ['Picante'] })
  assert.deepEqual(m.splitAllergenLabels(['Maní', 'Mostaza']), { allergens: ['mani'], allergens_other: ['Mostaza'] })
  assert.equal(m.labelProblem('Colombiana, Peruana', []), 'Agrega una opción a la vez (sin comas).')
})
