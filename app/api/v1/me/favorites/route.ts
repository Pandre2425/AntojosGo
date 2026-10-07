import { route } from '@/lib/server/api'
import { listFavorites } from '@/modules/accounts/data/favorites'

export const GET = route(async (_req, { db }) => ({ items: await listFavorites(db) }))
