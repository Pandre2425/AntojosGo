import 'server-only'
import { dishImageUrl } from '../../modules/restaurants/data/dish-images'
import { supabaseUrl } from '../supabase/config'

/** Public URL of any object in the restaurant media bucket (dish photos, logos, covers). */
export const mediaUrl = (path: string | null | undefined) => dishImageUrl(supabaseUrl, path)

/** Restaurant profile: logo/cover storage paths -> public URLs. */
export const withBrandUrls = <T extends { logo_url?: string | null; cover_url?: string | null }>(r: T): T =>
  ({ ...r, logo_url: mediaUrl(r.logo_url), cover_url: mediaUrl(r.cover_url) })

/** Replaces a dish's stored image path with its public URL. */
export const withImageUrl = <T extends { image_url?: string | null }>(dish: T): T => ({ ...dish, image_url: dishImageUrl(supabaseUrl, dish.image_url) })

/** Public menu rows carry `image_path`; expose only the public URL. */
export const publicDishWithImage = <T extends { image_path?: string | null }>({ image_path, ...dish }: T) =>
  ({ ...dish, image_url: dishImageUrl(supabaseUrl, image_path) })
