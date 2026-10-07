import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import type { PublicCatalogItem } from '../../catalog/data/public-catalog'

// Rules (owner-only, published branches only, 200 per user): supabase/migrations/20261007110000_favorites.sql
const uuid = z.string().uuid()

/** The user's favorites that are still published, newest first. */
export async function listFavorites(db: SupabaseClient): Promise<PublicCatalogItem[]> {
  const { data, error } = await db.rpc('get_my_favorites')
  if (error) throw dbError(error, 'No pudimos cargar tus favoritos.')
  return (data ?? []) as PublicCatalogItem[]
}

/** Idempotent: adding an existing favorite succeeds. */
export async function addFavorite(db: SupabaseClient, branchId: string): Promise<void> {
  uuid.parse(branchId)
  const { error } = await db.from('favorites').insert({ branch_id: branchId })
  if (!error || error.code === '23505') return
  // RLS rejects unpublished/unknown branches and the per-user limit with the same code.
  if (error.code === '42501') throw new AppError('No pudimos guardar esta sede: ya no está publicada o llegaste al límite de 200 favoritos.', 400, 'invalid')
  throw dbError(error, 'No pudimos guardar el favorito.')
}

export async function removeFavorite(db: SupabaseClient, branchId: string): Promise<void> {
  uuid.parse(branchId)
  const { error } = await db.from('favorites').delete().eq('branch_id', branchId)
  if (error) throw dbError(error, 'No pudimos quitar el favorito.')
}
