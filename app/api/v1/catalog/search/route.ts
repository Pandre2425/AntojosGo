import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { listPublishedCatalog } from '@/modules/catalog/data/public-catalog'
import { catalogQuerySchema } from '@/shared/contracts/catalog-query'

/** Public: published branches only. Cached briefly at the edge; never personalized. */
export const GET = route(async (req, { db }) => {
  const params = catalogQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
  const items = await listPublishedCatalog(db, {
    query: params.q, limit: params.limit,
    location: params.lat !== undefined && params.lng !== undefined ? { latitude: params.lat, longitude: params.lng, radiusKm: params.radiusMeters / 1000 } : undefined,
  })
  return NextResponse.json({ items, count: items.length }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}, { auth: false })
