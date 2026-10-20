const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { feedbackInputSchema } = require('../shared/contracts/feedback.ts')

test('app rating: 1 to 5, optional comment, known platform', () => {
  const ok = feedbackInputSchema.parse({ rating: 4, comment: '  ', platform: 'web' })
  assert.deepEqual(ok, { rating: 4, comment: null, platform: 'web', app_version: null })
  assert.equal(feedbackInputSchema.parse({ rating: 5, comment: ' Más sedes ', platform: 'android', app_version: '0.4.0' }).comment, 'Más sedes')
  for (const bad of [{ rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: 3, platform: 'ios' }, { rating: 3, comment: 'x'.repeat(1001) }])
    assert.equal(feedbackInputSchema.safeParse({ platform: 'web', ...bad }).success, false, JSON.stringify(bad).slice(0, 40))
})

const { copyMondayToAll, toDayForm } = require('../shared/contracts/hours.ts')
test('copy Monday to all days keeps each day and copies hours or closed', () => {
  const form = toDayForm([{ day: 1, open: '09:00', close: '18:00' }, { day: 0, open: '10:00', close: '14:00' }])
  const copied = copyMondayToAll(form)
  assert.deepEqual(copied.map(d => d.day), [1, 2, 3, 4, 5, 6, 0])
  assert.ok(copied.every(d => d.open === '09:00' && d.close === '18:00' && !d.closed))
  assert.ok(copyMondayToAll(toDayForm([])).every(d => d.closed))
})

const { starParts, ratingLabel, reviewInputSchema } = require('../shared/contracts/reviews.ts')
test('review stars: whole stars in, average drawn to the nearest half', () => {
  assert.deepEqual(starParts(3.6), ['full', 'full', 'full', 'half', 'empty'])
  assert.deepEqual(starParts(3.74), ['full', 'full', 'full', 'half', 'empty'])
  assert.deepEqual(starParts(3.75), ['full', 'full', 'full', 'full', 'empty'])
  assert.deepEqual(starParts(null), ['empty', 'empty', 'empty', 'empty', 'empty'])
  assert.deepEqual(starParts(9), Array(5).fill('full'))
  assert.equal(ratingLabel({ rating_avg: 4.25, rating_count: 12 }), '4.3 (12 reseñas)')
  assert.equal(ratingLabel({ rating_avg: 5, rating_count: 1 }), '5.0 (1 reseña)')
  assert.equal(ratingLabel({ rating_avg: null, rating_count: 0 }), 'Sin reseñas')
  assert.equal(reviewInputSchema.safeParse({ rating: 3.5 }).success, false)
  assert.equal(reviewInputSchema.parse({ rating: 4, comment: ' ' }).comment, null)
})

test('email links use the domain without www', () => {
  const { authOrigin, accountLink } = require('../lib/auth-validation.ts')
  assert.equal(authOrigin('https://www.antojosgo.com'), 'https://antojosgo.com')
  assert.equal(authOrigin('https://antojosgo.com/restaurant'), 'https://antojosgo.com/restaurant')
  assert.equal(accountLink(authOrigin('https://www.antojosgo.com'), 'confirmar'), 'https://antojosgo.com/cuenta?accion=confirmar')
})

test('«Para que te encuentren»: required items decide visibility; score weights them double', () => {
  const { findabilityChecklist, findabilityScore } = require('../shared/contracts/findability.ts')
  const branch = (o = {}) => ({ id: 'b', name: 'Centro', status: 'published', latitude: 14.8, longitude: -91.5, opening_hours: [{ day: 1, open: '08:00', close: '17:00' }], phone: '77654321', whatsapp: true, ...o })
  const dish = (o = {}) => ({ id: Math.random().toString(), status: 'published', is_available: true, image_url: 'x.jpg', allergens: ['ninguno'], dish_types: ['Plato fuerte'], cuisines: [], ...o })
  const full = findabilityChecklist({ description: 'x'.repeat(40), category: 'Pizzería', logo_url: 'l', cover_url: 'c' }, [branch()], [dish(), dish(), dish()])
  assert.ok(full.every(i => i.done)); assert.equal(findabilityScore(full), 100)
  const empty = findabilityChecklist({ description: null, category: null, logo_url: null, cover_url: null }, [branch({ status: 'draft', latitude: null, opening_hours: [], phone: null })], [dish({ status: 'draft' })])
  assert.deepEqual(empty.filter(i => i.required && !i.done).map(i => i.key), ['published', 'location', 'menu'])
  assert.equal(findabilityScore(empty), 0)
  const photos = findabilityChecklist({ description: '', category: 'x', logo_url: null, cover_url: null }, [branch()], [dish(), dish({ image_url: null })]).find(i => i.key === 'photos')
  assert.deepEqual(photos.detail, { done: 1, total: 2 })
})
