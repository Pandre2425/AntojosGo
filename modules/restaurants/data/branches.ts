import { getSupabase } from '../../../lib/supabase/client'
import { branchInputSchema, branchPageSize, type BranchInput, type RestaurantBranch } from '../../../shared/contracts/branches'
import { z } from 'zod'
import { branchLocationSchema, type BranchLocation } from '../../../shared/contracts/branches'

export async function saveBranchLocation(restaurantId: string, branchId: string, location: BranchLocation): Promise<RestaurantBranch> {
  z.string().uuid().parse(restaurantId)
  z.string().uuid().parse(branchId)
  const values = branchLocationSchema.parse(location)
  const { data, error } = await client().from('restaurant_branches').update(values)
    .eq('id', branchId).eq('restaurant_id', restaurantId).select(fields).single()
  if (error) throw new Error('No pudimos confirmar la ubicación. Conservamos el punto para reintentar.')
  return data as RestaurantBranch
}

const fields = 'id,restaurant_id,name,department,municipality,address,status,latitude,longitude'
export async function loadBranch(branchId: string): Promise<RestaurantBranch> {
  z.string().uuid().parse(branchId)
  const { data, error } = await client().from('restaurant_branches').select(fields).eq('id', branchId).single()
  if (error) throw new Error('No pudimos cargar la sede. Revisa tu acceso y conexión.')
  return data as RestaurantBranch
}
function client() {
  const db = getSupabase()
  if (!db) throw new Error('Servicio no configurado.')
  return db
}
export async function listBranches(restaurantId: string, page = 0): Promise<{ items: RestaurantBranch[]; hasMore: boolean }> {
  z.string().uuid().parse(restaurantId)
  z.number().int().min(0).max(10000).parse(page)
  const start = page * branchPageSize
  const { data, error } = await client().from('restaurant_branches').select(fields).eq('restaurant_id', restaurantId)
    .order('created_at').order('id').range(start, start + branchPageSize)
  if (error) throw new Error('No pudimos cargar las sedes. Puedes reintentar.')
  return { items: (data || []).slice(0, branchPageSize) as RestaurantBranch[], hasMore: (data || []).length > branchPageSize }
}
export async function createBranch(restaurantId: string, id: string, input: BranchInput): Promise<RestaurantBranch> {
  z.string().uuid().parse(restaurantId); z.string().uuid().parse(id)
  const values = branchInputSchema.parse(input)
  const db = client()
  const { error } = await db.from('restaurant_branches').upsert({ id, restaurant_id: restaurantId, ...values }, { onConflict: 'id', ignoreDuplicates: true })
  if (error?.code === '23505') throw new Error('Ya hay una sede con ese nombre en este negocio.')
  if (error) throw new Error('No pudimos confirmar el guardado. Conservamos los datos para reintentar.')
  const { data, error: readError } = await db.from('restaurant_branches').select(fields).eq('id', id).eq('restaurant_id', restaurantId).single()
  if (readError) throw new Error('No pudimos consultar la sede guardada. Reintenta para comprobarla.')
  return data as RestaurantBranch
}
