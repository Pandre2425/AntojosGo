import 'server-only'
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Per-IP request limits, counted in Postgres (supabase/migrations/20261020090000_rate_limits.sql) so every
// serverless instance shares them. The IP is never stored: only a salted hash. Set RATE_LIMIT_SALT in Vercel to a
// random secret so nobody can compute someone else's key. If the counter fails, the request goes through.
export type RateLimit = { bucket: 'api' | 'search' | 'ai'; max: number; windowSeconds?: number }
export const DEFAULT_LIMIT: RateLimit = { bucket: 'api', max: 120 }

const salt = process.env.RATE_LIMIT_SALT?.trim() || `antojosgo:${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`

/** Client IP as seen by Vercel (x-real-ip), else the first x-forwarded-for hop. */
export function clientIp(request: NextRequest): string {
  return request.headers.get('x-real-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export const rateKey = (bucket: string, ip: string) => `${bucket}:${createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32)}`

/** True while this client is within the limit. */
export async function withinLimit(db: SupabaseClient, request: NextRequest, limit: RateLimit): Promise<boolean> {
  const { data, error } = await db.rpc('rate_limit_hit', { p_key: rateKey(limit.bucket, clientIp(request)), p_window_seconds: limit.windowSeconds ?? 60, p_max: limit.max })
  if (error) { console.error('[rate-limit] unavailable:', error.code); return true }
  return data !== false
}
