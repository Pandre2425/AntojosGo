import type { SupabaseClient } from '@supabase/supabase-js'
import { detectConcepts, extractExclusions, normalize } from '../../../shared/contracts/assistant'
import { rankHomeOptions, type HomeOption } from '../../../shared/contracts/home'

/** Counts the food concepts in a search (anonymous: only the concept key). Best effort, never throws. */
export async function recordSearch(db: SupabaseClient, text: string): Promise<void> {
  const concepts = detectConcepts(extractExclusions(normalize(text)).rest).slice(0, 3)
  if (!concepts.length) return
  await db.rpc('record_concept_searches', { p_concepts: concepts }).then(() => undefined, () => undefined)
}

/** Home shortcuts ordered by the last 30 days of searches; default order when there is no data or the DB fails. */
export async function popularOptions(db: SupabaseClient): Promise<HomeOption[]> {
  const { data } = await db.rpc('popular_concepts').then(r => r, () => ({ data: null }))
  return rankHomeOptions(Object.fromEntries(((data ?? []) as { concept: string; hits: number }[]).map(r => [r.concept, Number(r.hits)])))
}
