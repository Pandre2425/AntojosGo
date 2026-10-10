import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import { displayNameSchema } from '../../../shared/contracts/names'
import { businessProfileSchema, type BusinessProfileInput, type BusinessProfile, type OwnedRestaurant } from '../../../shared/contracts/restaurants'
import { normalize } from '../../../shared/contracts/assistant'

// category is the free-text business_type (the old fixed-list column stays untouched).
const PROFILE = 'id, name, auth_owner_id, description, category:business_type, logo_url:logo_path, cover_url:cover_path'

// Every query filters by owner explicitly; RLS enforces the same rule as a second barrier.
const uuid = z.string().uuid()
const notFound = 'No encontramos ese restaurante en tu cuenta.'

export async function loadBusinessProfile(db: SupabaseClient, userId: string, restaurantId: string): Promise<BusinessProfile> {
  uuid.parse(restaurantId)
  const { data, error } = await db.from('restaurants').select(PROFILE)
    .eq('auth_owner_id', userId).eq('id', restaurantId).single()
  if (error) throw dbError(error, 'No pudimos cargar el perfil. Intenta nuevamente.', notFound)
  return data as BusinessProfile
}

export async function saveBusinessProfile(db: SupabaseClient, userId: string, restaurantId: string, input: BusinessProfileInput): Promise<BusinessProfile> {
  uuid.parse(restaurantId)
  const { category, ...rest } = businessProfileSchema.parse(input)
  const values = category === undefined ? rest : { ...rest, business_type: category && await canonicalBusinessType(db, category) }
  const { data, error } = await db.from('restaurants').update(values)
    .eq('auth_owner_id', userId).eq('id', restaurantId)
    .select(PROFILE).single()
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

/** Business types already in use (plus defaults), for suggestions and the diner filter. */
export async function listBusinessTypes(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.rpc('list_business_types')
  if (error) throw dbError(error, 'No pudimos cargar los tipos de negocio.')
  return ((data ?? []) as { name: string }[]).map(r => r.name)
}

/** "pizzeria" -> "Pizzería" when that type already exists, so the same type is not spelled twice. */
async function canonicalBusinessType(db: SupabaseClient, typed: string): Promise<string> {
  const known = await listBusinessTypes(db).catch(() => [] as string[])
  return known.find(k => normalize(k) === normalize(typed)) ?? typed
}
