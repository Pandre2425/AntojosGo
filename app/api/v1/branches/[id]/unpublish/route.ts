import { route } from '@/lib/server/api'
import { setBranchPublished } from '@/modules/restaurants/data/branches'

export const POST = route(async (_req, { db, params }) => ({ status: await setBranchPublished(db, params.id, false) }))
