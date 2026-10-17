import { readJson, route } from '@/lib/server/api'
import { replyToReview } from '@/modules/catalog/data/reviews'
import { replyInputSchema } from '@/shared/contracts/reviews'

/** Restaurant's public reply; an empty text removes it. */
export const PUT = route(async (req, { db, params }) => { await replyToReview(db, params.id, (await readJson(req, replyInputSchema)).reply); return { ok: true } })
