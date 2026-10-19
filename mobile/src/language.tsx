import { createContext, Fragment, useContext, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { getLocales } from 'expo-localization'
import { LANGS, pickLang, setLanguageSource, type Lang } from '../../shared/i18n'
import { Chip, Txt } from './ui'
import { View } from 'react-native'

// Phone language on first use (English if the phone is in English), then the user's choice, saved on the device.
// Changing it remounts the app so every t() renders again in the new language.
const KEY = 'lang'
let current: Lang = 'es'
setLanguageSource(() => current)

export async function loadLanguage() {
  let saved: string | null = null
  try { saved = await SecureStore.getItemAsync(KEY) } catch { /* first run */ }
  current = saved === 'es' || saved === 'en' ? saved : pickLang(getLocales()[0]?.languageTag)
}

const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: 'es', setLang: () => {} })
export const useLanguage = () => useContext(LanguageContext)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(current)
  const setLang = (next: Lang) => { current = next; setState(next); SecureStore.setItemAsync(KEY, next).catch(() => {}) }
  return <LanguageContext.Provider value={{ lang, setLang }}><Fragment key={lang}>{children}</Fragment></LanguageContext.Provider>
}

/** «Idioma / Language» chips for the account tab. */
export function LanguageSelector() {
  const { lang, setLang } = useLanguage()
  return <View style={{ gap: 8 }}>
    <Txt variant="label">Idioma / Language</Txt>
    <View style={{ flexDirection: 'row', gap: 8 }}>{LANGS.map(l => <Chip key={l.id} label={l.label} on={lang === l.id} onPress={() => setLang(l.id)} />)}</View>
  </View>
}
