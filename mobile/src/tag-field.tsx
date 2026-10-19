import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { Action, Chip, Input, Txt, colors, spacing } from './ui'
import { t } from '../../shared/i18n'

/** Tag picker: type-your-own field first, then the chosen tags (tap to remove), then quick-pick options. */
export function TagField({ title, hint, placeholder, options = [], value, onChange, validate, disabled, tone = 'green', children }: {
  title: string; hint?: string; placeholder: string; options?: readonly string[]
  value: string[]; onChange: (next: string[]) => void; validate: (text: string, current: readonly string[]) => string
  disabled?: boolean; tone?: 'green' | 'red'; children?: ReactNode
}) {
  const [text, setText] = useState('')
  const [problem, setProblem] = useState('')
  const has = (v: string) => value.some(x => x.toLowerCase() === v.toLowerCase())
  const custom = value.filter(v => !options.some(o => o.toLowerCase() === v.toLowerCase()))
  function add() {
    const p = validate(text, value)
    setProblem(p)
    if (!p) { onChange([...value, text.trim().replace(/\s+/g, ' ')]); setText('') }
  }
  function toggle(o: string) {
    if (has(o)) { onChange(value.filter(x => x.toLowerCase() !== o.toLowerCase())); setProblem(''); return }
    const p = validate(o, value)
    setProblem(p === t('Ya está en la lista.') ? '' : p)
    if (!p) onChange([...value, o])
  }
  return <View style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
    <Txt variant="label" accessibilityRole="header">{title}</Txt>
    {hint ? <Txt variant="subhead">{hint}</Txt> : null}
    {children}
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Input accessibilityLabel={title} placeholder={placeholder} value={text} maxLength={40} editable={!disabled}
        onChangeText={value => { setText(value); setProblem('') }} returnKeyType="done" onSubmitEditing={add} style={{ flex: 1 }} />
      <Action title={t('Agregar')} secondary disabled={disabled || !text.trim()} onPress={add} />
    </View>
    {problem ? <Txt accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{problem}</Txt> : null}
    {custom.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {custom.map(c => <Chip key={c} label={`${t(c)}  ×`} on tone={tone} disabled={disabled} onPress={() => toggle(c)} />)}</View> : null}
    {options.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map(o => <Chip key={o} label={t(o)} on={has(o)} tone={tone} disabled={disabled} onPress={() => toggle(o)} />)}</View> : null}
  </View>
}
