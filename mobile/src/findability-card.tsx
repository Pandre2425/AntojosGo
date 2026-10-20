import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { api } from './api'
import { Card, Txt, colors, radius, spacing } from './ui'
import { findabilityChecklist, findabilityScore, type FindabilityArea, type FindabilityItem } from '../../shared/contracts/findability'
import { t } from '../../shared/i18n'

/** «Para que te encuentren» on the business screen; reloads when the screen regains focus (after editing the menu). */
export function FindabilityCard({ restaurantId, onOpenMenu }: { restaurantId: string; onOpenMenu: () => void }) {
  const [items, setItems] = useState<FindabilityItem[] | null>(null)
  useFocusEffect(useCallback(() => {
    let active = true
    Promise.all([api.getRestaurant(restaurantId), api.listBranches(restaurantId), api.listDishes(restaurantId)])
      .then(([profile, branches, dishes]) => { if (active) setItems(findabilityChecklist(profile, branches.items, dishes)) })
      .catch(() => {})
    return () => { active = false }
  }, [restaurantId]))
  if (!items) return null
  const score = findabilityScore(items)
  const pending = items.filter(i => !i.done).sort((a, b) => Number(b.required) - Number(a.required))
  const hidden = items.some(i => i.required && !i.done)
  const go = (area: FindabilityArea) => (area === 'menu' ? onOpenMenu : null)
  return <Card>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Txt variant="headline" accessibilityRole="header">{t('Para que te encuentren')}</Txt>
      <Text style={{ color: colors.muted, fontVariant: ['tabular-nums'] }}>{t('{n}% completo', { n: score })}</Text>
    </View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: score }} style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${score}%`, height: '100%', backgroundColor: hidden ? colors.orange : colors.green }} />
    </View>
    {!pending.length ? <Txt style={{ color: colors.green }}>{t('¡Todo listo! Tu restaurante aparece completo en las búsquedas.')}</Txt> : <>
      {hidden ? <Txt style={{ color: colors.orange }}>{t('Todavía no apareces en las búsquedas. Completa lo marcado como imprescindible.')}</Txt> : null}
      {pending.map(i => {
        const action = go(i.area)
        return <View key={i.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 }}>
          <Text style={{ color: i.required ? colors.orange : colors.muted }}>○</Text>
          <Txt style={{ flex: 1 }}>{t(i.label)}{i.detail && i.detail.total > 0 ? ` (${i.detail.done}/${i.detail.total})` : ''}{i.required ? ` · ${t('Imprescindible')}` : ''}</Txt>
          {action ? <Pressable accessibilityRole="button" onPress={action} hitSlop={6}><Text style={{ color: colors.green, fontWeight: '700' }}>{t('Ir')}</Text></Pressable> : null}
        </View>
      })}
    </>}
  </Card>
}
