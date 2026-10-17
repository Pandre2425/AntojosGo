import { route } from '@/lib/server/api'
import { listOwnerReviews } from '@/modules/catalog/data/reviews'

/** Owner panel: reviews of every dish of the restaurant. */
export const GET = route(async (req, { db, params }) =>
  listOwnerReviews(db, params.id, Math.min(Math.max(Number(req.nextUrl.searchParams.get('page')) || 0, 0), 50)))
