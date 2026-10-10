import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { confirmRestaurantImage, removeRestaurantImage } from '@/modules/restaurants/data/brand-images'
import { mediaUrl } from '@/lib/server/images'

/** Step 2: checks the uploaded file's real format and links it as the logo or cover. */
export const PUT = route(async (req, { db, params }) => {
  const { path } = await readJson(req, z.object({ path: z.string() }))
  return { url: mediaUrl(await confirmRestaurantImage(db, params.id, params.kind, path)) }
})

export const DELETE = route(async (_req, { db, params }) => { await removeRestaurantImage(db, params.id, params.kind); return { url: null } })
