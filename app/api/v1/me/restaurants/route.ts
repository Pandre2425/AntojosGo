import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { createOwnedRestaurant, listOwnedRestaurants } from '@/modules/restaurants/data/owned-restaurants'

export const GET = route(async (_req, { db, userId }) => ({ items: await listOwnedRestaurants(db, userId) }))

export const POST = route(async (req, { db, userId }) => {
  const { name } = await readJson(req, z.object({ name: z.string() }))
  return createOwnedRestaurant(db, userId, name)
})
