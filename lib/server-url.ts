/** Accepts "10.0.0.5:3000" or "http(s)://host[:port][/...]"; returns a clean origin, or null if invalid. */
export function normalizeServerUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) && !/^https?:\/\//i.test(text)) return null
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `http://${text}`)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null
    return `${url.protocol}//${url.host}`
  } catch { return null }
}
