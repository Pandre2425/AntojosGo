import { readJson, route } from '@/lib/server/api'
import { moderateReview, moderationSchema } from '@/modules/admin/data/moderation'

/** Admins only: keep (clear the report), hide or unhide a review. */
export const POST = route(async (req, { db, params }) => { await moderateReview(db, params.id, (await readJson(req, moderationSchema)).action); return { ok: true } })
