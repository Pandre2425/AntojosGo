import { z } from 'zod'
import { readJson, route } from '@/lib/server/api'
import { runAdmin } from '@/modules/admin/data/admin'

/** Superadmin panel: one POST per action; the database re-checks admin + second factor on every call. */
export const POST = route(async (req, { db, params }) => ({ result: await runAdmin(db, params.action, await readJson(req, z.record(z.unknown()))) }))
