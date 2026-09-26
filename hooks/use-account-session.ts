'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'

export function useAccountSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const db = getSupabase()
    if (!db) { setLoading(false); return }
    // The listener emits INITIAL_SESSION after restoring persisted authentication.
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  return { user, loading }
}
