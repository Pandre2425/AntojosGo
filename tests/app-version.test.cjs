const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { newerRelease } = require('../shared/contracts/app-version.ts')

const ok = { versionCode: 2, version: '0.2.0', url: 'https://github.com/Pandre2425/AntojosGo/releases/latest', notes: 'x' }

test('offers only newer releases from this repository', () => {
  assert.equal(newerRelease(ok, 1).version, '0.2.0')
  assert.equal(newerRelease(ok, 2), null) // same version
  assert.equal(newerRelease({ ...ok, url: 'https://evil.example/app.apk' }, 1), null)
  assert.equal(newerRelease({ ...ok, url: 'https://github.com/Pandre2425/AntojosGo.evil.com/releases/' }, 1), null)
  assert.equal(newerRelease({ ...ok, url: 'http://github.com/Pandre2425/AntojosGo/releases/latest' }, 1), null)
  assert.equal(newerRelease('<html>', 1), null)
})

test('the published manifest is valid', () => {
  const manifest = JSON.parse(fs.readFileSync('public/app-version.json', 'utf8'))
  assert.equal(newerRelease(manifest, 0)?.versionCode, manifest.versionCode)
})
