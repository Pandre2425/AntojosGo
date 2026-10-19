import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { listDishReviews } from '@/modules/catalog/data/reviews'
import { translateReviews } from '@/lib/server/translate'
import { currentLang } from '@/shared/i18n'

/** Public: anonymous reviews of a published dish, 20 per page. */
export const GET = route(async (req, { db, params }) => {
  const page = Math.min(Math.max(Number(req.nextUrl.searchParams.get('page')) || 0, 0), 50)
  const list = await listDishReviews(db, params.id, page)
  const { items, translated } = currentLang() === 'en' ? await translateReviews(list.items) : { items: list.items, translated: false }
  return NextResponse.json({ ...list, items, translated }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}, { auth: false })
