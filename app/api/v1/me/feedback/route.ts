import { readJson, route } from '@/lib/server/api'
import { feedbackInputSchema } from '@/shared/contracts/feedback'
import { getMyFeedback, saveMyFeedback } from '@/modules/accounts/data/feedback'

export const GET = route(async (_req, { db }) => ({ item: await getMyFeedback(db) }))
export const PUT = route(async (req, { db }) => saveMyFeedback(db, await readJson(req, feedbackInputSchema)))
