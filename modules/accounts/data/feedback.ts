import type { SupabaseClient } from '@supabase/supabase-js'
import { dbError } from '../../../lib/app-error'
import { feedbackInputSchema, type Feedback } from '../../../shared/contracts/feedback'

// Rules (owner-only, one row per account): supabase/migrations/20261016090000_app_feedback.sql
const fields = 'rating, comment, platform, app_version, updated_at'

export async function getMyFeedback(db: SupabaseClient): Promise<Feedback | null> {
  const { data, error } = await db.from('app_feedback').select(fields).maybeSingle()
  if (error) throw dbError(error, 'No pudimos cargar tu calificación.')
  return data as Feedback | null
}

export async function saveMyFeedback(db: SupabaseClient, input: unknown): Promise<Feedback> {
  const row = { ...feedbackInputSchema.parse(input), updated_at: new Date().toISOString() }
  const { data, error } = await db.from('app_feedback').upsert(row, { onConflict: 'user_id' }).select(fields).single()
  if (error) throw dbError(error, 'No pudimos guardar tu calificación.')
  return data as Feedback
}
