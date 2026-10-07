import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createBoundedFetch } from '../bounded-fetch'
import { isSupabaseConfigured, supabaseUrl, supabasePublicKey } from './config'

// Check if Supabase environment variables are available
export { isSupabaseConfigured } from './config'

// Create a singleton instance of the Supabase client
let supabaseInstance: SupabaseClient | null = null

export function getSupabase() {
  if (!supabaseInstance && isSupabaseConfigured) {
    supabaseInstance = createClient(supabaseUrl, supabasePublicKey, {
      global: { fetch: createBoundedFetch() },
    })
  }
  return supabaseInstance
}

export const supabase = getSupabase()
