import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { api } from './api'
import { supabase } from './supabase'

const MAX_SIDE = 1200
type Target = { path: string; token: string; maxBytes: number }
type Mime = 'image/jpeg' | 'image/png'

/**
 * Same flow as the web (lib/web-image-upload.ts): pick → resize and re-encode to JPEG
 * (drops EXIF, including GPS) → signed URL → direct upload to Storage → server verification.
 * Returns false when the user cancels.
 */
export const pickAndUploadDishPhoto = (dishId: string) =>
  pickAndUpload(type => api.prepareDishImage(dishId, type), path => api.confirmDishImage(dishId, path))

/** Logo (square crop, PNG keeps transparency) or cover photo of a restaurant. */
export const pickAndUploadRestaurantImage = (restaurantId: string, kind: 'logo' | 'cover') =>
  pickAndUpload(type => api.prepareRestaurantImage(restaurantId, kind, type), path => api.confirmRestaurantImage(restaurantId, kind, path),
    kind === 'logo' ? [1, 1] : [16, 9], kind === 'logo' ? 'image/png' : 'image/jpeg')

async function pickAndUpload(prepare: (type: Mime) => Promise<Target>, confirm: (path: string) => Promise<unknown>, aspect?: [number, number], type: Mime = 'image/jpeg'): Promise<boolean> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, ...(aspect ? { allowsEditing: true, aspect } : {}) })
  if (picked.canceled || !picked.assets[0]) return false
  const asset = picked.assets[0]
  const context = ImageManipulator.manipulate(asset.uri)
  if (Math.max(asset.width, asset.height) > MAX_SIDE) context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE })
  const image = await (await context.renderAsync()).saveAsync({ format: type === 'image/png' ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.85, base64: true })
  if (!image.base64) throw new Error('No pudimos procesar la imagen.')
  const bytes = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0))
  const target = await prepare(type)
  if (bytes.byteLength > target.maxBytes) throw new Error('La imagen es demasiado grande (máx. 5 MB).')
  if (!supabase) throw new Error('Servicio no configurado.')
  const { error } = await supabase.storage.from('restaurant-media').uploadToSignedUrl(target.path, target.token, bytes.buffer, { contentType: type })
  if (error) throw new Error('No pudimos subir la foto. Intenta de nuevo.')
  await confirm(target.path)
  return true
}
