'use client'

import { Component, type ReactNode } from 'react'
import { Button } from './ui/button'

export default class ModuleBoundary extends Component<{ name: string; children: ReactNode; onExit?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <section role="alert" className="rounded-xl border bg-muted p-5 space-y-3">
      <h2 className="font-semibold">No pudimos abrir {this.props.name}</h2>
      <p className="text-sm text-muted-foreground">Puedes intentar otra vez o continuar en otra sección.</p>
      <Button variant="outline" onClick={() => this.setState({ failed: false })}>Reintentar</Button>
      {this.props.onExit && <Button variant="ghost" onClick={this.props.onExit}>Volver al panel</Button>}
    </section>
  }
}

export function ModuleLoading() {
  return <p role="status" className="p-5 text-sm text-muted-foreground">Cargando sección…</p>
}
