import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { listBusinessTypes } from '@/modules/restaurants/data/owned-restaurants'

/** Public: business types in use (plus defaults), for suggestions and the diner filter. */
export const GET = route(async (_req, { db }) =>
  NextResponse.json({ items: await listBusinessTypes(db) }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' } }),
{ auth: false })
