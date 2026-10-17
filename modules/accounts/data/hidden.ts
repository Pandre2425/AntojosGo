import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import type { HiddenRestaurant } from '../../../lib/api-client'

// Rules (owner-only, published restaurants only, 200 per user): supabase/migrations/20261018090000_search_v3_hidden_restaurants.sql
const uuid = z.string().uuid('No encontramos ese restaurante.')

export async function listHidden(db: SupabaseClient): Promise<HiddenRestaurant[]> {
  const { data, error } = await db.rpc('get_my_hidden_restaurants')
  if (error) throw dbError(error, 'No pudimos cargar tus restaurantes ocultos.')
  return (data ?? []) as HiddenRestaurant[]
}

/** Idempotent: hiding an already hidden restaurant succeeds. */
export async function hideRestaurant(db: SupabaseClient, restaurantId: string): Promise<void> {
  uuid.parse(restaurantId)
  const { error } = await db.from('hidden_restaurants').insert({ restaurant_id: restaurantId })
  if (!error || error.code === '23505') return
  if (error.code === '42501') throw new AppError('No pudimos ocultarlo: ya no está publicado o llegaste al límite de 200.', 400, 'invalid')
  throw dbError(error, 'No pudimos ocultar el restaurante.')
}

export async function unhideRestaurant(db: SupabaseClient, restaurantId: string): Promise<void> {
  uuid.parse(restaurantId)
  const { error } = await db.from('hidden_restaurants').delete().eq('restaurant_id', restaurantId)
  if (error) throw dbError(error, 'No pudimos mostrarlo de nuevo.')
}
