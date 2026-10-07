import { readJson, route } from '@/lib/server/api'
import { saveBranchLocation } from '@/modules/restaurants/data/branches'
import { branchLocationSchema } from '@/shared/contracts/branches'

export const PUT = route(async (req, { db, params }) => saveBranchLocation(db, params.id, await readJson(req, branchLocationSchema)))
