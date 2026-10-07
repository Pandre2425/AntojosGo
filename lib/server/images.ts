import 'server-only'
import { dishImageUrl } from '../../modules/restaurants/data/dish-images'
import { supabaseUrl } from '../supabase/config'

/** Replaces a dish's stored image path with its public URL. */
export const withImageUrl = <T extends { image_url?: string | null }>(dish: T): T => ({ ...dish, image_url: dishImageUrl(supabaseUrl, dish.image_url) })

/** Public menu rows carry `image_path`; expose only the public URL. */
export const publicDishWithImage = <T extends { image_path?: string | null }>({ image_path, ...dish }: T) =>
  ({ ...dish, image_url: dishImageUrl(supabaseUrl, image_path) })
