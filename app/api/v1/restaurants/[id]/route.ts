import { readJson, route } from '@/lib/server/api'
import { loadBusinessProfile, saveBusinessProfile } from '@/modules/restaurants/data/owned-restaurants'
import { businessProfileSchema } from '@/shared/contracts/restaurants'

export const GET = route(async (_req, { db, userId, params }) => loadBusinessProfile(db, userId, params.id))

export const PATCH = route(async (req, { db, userId, params }) =>
  saveBusinessProfile(db, userId, params.id, await readJson(req, businessProfileSchema)))
