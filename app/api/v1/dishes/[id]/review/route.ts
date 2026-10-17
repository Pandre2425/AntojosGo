import { readJson, route } from '@/lib/server/api'
import { deleteMyReview, getMyReview, saveMyReview } from '@/modules/catalog/data/reviews'
import { reviewInputSchema } from '@/shared/contracts/reviews'

/** The signed-in user's own review of this dish. */
export const GET = route(async (_req, { db, params }) => ({ item: await getMyReview(db, params.id) }))
export const PUT = route(async (req, { db, params }) => saveMyReview(db, params.id, await readJson(req, reviewInputSchema)))
export const DELETE = route(async (_req, { db, params }) => { await deleteMyReview(db, params.id); return { ok: true } })
