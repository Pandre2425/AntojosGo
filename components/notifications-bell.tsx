'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { parseAnnouncements, type Announcement } from '@/shared/contracts/announcements'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { t } from '@/shared/i18n'

const SEEN_KEY = 'antojosgo:seen-announcements'
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') } catch { return [] } }

/** Header bell: notices from public/announcements.json; a dot marks unseen ones (remembered in this browser). */
export default function NotificationsBell() {
  const [items, setItems] = useState<Announcement[]>([])
  const [seen, setSeen] = useState<string[]>([])
  useEffect(() => {
    setSeen(readSeen())
    fetch('/announcements.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).then(b => setItems(parseAnnouncements(b, 'web'))).catch(() => {})
  }, [])
  const unseen = items.filter(a => !seen.includes(a.id)).length
  function markSeen(open: boolean) {
    if (!open || !unseen) return
    const ids = items.map(a => a.id)
    setSeen(ids)
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)) } catch { /* private mode: dot returns next visit */ }
  }
  return <Popover onOpenChange={markSeen}>
    <PopoverTrigger aria-label={unseen ? t('Notificaciones, {n} sin leer', { n: unseen }) : t('Notificaciones')}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#173F35] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#173F35]">
      <Bell className="h-5 w-5" />
      {unseen > 0 && <span aria-hidden className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#BD481F] ring-2 ring-white" />}
    </PopoverTrigger>
    <PopoverContent align="end" className="w-80 p-0">
      <p className="border-b px-4 py-3 text-sm font-semibold">{t('Notificaciones')}</p>
      {items.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('No hay notificaciones.')}</p>
        : <ul className="max-h-96 divide-y overflow-y-auto">{items.map(a => <li key={a.id} className="space-y-1 px-4 py-3">
          <p className="text-sm font-semibold text-[#173F35]">{a.title}</p>
          <p className="text-sm text-stone-600">{a.body}</p>
          {a.link && <a href={a.link.url} target="_blank" rel="noreferrer" className="mt-1 inline-block rounded-lg bg-[#BD481F] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#9a3a18]">{a.link.label}</a>}
        </li>)}</ul>}
    </PopoverContent>
  </Popover>
}
