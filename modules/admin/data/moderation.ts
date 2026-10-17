import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'

// Rules (admins listed in app_admins, checked inside each function): supabase/migrations/20261018100000_review_moderation.sql
export type ReportedReview = {
  id: string; restaurant_name: string; dish_name: string; rating: number; comment: string | null; reply: string | null
  report_reason: string | null; reported_at: string | null; hidden_at: string | null; updated_at: string
}
export const moderationSchema = z.object({ action: z.enum(['keep', 'hide', 'unhide']) })

async function requireAdmin(db: SupabaseClient) {
  const { data, error } = await db.rpc('is_app_admin')
  if (error) throw dbError(error, 'No pudimos comprobar tus permisos.')
  if (!data) throw new AppError('Esta sección es solo para administradores de AntojosGo.', 403, 'forbidden')
}

export async function listReportedReviews(db: SupabaseClient): Promise<ReportedReview[]> {
  await requireAdmin(db)
  const { data, error } = await db.rpc('get_reported_reviews')
  if (error) throw dbError(error, 'No pudimos cargar las reseñas reportadas.')
  return (data ?? []) as ReportedReview[]
}

export async function moderateReview(db: SupabaseClient, reviewId: string, action: 'keep' | 'hide' | 'unhide'): Promise<void> {
  z.string().uuid('No encontramos esa reseña.').parse(reviewId)
  await requireAdmin(db)
  const { data, error } = await db.rpc('moderate_review', { p_review_id: reviewId, p_action: action })
  if (error) throw dbError(error, 'No pudimos aplicar la decisión.')
  if (!data) throw new AppError('No encontramos esa reseña.', 404, 'not_found')
}
