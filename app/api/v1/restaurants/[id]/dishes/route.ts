import { readJson, route } from '@/lib/server/api'
import { withImageUrl } from '@/lib/server/images'
import { createDish, listDishes } from '@/modules/restaurants/data/menu'
import { dishInputSchema } from '@/shared/contracts/menu'

export const GET = route(async (_req, { db, params }) => ({ items: (await listDishes(db, params.id)).map(withImageUrl) }))

export const POST = route(async (req, { db, params }) => withImageUrl(await createDish(db, params.id, await readJson(req, dishInputSchema))))
