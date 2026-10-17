import { readJson, route } from '@/lib/server/api'
import { reportReview } from '@/modules/catalog/data/reviews'
import { reportInputSchema } from '@/shared/contracts/reviews'

/** Restaurant reports an offensive review (it stays visible until reviewed). */
export const POST = route(async (req, { db, params }) => { await reportReview(db, params.id, (await readJson(req, reportInputSchema)).reason); return { ok: true } })
