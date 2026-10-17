import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { listDishReviews } from '@/modules/catalog/data/reviews'

/** Public: anonymous reviews of a published dish, 20 per page. */
export const GET = route(async (req, { db, params }) => {
  const page = Math.min(Math.max(Number(req.nextUrl.searchParams.get('page')) || 0, 0), 50)
  return NextResponse.json(await listDishReviews(db, params.id, page), { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}, { auth: false })
