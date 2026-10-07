import { z } from 'zod'

// Only this repository's releases may be offered, whatever the server returns:
// a tampered app-version.json cannot send testers to another download.
export const RELEASES_URL = 'https://github.com/Pandre2425/AntojosGo/releases/'
export const appVersionSchema = z.object({
  versionCode: z.number().int().positive(),
  version: z.string().max(20),
  url: z.string().url().startsWith(RELEASES_URL),
  notes: z.string().max(500).default(''),
})
export type AppVersion = z.infer<typeof appVersionSchema>

/** The newer release to offer, or null (invalid manifest or not newer). */
export function newerRelease(body: unknown, currentVersionCode: number): AppVersion | null {
  const parsed = appVersionSchema.safeParse(body)
  return parsed.success && parsed.data.versionCode > currentVersionCode ? parsed.data : null
}
