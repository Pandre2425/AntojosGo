const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { runAssistant } = require('../modules/catalog/data/assistant.ts')

const row = (name, dish, price) => ({ id: '1f0e5c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b', name, branch_name: 'Centro', category: null, address: 'x', municipality: 'Xela', distance_m: null, opening_hours: [], match_dish: dish, match_price: price })
// Fake DB: only matches when a group regex mentions "sushi" or "picant".
const db = { rpc: async (_fn, args) => ({ data: args.p_groups.some(g => /sushi/.test(g.re)) ? [row('Sakura', 'Sushi roll', 60)] : args.p_groups.some(g => /picant/.test(g.re)) ? [row('Doña Mary', 'Pollo a la diabla', 45)] : [], error: null }) }
const aiCalls = []
const ai = async (m) => { aiCalls.push(m); return /nigiri|algo japo/.test(m) ? { understood: true, concepts: ['japonesa'], words: [], near: false, openNow: false, cheap: false } : { understood: false, concepts: [], words: [], near: false, openNow: false, cheap: false } }

test('rules answer known cravings without calling the AI', async () => {
  aiCalls.length = 0
  const r = await runAssistant(db, { message: 'quiero algo picante' }, ai)
  assert.equal(r.source, 'rules'); assert.equal(r.items[0].name, 'Doña Mary'); assert.match(r.reply, /Pollo a la diabla/)
  assert.equal(aiCalls.length, 0)
})

test('unknown words with no results get one AI attempt, and the DB still decides', async () => {
  aiCalls.length = 0
  const r = await runAssistant(db, { message: 'se me antoja un nigiri' }, ai)
  assert.equal(aiCalls.length, 1); assert.equal(r.source, 'ai'); assert.equal(r.items[0].name, 'Sakura')
})

test('nonsense ends in a polite "not understood" without inventing places', async () => {
  aiCalls.length = 0
  const r = await runAssistant(db, { message: '???' }, ai)
  assert.equal(r.source, 'none'); assert.equal(r.items.length, 0); assert.equal(aiCalls.length, 1)
})

test('"cerca" without a location asks for it instead of searching', async () => {
  const r = await runAssistant(db, { message: 'algo picante cerca' }, ai)
  assert.equal(r.needsLocation, true); assert.equal(r.items.length, 0)
})

test('AI disabled (returns null) never breaks the assistant', async () => {
  const r = await runAssistant(db, { message: '???' }, async () => null)
  assert.equal(r.source, 'none')
})
