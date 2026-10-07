import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import { displayNameSchema } from '../../../shared/contracts/names'
import { businessProfileSchema, type BusinessProfileInput, type BusinessProfile, type OwnedRestaurant } from '../../../shared/contracts/restaurants'

// Every query filters by owner explicitly; RLS enforces the same rule as a second barrier.
const uuid = z.string().uuid()
const notFound = 'No encontramos ese restaurante en tu cuenta.'

export async function loadBusinessProfile(db: SupabaseClient, userId: string, restaurantId: string): Promise<BusinessProfile> {
  uuid.parse(restaurantId)
  const { data, error } = await db.from('restaurants').select('id, name, auth_owner_id, description, category')
    .eq('auth_owner_id', userId).eq('id', restaurantId).single()
  if (error) throw dbError(error, 'No pudimos cargar el perfil. Intenta nuevamente.', notFound)
  return data as BusinessProfile
}

export async function saveBusinessProfile(db: SupabaseClient, userId: string, restaurantId: string, input: BusinessProfileInput): Promise<BusinessProfile> {
  uuid.parse(restaurantId)
  const values = businessProfileSchema.parse(input)
  const { data, error } = await db.from('restaurants').update(values)
    .eq('auth_owner_id', userId).eq('id', restaurantId)
    .select('id, name, auth_owner_id, description, category').single()
  if (error?.code === '23505') throw new AppError('Ya tienes otro restaurante con ese nombre.', 409, 'conflict')
  if (error) throw dbError(error, 'No pudimos confirmar el guardado. Puedes volver a intentar.', notFound)
  return data as BusinessProfile
}

// ponytail: hard cap of 50 owned businesses, add cursor pagination when an owner gets near it.
export async function listOwnedRestaurants(db: SupabaseClient, userId: string): Promise<OwnedRestaurant[]> {
  const { data, error } = await db.from('restaurants').select('id, name, auth_owner_id').eq('auth_owner_id', userId).order('created_at').limit(50)
  if (error) throw dbError(error, 'No pudimos cargar tus restaurantes.')
  return data as OwnedRestaurant[]
}

/** Idempotent per (owner, name): retrying never creates duplicates. */
export async function createOwnedRestaurant(db: SupabaseClient, userId: string, name: string): Promise<OwnedRestaurant> {
  const restaurantName = displayNameSchema.parse(name)
  const { error } = await db.from('restaurants').upsert({ auth_owner_id: userId, name: restaurantName }, { onConflict: 'auth_owner_id,name', ignoreDuplicates: true })
  if (error) throw dbError(error, 'No pudimos guardar el restaurante. Puedes reintentar sin crear duplicados.')
  const { data, error: readError } = await db.from('restaurants').select('id, name, auth_owner_id').eq('auth_owner_id', userId).eq('name', restaurantName).single()
  if (readError) throw dbError(readError, 'No pudimos cargar el restaurante guardado.')
  return data as OwnedRestaurant
}
