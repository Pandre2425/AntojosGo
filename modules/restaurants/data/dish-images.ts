import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'

// Storage layout and rules: supabase/migrations/20261003090000_dish_images.sql
export const DISH_IMAGE_BUCKET = 'restaurant-media'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
export const imageContentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'], { errorMap: () => ({ message: 'Usa una imagen JPG, PNG o WebP.' }) })
const uuid = z.string().uuid()

/** Public URL for a stored object path, or null. */
export function dishImageUrl(supabaseUrl: string, path: string | null | undefined): string | null {
  return path ? `${supabaseUrl}/storage/v1/object/public/${DISH_IMAGE_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}` : null
}

/** Detects the real format from the first bytes; never trust the declared type or extension. */
export function sniffImageType(bytes: Uint8Array): keyof typeof types | null {
  const b = bytes
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png'
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

/** Step 1: returns a short-lived signed URL to upload directly to Storage (the file never passes through the API). */
export async function prepareDishImageUpload(db: SupabaseClient, dishId: string, contentType: string) {
  uuid.parse(dishId)
  const type = imageContentTypeSchema.parse(contentType)
  const { data: dish, error } = await db.from('foods').select('id, restaurant_id').eq('id', dishId).single()
  if (error) throw dbError(error, 'No pudimos preparar la subida.', 'No encontramos ese platillo en tu cuenta.')
  const path = `${dish.restaurant_id}/dishes/${dish.id}/${crypto.randomUUID().replace(/-/g, '')}.${types[type]}`
  const { data, error: signError } = await db.storage.from(DISH_IMAGE_BUCKET).createSignedUploadUrl(path)
  if (signError || !data) throw new AppError('No pudimos preparar la subida de la foto.', 503, 'unavailable')
  return { path, token: data.token, signedUrl: data.signedUrl, maxBytes: MAX_IMAGE_BYTES, contentType: type }
}

/** Step 2: verifies the uploaded bytes, then links the photo to the dish (replacing any previous one). */
export async function confirmDishImage(db: SupabaseClient, dishId: string, path: string): Promise<string> {
  uuid.parse(dishId)
  z.string().max(200).parse(path)
  const bucket = db.storage.from(DISH_IMAGE_BUCKET)
  const { data: previous } = await db.from('foods').select('image_url').eq('id', dishId).single()
  const { data: blob, error } = await bucket.download(path)
  if (error || !blob) throw new AppError('No encontramos la foto subida. Intenta subirla de nuevo.', 400, 'invalid')
  if (blob.size > MAX_IMAGE_BYTES || !sniffImageType(new Uint8Array(await blob.slice(0, 16).arrayBuffer()))) {
    await bucket.remove([path])
    throw new AppError('El archivo no es una imagen JPG, PNG o WebP válida.', 400, 'invalid')
  }
  const { error: setError } = await db.rpc('set_dish_image', { p_dish_id: dishId, p_path: path })
  if (setError?.code === '22023') throw new AppError('La foto no corresponde a este platillo.', 400, 'invalid')
  if (setError) throw dbError(setError, 'No pudimos guardar la foto.', 'No encontramos ese platillo en tu cuenta.')
  if (previous?.image_url && previous.image_url !== path) await bucket.remove([previous.image_url]) // best effort
  return path
}

export async function removeDishImage(db: SupabaseClient, dishId: string): Promise<void> {
  uuid.parse(dishId)
  const { data: dish, error } = await db.from('foods').select('image_url').eq('id', dishId).single()
  if (error) throw dbError(error, 'No pudimos quitar la foto.', 'No encontramos ese platillo en tu cuenta.')
  const { error: setError } = await db.rpc('set_dish_image', { p_dish_id: dishId, p_path: null })
  if (setError) throw dbError(setError, 'No pudimos quitar la foto.', 'No encontramos ese platillo en tu cuenta.')
  if (dish.image_url) await db.storage.from(DISH_IMAGE_BUCKET).remove([dish.image_url])
}
