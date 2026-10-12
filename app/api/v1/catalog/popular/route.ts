import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { popularOptions } from '@/modules/catalog/data/popular'

/** Public: home shortcuts (symbol + title), most searched first. */
export const GET = route(async (_req, { db }) =>
  NextResponse.json({ items: await popularOptions(db) }, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=900' } }),
{ auth: false })
