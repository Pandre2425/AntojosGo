'use client'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { BranchLocation } from '@/shared/contracts/branches'

export default function BranchMap({ value, onChange }: { value: BranchLocation | null; onChange: (value: BranchLocation) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const initial = useRef(value)
  const change = useRef(onChange)
  change.current = onChange
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!container.current) return
    // Initial country overview is not a selected restaurant location.
    const instance = L.map(container.current).setView(initial.current ? [initial.current.latitude, initial.current.longitude] : [15.5, -90.25], initial.current ? 17 : 7)
    map.current = instance
    const tiles = L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance)
    tiles.on('tileerror', () => setFailed(true))
    instance.on('moveend', () => {
      const point = instance.getCenter().wrap()
      if (point.lat >= -90 && point.lat <= 90) change.current({ latitude: point.lat, longitude: point.lng })
    })
    instance.on('click', (event: L.LeafletMouseEvent) => instance.panTo(event.latlng))
    const resize = new ResizeObserver(() => instance.invalidateSize())
    resize.observe(container.current)
    return () => { resize.disconnect(); instance.remove(); map.current = null }
  }, [])
  useEffect(() => {
    if (!map.current || !value) return
    const point: L.LatLngTuple = [value.latitude, value.longitude]
    if (!map.current.getCenter().equals(L.latLng(point), 0.00000001)) {
      map.current.setView(point, Math.max(map.current.getZoom(), 17), { animate: false })
    }
  }, [value])
  return <div className="space-y-2">
    <p className="text-sm">Mueve el mapa hasta que la punta del pin quede sobre la entrada de tu restaurante. Acerca el mapa para ajustar el punto.</p>
    <div className="relative isolate">
      <div ref={container} aria-label="Mapa de ubicación: usa las flechas para moverlo y los botones para acercar" className="relative z-0 h-96 w-full rounded-xl" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
        <svg width="40" height="52" viewBox="0 0 40 52" className="drop-shadow-lg"><path d="M20 50C16 42 2 29 2 20a18 18 0 1 1 36 0c0 9-14 22-18 30Z" fill="#bd481f" stroke="white" strokeWidth="2"/><circle cx="20" cy="20" r="6" fill="white"/></svg>
      </div>
    </div>
    {failed && <p role="status" className="text-sm">No se cargaron algunas partes del mapa. Puedes guardar coordenadas conocidas o cerrar y reintentar.</p>}
    <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer" className="text-sm underline">Informar un problema del mapa</a>
  </div>
}
