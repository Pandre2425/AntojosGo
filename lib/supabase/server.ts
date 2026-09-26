import { createClient } from "@supabase/supabase-js"
import 'server-only'
import { headers } from 'next/headers'

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export async function createServerClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase environment variables are not set.")
  }

  const authorization = (await headers()).get('authorization')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: authorization ? { Authorization: authorization } : {} },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
