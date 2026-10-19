import { NextResponse } from 'next/server'
import { AppError } from '@/lib/app-error'
import { route } from '@/lib/server/api'
import { publicDishWithImage, withBrandUrls } from '@/lib/server/images'
import { getPublicBranchExtras, getPublicMenu, getPublishedBranch } from '@/modules/catalog/data/public-catalog'
import { translateBranchAndMenu } from '@/lib/server/translate'
import { currentLang } from '@/shared/i18n'

/** Public detail: branch and its published menu in one round trip. */
export const GET = route(async (_req, { db, params }) => {
  const [branch, menu, extras] = await Promise.all([getPublishedBranch(db, params.id), getPublicMenu(db, params.id), getPublicBranchExtras(db, params.id)])
  if (!branch) throw new AppError('Esta sede no está publicada o no existe.', 404, 'not_found')
  // In English, restaurant-written text is machine-translated (cached); the response says so.
  const content = currentLang() === 'en' ? await translateBranchAndMenu({ ...branch, ...extras }, menu) : { branch: { ...branch, ...extras }, menu, translated: false }
  return NextResponse.json({ branch: withBrandUrls(content.branch), menu: content.menu.map(publicDishWithImage), translated: content.translated }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
}, { auth: false })
