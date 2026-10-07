import { readJson, route } from '@/lib/server/api'
import { loadBranch, updateBranch } from '@/modules/restaurants/data/branches'
import { branchInputSchema } from '@/shared/contracts/branches'

export const GET = route(async (_req, { db, params }) => loadBranch(db, params.id))

export const PATCH = route(async (req, { db, params }) => updateBranch(db, params.id, await readJson(req, branchInputSchema)))
