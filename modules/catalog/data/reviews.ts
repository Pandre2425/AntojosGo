import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import type { MyReview, OwnerReview, PublicReview } from '../../../shared/contracts/reviews'

// Rules (anonymous, one per account and dish, owners reply/report only): supabase/migrations/20261017090000_dish_reviews.sql
const uuid = z.string().uuid('No encontramos ese elemento.')
const PAGE = 20

/** Public reviews of a public dish, newest first, without author. */
export async function listDishReviews(client: SupabaseClient, dishId: string, page = 0): Promise<{ items: PublicReview[]; hasMore: boolean }> {
  uuid.parse(dishId)
  const { data, error } = await client.rpc('get_dish_reviews', { p_dish_id: dishId, p_limit: PAGE + 1, p_offset: Math.max(0, page) * PAGE })
  if (error) throw dbError(error, 'No pudimos cargar las reseñas.')
  const rows = (data ?? []) as PublicReview[]
  return { items: rows.slice(0, PAGE), hasMore: rows.length > PAGE }
}

const MINE = 'rating, comment, updated_at'
export async function getMyReview(db: SupabaseClient, dishId: string): Promise<MyReview | null> {
  uuid.parse(dishId)
  const { data, error } = await db.from('dish_reviews').select(MINE).eq('dish_id', dishId).maybeSingle()
  if (error) throw dbError(error, 'No pudimos cargar tu reseña.')
  return data as MyReview | null
}

/** Creates or replaces the user's review. Update first: the update grant excludes dish_id, so an upsert would be refused. */
export async function saveMyReview(db: SupabaseClient, dishId: string, input: { rating: number; comment: string | null }): Promise<MyReview> {
  uuid.parse(dishId)
  const row = { rating: input.rating, comment: input.comment, updated_at: new Date().toISOString() }
  const updated = await db.from('dish_reviews').update(row).eq('dish_id', dishId).select(MINE)
  if (updated.error) throw dbError(updated.error, 'No pudimos guardar tu reseña.')
  if (updated.data.length) return updated.data[0] as MyReview
  const { data, error } = await db.from('dish_reviews').insert({ dish_id: dishId, ...row }).select(MINE).single()
  if (error?.code === '42501') throw new AppError('No puedes reseñar este platillo: no está publicado o es de tu propio restaurante.', 403, 'forbidden')
  if (error) throw dbError(error, 'No pudimos guardar tu reseña.')
  return data as MyReview
}

export async function deleteMyReview(db: SupabaseClient, dishId: string): Promise<void> {
  uuid.parse(dishId)
  const { error } = await db.from('dish_reviews').delete().eq('dish_id', dishId)
  if (error) throw dbError(error, 'No pudimos borrar tu reseña.')
}

/** Owner panel: reviews of every dish of their restaurant (empty if not theirs). */
export async function listOwnerReviews(db: SupabaseClient, restaurantId: string, page = 0): Promise<{ items: OwnerReview[]; hasMore: boolean }> {
  uuid.parse(restaurantId)
  const { data, error } = await db.rpc('get_owner_reviews', { p_restaurant_id: restaurantId, p_limit: 51, p_offset: Math.max(0, page) * 50 })
  if (error) throw dbError(error, 'No pudimos cargar las reseñas.')
  const rows = (data ?? []) as OwnerReview[]
  return { items: rows.slice(0, 50), hasMore: rows.length > 50 }
}

/** Public reply from the restaurant; an empty text removes it. */
export async function replyToReview(db: SupabaseClient, reviewId: string, reply: string): Promise<void> {
  uuid.parse(reviewId)
  const { data, error } = await db.rpc('reply_to_review', { p_review_id: reviewId, p_reply: reply })
  if (error) throw dbError(error, 'No pudimos guardar la respuesta.')
  if (!data) throw new AppError('No encontramos esa reseña en tu restaurante.', 404, 'not_found')
}

export async function reportReview(db: SupabaseClient, reviewId: string, reason: string): Promise<void> {
  uuid.parse(reviewId)
  const { data, error } = await db.rpc('report_review', { p_review_id: reviewId, p_reason: reason })
  if (error) throw dbError(error, 'No pudimos reportar la reseña.')
  if (!data) throw new AppError('No encontramos esa reseña en tu restaurante.', 404, 'not_found')
}
