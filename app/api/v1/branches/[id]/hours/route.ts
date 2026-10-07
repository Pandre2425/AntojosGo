import { readJson, route } from '@/lib/server/api'
import { saveBranchHours } from '@/modules/restaurants/data/branches'
import { openingHoursSchema } from '@/shared/contracts/hours'

export const PUT = route(async (req, { db, params }) => saveBranchHours(db, params.id, await readJson(req, openingHoursSchema)))
