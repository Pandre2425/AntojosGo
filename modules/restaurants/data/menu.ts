import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import { dishInputSchema, dishPatchSchema, type Dish, type DishInput, type DishPatch } from '../../../shared/contracts/menu'

// RLS (food_owner_* policies) restricts every query to dishes of the caller's restaurants.
const fields = 'id,restaurant_id,name,price,category,description,status,is_available,image_url'
const uuid = z.string().uuid()
const notFound = 'No encontramos ese platillo en tu cuenta.'
const toDish = (row: Dish): Dish => ({ ...row, price: Number(row.price) })

// ponytail: no pagination, menus are tens of dishes; page like listBranches if one passes ~200.
export async function listDishes(db: SupabaseClient, restaurantId: string): Promise<Dish[]> {
  uuid.parse(restaurantId)
  const { data, error } = await db.from('foods').select(fields).eq('restaurant_id', restaurantId)
    .order('category', { nullsFirst: false }).order('name').order('id').limit(200)
  if (error) throw dbError(error, 'No pudimos cargar el menú.')
  return (data as Dish[]).map(toDish)
}

export async function createDish(db: SupabaseClient, restaurantId: string, input: DishInput): Promise<Dish> {
  uuid.parse(restaurantId)
  const values = dishInputSchema.parse(input)
  const { data, error } = await db.from('foods').insert({ restaurant_id: restaurantId, ...values }).select(fields).single()
  // RLS rejects inserts into someone else's restaurant with 42501.
  if (error?.code === '42501') throw new AppError('No encontramos ese restaurante en tu cuenta.', 404, 'not_found')
  if (error) throw dbError(error, 'No pudimos guardar el platillo.')
  return toDish(data as Dish)
}

// .single() fails when RLS hides the row, so a foreign dish is reported as not found, never as success.
export async function updateDish(db: SupabaseClient, dishId: string, patch: DishPatch): Promise<Dish> {
  uuid.parse(dishId)
  const values = dishPatchSchema.parse(patch)
  if (!Object.keys(values).length) throw new AppError('No hay cambios para guardar.', 400, 'invalid')
  const { data, error } = await db.from('foods').update(values).eq('id', dishId).select(fields).single()
  if (error) throw dbError(error, 'No pudimos actualizar el platillo.', notFound)
  return toDish(data as Dish)
}

export async function deleteDish(db: SupabaseClient, dishId: string): Promise<void> {
  uuid.parse(dishId)
  const { data, error } = await db.from('foods').delete().eq('id', dishId).select('id')
  if (error) throw dbError(error, 'No pudimos eliminar el platillo.', notFound)
  if (!data?.length) throw new AppError(notFound, 404, 'not_found')
}
