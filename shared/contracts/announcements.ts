import { z } from 'zod'
import { RELEASES_URL } from './app-version'

/** Android app download while it is not on Google Play (QR short link in public/descargar-apk-qr.png). */
export const APK_DOWNLOAD_URL = 'https://qr.codes/0Z1jMD'

// Like app-version.json: links may only point to our own downloads, whatever the server file says.
const ALLOWED_LINKS = [APK_DOWNLOAD_URL, RELEASES_URL, 'https://play.google.com/store/apps/']
const announcementSchema = z.object({
  id: z.string().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(80),
  body: z.string().max(400),
  for: z.enum(['web', 'app', 'all']).default('all'),
  link: z.object({ label: z.string().min(1).max(40), url: z.string().url().refine(u => ALLOWED_LINKS.some(a => u.startsWith(a)), 'Enlace no permitido') }).optional(),
})
export type Announcement = z.infer<typeof announcementSchema>

/** Valid notices for one platform, newest first. Invalid entries are skipped, never shown. */
export function parseAnnouncements(body: unknown, platform: 'web' | 'app'): Announcement[] {
  const list = Array.isArray(body) ? body : []
  return list.map(a => announcementSchema.safeParse(a)).flatMap(r => r.success ? [r.data] : [])
    .filter(a => a.for === 'all' || a.for === platform).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
}
