import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, dbError } from '../../../lib/app-error'
import { BRAND_IMAGE_KINDS, type BrandImageKind } from '../../../shared/contracts/restaurants'
import { DISH_IMAGE_BUCKET as BUCKET, MAX_IMAGE_BYTES, imageContentTypeSchema, sniffImageType } from './dish-images'

// Same rules as dish photos (supabase/migrations/20261010090000_business_type_brand_images.sql):
// <restaurant_id>/brand/<random>.<ext>, set only through set_restaurant_image (path-checked).
const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
const uuid = z.string().uuid()
const kindSchema = z.enum(BRAND_IMAGE_KINDS, { errorMap: () => ({ message: 'Tipo de imagen no válido.' }) })
const notFound = 'No encontramos ese restaurante en tu cuenta.'
const column = (kind: BrandImageKind) => kind === 'logo' ? 'logo_path' : 'cover_path'

export async function prepareRestaurantImageUpload(db: SupabaseClient, restaurantId: string, kind: string, contentType: string) {
  uuid.parse(restaurantId); kindSchema.parse(kind)
  const type = imageContentTypeSchema.parse(contentType)
  const { error } = await db.from('restaurants').select('id').eq('id', restaurantId).single()
  if (error) throw dbError(error, 'No pudimos preparar la subida.', notFound)
  const path = `${restaurantId}/brand/${crypto.randomUUID().replace(/-/g, '')}.${ext[type]}`
  const { data, error: signError } = await db.storage.from(BUCKET).createSignedUploadUrl(path)
  if (signError || !data) throw new AppError('No pudimos preparar la subida de la imagen.', 503, 'unavailable')
  return { path, token: data.token, signedUrl: data.signedUrl, maxBytes: MAX_IMAGE_BYTES, contentType: type }
}

/** Verifies the uploaded bytes, then links the image (replacing the previous one). */
export async function confirmRestaurantImage(db: SupabaseClient, restaurantId: string, kind: string, path: string): Promise<string> {
  uuid.parse(restaurantId); const k = kindSchema.parse(kind); z.string().max(200).parse(path)
  const bucket = db.storage.from(BUCKET)
  const { data: previous } = await db.from('restaurants').select('logo_path, cover_path').eq('id', restaurantId).single()
  const { data: blob, error } = await bucket.download(path)
  if (error || !blob) throw new AppError('No encontramos la imagen subida. Intenta subirla de nuevo.', 400, 'invalid')
  if (blob.size > MAX_IMAGE_BYTES || !sniffImageType(new Uint8Array(await blob.slice(0, 16).arrayBuffer()))) {
    await bucket.remove([path])
    throw new AppError('El archivo no es una imagen JPG, PNG o WebP válida.', 400, 'invalid')
  }
  const { error: setError } = await db.rpc('set_restaurant_image', { p_restaurant_id: restaurantId, p_kind: k, p_path: path })
  if (setError?.code === '22023') throw new AppError('La imagen no corresponde a este restaurante.', 400, 'invalid')
  if (setError) throw dbError(setError, 'No pudimos guardar la imagen.', notFound)
  const old = (previous as Record<string, string | null> | null)?.[column(k)]
  if (old && old !== path) await bucket.remove([old]) // best effort
  return path
}

export async function removeRestaurantImage(db: SupabaseClient, restaurantId: string, kind: string): Promise<void> {
  uuid.parse(restaurantId); const k = kindSchema.parse(kind)
  const { data, error } = await db.from('restaurants').select('logo_path, cover_path').eq('id', restaurantId).single()
  if (error) throw dbError(error, 'No pudimos quitar la imagen.', notFound)
  const { error: setError } = await db.rpc('set_restaurant_image', { p_restaurant_id: restaurantId, p_kind: k, p_path: null })
  if (setError) throw dbError(setError, 'No pudimos quitar la imagen.', notFound)
  const old = (data as Record<string, string | null>)[column(k)]
  if (old) await db.storage.from(BUCKET).remove([old])
}
