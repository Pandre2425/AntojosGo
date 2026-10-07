import { createClient } from "@supabase/supabase-js"
import 'server-only'
import { headers } from 'next/headers'
import { isSupabaseConfigured, supabaseUrl, supabasePublicKey } from './config'

// Check if Supabase environment variables are available
export { isSupabaseConfigured } from './config'

export async function createServerClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase environment variables are not set.")
  }

  const authorization = (await headers()).get('authorization')
  return createClient(supabaseUrl, supabasePublicKey, {
    global: { headers: authorization ? { Authorization: authorization } : {} },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
