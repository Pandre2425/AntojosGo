const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('shared contracts cannot import UI, server code or database clients', () => {
  const directory = path.join(__dirname, '../shared/contracts')
  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join(directory, file), 'utf8')
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      assert.ok(match[1] === 'zod' || /^\.\/[\w-]+$/.test(match[1]), `${file}: unexpected dependency ${match[1]}`)
    }
  }
})
