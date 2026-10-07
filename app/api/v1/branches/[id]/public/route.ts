import { NextResponse } from 'next/server'
import { AppError } from '@/lib/app-error'
import { route } from '@/lib/server/api'
import { publicDishWithImage } from '@/lib/server/images'
import { getPublicMenu, getPublishedBranch } from '@/modules/catalog/data/public-catalog'

/** Public detail: branch and its published menu in one round trip. */
export const GET = route(async (_req, { db, params }) => {
  const [branch, menu] = await Promise.all([getPublishedBranch(db, params.id), getPublicMenu(db, params.id)])
  if (!branch) throw new AppError('Esta sede no está publicada o no existe.', 404, 'not_found')
  return NextResponse.json({ branch, menu: menu.map(publicDishWithImage) }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}, { auth: false })
