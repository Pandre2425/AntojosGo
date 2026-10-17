import { route } from '@/lib/server/api'
import { listReportedReviews } from '@/modules/admin/data/moderation'

/** Admins only: reported and hidden reviews. */
export const GET = route(async (_req, { db }) => ({ items: await listReportedReviews(db) }))
