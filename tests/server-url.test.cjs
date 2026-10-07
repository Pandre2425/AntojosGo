const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { normalizeServerUrl } = require('../lib/server-url.ts')

test('server address accepts what a tester types and returns a clean origin', () => {
  assert.equal(normalizeServerUrl('10.239.243.18:3000'), 'http://10.239.243.18:3000')
  assert.equal(normalizeServerUrl('  http://192.168.1.19:3000/  '), 'http://192.168.1.19:3000')
  assert.equal(normalizeServerUrl('https://api.antojosgo.com/api/v1'), 'https://api.antojosgo.com')
})

test('server address rejects empty, non-http and credential-bearing values', () => {
  for (const bad of ['', '   ', 'ftp://host', 'javascript:alert(1)', 'http://user:pass@host:3000', 'http://']) assert.equal(normalizeServerUrl(bad), null, bad)
})
