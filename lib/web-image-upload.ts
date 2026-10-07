'use client'
import { getSupabase } from './supabase/client'
import { webApi } from './web-api'

const MAX_SIDE = 1200

/** Downscales and re-encodes to JPEG in the browser. Re-encoding also drops EXIF (incl. GPS location). */
async function toJpeg(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('No pudimos leer esa imagen. Prueba con JPG o PNG.') })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('No pudimos procesar la imagen.')
  return blob
}

/** Full flow: resize → signed URL → direct upload to Storage → server-side verification. Returns the public URL. */
export async function uploadDishImage(dishId: string, file: File): Promise<string> {
  const jpeg = await toJpeg(file)
  const target = await webApi.prepareDishImage(dishId, 'image/jpeg')
  if (jpeg.size > target.maxBytes) throw new Error('La imagen sigue siendo demasiado grande (máx. 5 MB).')
  const storage = getSupabase()?.storage.from('restaurant-media')
  if (!storage) throw new Error('Servicio no configurado.')
  const { error } = await storage.uploadToSignedUrl(target.path, target.token, jpeg, { contentType: 'image/jpeg' })
  if (error) throw new Error('No pudimos subir la foto. Intenta de nuevo.')
  return (await webApi.confirmDishImage(dishId, target.path)).image_url
}
