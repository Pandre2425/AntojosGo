import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import { createBoundedFetch } from '../../lib/bounded-fetch'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && key)
export const supabase = url && key ? createClient(url, key, {
  global: { fetch: createBoundedFetch() },
  auth: {
    storage: { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync },
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
  },
}) : null
export function getSupabase() { return supabase }
