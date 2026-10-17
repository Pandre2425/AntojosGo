import { route } from '@/lib/server/api'
import { hideRestaurant, unhideRestaurant } from '@/modules/accounts/data/hidden'

export const PUT = route(async (_req, { db, params }) => { await hideRestaurant(db, params.restaurantId); return { ok: true } })
export const DELETE = route(async (_req, { db, params }) => { await unhideRestaurant(db, params.restaurantId); return { ok: true } })
