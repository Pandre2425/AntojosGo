import { getSupabase } from '../../../lib/supabase/client'
import { displayNameSchema } from '../../../shared/contracts/names'
import { businessProfileSchema, type BusinessProfileInput, type BusinessProfile, type OwnedRestaurant } from '../../../shared/contracts/restaurants'

function client() {
  const value = getSupabase()
  if (!value) throw new Error('El servicio de cuentas no está configurado.')
  return value
}

export async function loadBusinessProfile(userId: string, restaurantId: string, signal: AbortSignal): Promise<BusinessProfile> {
  const { data, error } = await client().from('restaurants').select('id, name, auth_owner_id, description')
    .eq('auth_owner_id', userId).eq('id', restaurantId).abortSignal(signal).single()
  if (error) throw new Error('No pudimos cargar el perfil. Comprueba tu conexión e intenta nuevamente.')
  return data as BusinessProfile
}

export async function saveBusinessProfile(userId: string, restaurantId: string, input: BusinessProfileInput, signal: AbortSignal): Promise<BusinessProfile> {
  const values = businessProfileSchema.parse(input)
  const { data, error } = await client().from('restaurants').update(values)
    .eq('auth_owner_id', userId).eq('id', restaurantId)
    .select('id, name, auth_owner_id, description').abortSignal(signal).single()
  if (error?.code === '23505') throw new Error('Ya tienes otro restaurante con ese nombre.')
  if (error) throw new Error('No pudimos confirmar el guardado. Conservamos tus cambios; puedes volver a intentar.')
  return data as BusinessProfile
}
export async function listOwnedRestaurants(userId: string): Promise<OwnedRestaurant[]> {
  const { data, error } = await client().from('restaurants').select('id, name, auth_owner_id').eq('auth_owner_id', userId).order('created_at').limit(50)
  if (error) throw new Error('No pudimos cargar tus restaurantes. Tu sesión sigue activa.')
  return data as OwnedRestaurant[]
}

export async function createOwnedRestaurant(userId: string, name: string): Promise<OwnedRestaurant> {
  const restaurantName = displayNameSchema.parse(name)
  const db = client()
  const { error } = await db.from('restaurants').upsert({ auth_owner_id: userId, name: restaurantName }, { onConflict: 'auth_owner_id,name', ignoreDuplicates: true })
  if (error) throw new Error('No pudimos guardar el restaurante. Puedes reintentar sin crear duplicados.')
  const { data, error: readError } = await db.from('restaurants').select('id, name, auth_owner_id').eq('auth_owner_id', userId).eq('name', restaurantName).single()
  if (readError) throw new Error('No pudimos cargar el restaurante guardado. Intenta nuevamente.')
  return data as OwnedRestaurant
}
