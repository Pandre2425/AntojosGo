import { route } from '@/lib/server/api'
import { addFavorite, removeFavorite } from '@/modules/accounts/data/favorites'

export const PUT = route(async (_req, { db, params }) => addFavorite(db, params.branchId))

export const DELETE = route(async (_req, { db, params }) => removeFavorite(db, params.branchId))
