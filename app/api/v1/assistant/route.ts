import { NextResponse, after } from 'next/server'
import { readJson, route } from '@/lib/server/api'
import { interpretWithAi } from '@/lib/server/gemini'
import { runAssistant } from '@/modules/catalog/data/assistant'
import { recordSearch } from '@/modules/catalog/data/popular'
import { assistantRequestSchema } from '@/shared/contracts/assistant'

/** Public diner assistant. The conversation context travels with each request; nothing is stored. */
// ponytail: no per-IP limit on the AI fallback; the Gemini free-tier quota caps cost. Add a shared rate limiter (EXECUTION-PLAN §4.5) before a paid AI tier.
export const POST = route(async (req, { db }) => {
  const input = await readJson(req, assistantRequestSchema)
  const result = await runAssistant(db, input, interpretWithAi)
  after(() => recordSearch(db, input.message)) // runs after the reply is sent
  return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } })
}, { auth: false })
