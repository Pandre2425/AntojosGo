import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { dishImageUrl, confirmDishImage, removeDishImage } from '@/modules/restaurants/data/dish-images'
import { supabaseUrl } from '@/lib/supabase/config'

/** Step 2: checks the uploaded file's real format and links it to the dish. */
export const PUT = route(async (req, { db, params }) => {
  const { path } = await readJson(req, z.object({ path: z.string() }))
  return { image_url: dishImageUrl(supabaseUrl, await confirmDishImage(db, params.id, path)) }
})

export const DELETE = route(async (_req, { db, params }) => { await removeDishImage(db, params.id); return { image_url: null } })
