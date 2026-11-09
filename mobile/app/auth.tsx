import { useEffect, useState } from 'react'
import { Redirect, Stack } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../src/supabase'
import { Loading, Page } from '../src/ui'

// Google sign-in returns to antojosgo://auth (src/google-auth.ts). Android also hands that link to the router,
// which needs a screen here. Normally google-auth.ts already saved the session; if the app was restarted
// meanwhile, the tokens come in the launch link, so save them before going to the account tab.
export default function AuthReturn() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL()
      const params = new URLSearchParams(url?.split('#')[1] ?? '')
      const access_token = params.get('access_token'), refresh_token = params.get('refresh_token')
      if (supabase && access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token })
    })().catch(() => {}).finally(() => setDone(true))
  }, [])
  return <>
    <Stack.Screen options={{ headerShown: false }} />
    {done ? <Redirect href="/account" /> : <Page><Loading /></Page>}
  </>
}
