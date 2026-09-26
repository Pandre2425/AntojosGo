import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Action, Message, Page } from './ui'
const Context = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false })
export const useSession = () => useContext(Context)
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!supabase) { setReady(true); return }
    let active = true
    setError(false)
    const subscription = supabase.auth.onAuthStateChange((_event, next) => { if (active) { setSession(next); setReady(true) } })
    supabase.auth.getSession().then(({ data, error }) => { if (active) { if (error) setError(true); else { setSession(data.session); setReady(true) } } }).catch(() => { if (active) setError(true) })
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh()
    const state = AppState.addEventListener('change', (value) => value === 'active' ? supabase!.auth.startAutoRefresh() : supabase!.auth.stopAutoRefresh())
    return () => { active = false; subscription.data.subscription.unsubscribe(); state.remove(); supabase!.auth.stopAutoRefresh() }
  }, [retry])
  if (error) return <Page><Message>No pudimos recuperar tu sesión.</Message><Action title="Reintentar" onPress={() => setRetry(v => v + 1)} /></Page>
  return <Context.Provider value={{ session, ready }}>{children}</Context.Provider>
}
