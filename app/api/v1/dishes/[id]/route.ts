import { readJson, route } from '@/lib/server/api'
import { withImageUrl } from '@/lib/server/images'
import { removeDishImage } from '@/modules/restaurants/data/dish-images'
import { deleteDish, updateDish } from '@/modules/restaurants/data/menu'
import { dishPatchSchema } from '@/shared/contracts/menu'

export const PATCH = route(async (req, { db, params }) => withImageUrl(await updateDish(db, params.id, await readJson(req, dishPatchSchema))))

/** Deleting a dish also removes its photo from Storage. */
export const DELETE = route(async (_req, { db, params }) => {
  await removeDishImage(db, params.id)
  await deleteDish(db, params.id)
  return { ok: true }
})
