import { readJson, route } from '@/lib/server/api'
import { loadBusinessProfile, saveBusinessProfile } from '@/modules/restaurants/data/owned-restaurants'
import { businessProfileSchema } from '@/shared/contracts/restaurants'
import { withBrandUrls } from '@/lib/server/images'

export const GET = route(async (_req, { db, userId, params }) => withBrandUrls(await loadBusinessProfile(db, userId, params.id)))

export const PATCH = route(async (req, { db, userId, params }) =>
  withBrandUrls(await saveBusinessProfile(db, userId, params.id, await readJson(req, businessProfileSchema))))
