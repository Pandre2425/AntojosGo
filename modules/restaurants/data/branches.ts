import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import { openingHoursSchema, type OpeningHours } from '../../../shared/contracts/hours'
import { branchInputSchema, branchLocationSchema, branchPageSize, type BranchInput, type BranchLocation, type RestaurantBranch } from '../../../shared/contracts/branches'

// RLS (branches_*_own policies) restricts every query to the owner's branches.
const fields = 'id,restaurant_id,name,department,municipality,address,status,latitude,longitude,opening_hours,phone,whatsapp'
const uuid = z.string().uuid()
const notFound = 'No encontramos esa sede en tu cuenta.'

export async function loadBranch(db: SupabaseClient, branchId: string): Promise<RestaurantBranch> {
  uuid.parse(branchId)
  const { data, error } = await db.from('restaurant_branches').select(fields).eq('id', branchId).single()
  if (error) throw dbError(error, 'No pudimos cargar la sede.', notFound)
  return data as RestaurantBranch
}

export async function listBranches(db: SupabaseClient, restaurantId: string, page = 0): Promise<{ items: RestaurantBranch[]; hasMore: boolean }> {
  uuid.parse(restaurantId)
  z.number().int().min(0).max(10000).parse(page)
  const start = page * branchPageSize
  const { data, error } = await db.from('restaurant_branches').select(fields).eq('restaurant_id', restaurantId)
    .order('created_at').order('id').range(start, start + branchPageSize)
  if (error) throw dbError(error, 'No pudimos cargar las sedes.')
  return { items: (data || []).slice(0, branchPageSize) as RestaurantBranch[], hasMore: (data || []).length > branchPageSize }
}

/** `id` is a client-generated idempotency key: retrying the same request never duplicates a branch. */
export async function createBranch(db: SupabaseClient, restaurantId: string, id: string, input: BranchInput): Promise<RestaurantBranch> {
  uuid.parse(restaurantId); uuid.parse(id)
  const values = branchInputSchema.parse(input)
  const { error } = await db.from('restaurant_branches').upsert({ id, restaurant_id: restaurantId, ...values }, { onConflict: 'id', ignoreDuplicates: true })
  if (error?.code === '23505') throw new AppError('Ya hay una sede con ese nombre en este negocio.', 409, 'conflict')
  if (error) throw dbError(error, 'No pudimos confirmar el guardado. Conservamos los datos para reintentar.')
  const { data, error: readError } = await db.from('restaurant_branches').select(fields).eq('id', id).eq('restaurant_id', restaurantId).single()
  if (readError) throw dbError(readError, 'No pudimos consultar la sede guardada.', 'No pudimos crear la sede en ese negocio.')
  // A retry may carry corrected data while the first attempt already created the row (response lost).
  const stored = data as RestaurantBranch
  const changed = (Object.keys(values) as (keyof typeof values)[]).some(k => stored[k] !== values[k])
  return changed ? updateBranch(db, id, input) : stored
}

export async function updateBranch(db: SupabaseClient, branchId: string, input: BranchInput): Promise<RestaurantBranch> {
  uuid.parse(branchId)
  const values = branchInputSchema.parse(input)
  const { data, error } = await db.from('restaurant_branches').update(values).eq('id', branchId).select(fields).single()
  if (error?.code === '23505') throw new AppError('Ya hay una sede con ese nombre en este negocio.', 409, 'conflict')
  if (error) throw dbError(error, 'No pudimos guardar la sede.', notFound)
  return data as RestaurantBranch
}

export async function saveBranchLocation(db: SupabaseClient, branchId: string, location: BranchLocation): Promise<RestaurantBranch> {
  uuid.parse(branchId)
  const values = branchLocationSchema.parse(location)
  const { data, error } = await db.from('restaurant_branches').update(values).eq('id', branchId).select(fields).single()
  if (error) throw dbError(error, 'No pudimos confirmar la ubicación. Conservamos el punto para reintentar.', notFound)
  return data as RestaurantBranch
}

export async function saveBranchHours(db: SupabaseClient, branchId: string, hours: OpeningHours): Promise<RestaurantBranch> {
  uuid.parse(branchId)
  const opening_hours = openingHoursSchema.parse(hours)
  const { data, error } = await db.from('restaurant_branches').update({ opening_hours }).eq('id', branchId).select(fields).single()
  if (error) throw dbError(error, 'No pudimos guardar el horario.', notFound)
  return data as RestaurantBranch
}

/** Owner-only toggle via set_branch_published (supabase/migrations/20261002110000_branch_publish_and_public_menu.sql). */
export async function setBranchPublished(db: SupabaseClient, branchId: string, publish: boolean): Promise<RestaurantBranch['status']> {
  uuid.parse(branchId)
  const { data, error } = await db.rpc('set_branch_published', { p_branch_id: branchId, p_publish: publish })
  if (error?.hint === 'location') throw new AppError('Guarda la ubicación de la sede antes de publicarla.', 400, 'location_required')
  if (error?.hint === 'inactive') throw new AppError('Esta sede está suspendida. Contacta a AntojosGo.', 403, 'suspended')
  if (error) throw dbError(error, 'No pudimos cambiar la publicación.', notFound)
  return data as RestaurantBranch['status']
}
