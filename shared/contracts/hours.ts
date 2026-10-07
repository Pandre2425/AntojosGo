import { z } from 'zod'

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato HH:MM, por ejemplo 08:30.')

/** One opening range. close <= open means it ends after midnight (e.g. 18:00–02:00). */
export const hoursRangeSchema = z.object({ day: z.number().int().min(0).max(6), open: time, close: time })
  .refine(r => r.open !== r.close, 'La hora de apertura y la de cierre no pueden ser iguales.')
export const openingHoursSchema = z.array(hoursRangeSchema).max(21)
export type HoursRange = z.infer<typeof hoursRangeSchema>
export type OpeningHours = HoursRange[]

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

// ponytail: fixed UTC-6 (Guatemala has no DST); store a time zone per branch if the app expands abroad.
const GUATEMALA_OFFSET_MIN = -6 * 60

/** null when the branch has no hours registered (unknown, not "closed"). */
export function isOpenNow(hours: OpeningHours, now = new Date()): boolean | null {
  if (!hours.length) return null
  const local = new Date(now.getTime() + GUATEMALA_OFFSET_MIN * 60_000)
  const day = local.getUTCDay()
  const t = local.getUTCHours() * 60 + local.getUTCMinutes()
  const yesterday = (day + 6) % 7
  return hours.some(r => {
    const open = minutes(r.open), close = minutes(r.close)
    if (close > open) return r.day === day && t >= open && t < close
    return (r.day === day && t >= open) || (r.day === yesterday && t < close)
  })
}

/** One line per day, in week order starting Monday: "Lunes: 08:00–14:00, 17:00–22:00" or "Lunes: Cerrado". */
export function describeHours(hours: OpeningHours): string[] {
  return [1, 2, 3, 4, 5, 6, 0].map(day => {
    const ranges = hours.filter(r => r.day === day).sort((a, b) => a.open.localeCompare(b.open))
    return `${DAY_NAMES[day]}: ${ranges.length ? ranges.map(r => `${r.open}–${r.close}`).join(', ') : 'Cerrado'}`
  })
}

/** Editor model: one range per day, Monday first. */
export type DayForm = { day: number; open: string; close: string; closed: boolean }[]
export const toDayForm = (hours: OpeningHours): DayForm => [1, 2, 3, 4, 5, 6, 0].map(day => {
  const r = hours.find(h => h.day === day)
  return r ? { day, open: r.open, close: r.close, closed: false } : { day, open: '08:00', close: '17:00', closed: true }
})
export const fromDayForm = (form: DayForm) => openingHoursSchema.safeParse(form.filter(d => !d.closed).map(({ day, open, close }) => ({ day, open: open.trim(), close: close.trim() })))
