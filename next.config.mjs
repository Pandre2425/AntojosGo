/** @type {import('next').NextConfig} */
const dev = process.env.NODE_ENV !== 'production'
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const tiles = (() => { try { return new URL((process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/').replace(/\{[a-z]\}/g, 'a')).origin } catch { return 'https://tile.openstreetmap.org' } })()
// ponytail: 'unsafe-inline' scripts because Next injects inline bootstrap scripts; switch to nonces via middleware if a stricter CSP is required.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase} ${tiles}`,
  `connect-src 'self' ${supabase} ${supabase.replace(/^http/, 'ws')}${dev ? ' ws:' : ''}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'Content-Security-Policy', value: csp },
        ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
      ] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
