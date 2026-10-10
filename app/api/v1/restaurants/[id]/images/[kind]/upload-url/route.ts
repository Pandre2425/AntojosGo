import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { prepareRestaurantImageUpload } from '@/modules/restaurants/data/brand-images'

/** Step 1 of a logo/cover upload: a short-lived signed URL to send the file straight to Storage. */
export const POST = route(async (req, { db, params }) => {
  const { contentType } = await readJson(req, z.object({ contentType: z.string() }))
  return prepareRestaurantImageUpload(db, params.id, params.kind, contentType)
})
