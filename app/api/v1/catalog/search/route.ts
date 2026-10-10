import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { listPublishedCatalog } from '@/modules/catalog/data/public-catalog'
import { catalogQuerySchema } from '@/shared/contracts/catalog-query'
import { mediaUrl } from '@/lib/server/images'

/** Public: published branches only. Cached briefly at the edge; never personalized. */
export const GET = route(async (req, { db }) => {
  const params = catalogQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
  const items = await listPublishedCatalog(db, {
    query: params.q, limit: params.limit,
    location: params.lat !== undefined && params.lng !== undefined ? { latitude: params.lat, longitude: params.lng, radiusKm: params.radiusMeters / 1000 } : undefined,
    category: params.category, tags: params.tags, without: params.without, avoid: params.avoid, openNow: params.openNow, sort: params.sort,
  })
  return NextResponse.json({ items: items.map(i => ({ ...i, logo_url: mediaUrl(i.logo_url) })), count: items.length }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}, { auth: false })
