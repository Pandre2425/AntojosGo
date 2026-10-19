const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('shared contracts cannot import UI, server code or database clients', () => {
  const directory = path.join(__dirname, '../shared/contracts')
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join(directory, file), 'utf8')
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      // The translator (shared/i18n) is pure and dependency-free, like the contracts themselves.
      assert.ok(match[1] === 'zod' || match[1] === '../i18n' || /^\.\/[\w-]+$/.test(match[1]), `${file}: unexpected dependency ${match[1]}`)
    }
  }
})
