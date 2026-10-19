'use client'

import { Component, type ReactNode } from 'react'
import { Button } from './ui/button'
import FoodLoader from './food-loader'
import { t } from '@/shared/i18n'

export default class ModuleBoundary extends Component<{ name: string; children: ReactNode; onExit?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <section role="alert" className="rounded-xl border bg-muted p-5 space-y-3">
      <h2 className="font-semibold">{t('No pudimos abrir {name}', { name: t(this.props.name) })}</h2>
      <p className="text-sm text-muted-foreground">{t('Puedes intentar otra vez o continuar en otra sección.')}</p>
      <Button variant="outline" onClick={() => this.setState({ failed: false })}>{t('Reintentar')}</Button>
      {this.props.onExit && <Button variant="ghost" onClick={this.props.onExit}>{t('Volver al panel')}</Button>}
    </section>
  }
}

export function ModuleLoading() {
  return <FoodLoader label={t('Cargando sección…')} />
}
