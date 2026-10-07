import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { prepareDishImageUpload } from '@/modules/restaurants/data/dish-images'

/** Step 1 of a photo upload: a short-lived signed URL to send the file straight to Storage. */
export const POST = route(async (req, { db, params }) => {
  const { contentType } = await readJson(req, z.object({ contentType: z.string() }))
  return prepareDishImageUpload(db, params.id, contentType)
})
