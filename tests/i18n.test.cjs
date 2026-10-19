const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { en } = require('../shared/i18n/en.ts')
const { t } = require('../shared/i18n/index.ts')

const ROOT = path.join(__dirname, '..')
const DIRS = ['app', 'components', 'hooks', 'lib', 'modules', 'shared', 'mobile/app', 'mobile/src']
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { if (!['node_modules', 'i18n'].includes(entry.name)) yield* files(full) }
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full
  }
}
// Spanish texts the code shows: t('…') calls, plus server error messages that the API translates by lookup.
const PATTERNS = [
  /\b(?:t|msg)\(\s*'((?:\\.|[^'\\])+)'/g, /\b(?:t|msg)\(\s*"((?:\\.|[^"\\])+)"/g,
  /new AppError\(\s*'((?:\\.|[^'\\])+)'/g, /dbError\([^,]+,\s*'((?:\\.|[^'\\])+)'/g,
  // zod messages (forms show them through t(); the API translates them by lookup)
  /\.(?:min|max|length|regex|refine|startsWith)\([^'"\n]*?,\s*'((?:\\.|[^'\\])+)'/g, /\.(?:email|url|uuid|int|positive|nonnegative)\(\s*'((?:\\.|[^'\\])+)'/g,
  /message:\s*'((?:\\.|[^'\\])+)'/g,
]
const unescape = s => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n')

test('every Spanish text in t() and API errors has an English translation', () => {
  const missing = new Map()
  for (const dir of DIRS) for (const file of files(path.join(ROOT, dir))) {
    const src = fs.readFileSync(file, 'utf8')
    for (const re of PATTERNS) for (const m of src.matchAll(re)) {
      const text = unescape(m[1])
      if (!(text in en)) missing.set(text, path.relative(ROOT, file))
    }
  }
  if (process.env.I18N_DUMP) fs.appendFileSync(process.env.I18N_DUMP, [...missing.keys()].map(k => JSON.stringify(k) + '\n').join(''))
  assert.equal(missing.size, 0, `Sin traducir (${missing.size}):\n` + [...missing].map(([k, f]) => `  ${JSON.stringify(k)}  ← ${f}`).join('\n'))
})

test('English translations keep their {placeholders} and are not empty', () => {
  for (const [es, english] of Object.entries(en)) {
    assert.ok(english.trim(), `vacía: ${es}`)
    const vars = s => (s.match(/\{\w+\}/g) ?? []).sort().join()
    assert.equal(vars(english), vars(es), `marcadores distintos en: ${es}`)
  }
})

test('t() falls back to the Spanish text and fills placeholders', () => {
  assert.equal(t('Texto sin traducir', undefined, 'en'), 'Texto sin traducir')
  assert.equal(t('Hola {name}', { name: 'Ana' }, 'es'), 'Hola Ana')
})

test('every value of the shared lists shown on screen has an English translation', () => {
  const menu = require('../shared/contracts/menu.ts')
  const lists = {
    'menu.DISH_TAG_LABELS': Object.values(menu.DISH_TAG_LABELS),
    'menu.ALLERGEN_LABELS': Object.values(menu.ALLERGEN_LABELS),
    'menu.DISH_DETAIL_GROUPS': menu.DISH_DETAIL_GROUPS.flatMap(g => [g.title, g.placeholder, ...g.options.map(o => o.label)]),
    'hours.DAY_NAMES': [...require('../shared/contracts/hours.ts').DAY_NAMES],
    'feedback.RATING_LABELS': require('../shared/contracts/feedback.ts').RATING_LABELS.filter(Boolean),
    'catalog-query.PRICE_RANGES': require('../shared/contracts/catalog-query.ts').PRICE_RANGES.map(p => p.label),
    'home.HOME_OPTIONS': require('../shared/contracts/home.ts').HOME_OPTIONS.map(o => o.title),
    'accessibility.TEXT_SIZES': require('../shared/contracts/accessibility.ts').TEXT_SIZES.map(s => s.label),
  }
  const missing = Object.entries(lists).flatMap(([name, values]) => values.filter(v => !(v in en)).map(v => `${name}: ${JSON.stringify(v)}`))
  if (process.env.I18N_DUMP) fs.appendFileSync(process.env.I18N_DUMP, Object.values(lists).flat().filter(v => !(v in en)).map(k => JSON.stringify(k) + '\n').join(''))
  assert.equal(missing.length, 0, `Sin traducir (${missing.length}):\n  ` + missing.join('\n  '))
})
