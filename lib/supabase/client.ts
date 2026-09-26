import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createBoundedFetch } from '../bounded-fetch'

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a singleton instance of the Supabase client
let supabaseInstance: SupabaseClient | null = null

export function getSupabase() {
  if (!supabaseInstance && isSupabaseConfigured) {
    supabaseInstance = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { fetch: createBoundedFetch() },
    })
  }
  return supabaseInstance
}

export const supabase = getSupabase()
