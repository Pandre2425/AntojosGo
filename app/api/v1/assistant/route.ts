import { NextResponse, after } from 'next/server'
import { readJson, route } from '@/lib/server/api'
import { interpretWithAi } from '@/lib/server/gemini'
import { runAssistant } from '@/modules/catalog/data/assistant'
import { recordSearch } from '@/modules/catalog/data/popular'
import { assistantRequestSchema } from '@/shared/contracts/assistant'

/** Public diner assistant. The conversation context travels with each request; nothing is stored. */
export const POST = route(async (req, { db }) => {
  const input = await readJson(req, assistantRequestSchema)
  const result = await runAssistant(db, input, interpretWithAi)
  after(() => recordSearch(db, input.message)) // runs after the reply is sent
  return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } })
}, { auth: false, rate: { bucket: 'ai', max: 20 } })
