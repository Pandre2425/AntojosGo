const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { isOpenNow, openingHoursSchema, fromDayForm, toDayForm } = require('../shared/contracts/hours.ts')

// Guatemala is UTC-6: 2026-10-05 is a Monday (day 1).
const gt = (iso) => new Date(`${iso}-06:00`)

test('open-now uses Guatemala time and handles ranges past midnight', () => {
  const hours = [{ day: 1, open: '08:00', close: '14:00' }, { day: 5, open: '18:00', close: '02:00' }]
  assert.equal(isOpenNow(hours, gt('2026-10-05T08:00')), true)
  assert.equal(isOpenNow(hours, gt('2026-10-05T14:00')), false) // close is exclusive
  assert.equal(isOpenNow(hours, gt('2026-10-05T07:59')), false)
  assert.equal(isOpenNow(hours, gt('2026-10-09T23:30')), true) // Friday night
  assert.equal(isOpenNow(hours, gt('2026-10-10T01:30')), true) // Saturday early, from Friday
  assert.equal(isOpenNow(hours, gt('2026-10-10T02:00')), false)
  assert.equal(isOpenNow([], gt('2026-10-05T10:00')), null) // unknown, not closed
})

test('hours contract rejects bad times and the day form round-trips', () => {
  assert.equal(openingHoursSchema.safeParse([{ day: 1, open: '24:00', close: '10:00' }]).success, false)
  assert.equal(openingHoursSchema.safeParse([{ day: 7, open: '08:00', close: '10:00' }]).success, false)
  assert.equal(openingHoursSchema.safeParse([{ day: 1, open: '08:00', close: '08:00' }]).success, false)
  const hours = [{ day: 1, open: '08:00', close: '14:00' }]
  assert.deepEqual(fromDayForm(toDayForm(hours)).data, hours)
})
