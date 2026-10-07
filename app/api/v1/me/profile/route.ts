import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { ensureAccountProfile } from '@/modules/accounts/data/account-profile'

/** Creates the account profile on first use (display name from sign-up); idempotent. */
export const PUT = route(async (req, { db, userId }) => {
  const { displayName } = await readJson(req, z.object({ displayName: z.string() }))
  return ensureAccountProfile(db, userId, displayName)
})
