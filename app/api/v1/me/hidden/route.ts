import { route } from '@/lib/server/api'
import { listHidden } from '@/modules/accounts/data/hidden'

/** «No me interesa»: the diner's hidden restaurants, newest first. */
export const GET = route(async (_req, { db }) => ({ items: await listHidden(db) }))
