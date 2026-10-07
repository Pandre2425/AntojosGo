import { z } from 'zod'
import { AppError } from '@/lib/app-error'
import { readJson, route } from '@/lib/server/api'
import { createBranch, listBranches } from '@/modules/restaurants/data/branches'
import { branchInputSchema } from '@/shared/contracts/branches'

export const GET = route(async (req, { db, params }) => {
  const page = z.coerce.number().int().min(0).max(10000).catch(0).parse(req.nextUrl.searchParams.get('page') ?? 0)
  return listBranches(db, params.id, page)
})

/** Requires an Idempotency-Key (UUID): retries of the same request return the same branch. */
export const POST = route(async (req, { db, params }) => {
  const key = req.headers.get('idempotency-key')
  if (!key || !z.string().uuid().safeParse(key).success) throw new AppError('Falta la cabecera Idempotency-Key (UUID).', 400, 'invalid')
  return createBranch(db, params.id, key, await readJson(req, branchInputSchema))
})
