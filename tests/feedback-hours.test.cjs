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
