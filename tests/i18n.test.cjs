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
